import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIPURI = [
  { value: 'iqc', label: 'Eșec IQC' },
  { value: 'temperatura', label: 'Temperatură/Umiditate' },
  { value: 'echipament', label: 'Echipament' },
  { value: 'reactiv', label: 'Reactiv/Consumabil' },
  { value: 'proba', label: 'Probă neconformă' },
  { value: 'procedura', label: 'Deviere procedură' },
  { value: 'personal', label: 'Personal' },
  { value: 'altul', label: 'Altul' },
]

const PERSONAL = [
  'Rotari Ion',
  'Croitoru Tatiana',
  'Jentimir Valeria',
  'Andrian Maria',
  'Antropov Marina',
]

const STATUS_COLORS = {
  deschis: 'bg-red-100 text-red-700',
  investigare: 'bg-yellow-100 text-yellow-700',
  inchis: 'bg-green-100 text-green-700',
}

const STATUS_LABELS = {
  deschis: 'Deschisă',
  investigare: 'Investigare',
  inchis: 'Închisă',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nextCod(ncData) {
  const year = new Date().getFullYear().toString().slice(-2)
  const existing = ncData
    .filter(n => n.cod && n.cod.includes(`-${year}-`))
    .map(n => parseInt(n.cod.split('-').pop()) || 0)
  const max = existing.length ? Math.max(...existing) : 0
  return `NC-BM-${year}-${String(max + 1).padStart(3, '0')}`
}

export default function NC() {
  const [ncData, setNcData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [showClose, setShowClose] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    data: todayStr(),
    tip: 'altul',
    zona: '',
    detectat_nume: '',
    descriere: '',
    cauza: '',
    actiune_imediata: '',
    severitate: 'moderata',
  })

  const [acText, setAcText] = useState('')

  useEffect(() => { loadNC() }, [])

  async function loadNC() {
    setLoading(true)
    const { data, error } = await supabase
      .from('nc_data')
      .select('*')
      .order('data', { ascending: false })
    if (!error) setNcData(data || [])
    setLoading(false)
  }

  async function saveNC() {
    if (!form.descriere.trim()) {
      alert('Descrieți neconformitatea!')
      return
    }
    setSaving(true)
    const rec = {
      id: 'NC-' + Date.now(),
      cod: nextCod(ncData),
      data: form.data,
      tip: form.tip,
      zona: form.zona,
      detectat_nume: form.detectat_nume,
      descriere: form.descriere,
      cauza: form.cauza,
      actiune_imediata: form.actiune_imediata,
      severitate: form.severitate,
      status: 'deschis',
      actiune_corectiva: '',
      data_inchidere: null,
      ts: new Date().toISOString(),
    }
    const { error } = await supabase.from('nc_data').insert(rec)
    if (error) {
      alert('Eroare la salvare: ' + error.message)
    } else {
      setNcData(prev => [rec, ...prev])
      setShowAdd(false)
      setForm({ data: todayStr(), tip: 'altul', zona: '', detectat_nume: '', descriere: '', cauza: '', actiune_imediata: '', severitate: 'moderata' })
    }
    setSaving(false)
  }

  async function closeNC() {
    if (!acText.trim()) {
      if (!window.confirm('Nu ați introdus acțiunea corectivă. Continuați?')) return
    }
    setSaving(true)
    const updates = {
      status: 'inchis',
      actiune_corectiva: acText,
      data_inchidere: todayStr(),
      ts: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('nc_data')
      .update(updates)
      .eq('id', showClose.id)
    if (!error) {
      setNcData(prev => prev.map(n => n.id === showClose.id ? { ...n, ...updates } : n))
      setShowClose(null)
      setShowDetail(null)
      setAcText('')
    }
    setSaving(false)
  }

  async function setInvestigare(nc) {
    const { error } = await supabase
      .from('nc_data')
      .update({ status: 'investigare', ts: new Date().toISOString() })
      .eq('id', nc.id)
    if (!error) {
      setNcData(prev => prev.map(n => n.id === nc.id ? { ...n, status: 'investigare' } : n))
      setShowDetail(prev => prev ? { ...prev, status: 'investigare' } : null)
    }
  }

  const filtered = ncData.filter(n => !filter || n.status === filter)
  const deschise = ncData.filter(n => n.status === 'deschis').length
  const investigare = ncData.filter(n => n.status === 'investigare').length
  const inchise = ncData.filter(n => n.status === 'inchis').length

  return (
    <div className="p-6 max-w-6xl">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Neconformități</h1>
          <p className="text-sm text-gray-500">ISO 15189:2023 §8.7 · Cod automat NC-BM-YY-NNN</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + NC nouă
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-700">{ncData.length}</div>
          <div className="text-sm text-gray-400">Total</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{deschise}</div>
          <div className="text-sm text-red-400">Deschise</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{investigare}</div>
          <div className="text-sm text-yellow-400">Investigare</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{inchise}</div>
          <div className="text-sm text-green-400">Închise</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b flex gap-2 flex-wrap">
          {[
            { v: '', l: 'Toate' },
            { v: 'deschis', l: 'Deschise' },
            { v: 'investigare', l: 'Investigare' },
            { v: 'inchis', l: 'Închise' },
          ].map(s => (
            <button key={s.v} onClick={() => setFilter(s.v)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${filter === s.v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Se încarcă...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nicio neconformitate</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Cod</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Tip</th>
                <th className="px-4 py-3 text-left">Descriere</th>
                <th className="px-4 py-3 text-left">Detectat de</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Închis la</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(n => (
                <tr key={n.id}
                  onClick={() => setShowDetail(n)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-bold text-blue-700">{n.cod}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{n.data}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {TIPURI.find(t => t.value === n.tip)?.label || n.tip}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{n.descriere}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{n.detectat_nume || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[n.status] || ''}`}>
                      {STATUS_LABELS[n.status] || n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{n.data_inchidere || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: NC NOUĂ */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Neconformitate nouă</h2>
              <p className="text-sm text-gray-400">Cod: {nextCod(ncData)}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" value={form.data}
                    onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                  <select value={form.tip}
                    onChange={e => setForm(p => ({ ...p, tip: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {TIPURI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zonă / Grupă</label>
                  <input type="text" value={form.zona} placeholder="ex. IST, Sala 2"
                    onChange={e => setForm(p => ({ ...p, zona: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detectat de</label>
                  <select value={form.detectat_nume}
                    onChange={e => setForm(p => ({ ...p, detectat_nume: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">— selectați —</option>
                    {PERSONAL.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descriere neconformitate *</label>
                <textarea value={form.descriere} rows={3}
                  onChange={e => setForm(p => ({ ...p, descriere: e.target.value }))}
                  placeholder="Descrieți detaliat neconformitatea identificată..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cauza probabilă</label>
                <textarea value={form.cauza} rows={2}
                  onChange={e => setForm(p => ({ ...p, cauza: e.target.value }))}
                  placeholder="Care este cauza probabilă?"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acțiune imediată</label>
                <textarea value={form.actiune_imediata} rows={2}
                  onChange={e => setForm(p => ({ ...p, actiune_imediata: e.target.value }))}
                  placeholder="Ce acțiune imediată a fost luată?"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severitate</label>
                <select value={form.severitate}
                  onChange={e => setForm(p => ({ ...p, severitate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="minora">Minoră</option>
                  <option value="moderata">Moderată</option>
                  <option value="majora">Majoră</option>
                  <option value="critica">Critică</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Anulare
              </button>
              <button onClick={saveNC} disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează NC'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALII NC */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{showDetail.cod}</h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[showDetail.status]}`}>
                  {STATUS_LABELS[showDetail.status]}
                </span>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-400">Data:</span> <span className="font-medium">{showDetail.data}</span></div>
                <div><span className="text-gray-400">Tip:</span> <span className="font-medium">{TIPURI.find(t => t.value === showDetail.tip)?.label || showDetail.tip}</span></div>
                <div><span className="text-gray-400">Zonă:</span> <span className="font-medium">{showDetail.zona || '—'}</span></div>
                <div><span className="text-gray-400">Detectat de:</span> <span className="font-medium">{showDetail.detectat_nume || '—'}</span></div>
                <div><span className="text-gray-400">Severitate:</span> <span className="font-medium capitalize">{showDetail.severitate || '—'}</span></div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Descriere:</div>
                <div className="bg-gray-50 rounded-lg p-3 text-gray-700">{showDetail.descriere}</div>
              </div>
              {showDetail.cauza && (
                <div>
                  <div className="text-gray-400 mb-1">Cauza:</div>
                  <div className="bg-gray-50 rounded-lg p-3 text-gray-700">{showDetail.cauza}</div>
                </div>
              )}
              {showDetail.actiune_imediata && (
                <div>
                  <div className="text-gray-400 mb-1">Acțiune imediată:</div>
                  <div className="bg-gray-50 rounded-lg p-3 text-gray-700">{showDetail.actiune_imediata}</div>
                </div>
              )}
              {showDetail.actiune_corectiva && (
                <div>
                  <div className="text-gray-400 mb-1">Acțiune corectivă:</div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">{showDetail.actiune_corectiva}</div>
                </div>
              )}
              {showDetail.data_inchidere && (
                <div><span className="text-gray-400">Închisă la:</span> <span className="font-medium text-green-700">{showDetail.data_inchidere}</span></div>
              )}
            </div>
            {showDetail.status !== 'inchis' && (
              <div className="p-6 border-t flex gap-3 justify-end">
                {showDetail.status === 'deschis' && (
                  <button onClick={() => setInvestigare(showDetail)}
                    className="px-4 py-2 text-sm border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50">
                    Pune în investigare
                  </button>
                )}
                <button onClick={() => { setShowClose(showDetail); setAcText('') }}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  ✓ Închide NC
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ÎNCHIDERE NC */}
      {showClose && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Închidere {showClose.cod}</h2>
              <p className="text-sm text-gray-400 mt-1">{showClose.descriere?.slice(0, 80)}...</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acțiunea corectivă implementată
              </label>
              <textarea value={acText} rows={4}
                onChange={e => setAcText(e.target.value)}
                placeholder="Descrieți acțiunea corectivă implementată..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowClose(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Anulare
              </button>
              <button onClick={closeNC} disabled={saving}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Se salvează...' : '✓ Confirmă închiderea'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
