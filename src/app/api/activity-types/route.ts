import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { parse, stringify } from 'yaml';
import { ActivityType, MAX_ACTIVITY_TYPES } from '@/lib/activityTypes';

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

// Create a new activity type
export async function POST(request: NextRequest) {
  try {
    const newType = await request.json() as ActivityType;

    if (!newType.id || !newType.name || !newType.unit) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, unit' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = await readActivitiesFile();

    // Ensure types array exists
    if (!data.types) {
      data.types = [];
    }

    // Check if we've hit the limit
    const activeTypes = data.types.filter(t => !t.deleted);
    if (activeTypes.length >= MAX_ACTIVITY_TYPES) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_ACTIVITY_TYPES} activity types allowed` },
        { status: 400 }
      );
    }

    // Check for duplicate ID
    if (data.types.find(t => t.id === newType.id)) {
      return NextResponse.json(
        { error: 'Activity type with this ID already exists' },
        { status: 400 }
      );
    }

    // Add the new type
    data.types.push(newType);

    // Write back to file
    await writeActivitiesFile(data);

    return NextResponse.json({ success: true, type: newType });
  } catch (error) {
    console.error('Failed to create activity type:', error);
    return NextResponse.json(
      { error: 'Failed to create activity type' },
      { status: 500 }
    );
  }
}

// Update an existing activity type
export async function PUT(request: NextRequest) {
  try {
    const updatedType = await request.json() as ActivityType;

    if (!updatedType.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = await readActivitiesFile();

    if (!data.types) {
      return NextResponse.json(
        { error: 'Activity type not found' },
        { status: 404 }
      );
    }

    // Find and update the type
    const index = data.types.findIndex(t => t.id === updatedType.id);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Activity type not found' },
        { status: 404 }
      );
    }

    data.types[index] = updatedType;

    // Write back to file
    await writeActivitiesFile(data);

    return NextResponse.json({ success: true, type: updatedType });
  } catch (error) {
    console.error('Failed to update activity type:', error);
    return NextResponse.json(
      { error: 'Failed to update activity type' },
      { status: 500 }
    );
  }
}

// Soft delete an activity type (mark as deleted)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Read existing data
    const data = await readActivitiesFile();

    if (!data.types) {
      return NextResponse.json(
        { error: 'Activity type not found' },
        { status: 404 }
      );
    }

    // Find and soft-delete the type
    const index = data.types.findIndex(t => t.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Activity type not found' },
        { status: 404 }
      );
    }

    // Soft delete - mark as deleted
    data.types[index] = {
      ...data.types[index],
      deleted: true,
    };

    // Write back to file
    await writeActivitiesFile(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete activity type:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity type' },
      { status: 500 }
    );
  }
}

