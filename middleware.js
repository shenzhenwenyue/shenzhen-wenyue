import { NextResponse } from 'next/server'

// Dominios white-label: en estos, TODO el sitio muestra solo la página de
// dropshipping (sin precios, sin nombre del proveedor). El dominio real
// (shenzhen-wenyue.vercel.app) no se ve afectado.
const DROPSHIP_HOSTS = new Set([
  'er-wholesale-catalog.vercel.app',
])

export function middleware(request) {
  const host = (request.headers.get('host') || '').toLowerCase()
  if (!DROPSHIP_HOSTS.has(host)) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  // Ya en la página (o su carga interna): dejar pasar.
  if (pathname === '/dropshipping' || pathname.startsWith('/dropshipping/')) {
    return NextResponse.next()
  }

  // Cualquier otra ruta de este dominio -> se reescribe a /dropshipping,
  // manteniendo la URL limpia en la raíz (rewrite, no redirect).
  const url = request.nextUrl.clone()
  url.pathname = '/dropshipping'
  return NextResponse.rewrite(url)
}

export const config = {
  // No correr en assets internos, API ni archivos con extensión (imágenes, etc.)
  matcher: ['/((?!_next/|api/|favicon.ico|.*\\.).*)'],
}
