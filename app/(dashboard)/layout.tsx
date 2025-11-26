"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/context/auth-context"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  console.log('[Dashboard Layout] loading:', loading, 'user:', user?.email || 'No user', 'pathname:', pathname);

  useEffect(() => {
    console.log('[Dashboard useEffect] loading:', loading, 'user:', user?.email || 'No user');
    if (!loading && !user) {
      console.log('[Dashboard] No user detected, redirecting to login with returnUrl:', pathname);
      router.push(`/auth/login?returnUrl=${pathname}`)
    }
  }, [user, loading, router, pathname]);

  // Mostrar loading solo por un momento inicial
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario después de cargar, no mostrar nada (se redirige en useEffect)
  if (!user) {
    return null
  }

  // Usuario autenticado, mostrar el dashboard
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  )
}
