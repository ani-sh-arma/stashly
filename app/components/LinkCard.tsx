"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

interface LinkCardProps {
  id: Id<"links">;
  url: string;
  title: string;
  description?: string;
  image?: string;
  favicon?: string;
  hostname?: string;
  siteName?: string;
  tags: string[];
  createdAt: number;
}

function formatDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "now";
}

export function LinkCard({
  id,
  url,
  title,
  description,
  image,
  favicon,
  hostname,
  siteName,
  tags,
  createdAt,
}: LinkCardProps) {
  const deleteLink = useMutation(api.links.deleteLink);
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const domain =
    hostname ||
    (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    try {
      await deleteLink({ id });
    } catch {
      setDeleting(false);
    }
  };

  return (
    <article className="group relative bg-surface-primary border border-border-primary rounded-lg overflow-hidden transition-smooth hover:border-accent-primary/40 hover:shadow-lg hover:shadow-accent-primary/5 flex flex-col h-full">
      {/* Image / thumbnail */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block flex-shrink-0"
      >
        <div className="aspect-video bg-surface-secondary overflow-hidden relative">
          {image && !imgError ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-smooth group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-secondary to-surface-tertiary">
              <div className="w-12 h-12 rounded-lg bg-accent-primary/15 border border-accent-primary/20 flex items-center justify-center">
                {favicon && !faviconError ? (
                  <img
                    src={favicon}
                    alt={domain}
                    className="w-6 h-6"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <span className="text-lg font-bold text-accent-primary/50">
                    {(domain || title || "L")[0].toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </a>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        {/* Site info row */}
        <div className="flex items-center gap-2 mb-2">
          {favicon && !faviconError ? (
            <img
              src={favicon}
              alt={domain}
              className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <div className="w-3.5 h-3.5 rounded-sm bg-accent-primary/20 flex-shrink-0" />
          )}
          <span className="text-xs text-foreground/60 truncate font-medium">
            {siteName || domain}
          </span>
          <span className="ml-auto text-xs text-foreground/40 flex-shrink-0 whitespace-nowrap">
            {formatDate(createdAt)}
          </span>
        </div>

        {/* Title */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-1 hover:text-accent-primary transition-colors"
        >
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">
            {title}
          </h3>
        </a>

        {/* Description */}
        {description && (
          <p className="text-xs text-foreground/50 line-clamp-2 flex-1">
            {description}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-border-secondary">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/20 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 text-foreground/50">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Delete button (appears on hover/focus) */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Delete link"
        className="absolute top-2 right-2 w-7 h-7 rounded-md bg-surface-primary/80 border border-border-primary flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-red-950/30 hover:border-red-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 transition-smooth disabled:cursor-not-allowed"
      >
        {deleting ? (
          <svg
            className="w-3 h-3 text-foreground animate-spin"
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
            className="w-3 h-3 text-foreground/50 group-hover:text-red-400 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        )}
      </button>
    </article>
  );
}
