import { promises as fs } from "fs";
import path from "path";
import {
  ActivityCalendar,
  ActivityProvider,
} from "@/components/ActivityCalendar";
import { parseActivities } from "@/lib/activities";

async function getActivities() {
  const filePath = path.join(process.cwd(), "data", "activities.yaml");
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return parseActivities(content);
  } catch {
    // Return empty if file doesn't exist
    return {};
  }
}

export default async function Home() {
  const activities = await getActivities();

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Your Alcohol Rhythm
          </h2>
          <p className="text-muted-foreground">Track your daily drinking</p>
        </div>

        <ActivityProvider config={{ unit: "drink", pluralize: true }}>
          <ActivityCalendar activities={activities} />
        </ActivityProvider>
      </div>
    </main>
  );
}
