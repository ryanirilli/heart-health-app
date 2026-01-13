import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ActivityMap, ActivityEntry as AppActivityEntry } from '@/lib/activities';
import { DbActivity, DbActivityNote } from '@/lib/supabase/types';

// Maximum note length
const MAX_NOTE_LENGTH = 500;

interface ActivityEntry {
  typeId: string;
  value: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch activities
    const { data: dbActivities, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to fetch activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Fetch notes
    const { data: dbNotes, error: notesError } = await supabase
      .from('activity_notes')
      .select('*')
      .eq('user_id', user.id);

    if (notesError) {
      console.error('Failed to fetch activity notes:', notesError);
      // Continue without notes - don't fail the whole request
    }

    // Create a map of date -> note
    const notesMap = new Map<string, string>();
    (dbNotes as DbActivityNote[] | null)?.forEach((n) => {
      notesMap.set(n.date, n.note);
    });

    // Convert DB activities to app format (grouped by date)
    const activities: ActivityMap = {};
    (dbActivities as DbActivity[] | null)?.forEach((a) => {
      if (!activities[a.date]) {
        activities[a.date] = {
          date: a.date,
          entries: {},
          note: notesMap.get(a.date),
        };
      }
      activities[a.date].entries[a.activity_type_id] = {
        typeId: a.activity_type_id,
        value: a.value,
      } as AppActivityEntry;
    });

    // Also include notes for dates that have notes but no activities
    notesMap.forEach((note, date) => {
      if (!activities[date]) {
        activities[date] = {
          date,
          entries: {},
          note,
        };
      }
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
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

    const body = await request.json();
    const { date, entries, note } = body as { 
      date: string; 
      entries: { [typeId: string]: ActivityEntry };
      note?: string;
    };

    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Validate note if provided
    if (note !== undefined && note !== null) {
      if (typeof note !== 'string') {
        return NextResponse.json(
          { error: 'Invalid note format' },
          { status: 400 }
        );
      }
      if (note.length > MAX_NOTE_LENGTH) {
        return NextResponse.json(
          { error: `Note must be ${MAX_NOTE_LENGTH} characters or less` },
          { status: 400 }
        );
      }
    }

    // Get all existing entries for this date
    const { data: existingEntries } = await supabase
      .from('activities')
      .select('id, activity_type_id')
      .eq('user_id', user.id)
      .eq('date', date);

    const existingMap = new Map(
      existingEntries?.map(e => [e.activity_type_id, e.id]) ?? []
    );

    // Determine which entries to upsert and which to delete
    const toUpsert: { user_id: string; activity_type_id: string; date: string; value: number }[] = [];
    const toDelete: string[] = [];

    // Process incoming entries
    for (const typeId in entries) {
      const entry = entries[typeId];
      toUpsert.push({
        user_id: user.id,
        activity_type_id: typeId,
        date,
        value: entry.value,
      });
    }

    // Find entries to delete (exist in DB but not in incoming)
    for (const [typeId, id] of existingMap) {
      if (!(typeId in entries)) {
        toDelete.push(id);
      }
    }

    // Perform upserts
    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('activities')
        .upsert(toUpsert, { 
          onConflict: 'user_id,activity_type_id,date',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Failed to upsert activities:', upsertError);
        return NextResponse.json(
          { error: 'Failed to save activity' },
          { status: 500 }
        );
      }
    }

    // Delete removed entries
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .in('id', toDelete);

      if (deleteError) {
        console.error('Failed to delete activities:', deleteError);
      }
    }

    // Handle note - upsert if provided, delete if explicitly set to empty string
    if (note !== undefined) {
      if (note === '' || note === null) {
        // Delete note if it exists
        const { error: deleteNoteError } = await supabase
          .from('activity_notes')
          .delete()
          .eq('user_id', user.id)
          .eq('date', date);

        if (deleteNoteError) {
          console.error('Failed to delete note:', deleteNoteError);
        }
      } else {
        // Upsert note
        const { error: noteError } = await supabase
          .from('activity_notes')
          .upsert({
            user_id: user.id,
            date,
            note: note.trim(),
          }, {
            onConflict: 'user_id,date',
            ignoreDuplicates: false
          });

        if (noteError) {
          console.error('Failed to save note:', noteError);
          return NextResponse.json(
            { error: 'Failed to save note' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save activity:', error);
    return NextResponse.json(
      { error: 'Failed to save activity' },
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

    // Delete all entries for this date
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date);

    if (error) {
      console.error('Failed to delete activities:', error);
      return NextResponse.json(
        { error: 'Failed to delete activity' },
        { status: 500 }
      );
    }

    // Also delete the note for this date
    const { error: noteError } = await supabase
      .from('activity_notes')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date);

    if (noteError) {
      console.error('Failed to delete note:', noteError);
      // Don't fail the whole request if note deletion fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
