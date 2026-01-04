import { promises as fs } from "fs";
import path from "path";
import {
  ActivityCalendar,
  ActivityProvider,
} from "@/components/ActivityCalendar";
import { parseYamlContent } from "@/lib/activities";
import { ActivityHeader } from "@/components/ActivityHeader";

async function getActivityData() {
  const filePath = path.join(process.cwd(), "data", "activities.yaml");
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return parseYamlContent(content);
  } catch {
    // Return empty if file doesn't exist
    return { types: {}, activities: {} };
  }
}

export default async function Home() {
  const { types, activities } = await getActivityData();

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        <ActivityProvider initialTypes={types} initialActivities={activities}>
          <ActivityHeader />
          <ActivityCalendar />
        </ActivityProvider>
      </div>
    </main>
  );
}
