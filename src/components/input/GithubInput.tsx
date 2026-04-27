"use client";

import { useState, useCallback } from "react";
import { AlertCircle, Check } from "lucide-react";
import { GitHubIcon } from "@/components/shared/GitHubIcon";

interface GithubInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)\/?$/;
const USERNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

export function GithubInput({ value, onChange, disabled }: GithubInputProps) {
  const [focused, setFocused] = useState(false);

  const isValid = useCallback((val: string) => {
    if (!val.trim()) return null;
    return URL_REGEX.test(val.trim()) || USERNAME_REGEX.test(val.trim());
  }, []);

  const validity = isValid(value);

  return (
    <div className="w-full">
      <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
        GitHub Profile
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
          <GitHubIcon className={`w-5 h-5 transition-colors duration-200 ${
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
          placeholder="github.com/username"
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
          Enter a valid GitHub URL or username
        </p>
      )}
    </div>
  );
}
