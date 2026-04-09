"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to help with debugging
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-foreground/60 text-sm mb-6">
          An unexpected error occurred. This may be a temporary issue — please
          try again.
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-lg bg-accent-primary text-background font-semibold text-sm hover:opacity-90 transition-smooth"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
