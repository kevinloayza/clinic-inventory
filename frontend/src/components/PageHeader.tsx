import Link from 'next/link';

export default function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="page-head">
      <nav className="crumbs" aria-label="Ruta de navegación">
        <Link href="/">Inicio</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>
      <h1>{title}</h1>
      <p className="sub">{sub}</p>
    </div>
  );
}
