import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Órbitas',
  description:
    'La ley de gravitación de Newton y seis órbitas del problema de los tres cuerpos, para ver y tocar.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
