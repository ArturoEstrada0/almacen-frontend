import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isRootPath = request.nextUrl.pathname === '/'

  // Permitir acceso a la raíz sin redirigir (manejado por el componente)
  if (isRootPath) {
    return NextResponse.next()
  }

  // Verificar si hay token de sesión en las cookies
  // Buscar cookies de Supabase con varios patrones posibles
  const cookies = request.cookies.getAll()
  
  const hasSession = cookies.some(cookie => {
    const name = cookie.name
    // Buscar cookies de auth de Supabase
    return name.includes('sb-') && name.includes('auth-token')
  })
  
  console.log('[Middleware] Path:', request.nextUrl.pathname, 'Has Session:', hasSession)
  
  // IMPORTANTE: No redirigir rutas protegidas al login
  // Dejar que el layout del dashboard maneje la redirección
  // Solo proteger si estamos 100% seguros de que no hay sesión
  
  // Si hay sesión y está intentando acceder al login, redirigir al dashboard
  if (hasSession && request.nextUrl.pathname.startsWith('/auth/login')) {
    console.log('[Middleware] Usuario con sesión accediendo a login, redirigiendo a dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Para todas las demás rutas, permitir el paso
  // El layout del dashboard se encargará de proteger las rutas
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
