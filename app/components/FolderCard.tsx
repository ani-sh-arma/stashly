"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

interface FolderCardProps {
  id: Id<"folders">;
  name: string;
  isVault?: boolean;
  onOpen: (id: Id<"folders">) => void;
  onRenamed?: () => void;
}

export function FolderCard({ id, name, isVault, onOpen, onRenamed }: FolderCardProps) {
  const deleteFolder = useMutation(api.folders.deleteFolder);
  const renameFolder = useMutation(api.folders.renameFolder);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const [renameError, setRenameError] = useState("");

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete folder "${name}" and all its contents?`)) return;
    setDeleting(true);
    try {
      await deleteFolder({ id });
    } catch {
      setDeleting(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    setRenameError("");
    try {
      await renameFolder({ id, name: renameValue.trim() });
      setRenaming(false);
      onRenamed?.();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Rename failed");
    }
  };

  return (
    <article
      className={`group relative border rounded-lg overflow-hidden transition-smooth hover:shadow-lg flex flex-col cursor-pointer select-none ${
        isVault
          ? "bg-violet-950/20 border-violet-800/30 hover:border-violet-600/50 hover:shadow-violet-900/20"
          : "bg-surface-primary border-border-primary hover:border-accent-primary/40 hover:shadow-accent-primary/5"
      }`}
      onClick={() => !renaming && onOpen(id)}
    >
      <div className="p-4 flex items-center gap-3">
        {/* Folder icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isVault
              ? "bg-violet-500/20 border border-violet-500/30"
              : "bg-accent-primary/15 border border-accent-primary/20"
          }`}
        >
          <svg
            className={`w-5 h-5 ${isVault ? "text-violet-400" : "text-accent-primary"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
            />
          </svg>
        </div>

        {renaming ? (
          <form
            onSubmit={handleRename}
            className="flex-1 flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => { setRenameValue(e.target.value); setRenameError(""); }}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === "Escape") { setRenaming(false); setRenameError(""); } }}
              className={`w-full px-2 py-1 bg-surface-secondary border rounded text-sm text-foreground focus:outline-none focus:border-accent-primary/60 ${renameError ? "border-red-500/60" : "border-border-primary"}`}
            />
            {renameError && (
              <span className="text-xs text-red-400">{renameError}</span>
            )}
          </form>
        ) : (
          <span className="text-sm font-semibold text-foreground truncate flex-1">
            {name}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div
        className="absolute top-2 right-2 flex gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-smooth"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => { setRenaming(true); setRenameValue(name); }}
          aria-label="Rename folder"
          className="w-6 h-6 rounded bg-surface-primary/80 border border-border-primary flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-surface-secondary transition-smooth"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete folder"
          className="w-6 h-6 rounded bg-surface-primary/80 border border-border-primary flex items-center justify-center text-foreground/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-950/30 transition-smooth disabled:cursor-not-allowed"
        >
          {deleting ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
    </article>
  );
}
