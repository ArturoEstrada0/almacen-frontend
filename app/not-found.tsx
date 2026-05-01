"use client"

import { Button } from "@/components/ui/button"
import { Home, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="relative w-full max-w-md">
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-20"></div>

        <div className="relative bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
          {/* Error code with animation */}
          <div className="space-y-3">
            <div className="text-6xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              404
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Página no encontrada</h1>
            <p className="text-gray-500 text-base leading-relaxed">
              La página que buscas no existe o ha sido movida a otra ubicación.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              asChild
              size="lg"
              className="flex-1 gap-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Link href="/">
                <Home className="h-5 w-5" />
                Ir al inicio
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              className="flex-1 gap-2 border-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="h-5 w-5" />
              Atrás
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
