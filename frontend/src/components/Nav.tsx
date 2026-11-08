'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Insumos' },
  { href: '/movements', label: 'Movimientos' },
  { href: '/patients', label: 'Pacientes' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>Almacén clínico</strong>
            <small>Sistema de inventario de insumos médicos</small>
          </span>
        </div>
        <nav aria-label="Principal">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
