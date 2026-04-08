"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";

interface CreateFolderModalProps {
  parentId?: Id<"folders">;
  isVault?: boolean;
  onClose: () => void;
}

export function CreateFolderModal({ parentId, isVault, onClose }: CreateFolderModalProps) {
  const createFolder = useMutation(api.folders.createFolder);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createFolder({ name: name.trim(), parentId, isVault });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-primary border border-border-primary rounded-xl shadow-2xl shadow-black/40 p-6 animate-slide-up">
        <h2 className="text-base font-semibold text-foreground mb-4">New Folder</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 bg-surface-secondary border border-border-primary rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent-primary/60 focus:ring-1 focus:ring-accent-primary/20 text-sm transition-smooth"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border-primary text-foreground/70 text-sm font-medium hover:bg-surface-secondary transition-smooth"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 py-2 rounded-lg bg-accent-primary text-background text-sm font-semibold hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
