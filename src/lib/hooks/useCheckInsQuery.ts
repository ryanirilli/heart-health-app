"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import posthog from "posthog-js";
import {
  CheckIn,
  CheckInsResponse,
  CheckInStreamingStatus,
  CheckInStreamingStatusType,
  PartialCheckInAnalysis,
  DataState,
} from "@/lib/checkIns";

const CHECK_INS_QUERY_KEY = ["check-ins"];

async function fetchCheckIns(): Promise<CheckInsResponse> {
  const response = await fetch("/api/check-ins");
  if (!response.ok) {
    throw new Error("Failed to fetch check-ins");
  }
  return response.json();
}

/**
 * Stream-based check-in generation that provides real-time status updates
 * and streams partial content as it generates
 */
async function generateCheckInWithStreaming(
  onStatusUpdate: (status: CheckInStreamingStatus) => void,
  onPartialContent?: (partial: PartialCheckInAnalysis) => void
): Promise<CheckIn> {
  const startTime = performance.now();
  let lastStepTime = startTime;
  let lastStatus = "";

  posthog.capture("check_in_generate_start");

  try {
    const response = await fetch("/api/check-ins/generate", {
      method: "POST",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to generate check-in");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let finalResult: CheckIn | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n").filter((line) => line.startsWith("data: "));

      for (const line of lines) {
        try {
          const jsonStr = line.replace("data: ", "");
          const status: CheckInStreamingStatus = JSON.parse(jsonStr);
          onStatusUpdate(status);

          // Track step duration
          if (status.status !== lastStatus) {
            const now = performance.now();
            const stepDuration = now - lastStepTime;

            if (lastStatus) {
              posthog.capture("check_in_generate_step_complete", {
                step: lastStatus,
                duration_ms: stepDuration,
              });
            }

            lastStatus = status.status;
            lastStepTime = now;
          }

          if (status.status === "complete" && status.data) {
            finalResult = status.data;
            const totalDuration = performance.now() - startTime;
            posthog.capture("check_in_generate_complete", {
              total_duration_ms: totalDuration,
            });
          } else if (status.status === "streaming_content" && status.partialAnalysis) {
            // Forward partial content to the callback
            onPartialContent?.(status.partialAnalysis);
          } else if (status.status === "error") {
            throw new Error(status.message);
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
          if (
            e instanceof Error &&
            e.message !== "Unexpected end of JSON input"
          ) {
            throw e;
          }
        }
      }
    }

    if (!finalResult) {
      throw new Error("No result received from stream");
    }

    return finalResult;
  } catch (error) {
    const totalDuration = performance.now() - startTime;
    posthog.capture("check_in_generate_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      total_duration_ms: totalDuration,
    });
    throw error;
  }
}

export interface UseCheckInsResult {
  /** Array of completed check-ins */
  checkIns: CheckIn[];
  /** Total number of check-ins */
  total: number;
  /** Whether a new check-in can be generated (not rate-limited and has activity types) */
  canGenerateNew: boolean;
  /** Date when the next check-in can be generated (if rate-limited) */
  nextAvailableDate: string | null;
  /** Current data state affecting check-in type */
  dataState: DataState;
  /** Details about the user's data */
  dataStateDetails: {
    activityTypeCount: number;
    daysWithEntries: number;
    totalEntries: number;
  };
  /** Loading state */
  isLoading: boolean;
  /** Whether a check-in is currently being generated */
  isGenerating: boolean;
  /** Current streaming status during generation */
  streamingStatus: CheckInStreamingStatusType | null;
  /** Current streaming message */
  streamingMessage: string | null;
  /** Partial analysis content streamed during generation */
  streamingContent: PartialCheckInAnalysis | null;
  /** Error during generation */
  generationError: string | null;
  /** Generate a new check-in */
  generateCheckIn: () => Promise<CheckIn | null>;
}

export function useCheckIns(): UseCheckInsResult {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingStatus, setStreamingStatus] =
    useState<CheckInStreamingStatusType | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<PartialCheckInAnalysis | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Query for fetching check-ins and metadata
  const { data, isLoading } = useQuery<CheckInsResponse>({
    queryKey: CHECK_INS_QUERY_KEY,
    queryFn: fetchCheckIns,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const generateCheckIn = useCallback(async (): Promise<CheckIn | null> => {
    setIsGenerating(true);
    setGenerationError(null);
    setStreamingContent(null);
    setStreamingStatus("checking_rate_limit");
    setStreamingMessage("Starting...");

    try {
      const result = await generateCheckInWithStreaming(
        (status) => {
          setStreamingStatus(status.status);
          setStreamingMessage(status.message);
        },
        (partial) => {
          setStreamingContent(partial);
        }
      );

      // Update cache with new check-in
      queryClient.setQueryData<CheckInsResponse>(CHECK_INS_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          checkIns: [result, ...old.checkIns],
          total: old.total + 1,
          canGenerateNew: false,
          // Next available date will be 7 days from now
          nextAvailableDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        };
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate check-in";
      setGenerationError(message);
      return null;
    } finally {
      setIsGenerating(false);
      setStreamingStatus(null);
      setStreamingMessage(null);
      setStreamingContent(null);
    }
  }, [queryClient]);

  return {
    checkIns: data?.checkIns || [],
    total: data?.total || 0,
    canGenerateNew: data?.canGenerateNew ?? false,
    nextAvailableDate: data?.nextAvailableDate ?? null,
    dataState: data?.dataState ?? "no_activity_types",
    dataStateDetails: data?.dataStateDetails ?? {
      activityTypeCount: 0,
      daysWithEntries: 0,
      totalEntries: 0,
    },
    isLoading,
    isGenerating,
    streamingStatus,
    streamingMessage,
    streamingContent,
    generationError,
    generateCheckIn,
  };
}

/**
 * Hook to get a specific check-in by ID
 */
export function useCheckIn(checkInId: string | null): {
  checkIn: CheckIn | null;
  isLoading: boolean;
} {
  const { checkIns, isLoading } = useCheckIns();

  const checkIn = checkInId
    ? checkIns.find((c) => c.id === checkInId) ?? null
    : null;

  return {
    checkIn,
    isLoading,
  };
}
