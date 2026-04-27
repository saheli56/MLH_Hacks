"use client";

import { motion } from "framer-motion";
import type { ViewMode } from "@/lib/types";
import { Eye, Cpu } from "lucide-react";

interface ModeToggleProps {
  mode: ViewMode;
  onToggle: (mode: ViewMode) => void;
}

export function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  return (
    <div className="relative flex items-center bg-surface rounded-lg border border-border p-1 gap-0.5">
      {/* Sliding background */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-md bg-accent/15 border border-accent/20"
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          left: mode === "user" ? 4 : "calc(50% + 2px)",
          width: "calc(50% - 6px)",
        }}
      />

      <button
        onClick={() => onToggle("user")}
        className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
          mode === "user" ? "text-accent" : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <Eye className="w-3.5 h-3.5" />
        User
      </button>

      <button
        onClick={() => onToggle("agent")}
        className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
          mode === "agent" ? "text-accent" : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <Cpu className="w-3.5 h-3.5" />
        Agent
      </button>
    </div>
  );
}
