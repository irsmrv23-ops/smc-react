import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const NIVELURI = [
  { id: 1, cod: 'MAN', label: 'Manual Calității', desc: 'Manual + ISO 15189:2023', color: 'blue', icon: '📘' },
  { id: 2, cod: 'PG', label: 'Proceduri Generale', desc: 'PG-4.1 … PG-8.8', color: 'teal', icon: '📗' },
  { id: 3, cod: 'PS', label: 'Proceduri Specifice', desc: 'IST · TOR · HEP · IRP · IGI · GEN', color: 'amber', icon: '📙' },
  { id: 4, cod: 'F', label: 'Formulare & Registre', desc: 'Formulare digitale', color: 'purple', icon: '📋' },
  { id: 5, cod: 'EXT', label: 'Documente Externe', desc: 'IFU · Standarde · Certificate', color: 'gray', icon: '📦' },
]

const GRUPE_PS = ['IST', 'TOR', 'HEP', 'IRP', 'IGI', 'GEN']

const STATUS_OPTS = [
  { value: 'existent', label: 'Existent', color: 'bg-green-100 text-green-700' },
  { value: 'prioritar', label: 'Prioritar', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'elaborare', label: 'În elaborare', color: 'bg-blue-100 text-blue-700' },
  { value: 'lipsa', label: 'Lipsă', color: 'bg-red-100 text-red-700' },
]

const NIVEL_COLORS = {
  blue:   { btn: 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800', active: 'border-blue-600 bg-blue-600 text-white' },
  teal:   { btn: 'border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800', active: 'border-teal-600 bg-teal-600 text-white' },
  amber:  { btn: 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800', active: 'border-amber-600 bg-amber-600 text-white' },
  purple: { btn: 'border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800', active: 'border-purple-600 bg-purple-600 text-white' },
  gray:   { btn: 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-800', active: 'border-gray-600 bg-gray-600 text-white' },
}

function statusInfo(s) {
  return STATUS_OPTS.find(x => x.value === s) || STATUS_OPTS[0]
}

export default function Documente() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [nivel, setNivel] = useState(null)
  const [grupaPS, setGrupaPS] = useState('IST')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [showPDF, setShowPDF] = useState(null)
  const [uploadingId, setUploadingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const emptyForm = { cod: '', titlu: '', tip: 'PG', nivel: 2, grupa: '', editie: 1, revizie: 1, data_vigoare: '', status: 'elaborare', responsabil: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('docs')
      .select('*')
      .order('cod', { ascending: true })
    if (!error) setDocs(data || [])
    setLoading(false)
  }

  function docsForNivel(n) {
    if (!n) return docs
    const tipuri = n.id === 1 ? ['MAN'] : n.id === 2 ? ['PG'] : n.id === 3 ? ['PS', 'IL'] : n.id === 4 ? ['F', 'REG'] : ['EXT', 'AH']
    let list = docs.filter(d => tipuri.includes(d.tip) || d.nivel === n.id)
    if (n.id === 3) list = list.filter(d => d.grupa === grupaPS)
    return list
  }

  async function saveDoc() {
    if (!form.cod.trim() || !form.titlu.trim()) { alert('Cod și titlu sunt obligatorii!'); return }
    if (docs.find(d => d.cod === form.cod && d.id !== form.id)) { alert('Codul ' + form.cod + ' există deja!'); return }
    setSaving(true)
    const rec = { ...form, ts: new Date().toISOString() }
    if (!rec.id) rec.id = form.cod
    const { error } = await supabase.from('docs').upsert(rec, { onConflict: 'id' })
    if (error) { alert('Eroare: ' + error.message) }
    else {
      await loadDocs()
      setShowAdd(false)
      setShowEdit(null)
      setForm(emptyForm)
    }
    setSaving(false)
  }

  async function deleteDoc(id) {
    if (!window.confirm('Ștergeți documentul?')) return
    await supabase.from('docs').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  async function uploadPDF(docId, file) {
    if (!file) return
    setUploadingId(docId)
    try {
      const path = `docs/${docId}/${file.name}`
      const { error: upErr } = await supabase.storage.from('documente').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('documente').getPublicUrl(path)
      await supabase.from('docs').update({ fisier: urlData.publicUrl, ts: new Date().toISOString() }).eq('id', docId)
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, fisier: urlData.publicUrl } : d))
    } catch (e) {
      alert('Eroare upload: ' + e.message)
    }
    setUploadingId(null)
  }

  function openAdd(n) {
    const tipMap = { 1: 'MAN', 2: 'PG', 3: 'PS', 4: 'F', 5: 'EXT' }
    setForm({ ...emptyForm, tip: tipMap[n.id] || 'PG', nivel: n.id, grupa: n.id === 3 ? grupaPS : '' })
    setShowAdd(true)
  }

  function openEdit(doc) {
    setForm({ ...doc })
    setShowEdit(doc)
  }

  const currentDocs = docsForNivel(nivel)
  const totalFaraPDF = docs.filter(d => d.status === 'existent' && !d.fisier).length

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Documente SMC</h1>
          <p className="text-sm text-gray-500">ISO 15189:2023 · 5 niveluri ierarhice · {docs.length} documente</p>
        </div>
        {totalFaraPDF > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            ⚠ {totalFaraPDF} doc. fără PDF
          </div>
        )}
      </div>

      {/* 5 NIVELURI BUTOANE */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {NIVELURI.map(n => {
          const cnt = docsForNivel(n).length
          const isActive = nivel?.id === n.id
          const col = NIVEL_COLORS[n.color]
          return (
            <button key={n.id}
              onClick={() => setNivel(isActive ? null : n)}
              className={`border-2 rounded-xl p-4 text-left transition-all ${isActive ? col.active : col.btn}`}>
              <div className="text-2xl mb-2">{n.icon}</div>
              <div className="font-bold text-sm">Nivel {n.id}</div>
              <div className="font-bold text-base">{n.cod}</div>
              <div className={`text-xs mt-1 ${isActive ? 'opacity-80' : 'opacity-60'}`}>{n.desc}</div>
              <div className={`text-xs mt-2 font-bold ${isActive ? 'opacity-90' : ''}`}>{cnt} doc.</div>
            </button>
          )
        })}
      </div>

      {/* NIVEL 3 - GRUPE PS */}
      {nivel?.id === 3 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {GRUPE_PS.map(g => (
            <button key={g}
              onClick={() => setGrupaPS(g)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors
                ${grupaPS === g ? 'bg-amber-600 border-amber-600 text-white' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
              {g}
            </button>
          ))}
        </div>
      )}

      {/* TABEL DOCUMENTE */}
      {nivel && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="font-medium text-gray-700">
              {nivel.icon} {nivel.label} {nivel.id === 3 ? `— ${grupaPS}` : ''} · {currentDocs.length} documente
            </div>
            <button onClick={() => openAdd(nivel)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
              + Adaugă
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">Se încarcă...</div>
          ) : currentDocs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Niciun document.
              <button onClick={() => openAdd(nivel)} className="ml-2 text-blue-600 underline">Adaugă primul</button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Cod</th>
                  <th className="px-4 py-3 text-left">Titlu</th>
                  <th className="px-4 py-3 text-left">Ed./Rev.</th>
                  <th className="px-4 py-3 text-left">Dată vigoare</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">PDF</th>
                  <th className="px-4 py-3 text-left">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentDocs.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-bold text-blue-700">{d.cod}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-xs">{d.titlu}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">Ed.{d.editie||1}/Rev.{d.revizie||0}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{d.data_vigoare || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo(d.status).color}`}>
                        {statusInfo(d.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.fisier ? (
                        <button onClick={() => setShowPDF(d)}
                          className="text-blue-600 hover:text-blue-800 text-sm underline">
                          📄 Vezi
                        </button>
                      ) : (
                        <label className="cursor-pointer text-gray-400 hover:text-blue-600 text-sm">
                          {uploadingId === d.id ? '⏳...' : '📎 Upload'}
                          <input type="file" accept=".pdf" className="hidden"
                            onChange={e => uploadPDF(d.id, e.target.files[0])} />
                        </label>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(d)}
                          className="text-gray-400 hover:text-blue-600 text-sm">✏️</button>
                        <button onClick={() => deleteDoc(d.id)}
                          className="text-gray-400 hover:text-red-600 text-sm">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL ADD/EDIT */}
      {(showAdd || showEdit) && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {showEdit ? 'Editare document' : 'Document nou'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cod document *</label>
                  <input type="text" value={form.cod}
                    onChange={e => setForm(p => ({ ...p, cod: e.target.value }))}
                    placeholder="ex. PG-4.1"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                  <select value={form.tip}
                    onChange={e => setForm(p => ({ ...p, tip: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {['MAN','PG','PS','IL','F','REG','EXT','AH'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titlu document *</label>
                <input type="text" value={form.titlu}
                  onChange={e => setForm(p => ({ ...p, titlu: e.target.value }))}
                  placeholder="ex. Procedura de control al documentelor"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ediția</label>
                  <input type="number" min="1" value={form.editie}
                    onChange={e => setForm(p => ({ ...p, editie: parseInt(e.target.value)||1 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Revizia</label>
                  <input type="number" min="0" value={form.revizie}
                    onChange={e => setForm(p => ({ ...p, revizie: parseInt(e.target.value)||0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data intrării în vigoare</label>
                  <input type="date" value={form.data_vigoare}
                    onChange={e => setForm(p => ({ ...p, data_vigoare: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              {form.tip === 'PS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grupă metodologică</label>
                  <select value={form.grupa}
                    onChange={e => setForm(p => ({ ...p, grupa: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">— selectați —</option>
                    {GRUPE_PS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsabil</label>
                <input type="text" value={form.responsabil}
                  onChange={e => setForm(p => ({ ...p, responsabil: e.target.value }))}
                  placeholder="ex. Croitoru Tatiana"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => { setShowAdd(false); setShowEdit(null); setForm(emptyForm) }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Anulare
              </button>
              <button onClick={saveDoc} disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PDF VIEWER */}
      {showPDF && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',flexDirection:'column',zIndex:9999}}>
          <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
            <span className="font-mono font-bold">{showPDF.cod} — {showPDF.titlu}</span>
            <div className="flex gap-3">
              <a href={showPDF.fisier} target="_blank" rel="noreferrer"
                className="text-blue-300 hover:text-blue-100 text-sm">↗ Deschide în tab nou</a>
              <button onClick={() => setShowPDF(null)} className="text-gray-300 hover:text-white text-xl">✕</button>
            </div>
          </div>
          <iframe src={showPDF.fisier} className="flex-1 w-full" title={showPDF.titlu} />
        </div>
      )}
    </div>
  )
}
