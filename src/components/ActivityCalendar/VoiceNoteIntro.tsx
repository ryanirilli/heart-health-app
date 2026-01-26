import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

interface VoiceNoteIntroProps {
  onContinue: () => void;
}

export function VoiceNoteIntro({ onContinue }: VoiceNoteIntroProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
        <Mic className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-lg font-semibold tracking-tight">
          Capture your day with Voice Notes
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          Record a quick summary of your day.
          Rhythm Tracker will detect and track your activities for you.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        <Button onClick={onContinue} size="lg" className="w-full rounded-full">
          Get Started
        </Button>        
      </div>
    </div>
  );
}
