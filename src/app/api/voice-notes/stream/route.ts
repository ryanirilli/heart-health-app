import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { extractActivities } from '@/lib/ai/extractActivities';

// Maximum voice note duration in seconds
const MAX_DURATION_SECONDS = 60;

// Streaming status types
export type StreamingStatus = {
  status: 'uploading' | 'saving' | 'transcribing' | 'extracting' | 'finalizing' | 'complete' | 'error';
  message: string;
  data?: any;
  statusCode?: number;
};

export async function POST(request: NextRequest) {
  // Create a TransformStream to write status updates to
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to send status updates
  const sendStatus = async (status: StreamingStatus) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(status)}\n\n`));
  };

  // Start processing in the background (but awaiting critical steps inside the promise handler)
  (async () => {
    try {
      const supabase = await createClient();
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        await sendStatus({ status: 'error', message: 'Unauthorized', statusCode: 401 });
        await writer.close();
        return;
      }

      await sendStatus({ status: 'uploading', message: 'Processing audio file...' });

      const formData = await request.formData();
      const date = formData.get('date') as string;
      const audioFile = formData.get('audio') as File;
      const durationSeconds = parseInt(formData.get('duration') as string, 10);

      // Validation
      if (!date || typeof date !== 'string') {
        await sendStatus({ status: 'error', message: 'Invalid date format', statusCode: 400 });
        await writer.close();
        return;
      }

      if (!audioFile || !(audioFile instanceof File)) {
        await sendStatus({ status: 'error', message: 'Audio file is required', statusCode: 400 });
        await writer.close();
        return;
      }

      if (isNaN(durationSeconds) || durationSeconds <= 0) {
        await sendStatus({ status: 'error', message: 'Invalid duration', statusCode: 400 });
        await writer.close();
        return;
      }

      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (OpenAI limit)
        if (audioFile.size > MAX_FILE_SIZE) {
        await sendStatus({ status: 'error', message: 'File too large', statusCode: 400 });
        await writer.close();
        return;
      }

      if (durationSeconds > MAX_DURATION_SECONDS) {
        await sendStatus({ status: 'error', message: `Voice note must be ${MAX_DURATION_SECONDS} seconds or less`, statusCode: 400 });
        await writer.close();
        return;
      }

      await sendStatus({ status: 'uploading', message: 'Uploading to secure storage...' });

      // Check if voice note already exists for this date - if so, delete it first (upsert behavior)
      const { data: existing } = await supabase
        .from('voice_notes')
        .select('id, storage_path')
        .eq('user_id', user.id)
        .eq('date', date)
        .single();

      if (existing) {
        // Delete from storage
        await supabase.storage
          .from('voice-notes')
          .remove([existing.storage_path]);
        
        // Delete database record
        await supabase
          .from('voice_notes')
          .delete()
          .eq('id', existing.id);
      }

      // Generate unique storage path
      // Strip codec suffix from mime type (e.g., "audio/webm;codecs=opus" -> "audio/webm")
      const baseMimeType = audioFile.type.split(';')[0];
      const fileExtension = baseMimeType.split('/')[1] || 'webm';
      const storagePath = `${user.id}/${date}/${crypto.randomUUID()}.${fileExtension}`;

      // Upload to storage
      const arrayBuffer = await audioFile.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(storagePath, arrayBuffer, {
          contentType: baseMimeType, // Use base mime type without codec
          upsert: false,
        });

      if (uploadError) {
        console.error('Failed to upload voice note:', uploadError);
        await sendStatus({ status: 'error', message: 'Failed to upload voice note', statusCode: 500 });
        await writer.close();
        return;
      }

      await sendStatus({ status: 'saving', message: 'Saving record...' });

      // Create database record
      const { data: voiceNote, error: insertError } = await supabase
        .from('voice_notes')
        .insert({
          user_id: user.id,
          date,
          storage_path: storagePath,
          duration_seconds: durationSeconds,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to save voice note record:', insertError);
        // Cleanup: delete uploaded file if DB insert fails
        await supabase.storage.from('voice-notes').remove([storagePath]);
        await sendStatus({ status: 'error', message: 'Failed to save voice note record', statusCode: 500 });
        await writer.close();
        return;
      }

      // Transcribe audio with Whisper and extract activities
      let transcription: string | null = null;
      let transcriptionStatus: 'pending' | 'completed' | 'failed' = 'pending';
      let extractedActivities: any = null;

      try {
        await sendStatus({ status: 'transcribing', message: 'Transcribing audio...' });

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
          console.warn('OPENAI_API_KEY not configured - skipping transcription');
          transcriptionStatus = 'failed';
        } else {
          // Download audio from storage for transcription
          // We could use the arrayBuffer we already have, but this ensures we test the stored file too?
          // Actually using the buffer is faster and saves a round trip.
          
          // Call OpenAI Whisper API
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const transcriptionResult = await openai.audio.transcriptions.create({
            file: new File([arrayBuffer], `audio.${fileExtension}`, { type: baseMimeType }),
            model: 'whisper-1',
          });

          transcription = transcriptionResult.text;
          transcriptionStatus = 'completed';

          // Extract activities if transcription succeeded
          if (transcription) {
            await sendStatus({ status: 'extracting', message: 'Analyzing activities...' });
            
            const extractionResult = await extractActivities(
              transcription,
              user.id,
              supabase
            );
            if (extractionResult) {
              extractedActivities = extractionResult;
            }
          }
        }
      } catch (transcriptionError) {
        console.error('Transcription/extraction failed:', transcriptionError);
        transcriptionStatus = 'failed';
        // Don't fail the entire request - voice note is still saved
      }

      await sendStatus({ status: 'finalizing', message: 'Finalizing...' });

      // Update database record with transcription and extraction results
      const { error: updateError } = await supabase
        .from('voice_notes')
        .update({
          transcription,
          transcription_status: transcriptionStatus,
          extracted_activities: extractedActivities,
        })
        .eq('id', voiceNote.id);

      if (updateError) {
        console.error('Failed to update voice note with transcription:', updateError);
        // Don't fail the request - the voice note was saved successfully
      }

      // Generate signed URL for immediate playback
      const { data: signedUrlData } = await supabase.storage
        .from('voice-notes')
        .createSignedUrl(storagePath, 3600);

      const result = {
        id: voiceNote.id,
        date: voiceNote.date,
        storagePath: voiceNote.storage_path,
        durationSeconds: voiceNote.duration_seconds,
        signedUrl: signedUrlData?.signedUrl,
        transcription: transcription ?? undefined,
        transcriptionStatus: transcriptionStatus ?? undefined,
        extractedActivities: extractedActivities ?? undefined,
      };

      await sendStatus({ status: 'complete', message: 'Done!', data: result });
      await writer.close();

    } catch (error) {
      console.error('Unexpected error in voice note stream:', error);
      await sendStatus({ status: 'error', message: 'Internal server error', statusCode: 500 });
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
