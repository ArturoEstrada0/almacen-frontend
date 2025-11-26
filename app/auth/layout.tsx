import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Autenticación - Sistema de Almacén",
  description: "Acceso al sistema de gestión de almacén",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen">{children}</div>
}
