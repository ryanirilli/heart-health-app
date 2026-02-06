import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { subDays, parseISO, addDays } from "date-fns";
import {
  CheckIn,
  CheckInStreamingStatus,
  PartialCheckInAnalysis,
  dbCheckInToCheckIn,
} from "@/lib/checkIns";
import {
  assessDataState,
  compileCheckInContext,
  createDataSummary,
  DbActivity,
  DbActivityType,
  DbVoiceNote,
  DbGoal,
  DbAchievement,
} from "@/lib/checkInDataProcessor";
import { streamCheckInAnalysis, searchForResources } from "@/lib/ai/generateCheckIn";

export async function POST(request: NextRequest) {
  // Create a TransformStream to write status updates to
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to send status updates
  const sendStatus = async (status: CheckInStreamingStatus) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(status)}\n\n`));
  };

  // Start processing in the background
  (async () => {
    try {
      const supabase = await createClient();

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        await sendStatus({
          status: "error",
          message: "Unauthorized",
          statusCode: 401,
        });
        await writer.close();
        return;
      }

      await sendStatus({
        status: "checking_rate_limit",
        message: "Checking availability...",
      });

      // Get date boundaries (use UTC to avoid timezone issues)
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const thirtyDaysAgo = subDays(today, 30).toISOString().split("T")[0];
      const sevenDaysAgo = subDays(today, 7).toISOString().split("T")[0];

      // Check rate limiting - get most recent check-in
      // Use gt (not gte) so that check-ins from exactly 7 days ago don't block
      const { data: recentCheckIn } = await supabase
        .from("check_ins")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gt("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentCheckIn) {
        // Use toISOString() to get UTC date and avoid timezone issues
        const nextAvailable = addDays(parseISO(recentCheckIn.created_at), 7)
          .toISOString()
          .split("T")[0];
        await sendStatus({
          status: "error",
          message: `You can generate your next check-in on ${nextAvailable}`,
          statusCode: 429,
        });
        await writer.close();
        return;
      }

      await sendStatus({
        status: "aggregating_data",
        message: "Gathering your health data...",
      });

      // Fetch all required data in parallel
      const [
        activitiesResult,
        activityTypesResult,
        voiceNotesResult,
        goalsResult,
        achievementsResult,
      ] = await Promise.all([
        supabase
          .from("activities")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", thirtyDaysAgo)
          .order("date", { ascending: true }),
        supabase
          .from("activity_types")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("voice_notes")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", thirtyDaysAgo),
        supabase.from("goals").select("*").eq("user_id", user.id),
        supabase
          .from("achievements")
          .select("*, goals(name, icon)")
          .eq("user_id", user.id)
          .gte("period_end", thirtyDaysAgo),
      ]);

      // Check for errors
      if (activityTypesResult.error) {
        console.error("Failed to fetch activity types:", activityTypesResult.error);
        await sendStatus({
          status: "error",
          message: "Failed to fetch activity types",
          statusCode: 500,
        });
        await writer.close();
        return;
      }

      const activities = (activitiesResult.data || []) as DbActivity[];
      const activityTypes = (activityTypesResult.data || []) as DbActivityType[];
      const voiceNotes = (voiceNotesResult.data || []) as DbVoiceNote[];
      const goals = (goalsResult.data || []) as DbGoal[];
      const achievements = (achievementsResult.data || []) as DbAchievement[];

      // Assess data state
      const dataStateAssessment = assessDataState(activityTypes, activities, 30);

      // Check if user has any activity types
      if (dataStateAssessment.state === "no_activity_types") {
        await sendStatus({
          status: "error",
          message:
            "Please create some activity types first before generating a check-in.",
          statusCode: 400,
        });
        await writer.close();
        return;
      }

      await sendStatus({
        status: "analyzing",
        message: "Analyzing your progress...",
      });

      // Compile context for AI
      const context = compileCheckInContext(
        dataStateAssessment.state,
        activities,
        activityTypes,
        voiceNotes,
        goals,
        achievements,
        thirtyDaysAgo,
        todayStr
      );

      await sendStatus({
        status: "searching",
        message: "Finding personalized resources...",
      });

      // Search for resources
      let resources: Awaited<ReturnType<typeof searchForResources>> = [];
      try {
        resources = await searchForResources(context);
      } catch (searchError) {
        console.error("Resource search failed:", searchError);
        // Continue without resources
      }

      // Stream the check-in analysis content
      await sendStatus({
        status: "streaming_content",
        message: "Writing your check-in...",
      });

      let analysis;
      try {
        let lastPartial: PartialCheckInAnalysis = {};

        analysis = await streamCheckInAnalysis(context, resources, (partial) => {
          // Only send updates when content has meaningfully changed
          const partialAnalysis: PartialCheckInAnalysis = {
            title: partial.title,
            overallSummary: partial.overallSummary,
            celebrations: partial.celebrations as string[] | undefined,
            insights: partial.insights as string[] | undefined,
            recommendations: partial.recommendations as string[] | undefined,
            weeklyFocus: partial.weeklyFocus,
            motivation: partial.motivation,
          };

          // Check if there's meaningful new content to send
          const hasNewContent =
            (partialAnalysis.title && partialAnalysis.title !== lastPartial.title) ||
            (partialAnalysis.overallSummary && partialAnalysis.overallSummary !== lastPartial.overallSummary) ||
            (partialAnalysis.celebrations?.length !== lastPartial.celebrations?.length) ||
            (partialAnalysis.insights?.length !== lastPartial.insights?.length) ||
            (partialAnalysis.recommendations?.length !== lastPartial.recommendations?.length) ||
            (partialAnalysis.weeklyFocus && partialAnalysis.weeklyFocus !== lastPartial.weeklyFocus) ||
            (partialAnalysis.motivation && partialAnalysis.motivation !== lastPartial.motivation);

          if (hasNewContent) {
            // Fire and forget - we can't await in a sync callback
            sendStatus({
              status: "streaming_content",
              message: "Writing your check-in...",
              partialAnalysis,
            });
            lastPartial = partialAnalysis;
          }
        });
      } catch (aiError) {
        console.error("AI generation failed:", aiError);
        await sendStatus({
          status: "error",
          message: "Failed to generate check-in. Please try again.",
          statusCode: 500,
        });
        await writer.close();
        return;
      }

      await sendStatus({
        status: "saving",
        message: "Saving your check-in...",
      });

      // Create data summary
      const dataSummary = createDataSummary(context);

      // Save to database
      const { data: savedCheckIn, error: insertError } = await supabase
        .from("check_ins")
        .insert({
          user_id: user.id,
          period_start: thirtyDaysAgo,
          period_end: todayStr,
          analysis,
          data_summary: dataSummary,
          status: "completed",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to save check-in:", insertError);
        await sendStatus({
          status: "error",
          message: "Failed to save check-in",
          statusCode: 500,
        });
        await writer.close();
        return;
      }

      // Convert to application format
      const checkIn: CheckIn = dbCheckInToCheckIn(savedCheckIn);

      await sendStatus({
        status: "complete",
        message: "Done!",
        data: checkIn,
      });
      await writer.close();
    } catch (error) {
      console.error("Unexpected error in check-in generation:", error);
      await sendStatus({
        status: "error",
        message: "Internal server error",
        statusCode: 500,
      });
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
