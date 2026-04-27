"use client";

import { CopyButton } from "../shared/CopyButton";
import { MessageSquare } from "lucide-react";

interface ClaimCommentProps {
  comment: string;
}

export function ClaimComment({ comment }: ClaimCommentProps) {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Header — mimics GitHub comment box */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Draft Comment</span>
        </div>
        <CopyButton text={comment} label="Copy Comment" />
      </div>

      {/* Comment Body */}
      <div className="p-4">
        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
          {comment}
        </p>
      </div>
    </div>
  );
}
