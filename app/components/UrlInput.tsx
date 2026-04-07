"use client";

import { useRef, useState, useCallback } from "react";

interface UrlInputProps {
  onUrlsAdded: (urls: string[]) => void;
  isLoading?: boolean;
}

export function UrlInput({ onUrlsAdded, isLoading = false }: UrlInputProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parseUrls = (text: string): string[] => {
    // Match URLs and also text that looks like URLs (e.g., "example.com")
    const urlPattern = /(https?:\/\/[^\s]+|(?:www\.)?[\w-]+\.[\w-]+(?:\.[\w-]+)?(?:\/[^\s]*)?)/gi;
    const matches = text.match(urlPattern) || [];
    
    // Filter unique URLs and normalize them
    const uniqueUrls = Array.from(new Set(
      matches.map((url) => {
        const trimmed = url.trim();
        // Add https:// if no protocol
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
          return `https://${trimmed}`;
        }
        return trimmed;
      })
    ));

    return uniqueUrls;
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    const newUrls = parseUrls(pastedText);
    
    if (newUrls.length > 0) {
      e.preventDefault();
      // Add new URLs to the list
      setUrls((prev) => {
        const combined = [...prev, ...newUrls];
        return Array.from(new Set(combined)); // Remove duplicates
      });
      setInputValue("");
      // Auto-trigger adding
      setTimeout(() => {
        onUrlsAdded(newUrls);
      }, 0);
    }
  }, [onUrlsAdded]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const newUrls = parseUrls(inputValue);
      if (newUrls.length > 0) {
        setUrls((prev) => {
          const combined = [...prev, ...newUrls];
          return Array.from(new Set(combined));
        });
        onUrlsAdded(newUrls);
        setInputValue("");
      }
    }
  };

  const removeUrl = (urlToRemove: string) => {
    setUrls((prev) => prev.filter((u) => u !== urlToRemove));
  };

  const handleAddUrls = () => {
    const newUrls = parseUrls(inputValue);
    if (newUrls.length > 0) {
      setUrls((prev) => {
        const combined = [...prev, ...newUrls];
        return Array.from(new Set(combined));
      });
      onUrlsAdded(newUrls);
      setInputValue("");
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* URL Input */}
      <div>
        <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-2 block">
          Add URLs
        </label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Paste or type URLs... (one per line or all at once)"
            className="w-full px-4 py-3 bg-surface-secondary border border-border-primary rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 resize-none text-sm transition-smooth"
            rows={3}
            disabled={isLoading}
          />
          {inputValue && (
            <button
              onClick={() => setInputValue("")}
              className="absolute top-3 right-3 text-foreground/40 hover:text-foreground/60 transition-colors"
              aria-label="Clear input"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-foreground/50 mt-1.5">
          Press Enter to add, Shift+Enter for new line, or paste multiple URLs
        </p>
      </div>

      {/* URLs preview/list */}
      {urls.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-2">
            {urls.length} URL{urls.length !== 1 ? "s" : ""} to add
          </p>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {urls.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-primary/10 border border-accent-primary/30 rounded-md text-xs text-accent-primary truncate"
              >
                <span className="truncate max-w-xs">{url.replace(/^https?:\/\//, "")}</span>
                <button
                  onClick={() => removeUrl(url)}
                  className="flex-shrink-0 text-accent-primary/60 hover:text-accent-primary transition-colors"
                  aria-label={`Remove ${url}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add button */}
      {inputValue.trim() && (
        <button
          onClick={handleAddUrls}
          disabled={isLoading}
          className="w-full px-4 py-2.5 bg-accent-primary text-background font-semibold rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Adding...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add URL{urls.length > 1 ? "s" : ""}
            </>
          )}
        </button>
      )}
    </div>
  );
}
