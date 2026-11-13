'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { api, fmtDate, type Patient } from '@/lib/api';

const empty = { full_name: '', dni: '', birth_date: '' };

export default function PatientsPage() {
  const [q, setQ] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const formRef = useRef<HTMLElement>(null);

  // Búsqueda con pequeña espera para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      api<Patient[]>(`/patients?q=${encodeURIComponent(q)}`)
        .then((p) => { setPatients(p); setError(''); })
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q, reload]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api(`/patients/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await api('/patients', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm(empty);
      setEditingId(null);
      setReload((n) => n + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function startEdit(p: Patient) {
    setEditingId(p.id);
    setForm({ full_name: p.full_name, dni: p.dni, birth_date: p.birth_date });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function remove(p: Patient) {
    if (!confirm(`¿Eliminar a "${p.full_name}"? Sus movimientos se conservarán sin paciente asignado.`)) return;
    try {
      await api(`/patients/${p.id}`, { method: 'DELETE' });
      setReload((n) => n + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Pacientes" sub="Busca por nombre o por DNI. Los resultados se actualizan mientras escribes." />

      <section className="panel">
        <h2>Criterios de búsqueda</h2>
        <label>Nombre o DNI del paciente
          <input data-testid="patient-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o DNI" />
        </label>
      </section>

      {patients.length === 0 ? (
        <div className="empty" data-testid="no-results">No se encontraron pacientes con esa búsqueda.</div>
      ) : (
        <div className="table-wrap">
          <table data-testid="patients-table">
            <thead><tr><th>Nombre completo</th><th>DNI</th><th>Nacimiento</th><th><span className="sr">Acciones</span></th></tr></thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} data-testid="patient-row">
                  <td>{p.full_name}</td><td>{p.dni}</td><td>{fmtDate(p.birth_date)}</td>
                  <td>
                    <div className="actions">
                      <button className="ghost" data-testid="patient-edit" onClick={() => startEdit(p)}>Editar</button>
                      <button className="danger" data-testid="patient-delete" onClick={() => remove(p)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="panel" style={{ marginTop: 24 }} ref={formRef}>
        <h2>{editingId ? 'Editar paciente' : 'Registrar paciente'}</h2>
        <form className="row" onSubmit={submit}>
          <label>Nombre completo
            <input data-testid="patient-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </label>
          <label>DNI
            <input data-testid="patient-dni" inputMode="numeric" maxLength={8} value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} required />
          </label>
          <label>Fecha de nacimiento
            <input data-testid="patient-birth" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} required />
          </label>
          <button type="submit" data-testid="patient-submit">{editingId ? 'Guardar cambios' : 'Registrar paciente'}</button>
          {editingId && (
            <button type="button" className="ghost" onClick={() => { setEditingId(null); setForm(empty); }}>Cancelar</button>
          )}
        </form>
        {error && <p className="msg error" role="alert" data-testid="error">{error}</p>}
      </section>
    </>
  );
}
