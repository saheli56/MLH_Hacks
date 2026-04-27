"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  variant?: "default" | "large";
}

export function CopyButton({ text, label, className = "", variant = "default" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  if (variant === "large") {
    return (
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
          copied
            ? "bg-success/15 text-success border border-success/30"
            : "bg-accent hover:bg-accent-hover text-white"
        } ${className}`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            {label || "Copy"}
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
        copied
          ? "bg-success/15 text-success"
          : "bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-border"
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {label || "Copy"}
        </>
      )}
    </button>
  );
}
