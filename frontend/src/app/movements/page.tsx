'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { api, type Movement, type Supply } from '@/lib/api';

export default function MovementsPage() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [supplyId, setSupplyId] = useState('');
  const [type, setType] = useState<'in' | 'out'>('out');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    const [s, m] = await Promise.all([api<Supply[]>('/supplies'), api<Movement[]>('/movements')]);
    setSupplies(s);
    setMovements(m);
    setSupplyId((cur) => cur || (s[0] ? String(s[0].id) : ''));
  }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setOk('');
    try {
      const r = await api<{ stock: number }>('/movements', {
        method: 'POST',
        body: JSON.stringify({ supply_id: Number(supplyId), type, quantity: Number(quantity), note: note || undefined }),
      });
      setOk(`Movimiento registrado. Stock actual: ${r.stock}`);
      setQuantity('1'); setNote('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Movimientos" sub="Registra cada entrada o salida de insumos. No se permite sacar más de lo que hay en stock." />

      <section className="panel">
        <h2>Registrar movimiento</h2>
        <form className="row" onSubmit={submit}>
          <label>Insumo
            <select data-testid="mov-supply" value={supplyId} onChange={(e) => setSupplyId(e.target.value)} required>
              {supplies.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.stock} {s.unit})</option>)}
            </select>
          </label>
          <label>Tipo
            <select data-testid="mov-type" value={type} onChange={(e) => setType(e.target.value as 'in' | 'out')}>
              <option value="out">Salida</option>
              <option value="in">Entrada</option>
            </select>
          </label>
          <label>Cantidad
            <input data-testid="mov-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </label>
          <label>Nota (opcional)
            <input data-testid="mov-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </label>
          <button type="submit" data-testid="mov-submit" disabled={!supplyId}>Registrar</button>
        </form>
        {error && <p className="msg error" role="alert" data-testid="error">{error}</p>}
        {ok && <p className="msg ok" role="status" data-testid="success">{ok}</p>}
      </section>

      {movements.length === 0 ? (
        <div className="empty">Todavía no hay movimientos registrados.</div>
      ) : (
        <div className="table-wrap">
          <table data-testid="movements-table">
            <thead><tr><th>Fecha</th><th>Insumo</th><th>Tipo</th><th className="num">Cantidad</th><th>Nota</th></tr></thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleString('es-PE')}</td>
                  <td>{m.supply_name}</td>
                  <td><span className={`tag ${m.type}`}>{m.type === 'in' ? 'Entrada' : 'Salida'}</span></td>
                  <td className="num">{m.quantity} {m.unit}</td>
                  <td>{m.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
