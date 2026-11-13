'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { api, fmtDate, type Dashboard } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Dashboard>('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  const t = data?.totals;
  const cards = [
    { id: 'total', label: 'Insumos registrados', value: t?.supplies, href: '/supplies', tone: '' },
    { id: 'low', label: 'Con stock bajo', value: t?.low_stock, href: '/supplies?status=low', tone: t?.low_stock ? 'warn' : '' },
    { id: 'expiring', label: 'Por vencer (30 días)', value: t?.expiring, href: '/supplies?status=expiring', tone: t?.expiring ? 'warn' : '' },
    { id: 'expired', label: 'Vencidos', value: t?.expired, href: '/supplies?status=expired', tone: t?.expired ? 'bad' : '' },
  ];

  return (
    <>
      <PageHeader title="Resumen" sub="Estado actual del almacén: qué reponer, qué está por vencer y los últimos movimientos." />
      {error && <p className="msg error" role="alert" data-testid="error">{error}</p>}

      <div className="stats">
        {cards.map((c) => (
          <Link key={c.id} href={c.href} className={`stat ${c.tone}`} data-testid={`stat-${c.id}`}>
            <span className="stat-n">{c.value ?? '–'}</span>
            <span className="stat-l">{c.label}</span>
          </Link>
        ))}
      </div>

      {data && (
        <>
          <div className="cols">
            <section className="panel">
              <h2>Requieren reposición</h2>
              {data.low_stock.length === 0 ? (
                <p className="panel-empty">Todos los insumos están por encima de su stock mínimo.</p>
              ) : (
                <div className="table-wrap">
                  <table data-testid="low-table">
                    <thead><tr><th>Insumo</th><th className="num">Stock</th><th className="num">Mínimo</th></tr></thead>
                    <tbody>
                      {data.low_stock.map((s) => (
                        <tr key={s.id}><td>{s.name}</td><td className="num">{s.stock}</td><td className="num">{s.min_stock}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel">
              <h2>Vencimientos próximos</h2>
              {data.expiring.length === 0 ? (
                <p className="panel-empty">No hay insumos vencidos ni por vencer en los próximos 30 días.</p>
              ) : (
                <div className="table-wrap">
                  <table data-testid="expiring-table">
                    <thead><tr><th>Insumo</th><th>Vence</th><th>Estado</th></tr></thead>
                    <tbody>
                      {data.expiring.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{s.expiration_date ? fmtDate(s.expiration_date) : '—'}</td>
                          <td>
                            {s.expiration_status === 'vencido'
                              ? <span className="tag expired">Vencido</span>
                              : <span className="tag low">Por vencer</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="panel">
            <h2>Últimos movimientos</h2>
            {data.recent_movements.length === 0 ? (
              <p className="panel-empty">Todavía no hay movimientos registrados.</p>
            ) : (
              <div className="table-wrap">
                <table data-testid="recent-table">
                  <thead><tr><th>Fecha</th><th>Insumo</th><th>Tipo</th><th className="num">Cantidad</th><th>Paciente</th></tr></thead>
                  <tbody>
                    {data.recent_movements.map((m) => (
                      <tr key={m.id}>
                        <td>{new Date(m.created_at).toLocaleString('es-PE')}</td>
                        <td>{m.supply_name}</td>
                        <td><span className={`tag ${m.type}`}>{m.type === 'in' ? 'Entrada' : 'Salida'}</span></td>
                        <td className="num">{m.quantity} {m.unit}</td>
                        <td>{m.patient_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="panel-link"><Link href="/movements">Ver todos los movimientos</Link></p>
          </section>
        </>
      )}
    </>
  );
}
