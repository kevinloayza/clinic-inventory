import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = { title: 'Almacén clínico', description: 'Inventario de insumos médicos' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
