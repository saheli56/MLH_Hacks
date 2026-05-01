"use client";

import { useState, useCallback } from "react";
import { GitFork, AlertCircle, Check } from "lucide-react";

interface RepoInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\/.*)?$/;
const REPO_PATH_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export function RepoInput({ value, onChange, disabled }: RepoInputProps) {
  const [focused, setFocused] = useState(false);

  const isValid = useCallback((val: string) => {
    if (!val.trim()) return null;
    const trimmed = val.trim();
    return URL_REGEX.test(trimmed) || REPO_PATH_REGEX.test(trimmed);
  }, []);

  const validity = isValid(value);

  return (
    <div className="w-full">
      <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
        Target repository (optional)
      </label>
      <div
        className={`relative flex items-center rounded-xl border transition-all duration-200 ${
          focused
            ? "border-accent/50 ring-1 ring-accent/20"
            : validity === false
              ? "border-error/50"
              : validity === true
                ? "border-success/30"
                : "border-border hover:border-border-hover"
        } bg-surface`}
      >
        <div className="flex items-center justify-center pl-4 pr-1">
          <GitFork className={`w-5 h-5 transition-colors duration-200 ${
            focused ? "text-accent" : "text-text-muted"
          }`} />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder="github.com/owner/repo or owner/repo"
          className="flex-1 bg-transparent text-text-primary text-base py-3.5 px-3 outline-none placeholder:text-text-muted/50 disabled:opacity-50"
          autoComplete="off"
          spellCheck={false}
        />
        {validity !== null && (
          <div className="pr-4">
            {validity ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <AlertCircle className="w-4 h-4 text-error" />
            )}
          </div>
        )}
      </div>
      {validity === false && value.trim() && (
        <p className="mt-1.5 text-xs text-error flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Enter a valid GitHub repository URL or owner/repo path
        </p>
      )}
    </div>
  );
}
