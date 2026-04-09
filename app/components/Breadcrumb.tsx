"use client";

import { Id } from "@/convex/_generated/dataModel";

interface BreadcrumbItem {
  _id: Id<"folders">;
  name: string;
}

interface BreadcrumbProps {
  path: BreadcrumbItem[];
  isVault?: boolean;
  onNavigate: (id: Id<"folders"> | null) => void;
}

export function Breadcrumb({ path, isVault, onNavigate }: BreadcrumbProps) {
  const rootLabel = isVault ? "Private Vault" : "Home";

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-none py-0.5">
      <button
        onClick={() => onNavigate(null)}
        className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md transition-smooth ${
          path.length === 0
            ? isVault
              ? "text-violet-300 font-semibold"
              : "text-foreground font-semibold"
            : "text-foreground/50 hover:text-foreground/80 hover:bg-surface-secondary"
        }`}
      >
        {isVault ? (
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )}
        <span>{rootLabel}</span>
      </button>

      {path.map((item, i) => (
        <div key={item._id} className="flex items-center gap-1 shrink-0">
          <svg className="w-3.5 h-3.5 text-foreground/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <button
            onClick={() => onNavigate(item._id)}
            className={`px-2 py-1 rounded-md transition-smooth ${
              i === path.length - 1
                ? isVault
                  ? "text-violet-300 font-semibold"
                  : "text-foreground font-semibold"
                : "text-foreground/50 hover:text-foreground/80 hover:bg-surface-secondary"
            }`}
          >
            {item.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
