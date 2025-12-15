import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Portal de Cotizaciones - MECER",
  description: "Portal para proveedores - Responder cotizaciones",
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {children}
    </div>
  )
}
