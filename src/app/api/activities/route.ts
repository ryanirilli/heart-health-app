import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { parse, stringify } from 'yaml';
import { ActivityType } from '@/lib/activityTypes';

interface ActivityEntry {
  typeId: string;
  value: number;
}

interface YamlActivityEntry {
  date: string;
  entries: { [typeId: string]: number };
}

interface YamlData {
  types?: ActivityType[];
  activities?: Record<string, YamlActivityEntry[]>;
}

const ACTIVITIES_FILE = path.join(process.cwd(), 'data', 'activities.yaml');

async function readActivitiesFile(): Promise<YamlData> {
  try {
    const content = await fs.readFile(ACTIVITIES_FILE, 'utf-8');
    return (parse(content) as YamlData) || { types: [], activities: {} };
  } catch {
    return { types: [], activities: {} };
  }
}

async function writeActivitiesFile(data: YamlData): Promise<void> {
  // Ensure the data directory exists
  const dir = path.dirname(ACTIVITIES_FILE);
  await fs.mkdir(dir, { recursive: true });
  
  // Add a header comment
  const header = `# Heart Health Activity Log
# Types define what activities you're tracking
# Activities store daily entries for each type

`;
  
  const yamlContent = stringify(data, { lineWidth: 0 });
  await fs.writeFile(ACTIVITIES_FILE, header + yamlContent, 'utf-8');
}

export async function POST(request: NextRequest) {
  try {
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

    // Parse the year from the date
    const year = date.split('-')[0];
    if (!year) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = await readActivitiesFile();

    // Ensure the activities object and year array exist
    if (!data.activities) {
      data.activities = {};
    }
    if (!data.activities[year]) {
      data.activities[year] = [];
    }

    // Convert entries to YAML format (just the values)
    // Include 0 values to indicate "tracked but zero" (e.g., 0 drinks)
    const yamlEntries: { [typeId: string]: number } = {};
    for (const typeId in entries) {
      yamlEntries[typeId] = entries[typeId].value;
    }

    // Find existing entry for this date
    const existingIndex = data.activities[year].findIndex((entry) => entry.date === date);

    const newEntry: YamlActivityEntry = {
      date,
      entries: yamlEntries,
    };

    // If no entries, remove the activity entirely
    if (Object.keys(yamlEntries).length === 0) {
      if (existingIndex >= 0) {
        data.activities[year].splice(existingIndex, 1);
        
        // Remove year key if empty
        if (data.activities[year].length === 0) {
          delete data.activities[year];
        }
      }
    } else {
      if (existingIndex >= 0) {
        // Update existing entry
        data.activities[year][existingIndex] = newEntry;
      } else {
        // Add new entry and sort by date
        data.activities[year].push(newEntry);
        data.activities[year].sort((a, b) => a.date.localeCompare(b.date));
      }
    }

    // Write back to file
    await writeActivitiesFile(data);

    return NextResponse.json({ success: true, entry: newEntry });
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
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    const year = date.split('-')[0];
    if (!year) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = await readActivitiesFile();

    if (data.activities && data.activities[year]) {
      // Remove the entry for this date
      data.activities[year] = data.activities[year].filter((entry) => entry.date !== date);
      
      // Remove year key if empty
      if (data.activities[year].length === 0) {
        delete data.activities[year];
      }
    }

    // Write back to file
    await writeActivitiesFile(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
