"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LinkCard } from "./components/LinkCard";
import { AddLink } from "./AddLink";

export default function Home() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAddLink, setShowAddLink] = useState(false);

  // Debounce search input to avoid querying on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const links = useQuery(api.links.getLinks, {
    search: debouncedSearch || undefined,
    tag: selectedTag ?? undefined,
  });
  const allTags = useQuery(api.links.getAllTags);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Stashly
            </span>
          </div>

          {/* Add link button */}
          <button
            onClick={() => setShowAddLink(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-900/30 active:scale-95"
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
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="hidden sm:inline">Add Link</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      {/* ── Hero / Search section ── */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800/40 py-10 px-4">
        <div className="max-w-2xl mx-auto text-center mb-7">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
            Your Link Collection
          </h1>
          <p className="text-gray-500 text-sm">
            {links === undefined
              ? "Loading…"
              : links.length === 0 && !debouncedSearch && !selectedTag
                ? "Start saving your favorite links"
                : `${links.length} saved link${links.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-2xl mx-auto relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="search"
            placeholder="Search by title, URL, description, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-gray-900/80 border border-gray-700/50 rounded-2xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-gray-300 transition-colors"
              aria-label="Clear search"
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
          )}
        </div>
      </section>

      {/* ── Tag filter pills ── */}
      {allTags && allTags.length > 0 && (
        <div className="bg-gray-950 border-b border-gray-800/30 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-xs text-gray-600 flex-shrink-0 mr-1">
              Filter:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !selectedTag
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-900/40"
                  : "bg-gray-800/60 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTag(selectedTag === tag ? null : tag)
                }
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedTag === tag
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-900/40"
                    : "bg-gray-800/60 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Links grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading skeletons */}
        {links === undefined && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-900/60 border border-gray-800/50 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-gray-800/80" />
                <div className="p-4 space-y-2.5">
                  <div className="h-3 bg-gray-800 rounded-full w-1/3" />
                  <div className="h-4 bg-gray-800 rounded-full w-4/5" />
                  <div className="h-3 bg-gray-800 rounded-full w-full" />
                  <div className="h-3 bg-gray-800 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty states */}
        {links !== undefined && links.length === 0 && (
          <div className="text-center py-24">
            {!debouncedSearch && !selectedTag ? (
              <>
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-400 mb-2">
                  No links yet
                </h3>
                <p className="text-gray-600 mb-7 text-sm">
                  Save your first link to get started!
                </p>
                <button
                  onClick={() => setShowAddLink(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-900/30"
                >
                  Add your first link
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-400 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 text-sm">
                  Try a different search term or clear your filters
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedTag(null);
                  }}
                  className="mt-5 px-4 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:bg-gray-800 transition-colors"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        )}

        {/* Grid */}
        {links !== undefined && links.length > 0 && (
          <>
            {(debouncedSearch || selectedTag) && (
              <p className="text-xs text-gray-600 mb-4">
                {links.length} result
                {links.length !== 1 ? "s" : ""}
                {debouncedSearch && (
                  <>
                    {" "}
                    for &ldquo;
                    <span className="text-gray-400">{debouncedSearch}</span>
                    &rdquo;
                  </>
                )}
                {selectedTag && (
                  <>
                    {" "}
                    tagged{" "}
                    <span className="text-violet-400">#{selectedTag}</span>
                  </>
                )}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {links.map((link) => (
                <LinkCard
                  key={link._id}
                  id={link._id}
                  url={link.url}
                  title={link.title}
                  description={link.description}
                  image={link.image}
                  favicon={link.favicon}
                  hostname={link.hostname}
                  siteName={link.siteName}
                  tags={link.tags}
                  createdAt={link.createdAt}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Add Link modal ── */}
      {showAddLink && <AddLink onClose={() => setShowAddLink(false)} />}
    </main>
  );
}

