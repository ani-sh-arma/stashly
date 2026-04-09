"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { LinkCard } from "./components/LinkCard";
import { FolderCard } from "./components/FolderCard";
import { AddLink } from "./AddLink";
import { CreateFolderModal } from "./components/CreateFolderModal";
import { VaultModal } from "./components/VaultModal";
import { Breadcrumb } from "./components/Breadcrumb";
import { clerkUserButtonAppearance } from "./clerkAppearance";

export default function Home() {
  // --- Navigation state ---
  const [currentFolderId, setCurrentFolderId] = useState<Id<"folders"> | null>(null);
  const [isVaultMode, setIsVaultMode] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultToken, setVaultToken] = useState<string | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultModalMode, setVaultModalMode] = useState<"setup" | "unlock">("unlock");

  // --- Search + filter state ---
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchRecursive, setSearchRecursive] = useState(false);

  // --- UI modals ---
  const [showAddLink, setShowAddLink] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  // --- Convex mutations ---
  const invalidateVaultSession = useMutation(api.vault.invalidateVaultSession);

  // --- Debounce search ---
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Reset tag + search when navigating
  useEffect(() => {
    setSelectedTag(null);
    setSearch("");
  }, [currentFolderId, isVaultMode]);

  // --- Convex queries ---
  const hasVault = useQuery(api.vault.hasVault);

  const folders = useQuery(api.folders.getFolders, {
    parentId: currentFolderId ?? undefined,
    isVault: isVaultMode,
    vaultToken: isVaultMode ? (vaultToken ?? undefined) : undefined,
  });

  const links = useQuery(api.links.getLinks, {
    search: debouncedSearch || undefined,
    tag: selectedTag ?? undefined,
    folderId: currentFolderId ?? undefined,
    recursive: searchRecursive,
    isVault: isVaultMode,
    vaultToken: isVaultMode ? (vaultToken ?? undefined) : undefined,
  });

  const allTags = useQuery(api.links.getAllTags, {
    folderId: currentFolderId ?? undefined,
    recursive: searchRecursive,
    isVault: isVaultMode,
    vaultToken: isVaultMode ? (vaultToken ?? undefined) : undefined,
  });

  const folderPath = useQuery(
    api.folders.getFolderPath,
    currentFolderId
      ? {
          id: currentFolderId,
          vaultToken: isVaultMode ? (vaultToken ?? undefined) : undefined,
        }
      : "skip",
  );

  // --- Vault helpers ---
  const exitVault = () => {
    if (vaultToken) {
      invalidateVaultSession({ token: vaultToken }).catch(() => {});
    }
    setIsVaultMode(false);
    setCurrentFolderId(null);
    setVaultUnlocked(false);
    setVaultToken(null);
  };

  const handleVaultButtonClick = () => {
    if (hasVault === undefined) return; // still loading
    if (isVaultMode) {
      exitVault();
      return;
    }
    if (hasVault === false) {
      setVaultModalMode("setup");
      setShowVaultModal(true);
    } else if (!vaultUnlocked) {
      setVaultModalMode("unlock");
      setShowVaultModal(true);
    } else {
      setIsVaultMode(true);
      setCurrentFolderId(null);
    }
  };

  const handleVaultUnlocked = (token: string) => {
    setVaultToken(token);
    setShowVaultModal(false);
    setVaultUnlocked(true);
    setIsVaultMode(true);
    setCurrentFolderId(null);
  };

  const handleFolderOpen = (id: Id<"folders">) => {
    setCurrentFolderId(id);
    setSelectedTag(null);
    setSearch("");
  };

  const handleBreadcrumbNavigate = (id: Id<"folders"> | null) => {
    setCurrentFolderId(id);
    setSelectedTag(null);
    setSearch("");
  };

  const isLoading = links === undefined || folders === undefined;
  const pathItems = folderPath ?? [];

  return (
    <main className={`min-h-screen ${isVaultMode ? "bg-[#0d0d12]" : "bg-background"}`}>
      {/* Sticky header */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b ${
          isVaultMode
            ? "bg-[#0d0d12]/95 border-violet-900/30"
            : "bg-background/95 border-border-primary"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isVaultMode
                  ? "bg-violet-500/20 border border-violet-500/40"
                  : "bg-accent-primary/20 border border-accent-primary/40"
              }`}
            >
              <svg
                className={`w-4 h-4 ${isVaultMode ? "text-violet-400" : "text-accent-primary"}`}
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

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* New Folder button */}
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary text-foreground/60 border border-border-primary text-xs font-semibold hover:bg-surface-tertiary hover:text-foreground/80 transition-smooth"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">New Folder</span>
            </button>

            {/* Add Link button */}
            <button
              onClick={() => setShowAddLink(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all duration-200 shadow-lg active:scale-95 ${
                isVaultMode
                  ? "bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-900/30"
                  : "bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-900/30"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Link</span>
              <span className="sm:hidden">Add</span>
            </button>

            <UserButton appearance={clerkUserButtonAppearance} />
          </div>
        </div>

        {/* Tab bar — Normal / Private Vault */}
        <div
          className={`border-t ${
            isVaultMode ? "border-violet-900/30" : "border-border-primary"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-0">
            {/* My Links tab */}
            <button
              onClick={() => {
                if (isVaultMode) {
                  exitVault();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-smooth ${
                !isVaultMode
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-foreground/50 hover:text-foreground/80"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              My Links
            </button>

            {/* Private Vault tab */}
            <button
              onClick={handleVaultButtonClick}
              disabled={hasVault === undefined}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed ${
                isVaultMode
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-foreground/50 hover:text-foreground/80"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isVaultMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                )}
              </svg>
              Private Vault
            </button>
          </div>
        </div>
      </header>

      {/* Vault info banner */}
      {isVaultMode && (
        <div className="bg-violet-950/30 border-b border-violet-900/30 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-violet-300/70">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Private Vault — contents are hidden from global search
          </div>
        </div>
      )}

      {/* Search section */}
      <section
        className={`border-b py-6 px-4 ${
          isVaultMode ? "border-violet-900/30" : "border-border-primary"
        }`}
      >
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Breadcrumb */}
          <Breadcrumb
            path={pathItems}
            isVault={isVaultMode}
            onNavigate={handleBreadcrumbNavigate}
          />

          {/* Search row */}
          <div className="flex gap-2">
            {/* Search input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="search"
                placeholder={searchRecursive ? "Search all subfolders…" : "Search in this folder…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-9 py-2.5 bg-surface-primary border rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:ring-1 transition-smooth text-sm ${
                  isVaultMode
                    ? "border-violet-900/40 focus:border-violet-500/60 focus:ring-violet-500/20"
                    : "border-border-primary focus:border-accent-primary/60 focus:ring-accent-primary/20"
                }`}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-3 flex items-center text-foreground/40 hover:text-foreground/60 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Recursive search toggle */}
            <button
              onClick={() => setSearchRecursive(!searchRecursive)}
              title={searchRecursive ? "Searching all subfolders — click to search current folder only" : "Searching current folder — click to search all subfolders"}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-smooth ${
                searchRecursive
                  ? isVaultMode
                    ? "bg-violet-600/20 text-violet-300 border-violet-600/40"
                    : "bg-accent-primary/15 text-accent-primary border-accent-primary/30"
                  : "bg-surface-secondary text-foreground/50 border-border-primary hover:text-foreground/70"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
              </svg>
              <span className="hidden sm:inline">{searchRecursive ? "Recursive" : "This folder"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tag filter pills */}
      {allTags && allTags.length > 0 && (
        <div
          className={`border-b px-4 py-3 ${
            isVaultMode ? "border-violet-900/30" : "border-border-primary"
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-xs text-foreground/50 shrink-0 font-medium">Filter:</span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-smooth ${
                !selectedTag
                  ? isVaultMode
                    ? "bg-violet-500 text-white"
                    : "bg-accent-primary text-background"
                  : "bg-surface-secondary text-foreground/60 hover:text-foreground/80"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-smooth ${
                  selectedTag === tag
                    ? isVaultMode
                      ? "bg-violet-500 text-white"
                      : "bg-accent-primary text-background"
                    : "bg-surface-secondary text-foreground/60 hover:text-foreground/80"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-secondary border border-border-primary rounded-lg overflow-hidden animate-pulse">
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

        {!isLoading && (
          <>
            {/* Folders section */}
            {!debouncedSearch && !selectedTag && folders && folders.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-3">
                  Folders
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {folders.map((folder) => (
                    <FolderCard
                      key={folder._id}
                      id={folder._id}
                      name={folder.name}
                      isVault={isVaultMode}
                      vaultToken={isVaultMode ? (vaultToken ?? undefined) : undefined}
                      onOpen={handleFolderOpen}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Links section label */}
            {!debouncedSearch && !selectedTag && links && links.length > 0 && folders && folders.length > 0 && (
              <h2 className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mb-3">
                Links
              </h2>
            )}

            {/* Search/filter result count */}
            {links && links.length > 0 && (debouncedSearch || selectedTag) && (
              <p className="text-xs text-foreground/50 mb-4 font-medium">
                {links.length} result{links.length !== 1 ? "s" : ""}
                {debouncedSearch && (
                  <> for <span className="text-foreground/70">&quot;{debouncedSearch}&quot;</span></>
                )}
                {selectedTag && (
                  <> tagged <span className={isVaultMode ? "text-violet-400" : "text-accent-primary"}>#{selectedTag}</span></>
                )}
                {searchRecursive && <span className="text-foreground/40"> (all subfolders)</span>}
              </p>
            )}

            {/* Links grid */}
            {links && links.length > 0 && (
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
            )}

            {/* Empty state */}
            {(!folders || folders.length === 0) && (!links || links.length === 0) && (
              <div className="text-center py-20">
                {!debouncedSearch && !selectedTag ? (
                  <>
                    <div
                      className={`w-14 h-14 mx-auto mb-4 rounded-lg border flex items-center justify-center ${
                        isVaultMode
                          ? "bg-violet-950/20 border-violet-800/30"
                          : "bg-surface-secondary border-border-primary"
                      }`}
                    >
                      {isVaultMode ? (
                        <svg className="w-7 h-7 text-violet-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {isVaultMode ? "Vault is empty" : currentFolderId ? "Folder is empty" : "No links yet"}
                    </h3>
                    <p className="text-foreground/60 mb-6 text-sm">
                      {isVaultMode
                        ? "Add private links and folders to your vault"
                        : currentFolderId
                          ? "Add links or create sub-folders here"
                          : "Start saving your favorite links"}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setShowAddLink(true)}
                        className={`px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-smooth ${
                          isVaultMode
                            ? "bg-violet-600 text-white"
                            : "bg-accent-primary text-background"
                        }`}
                      >
                        Add {isVaultMode ? "private link" : "your first link"}
                      </button>
                      <button
                        onClick={() => setShowCreateFolder(true)}
                        className="px-5 py-2.5 rounded-lg border border-border-primary text-foreground/70 font-semibold text-sm hover:bg-surface-secondary transition-smooth"
                      >
                        New Folder
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-surface-secondary border border-border-primary flex items-center justify-center">
                      <svg className="w-7 h-7 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No results</h3>
                    <p className="text-foreground/60 text-sm mb-5">
                      Try a different search or clear filters
                      {!searchRecursive && " (or enable recursive search to include subfolders)"}
                    </p>
                    <button
                      onClick={() => { setSearch(""); setSelectedTag(null); }}
                      className="px-4 py-2 rounded-lg border border-border-primary text-foreground/70 text-sm hover:bg-surface-secondary transition-smooth"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showAddLink && (
        <AddLink
          onClose={() => setShowAddLink(false)}
          folderId={currentFolderId ?? undefined}
          isVault={isVaultMode}
          vaultToken={isVaultMode ? (vaultToken ?? undefined) : undefined}
        />
      )}

      {showCreateFolder && (
        <CreateFolderModal
          parentId={currentFolderId ?? undefined}
          isVault={isVaultMode}
          vaultToken={isVaultMode ? (vaultToken ?? undefined) : undefined}
          onClose={() => setShowCreateFolder(false)}
        />
      )}

      {showVaultModal && (
        <VaultModal
          mode={vaultModalMode}
          onUnlocked={handleVaultUnlocked}
          onClose={() => setShowVaultModal(false)}
        />
      )}
    </main>
  );
}
