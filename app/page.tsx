"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useUser, UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { LinkCard } from "./components/LinkCard";
import { AddLink } from "./AddLink";

export default function Home() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAddLink, setShowAddLink] = useState(false);

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
    <main className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-accent-primary"
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
            <span className="text-lg font-bold text-foreground">Stashly</span>
          </div>

          {/* Right side: User button + Add link */}
          <div className="flex items-center gap-3">
            {/* Add link button */}
            <button
              onClick={() => setShowAddLink(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-900/30 active:scale-95"
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

            {/* User profile button */}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
          {/* Add link button */}
          <button
            onClick={() => setShowAddLink(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-background text-sm font-semibold hover:bg-accent-primary/90 transition-smooth active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Hero / Search section */}
      <section className="border-b border-border-primary py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {user?.firstName
              ? `${user.firstName}'s Link Collection`
              : "Your Link Collection"}
            </h1>
            <p className="text-foreground/60 text-sm">
              {links === undefined
                ? "Loading…"
                : links.length === 0 && !debouncedSearch && !selectedTag
                  ? "Save and organize your favorite links"
                  : `${links.length} link${links.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-foreground/40"
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
              placeholder="Search links…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-surface-primary border border-border-primary rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent-primary/60 focus:ring-1 focus:ring-accent-primary/20 transition-smooth text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-3 flex items-center text-foreground/40 hover:text-foreground/60 transition-colors"
                aria-label="Clear search"
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
            )}
          </div>
        </div>
      </section>

      {/* Tag filter pills */}
      {allTags && allTags.length > 0 && (
        <div className="border-b border-border-primary px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-xs text-foreground/50 shrink-0 font-medium">
              Filter:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-smooth ${
                !selectedTag
                  ? "bg-accent-primary text-background"
                  : "bg-surface-secondary text-foreground/60 hover:text-foreground/80"
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
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-smooth ${
                  selectedTag === tag
                    ? "bg-accent-primary text-background"
                    : "bg-surface-secondary text-foreground/60 hover:text-foreground/80"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Links grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading skeletons */}
        {links === undefined && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-secondary border border-border-primary rounded-lg overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-surface-tertiary" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-surface-tertiary rounded w-1/3" />
                  <div className="h-4 bg-surface-tertiary rounded w-4/5" />
                  <div className="h-3 bg-surface-tertiary rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty states */}
        {links !== undefined && links.length === 0 && (
          <div className="text-center py-20">
            {!debouncedSearch && !selectedTag ? (
              <>
                <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-surface-secondary border border-border-primary flex items-center justify-center">
                  <svg
                    className="w-7 h-7 text-foreground/30"
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
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No links yet
                </h3>
                <p className="text-foreground/60 mb-6 text-sm">
                  Start saving your favorite links
                </p>
                <button
                  onClick={() => setShowAddLink(true)}
                  className="px-5 py-2.5 rounded-lg bg-accent-primary text-background font-semibold hover:bg-accent-primary/90 transition-smooth"
                >
                  Add your first link
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-surface-secondary border border-border-primary flex items-center justify-center">
                  <svg
                    className="w-7 h-7 text-foreground/30"
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
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No results
                </h3>
                <p className="text-foreground/60 text-sm mb-5">
                  Try a different search or clear filters
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedTag(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-border-primary text-foreground/70 text-sm hover:bg-surface-secondary transition-smooth"
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
              <p className="text-xs text-foreground/50 mb-4 font-medium">
                {links.length} result{links.length !== 1 ? "s" : ""}
                {debouncedSearch && (
                  <>
                    {" "}
                    for{" "}
                    <span className="text-foreground/70">
                      &quot;{debouncedSearch}&quot;
                    </span>
                  </>
                )}
                {selectedTag && (
                  <>
                    {" "}
                    tagged{" "}
                    <span className="text-accent-primary">#{selectedTag}</span>
                  </>
                )}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

      {/* Add Link modal */}
      {showAddLink && <AddLink onClose={() => setShowAddLink(false)} />}
    </main>
  );
}

