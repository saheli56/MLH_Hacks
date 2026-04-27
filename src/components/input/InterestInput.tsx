"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface InterestInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function InterestInput({ value, onChange, disabled }: InterestInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="w-full">
      <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
        Contribution Interest
      </label>
      <div
        className={`relative flex items-center rounded-xl border transition-all duration-200 ${
          focused
            ? "border-accent/50 ring-1 ring-accent/20"
            : "border-border hover:border-border-hover"
        } bg-surface`}
      >
        <div className="flex items-center justify-center pl-4 pr-1">
          <Search className={`w-5 h-5 transition-colors duration-200 ${
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
          placeholder="What do you want to work on? e.g. Python ML libraries, React, CLI tools"
          className="flex-1 bg-transparent text-text-primary text-base py-3.5 px-3 outline-none placeholder:text-text-muted/50 disabled:opacity-50"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
