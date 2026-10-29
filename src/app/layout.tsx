import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Cabecera } from '@/components/comunes/Cabecera';
import { Pie } from '@/components/comunes/Pie';
import { resolverUrlSitio } from '@/lib/galeria/sitio';
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
  metadataBase: resolverUrlSitio(process.env),
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
        <Cabecera />
        <main id="contenido" tabIndex={-1} className="outline-none">
          <ProveedorAlmacen>{children}</ProveedorAlmacen>
        </main>
        <Pie />
      </body>
    </html>
  );
}
