"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="scroll-area" className={cn("relative overflow-auto", className)} {...props}>
      {children}
    </div>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: "vertical" | "horizontal" }) {
  return (
    <div
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "horizontal" ? "h-2.5 w-full" : "w-2.5 h-full",
        className
      )}
      {...props}
    />
  )
}

export { ScrollArea, ScrollBar }
