"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

function Progress({ className, value = 0, children, ...props }: ProgressProps) {
  return (
    <div data-slot="progress" className={cn("flex flex-wrap gap-3", className)} {...props}>
      {children}
      <div
        data-slot="progress-track"
        className="relative flex h-1 w-full items-center overflow-hidden rounded-full bg-muted"
      >
        <div
          data-slot="progress-indicator"
          className="h-full bg-foreground transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

function ProgressTrack({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="progress-track"
      className={cn("relative flex h-1 w-full items-center overflow-hidden rounded-full bg-muted", className)}
      {...props}
    />
  )
}

function ProgressIndicator({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="progress-indicator"
      className={cn("h-full bg-foreground transition-all", className)}
      style={{ ...style }}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm font-medium", className)} data-slot="progress-label" {...props} />
  )
}

function ProgressValue({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("ml-auto text-sm text-muted-foreground tabular-nums", className)}
      data-slot="progress-value"
      {...props}
    />
  )
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue }
