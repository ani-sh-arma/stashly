"use client";

import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback } from "react";
import { UrlInput } from "./components/UrlInput";
import { TagSelector } from "./components/TagSelector";

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
  folderId?: Id<"folders">;
  isVault?: boolean;
  vaultToken?: string;
}

interface LinkInput {
  url: string;
  title?: string;
  description?: string;
}

export function AddLink({ onClose, folderId, isVault, vaultToken }: AddLinkProps) {
  const addLink = useMutation(api.links.addLink);
  const fetchMetadata = useAction(api.metadata.fetchUrlMetadata);
  const createTag = useMutation(api.tags.createTag);
  const userTags = useQuery(api.tags.getUserTags, {
    isVault,
    vaultToken: isVault ? vaultToken : undefined,
  }) ?? [];

  const [linksToAdd, setLinksToAdd] = useState<LinkInput[]>([]);
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Fetch metadata when a new link is focused
  useEffect(() => {
    if (linksToAdd.length > 0 && currentLinkIndex < linksToAdd.length) {
      const currentLink = linksToAdd[currentLinkIndex];
      if (!metadata && !fetching) {
        handleFetchMetadata(currentLink.url);
      }
    }
  }, [currentLinkIndex, linksToAdd]);

  /** Common multi-part TLD suffixes that should not be treated as the SLD. */
  const MULTI_PART_TLDS = new Set([
    "co.uk", "co.jp", "co.in", "co.nz", "co.za", "co.kr", "co.id",
    "com.au", "com.br", "com.mx", "com.sg", "com.hk", "com.tw",
    "org.uk", "net.au", "gov.uk", "gov.au",
  ]);

  /** Extract a clean domain tag from a hostname string.
   *  e.g. "www.github.com" → "github"  |  "bbc.co.uk" → "bbc" */
  const domainTagFromHostname = (hostname: string): string => {
    const h = hostname.replace(/^www\./, "").toLowerCase();
    const parts = h.split(".");
    if (parts.length >= 3) {
      const lastTwo = parts.slice(-2).join(".");
      if (MULTI_PART_TLDS.has(lastTwo)) {
        // e.g. bbc.co.uk → "bbc"
        return parts[parts.length - 3].replace(/[^a-z0-9-]/g, "");
      }
    }
    // Standard: use the second-to-last segment (the SLD)
    return parts.length >= 2
      ? parts[parts.length - 2].replace(/[^a-z0-9-]/g, "")
      : parts[0].replace(/[^a-z0-9-]/g, "");
  };

  const handleFetchMetadata = useCallback(
    async (urlToFetch: string) => {
      const trimmed = urlToFetch.trim();
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

          // Auto-add domain tag
          if (result.hostname) {
            const domainTag = domainTagFromHostname(result.hostname);
            if (domainTag) {
              setTags((prev) =>
                prev.includes(domainTag) ? prev : [...prev, domainTag],
              );
            }
          }
        }
      } catch {
        setMetadata({ error: "Failed to fetch metadata" });
      } finally {
        setFetching(false);
      }
    },
    [title, description, fetchMetadata]
  );

  const handleUrlsAdded = (urls: string[]) => {
    const newLinks = urls.map((url) => ({ url, title: "", description: "" }));
    setLinksToAdd((prev) => [...prev, ...newLinks]);
    if (linksToAdd.length === 0) {
      setCurrentLinkIndex(0);
    }
  };

  const handleCreateTag = async (name: string): Promise<string | null> => {
    try {
      return await createTag({
        name,
        isVault,
        vaultToken: isVault ? vaultToken : undefined,
      });
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (linksToAdd.length === 0) return;

    const currentLink = linksToAdd[currentLinkIndex];
    setSaving(true);

    try {
      const fullUrl = currentLink.url.startsWith("http://") ||
        currentLink.url.startsWith("https://")
        ? currentLink.url
        : `https://${currentLink.url}`;

      await addLink({
        url: fullUrl,
        title: title.trim() || currentLink.title || metadata?.title || "Saved Link",
        description:
          description.trim() ||
          currentLink.description ||
          metadata?.description ||
          undefined,
        tags,
        image: metadata?.image,
        favicon: metadata?.favicon,
        hostname: metadata?.hostname,
        siteName: metadata?.siteName,
        folderId,
        isVault,
        vaultToken,
      });

      // Move to next link — keep tags so users don't re-enter them for related links
      if (currentLinkIndex < linksToAdd.length - 1) {
        setCurrentLinkIndex(currentLinkIndex + 1);
        setTitle("");
        setDescription("");
        setMetadata(null);
        setImgError(false);
      } else {
        // All links saved
        onClose();
      }
    } catch {
      setSaving(false);
    }
  };

  const currentLink = linksToAdd[currentLinkIndex];
  const isMultipleLinks = linksToAdd.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full sm:max-w-lg bg-surface-primary border border-border-primary rounded-t-2xl sm:rounded-lg shadow-2xl shadow-black/40 overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {/* Drag indicator (mobile) */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border-primary" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-3 border-b border-border-primary flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-accent-primary"
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
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {linksToAdd.length > 0
                  ? `Save Link ${currentLinkIndex + 1} of ${linksToAdd.length}`
                  : "Add Links"}
              </h2>
              {isMultipleLinks && (
                <p className="text-xs text-foreground/50">
                  {linksToAdd.length} {linksToAdd.length === 1 ? "link" : "links"} total
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-surface-secondary flex items-center justify-center text-foreground/50 hover:bg-surface-tertiary hover:text-foreground transition-smooth"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {/* URL Input - only show when no links added yet */}
            {linksToAdd.length === 0 && (
              <UrlInput onUrlsAdded={handleUrlsAdded} isLoading={fetching} />
            )}

            {/* Current link details form */}
            {currentLink && (
              <>
                {/* URL Display */}
                <div>
                  <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-1.5 block">
                    URL
                  </label>
                  <div className="px-3 py-2.5 bg-surface-secondary border border-border-primary rounded-lg text-foreground/60 text-sm truncate">
                    {currentLink.url}
                  </div>
                </div>

                {/* Metadata preview card */}
                {metadata && !metadata.error && (
                  <div className="rounded-lg overflow-hidden border border-border-primary bg-surface-secondary">
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
                    <div className="px-3 py-2 flex items-center gap-2 text-xs">
                      {metadata.favicon && (
                        <img
                          src={metadata.favicon}
                          alt=""
                          className="w-4 h-4 rounded-sm"
                        />
                      )}
                      <span className="text-foreground/60">
                        {metadata.hostname}
                      </span>
                      <span className="ml-auto text-accent-primary flex items-center gap-1">
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
                        Loaded
                      </span>
                    </div>
                  </div>
                )}

                {metadata?.error && (
                  <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/20 border border-amber-800/30 rounded-lg px-3 py-2.5">
                    <svg
                      className="w-4 h-4 mt-0.5 shrink-0"
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
                      Could not load preview — fill in details manually.
                    </span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-1.5 block">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder={metadata?.title || "Link title"}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-secondary border border-border-primary rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent-primary/60 focus:ring-1 focus:ring-accent-primary/20 text-sm transition-smooth"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-1.5 block">
                    Description{" "}
                    <span className="normal-case text-foreground/50">(optional)</span>
                  </label>
                  <textarea
                    placeholder={metadata?.description || "Add a description..."}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-surface-secondary border border-border-primary rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent-primary/60 focus:ring-1 focus:ring-accent-primary/20 text-sm resize-none transition-smooth"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-1.5 block">
                    Tags{" "}
                    <span className="normal-case text-foreground/50">(optional)</span>
                  </label>
                  <TagSelector
                    selectedTags={tags}
                    availableTags={userTags}
                    onChange={setTags}
                    onCreateTag={handleCreateTag}
                    isVault={isVault}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-primary flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border-primary text-foreground/70 text-sm font-medium hover:bg-surface-secondary transition-smooth"
          >
            {linksToAdd.length > 0 ? "Cancel" : "Close"}
          </button>
          {linksToAdd.length > 0 && (
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="flex-1 py-2 rounded-lg bg-accent-primary text-background text-sm font-semibold hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
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
                  Saving...
                </>
              ) : (
                <>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {currentLinkIndex === linksToAdd.length - 1
                    ? "Save & Done"
                    : "Save & Next"}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
