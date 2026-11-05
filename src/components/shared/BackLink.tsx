import { Link } from 'wouter'
import { ArrowLeft } from 'lucide-preact'

/** Enlace "volver" sobre el título de una página (área táctil de 48 px en móvil). */
export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="state-layer -ml-3 mb-2 inline-flex h-12 items-center gap-2 rounded-full px-3 text-label-lg text-primary sm:h-10"
    >
      <ArrowLeft size={18} aria-hidden="true" />
      {children}
    </Link>
  )
}
