import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Link from 'next/link';
import { ProveedorAlmacen } from '@/store/ProveedorAlmacen';
import './globals.css';

// Inter variable (subconjunto latino, licencia OFL) autoalojada desde @fontsource-variable/inter.
const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--fuente-inter',
});

export const metadata: Metadata = {
  title: 'Órbitas',
  description:
    'La ley de gravitación de Newton y seis órbitas del problema de los tres cuerpos, para ver y tocar.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans">
        <a
          href="#contenido"
          className="bg-bone-white text-void text-etiqueta fixed top-2 left-2 z-50 flex min-h-8 min-w-8 -translate-y-24 items-center rounded-boton px-4 font-semibold uppercase focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        <header className="mx-auto flex min-h-14 max-w-pagina items-center px-4">
          <Link href="/" aria-label="Órbitas, inicio" className="flex min-h-8 items-center gap-2">
            <svg width="20" height="19" viewBox="0 0 20 19" aria-hidden="true" focusable="false">
              <polygon points="10,1 19,18 1,18" className="fill-electric-iris" />
            </svg>
            <span className="text-etiqueta font-semibold uppercase">Órbitas</span>
          </Link>
        </header>
        <main id="contenido" tabIndex={-1} className="outline-none">
          <ProveedorAlmacen>{children}</ProveedorAlmacen>
        </main>
        <footer className="text-ash-gray text-etiqueta mx-auto max-w-pagina px-4 py-10 font-light">
          Órbitas · la ley de Newton y el problema de los tres cuerpos, para ver y tocar.
        </footer>
      </body>
    </html>
  );
}
