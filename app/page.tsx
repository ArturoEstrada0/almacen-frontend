"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/context/auth-context"

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!loading && !redirecting) {
      setRedirecting(true)
      if (user) {
        router.replace("/dashboard")
      } else {
        router.replace("/auth/login")
      }
    }
  }, [user, loading, router, redirecting])

  if (loading || redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return null
}
