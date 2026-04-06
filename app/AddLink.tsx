"use client";

import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef, useEffect, useCallback } from "react";

interface Metadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  hostname?: string;
  siteName?: string;
  error?: string;
}

interface AddLinkProps {
  onClose: () => void;
}

export function AddLink({ onClose }: AddLinkProps) {
  const addLink = useMutation(api.links.addLink);
  const fetchMetadata = useAction(api.metadata.fetchUrlMetadata);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlInputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleFetchMetadata = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const fullUrl =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;

    setFetching(true);
    setMetadata(null);
    setImgError(false);
    try {
      const result = (await fetchMetadata({ url: fullUrl })) as Metadata;
      setMetadata(result);
      if (!result.error) {
        if (result.title && !title) setTitle(result.title);
        if (result.description && !description)
          setDescription(result.description);
      }
    } catch {
      setMetadata({ error: "Failed to fetch metadata" });
    } finally {
      setFetching(false);
    }
  }, [url, title, description, fetchMetadata]);

  const handleUrlBlur = () => {
    const trimmed = url.trim();
    if (trimmed && !metadata && !fetching) {
      handleFetchMetadata();
    }
  };

  const commitTag = () => {
    const tag = tagInput
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput("");
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    const trimmedUrl = url.trim();
    const fullUrl =
      trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")
        ? trimmedUrl
        : `https://${trimmedUrl}`;

    if (!fullUrl || !title.trim()) return;
    setSaving(true);
    try {
      await addLink({
        url: fullUrl,
        title: title.trim(),
        description: description.trim() || undefined,
        tags,
        image: metadata?.image,
        favicon: metadata?.favicon,
        hostname: metadata?.hostname,
        siteName: metadata?.siteName,
      });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleFetchMetadata();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full sm:max-w-lg bg-gray-900 border border-gray-700/50 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-slide-up">
        {/* Drag indicator (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">
              Save New Link
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800/80 flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
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
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* URL */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
              URL
            </label>
            <div className="flex gap-2">
              <input
                ref={urlInputRef}
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  const nextUrl = e.target.value;
                  setUrl(nextUrl);
                  if (nextUrl !== url) {
                    setMetadata(null);
                    setImgError(false);
                  }
                }}
                onBlur={handleUrlBlur}
                onKeyDown={handleUrlKeyDown}
                className="flex-1 px-3.5 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 text-sm transition-all"
              />
              <button
                onClick={handleFetchMetadata}
                disabled={!url.trim() || fetching}
                className="px-3.5 py-2.5 rounded-xl bg-violet-600/20 border border-violet-600/30 text-violet-400 text-sm font-medium hover:bg-violet-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {fetching ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                <span className="hidden sm:inline">
                  {fetching ? "Fetching…" : "Preview"}
                </span>
              </button>
            </div>
          </div>

          {/* Metadata preview card */}
          {metadata && !metadata.error && (
            <div className="rounded-xl overflow-hidden border border-gray-700/50 bg-gray-800/40">
              {metadata.image && !imgError && (
                <div className="aspect-video">
                  <img
                    src={metadata.image}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                </div>
              )}
              <div className="px-3 py-2 flex items-center gap-2">
                {metadata.favicon && (
                  <img
                    src={metadata.favicon}
                    alt=""
                    className="w-4 h-4 rounded-sm"
                    onError={() => {}}
                  />
                )}
                <span className="text-xs text-gray-500">
                  {metadata.hostname}
                </span>
                <span className="ml-auto text-xs text-green-500 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Preview loaded
                </span>
              </div>
            </div>
          )}

          {metadata?.error && (
            <div className="flex items-start gap-2 text-sm text-amber-400/90 bg-amber-950/30 border border-amber-800/30 rounded-xl px-3.5 py-2.5">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Could not load preview — you can still fill in the details
                manually.
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
              Title
            </label>
            <input
              type="text"
              placeholder="My awesome link"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 text-sm transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
              Description{" "}
              <span className="normal-case text-gray-600">(optional)</span>
            </label>
            <textarea
              placeholder="What's this link about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 text-sm resize-none transition-all"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
              Tags{" "}
              <span className="normal-case text-gray-600">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 px-2.5 py-2 bg-gray-800/70 border border-gray-700/50 rounded-xl min-h-[44px] focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all cursor-text">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 bg-violet-950/60 text-violet-400 border border-violet-800/40 rounded-full text-xs"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    className="text-violet-600 hover:text-violet-300 transition-colors"
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
                type="text"
                placeholder={tags.length === 0 ? "design, tools, ai…" : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={commitTag}
                className="flex-1 min-w-20 bg-transparent text-gray-100 placeholder-gray-600 outline-none text-sm py-0.5"
              />
            </div>
            <p className="text-xs text-gray-700 mt-1">
              Press Enter or comma to add a tag
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800/60 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700/50 text-gray-400 text-sm font-medium hover:bg-gray-800/50 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim() || !title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving…
              </span>
            ) : (
              "Save Link"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

