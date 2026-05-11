"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useNavigation } from "@/lib/context/navigation-context"

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function NavLink({ href, children, className }: NavLinkProps) {
  const router = useRouter()
  const { setIsNavigating } = useNavigation()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsNavigating(true)
    router.push(href)
  }

  return (
    <button
      onClick={handleClick}
      className={cn("text-left", className)}
    >
      {children}
    </button>
  )
}
