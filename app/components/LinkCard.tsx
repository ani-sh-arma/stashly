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
      year: "numeric",
    });
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
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
    <article className="group relative bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl overflow-hidden hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-950/40 transition-all duration-300 flex flex-col">
      {/* Image / thumbnail */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block shrink-0"
      >
        <div className="aspect-video bg-linear-to-br from-gray-800 to-gray-900 overflow-hidden">
          {image && !imgError ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-violet-600/20 to-indigo-600/20 border border-violet-700/20 flex items-center justify-center">
                {favicon && !faviconError ? (
                  <img
                    src={favicon}
                    alt={domain}
                    className="w-8 h-8"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <span className="text-2xl font-bold text-violet-400/50">
                    {(domain || title || "L")[0].toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </a>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Site info row */}
        <div className="flex items-center gap-2 mb-2">
          {favicon && !faviconError ? (
            <img
              src={favicon}
              alt={domain}
              className="w-4 h-4 rounded-sm shrink-0"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <div className="w-4 h-4 rounded-sm bg-violet-700/30 shrink-0" />
          )}
          <span className="text-xs text-gray-500 truncate">
            {siteName || domain}
          </span>
          <span className="ml-auto text-xs text-gray-600 shrink-0">
            {formatDate(createdAt)}
          </span>
        </div>

        {/* Title */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-1 hover:text-violet-300 transition-colors"
        >
          <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 leading-snug">
            {title}
          </h3>
        </a>

        {/* Description */}
        {description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mt-1 flex-1">
            {description}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-violet-950/60 text-violet-400 border border-violet-800/30 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Delete button (appears on hover/focus) */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Delete link"
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-900/80 border border-gray-700/50 flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-red-950/80 hover:border-red-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 transition-all duration-200 disabled:cursor-not-allowed"
      >
        {deleting ? (
          <svg
            className="w-3 h-3 text-gray-400 animate-spin"
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
            className="w-3 h-3 text-gray-500 group-hover:text-red-400"
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
