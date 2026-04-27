"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null)

function Collapsible({
  open,
  onOpenChange,
  className,
  children,
  ...props
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      <div data-slot="collapsible" className={cn(className)} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

function CollapsibleTrigger({
  asChild,
  children,
  ...props
}: {
  asChild?: boolean
  children: React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error("CollapsibleTrigger must be used within Collapsible")
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    context.onOpenChange(!context.open)
    if (children.props.onClick) {
      children.props.onClick(event)
    }
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      ...props,
      onClick: handleClick,
      "aria-expanded": context.open,
    } as any)
  }

  return (
    <button
      type="button"
      data-slot="collapsible-trigger"
      aria-expanded={context.open}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}

function CollapsibleContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(CollapsibleContext)
  if (!context?.open) {
    return null
  }

  return (
    <div data-slot="collapsible-content" className={cn(className)} {...props}>
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
