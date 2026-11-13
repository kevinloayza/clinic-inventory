'use client';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { api, fmtDate, qs, todayLima, type ExpirationStatus, type Supply } from '@/lib/api';

const empty = { name: '', unit: '', stock: '0', min_stock: '0', expiry: '' };
const STATUS_LABEL: Record<ExpirationStatus, string> = {
  sin_fecha: 'Sin fecha', vigente: 'Vigente', por_vencer: 'Por vencer', vencido: 'Vencido',
};

function SuppliesView() {
  const params = useSearchParams();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  // La búsqueda espera un momento para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      api<Supply[]>(`/supplies${qs({ q: search, status })}`)
        .then((s) => { setSupplies(s); setListError(''); })
        .catch((e) => setListError(e.message))
        .finally(() => setLoading(false));
    }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [search, status, reload]);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const body = { name: form.name, unit: form.unit, min_stock: Number(form.min_stock), expiration_date: form.expiry || null };
      if (editingId) {
        await api(`/supplies/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/supplies', { method: 'POST', body: JSON.stringify({ ...body, stock: Number(form.stock) }) });
      }
      setForm(empty);
      setEditingId(null);
      setReload((n) => n + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function startEdit(s: Supply) {
    setEditingId(s.id);
    setForm({ name: s.name, unit: s.unit, stock: String(s.stock), min_stock: String(s.min_stock), expiry: s.expiration_date ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(s: Supply) {
    if (!confirm(`¿Eliminar "${s.name}" y todo su historial de movimientos?`)) return;
    try {
      await api(`/supplies/${s.id}`, { method: 'DELETE' });
      setReload((n) => n + 1);
    } catch (err) {
      setListError((err as Error).message);
    }
  }

  function exportCsv() {
    // Evita que Excel interprete como fórmula un texto que empieza con = + - @
    const safe = (v: string | number) => (/^[=+\-@]/.test(String(v)) ? `'${v}` : String(v));
    const esc = (v: string | number) => `"${safe(v).replace(/"/g, '""')}"`;
    const header = ['Insumo', 'Unidad', 'Stock', 'Stock mínimo', 'Vencimiento', 'Estado de vencimiento'];
    const rows = supplies.map((s) => [
      s.name, s.unit, s.stock, s.min_stock, s.expiration_date ? fmtDate(s.expiration_date) : '', STATUS_LABEL[s.expiration_status],
    ]);
    const csv = '\ufeff' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `insumos-${todayLima()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtering = search !== '' || status !== '';

  return (
    <>
      <PageHeader title="Insumos" sub="Catálogo y existencias actuales. El stock cambia solo al registrar entradas y salidas." />

      <section className="panel">
        <h2>{editingId ? 'Editar insumo' : 'Nuevo insumo'}</h2>
        <form className="row" onSubmit={submit}>
          <label>Nombre
            <input data-testid="supply-name" value={form.name} onChange={set('name')} required />
          </label>
          <label>Unidad
            <input data-testid="supply-unit" value={form.unit} onChange={set('unit')} placeholder="cajas, tabletas…" required />
          </label>
          {!editingId && (
            <label>Stock inicial
              <input data-testid="supply-stock" type="number" min={0} value={form.stock} onChange={set('stock')} />
            </label>
          )}
          <label>Stock mínimo
            <input data-testid="supply-min" type="number" min={0} value={form.min_stock} onChange={set('min_stock')} />
          </label>
          <label>Vencimiento (opcional)
            <input data-testid="supply-expiry" type="date" value={form.expiry} onChange={set('expiry')} />
          </label>
          <button type="submit" data-testid="supply-submit">{editingId ? 'Guardar cambios' : 'Agregar insumo'}</button>
          {editingId && (
            <button type="button" className="ghost" onClick={() => { setEditingId(null); setForm(empty); }}>Cancelar</button>
          )}
        </form>
        {error && <p className="msg error" role="alert" data-testid="error">{error}</p>}
      </section>

      <div className="toolbar">
        <label>Buscar insumo
          <input data-testid="supply-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre del insumo" />
        </label>
        <label>Estado
          <select data-testid="supply-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="low">Stock bajo</option>
            <option value="expiring">Por vencer</option>
            <option value="expired">Vencidos</option>
          </select>
        </label>
        <span className="summary-inline" data-testid="summary">
          {supplies.length} {supplies.length === 1 ? 'insumo' : 'insumos'}
        </span>
        <button type="button" className="ghost" data-testid="supply-export" onClick={exportCsv} disabled={supplies.length === 0}>
          Exportar a Excel (CSV)
        </button>
      </div>

      {listError && <p className="msg error" role="alert" data-testid="list-error">{listError}</p>}

      {loading ? <p>Cargando…</p> : supplies.length === 0 ? (
        <div className="empty" data-testid="supplies-empty">
          {filtering ? 'No hay insumos que coincidan con la búsqueda.' : 'Aún no hay insumos. Agrega el primero con el formulario de arriba.'}
        </div>
      ) : (
        <div className="table-wrap">
          <table data-testid="supplies-table">
            <thead>
              <tr><th>Insumo</th><th>Unidad</th><th className="num">Stock</th><th className="num">Mínimo</th><th>Estado</th><th>Vencimiento</th><th><span className="sr">Acciones</span></th></tr>
            </thead>
            <tbody>
              {supplies.map((s) => {
                const low = s.stock <= s.min_stock;
                return (
                  <tr key={s.id} className={low ? 'low' : ''} data-testid={`supply-row-${s.name}`}>
                    <td>{s.name}</td>
                    <td>{s.unit}</td>
                    <td className="num" data-testid="stock-cell">{s.stock}</td>
                    <td className="num">{s.min_stock}</td>
                    <td>{low ? <span className="tag low">Stock bajo</span> : 'Normal'}</td>
                    <td data-testid="expiry-cell">
                      {s.expiration_date ? fmtDate(s.expiration_date) : '—'}{' '}
                      {s.expiration_status === 'vencido' && <span className="tag expired">Vencido</span>}
                      {s.expiration_status === 'por_vencer' && <span className="tag low">Por vencer</span>}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="ghost" data-testid="supply-edit" onClick={() => startEdit(s)}>Editar</button>
                        <button className="danger" data-testid="supply-delete" onClick={() => remove(s)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function SuppliesPage() {
  // useSearchParams exige un límite Suspense para poder compilar la página
  return <Suspense fallback={<p>Cargando…</p>}><SuppliesView /></Suspense>;
}
