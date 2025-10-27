"use client"

import type React from "react"
import { cn } from "../../lib/utils"

export interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-2xl border border-[#E5E5E5] bg-white text-center py-20 px-8", className)}>
      {icon && <div className="mb-6 flex justify-center">{icon}</div>}
      <h2 className="text-3xl font-bold mb-3 text-foreground">{title}</h2>
      <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">{description}</p>
    </div>
  )
}
