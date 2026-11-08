'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { api, fmtDate, type Supply } from '@/lib/api';

const empty = { name: '', unit: '', stock: '0', min_stock: '0', expiry: '' };

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSupplies(await api<Supply[]>('/supplies'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

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
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function startEdit(s: Supply) {
    setEditingId(s.id);
    setForm({ name: s.name, unit: s.unit, stock: String(s.stock), min_stock: String(s.min_stock), expiry: s.expiration_date ?? '' });
  }

  async function remove(s: Supply) {
    if (!confirm(`¿Eliminar "${s.name}" y todo su historial de movimientos?`)) return;
    try {
      await api(`/supplies/${s.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

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

      {loading ? <p>Cargando…</p> : supplies.length === 0 ? (
        <div className="empty">Aún no hay insumos. Agrega el primero con el formulario de arriba.</div>
      ) : (
        <div className="table-wrap">
          <p className="summary" data-testid="summary">
            {supplies.length} {supplies.length === 1 ? 'insumo' : 'insumos'} registrados
            {' · '}
            {supplies.filter((s) => s.stock <= s.min_stock).length} con stock bajo
            {' · '}
            {supplies.filter((s) => s.expiration_status === 'vencido').length} vencidos
          </p>
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
                        <button className="ghost" onClick={() => startEdit(s)}>Editar</button>
                        <button className="danger" onClick={() => remove(s)}>Eliminar</button>
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
