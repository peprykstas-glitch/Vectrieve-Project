"use client"

import React from "react"
import Link from "next/link"

interface LogoProps {
  className?: string
  iconOnly?: boolean
  size?: "sm" | "md" | "lg"
  href?: string
}

export function Logo({ className = "", iconOnly = false, size = "md", href }: LogoProps) {
  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  }

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-icon.png"
        alt="Vectrieve Icon"
        className={`${iconSizes[size]} object-contain drop-shadow-[0_0_12px_rgba(0,212,255,0.35)] transition-transform duration-200 hover:scale-105`}
      />
      {!iconOnly && (
        <div className="flex items-center gap-1.5 font-bold tracking-tight">
          <span className={`${textSizes[size]} text-white font-sans tracking-tight`}>
            Vectrieve
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            AI
          </span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    )
  }

  return content
}
