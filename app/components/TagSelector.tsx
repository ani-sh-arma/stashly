"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";

interface TagSelectorProps {
  selectedTags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  onCreateTag: (name: string) => Promise<string | null>;
  isVault?: boolean;
}

export function TagSelector({
  selectedTags,
  availableTags,
  onChange,
  onCreateTag,
  isVault,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizeTag = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

  const searchNorm = normalizeTag(search);

  const filtered = availableTags.filter(
    (t) => !selectedTags.includes(t) && t.includes(searchNorm),
  );

  const canCreate =
    searchNorm.length > 0 &&
    !availableTags.includes(searchNorm) &&
    !selectedTags.includes(searchNorm);

  const toggleTag = (tag: string) => {
    onChange(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag],
    );
    setSearch("");
    inputRef.current?.focus();
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    const created = await onCreateTag(searchNorm);
    if (created) {
      onChange([...selectedTags, created]);
    }
    setSearch("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (filtered.length > 0) {
        toggleTag(filtered[0]);
      } else if (canCreate) {
        handleCreate();
      }
    } else if (e.key === "Backspace" && !search && selectedTags.length > 0) {
      onChange(selectedTags.slice(0, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const accentCls = isVault
    ? "text-violet-400 bg-violet-500/15 border-violet-500/30 hover:bg-violet-500/25"
    : "text-accent-primary bg-accent-primary/15 border-accent-primary/30 hover:bg-accent-primary/25";
  const focusWithinCls = isVault
    ? "focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/20"
    : "focus-within:border-accent-primary/60 focus-within:ring-1 focus-within:ring-accent-primary/20";
  const tagOptionCls = isVault
    ? "text-violet-300"
    : "text-foreground/80";

  return (
    <div ref={containerRef} className="relative">
      {/* Input area */}
      <div
        className={`flex flex-wrap gap-1.5 px-3 py-2.5 bg-surface-secondary border border-border-primary rounded-lg min-h-11 transition-smooth cursor-text ${focusWithinCls}`}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className={`flex items-center gap-1 px-2 py-0.5 border rounded-md text-xs ${accentCls}`}
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(selectedTags.filter((t) => t !== tag));
              }}
              aria-label={`Remove tag #${tag}`}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          placeholder={selectedTags.length === 0 ? "Search or add tags…" : ""}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-24 bg-transparent text-foreground placeholder-foreground/40 outline-none text-sm py-0.5"
        />
      </div>

      {/* Dropdown */}
      {open && (filtered.length > 0 || canCreate) && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-primary border border-border-primary rounded-lg shadow-xl shadow-black/30 max-h-52 overflow-y-auto">
          {filtered.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleTag(tag);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-secondary transition-colors ${tagOptionCls}`}
            >
              <span className="text-foreground/60 text-xs">#</span>
              <span className="text-foreground">{tag}</span>
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-secondary transition-colors border-t border-border-primary"
            >
              <svg
                className="w-3.5 h-3.5 text-foreground/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-foreground/70">
                Add{" "}
                <span
                  className={
                    isVault ? "text-violet-400 font-medium" : "text-accent-primary font-medium"
                  }
                >
                  #{searchNorm}
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-foreground/50 mt-1">
        Type to search or create tags · Enter to select
      </p>
    </div>
  );
}
