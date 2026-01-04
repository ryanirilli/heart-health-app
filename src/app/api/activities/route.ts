import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ActivityEntry {
  typeId: string;
  value: number;
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
    const { date, entries } = body as { 
      date: string; 
      entries: { [typeId: string]: ActivityEntry } 
    };

    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
