import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DbVoiceNote } from '@/lib/supabase/types';
import OpenAI from 'openai';
import { extractActivities } from '@/lib/ai/extractActivities';

// Maximum voice note duration in seconds
const MAX_DURATION_SECONDS = 60;

export interface VoiceNote {
  id: string;
  date: string;
  storagePath: string;
  durationSeconds: number;
  signedUrl?: string;
  transcription?: string;
  transcriptionStatus?: 'pending' | 'completed' | 'failed';
  extractedActivities?: any;
}

export interface VoiceNoteMap {
  [date: string]: VoiceNote;
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch voice notes
    const { data: dbVoiceNotes, error } = await supabase
      .from('voice_notes')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to fetch voice notes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch voice notes' },
        { status: 500 }
      );
    }

    // Convert to map and generate signed URLs
    const voiceNotes: VoiceNoteMap = {};
    
    for (const note of (dbVoiceNotes as DbVoiceNote[] | null) ?? []) {
      // Generate signed URL for playback (1 hour expiry)
      const { data: signedUrlData } = await supabase.storage
        .from('voice-notes')
        .createSignedUrl(note.storage_path, 3600);

      voiceNotes[note.date] = {
        id: note.id,
        date: note.date,
        storagePath: note.storage_path,
        durationSeconds: note.duration_seconds,
        signedUrl: signedUrlData?.signedUrl,
        transcription: note.transcription ?? undefined,
        transcriptionStatus: note.transcription_status ?? undefined,
        extractedActivities: note.extracted_activities as any ?? undefined,
      };
    }

    return NextResponse.json(voiceNotes);
  } catch (error) {
    console.error('Failed to fetch voice notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const date = formData.get('date') as string;
    const audioFile = formData.get('audio') as File;
    const durationSeconds = parseInt(formData.get('duration') as string, 10);

    // Validation
    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    if (isNaN(durationSeconds) || durationSeconds <= 0) {
      return NextResponse.json(
        { error: 'Invalid duration' },
        { status: 400 }
      );
    }

    if (durationSeconds > MAX_DURATION_SECONDS) {
      return NextResponse.json(
        { error: `Voice note must be ${MAX_DURATION_SECONDS} seconds or less` },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: 'Failed to upload voice note' },
        { status: 500 }
      );
    }

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
      return NextResponse.json(
        { error: 'Failed to save voice note' },
        { status: 500 }
      );
    }

    // Transcribe audio with Whisper and extract activities
    let transcription: string | null = null;
    let transcriptionStatus: 'pending' | 'completed' | 'failed' = 'pending';
    let extractedActivities: any = null;

    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not configured - skipping transcription');
        transcriptionStatus = 'failed';
      } else {
        // Download audio from storage for transcription
        const { data: audioData, error: downloadError } = await supabase.storage
          .from('voice-notes')
          .download(storagePath);

        if (downloadError || !audioData) {
          console.error('Failed to download audio for transcription:', downloadError);
          transcriptionStatus = 'failed';
        } else {
          // Call OpenAI Whisper API
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const transcriptionResult = await openai.audio.transcriptions.create({
            file: new File([audioData], `audio.${fileExtension}`, { type: baseMimeType }),
            model: 'whisper-1',
          });

          transcription = transcriptionResult.text;
          transcriptionStatus = 'completed';

          // Extract activities if transcription succeeded
          if (transcription) {
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
      }
    } catch (transcriptionError) {
      console.error('Transcription/extraction failed:', transcriptionError);
      transcriptionStatus = 'failed';
      // Don't fail the entire request - voice note is still saved
    }

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

    return NextResponse.json({
      id: voiceNote.id,
      date: voiceNote.date,
      storagePath: voiceNote.storage_path,
      durationSeconds: voiceNote.duration_seconds,
      signedUrl: signedUrlData?.signedUrl,
      transcription: transcription ?? undefined,
      transcriptionStatus: transcriptionStatus ?? undefined,
      extractedActivities: extractedActivities ?? undefined,
    });
  } catch (error) {
    console.error('Failed to save voice note:', error);
    return NextResponse.json(
      { error: 'Failed to save voice note' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Get the voice note to find storage path
    const { data: voiceNote, error: fetchError } = await supabase
      .from('voice_notes')
      .select('id, storage_path')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (fetchError || !voiceNote) {
      return NextResponse.json(
        { error: 'Voice note not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('voice-notes')
      .remove([voiceNote.storage_path]);

    if (storageError) {
      console.error('Failed to delete voice note from storage:', storageError);
      // Continue to delete DB record anyway
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('voice_notes')
      .delete()
      .eq('id', voiceNote.id);

    if (deleteError) {
      console.error('Failed to delete voice note record:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete voice note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete voice note:', error);
    return NextResponse.json(
      { error: 'Failed to delete voice note' },
      { status: 500 }
    );
  }
}
