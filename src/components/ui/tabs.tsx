"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function Tabs({
  value,
  onValueChange,
  className,
  children,
  ...props
}: {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="tabs"
      className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
      {...props}
    >
      <TabsContext.Provider value={{ value, onValueChange }}>
        {children}
      </TabsContext.Provider>
    </div>
  )
}

function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="tabs-list" className={cn("inline-flex w-fit items-center justify-center", className)} {...props}>
      {children}
    </div>
  )
}

function TabsTrigger({
  value,
  className,
  children,
  ...props
}: {
  value: string
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs")
  }

  const selected = context.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        selected ? "text-foreground bg-muted" : "text-foreground/60 hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function TabsContent({
  value,
  className,
  children,
  ...props
}: {
  value: string
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(TabsContext)
  return context?.value === value ? (
    <div data-slot="tabs-content" className={cn("flex-1 text-sm outline-none", className)} {...props}>
      {children}
    </div>
  ) : null
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
