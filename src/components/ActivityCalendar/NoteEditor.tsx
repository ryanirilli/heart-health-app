'use client';

import { Button } from '@/components/ui/button';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const MAX_NOTE_LENGTH = 500;

interface NoteEditorContentProps {
  noteText: string;
  onNoteChange: (text: string) => void;
}

/**
 * Shared note editor textarea component.
 * Used by DayView and ActivityEntryDialog.
 */
export function NoteEditorContent({ noteText, onNoteChange }: NoteEditorContentProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          data-vaul-no-drag
          value={noteText}
          onChange={(e) => {
            if (e.target.value.length <= MAX_NOTE_LENGTH) {
              onNoteChange(e.target.value);
            }
          }}
          placeholder="Add a note for this day..."
          className="note-editor-textarea w-full min-h-[120px] p-3 text-base sm:text-sm rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          autoFocus
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {noteText.length}/{MAX_NOTE_LENGTH}
        </div>
      </div>
    </div>
  );
}

interface NoteEditorFooterProps {
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
  hasExistingNote: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
}

/**
 * Shared note editor footer with Back, Delete, and Save buttons.
 * Used by DayView and ActivityEntryDialog.
 */
export function NoteEditorFooter({
  onCancel,
  onSave,
  onDelete,
  hasExistingNote,
  isSaving = false,
  isDeleting = false,
}: NoteEditorFooterProps) {
  const isPending = isSaving || isDeleting;



  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={isPending}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <div className="flex items-center gap-2">
        {hasExistingNote && onDelete && (
          <ConfirmDeleteButton
            onDelete={onDelete}
            disabled={isSaving}
            isDeleting={isDeleting}
          />
        )}
        <Button
          size="pill"
          onClick={onSave}
          disabled={isPending}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}
