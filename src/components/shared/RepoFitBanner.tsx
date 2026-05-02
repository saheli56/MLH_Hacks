"use client";

import React from "react";
import { Alert, AlertTitle, AlertDescription, AlertAction } from "@/components/ui/alert";
import { AlertTriangle, XCircle } from "lucide-react";

interface RepoFitBannerProps {
  variant?: "error" | "warning" | "info";
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  repoName?: string | null;
  showCopy?: boolean;
}

export function RepoFitBanner({
  variant = "warning",
  title,
  message,
  actionLabel,
  onAction,
  repoName,
  showCopy = false,
}: RepoFitBannerProps) {
  const icon = variant === "error" ? AlertTriangle : XCircle;

  return (
    <Alert className="mb-4" variant={variant === "error" ? "destructive" : "default"}>
      <div className="flex items-start gap-3">
        <div className="text-current opacity-90 pt-0.5">
          {React.createElement(icon, { className: "w-5 h-5" })}
        </div>
        <div className="flex-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>
            <div className="text-sm text-muted-foreground">
              {message}
              {repoName ? <span className="font-medium"> {repoName}</span> : null}
            </div>
          </AlertDescription>
        </div>
        {(actionLabel || showCopy) && (
          <AlertAction>
            <div className="flex items-center gap-2">
              {actionLabel && (
                <button onClick={onAction} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent text-white text-sm">
                  {actionLabel}
                </button>
              )}
              {showCopy && repoName && (
                <button onClick={() => navigator.clipboard && navigator.clipboard.writeText(repoName)} className="text-xs text-text-muted">
                  Copy
                </button>
              )}
            </div>
          </AlertAction>
        )}
      </div>
    </Alert>
  );
}

export default RepoFitBanner;
