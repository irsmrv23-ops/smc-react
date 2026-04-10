import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const GRUPE = ['IST', 'TOR', 'HEP', 'IRP', 'IGI', 'GEN']

const GRUPA_LABELS = {
  IST: 'Infecții urogenitale / HPV / Biocenoze',
  TOR: 'Infecții TORCH',
  HEP: 'Hepatite virale',
  IRP: 'Infecții respiratorii',
  IGI: 'Infecții gastrointestinale',
  GEN: 'Teste genetice',
}

export default function Catalog({ userRol }) {
  const [servicii, setServicii] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filtruGrupa, setFiltruGrupa] = useState('')
  const [filtruActiv, setFiltruActiv] = useState('')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ cod: '', den: '', grupa: 'IST', activ: true })
  const isAdmin = userRol?.rol === 'admin' || userRol?.rol === 'rmc'

  useEffect(() => { loadServicii() }, [])

  async function loadServicii() {
    setLoading(true)
    const { data } = await supabase.from('servicii').select('*').order('grupa').order('cod')
    setServicii(data || [])
    setLoading(false)
  }

  async function toggleActiv(id, current) {
    if (!isAdmin) return
    await supabase.from('servicii').update({ activ: !current }).eq('id', id)
    setServicii(prev => prev.map(s => s.id === id ? { ...s, activ: !current } : s))
  }

  async function saveServiciu() {
    if (!form.cod.trim() || !form.den.trim()) { alert('Cod și denumire obligatorii!'); return }
    if (servicii.find(s => s.cod === form.cod.trim())) { alert('Codul există deja!'); return }
    setSaving(true)
    const rec = { id: form.cod.trim(), cod: form.cod.trim(), den: form.den.trim(), grupa: form.grupa, activ: form.activ, ts: new Date().toISOString() }
    const { error } = await supabase.from('servicii').insert(rec)
    if (error) { alert('Eroare: ' + error.message) }
    else { setServicii(prev => [...prev, rec].sort((a, b) => a.grupa.localeCompare(b.grupa) || a.cod.localeCompare(b.cod))); setShowAdd(false); setForm({ cod: '', den: '', grupa: 'IST', activ: true }) }
    setSaving(false)
  }

  async function deleteServiciu(id) {
    if (!window.confirm('Ștergeți serviciul?')) return
    await supabase.from('servicii').delete().eq('id', id)
    setServicii(prev => prev.filter(s => s.id !== id))
  }

  const filtered = servicii.filter(s => {
    if (filtruGrupa && s.grupa !== filtruGrupa) return false
    if (filtruActiv === 'activ' && !s.activ) return false
    if (filtruActiv === 'inactiv' && s.activ) return false
    if (search && !s.cod.toLowerCase().includes(search.toLowerCase()) && !s.den.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activi = servicii.filter(s => s.activ).length
  const inactivi = servicii.filter(s => !s.activ).length

  if (loading) return <div className="p-8 text-center text-gray-400">Se încarcă...</div>

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catalog servicii</h1>
          <p className="text-sm text-gray-500">
            {servicii.length} servicii total · <span className="text-green-600">{activi} active</span> · <span className="text-gray-400">{inactivi} inactive</span>
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Serviciu nou
          </button>
        )}
      </div>

      {/* Filtre */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Caută cod sau denumire..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48" />
        <select value={filtruGrupa} onChange={e => setFiltruGrupa(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Toate grupele</option>
          {GRUPE.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filtruActiv} onChange={e => setFiltruActiv(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Toate statusurile</option>
          <option value="activ">Doar active</option>
          <option value="inactiv">Doar inactive</option>
        </select>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Cod</th>
              <th className="px-4 py-3 text-left">Denumire</th>
              <th className="px-4 py-3 text-left">Grupă</th>
              <th className="px-4 py-3 text-left">Status</th>
              {isAdmin && <th className="px-4 py-3 text-left">Acțiuni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Niciun serviciu găsit</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className={`hover:bg-gray-50 ${!s.activ ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-sm font-bold text-blue-700">{s.cod}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{s.den}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{s.grupa}</span>
                  <span className="text-xs text-gray-400 ml-2 hidden sm:inline">{GRUPA_LABELS[s.grupa]}</span>
                </td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <button onClick={() => toggleActiv(s.id, s.activ)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer
                        ${s.activ ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {s.activ ? '✓ Activ' : '✗ Inactiv'}
                    </button>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.activ ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.activ ? '✓ Activ' : '✗ Inactiv'}
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <button onClick={() => deleteServiciu(s.id)} className="text-gray-300 hover:text-red-500">🗑️</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t text-xs text-gray-400">
          {filtered.length} servicii afișate din {servicii.length} total
        </div>
      </div>

      {/* Modal add */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">Serviciu nou</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cod *</label>
                  <input type="text" value={form.cod} onChange={e => setForm(p => ({ ...p, cod: e.target.value.toUpperCase() }))}
                    placeholder="ex. BM99" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grupă</label>
                  <select value={form.grupa} onChange={e => setForm(p => ({ ...p, grupa: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {GRUPE.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Denumire *</label>
                <input type="text" value={form.den} onChange={e => setForm(p => ({ ...p, den: e.target.value }))}
                  placeholder="ex. Parvovirus B19" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.activ} onChange={e => setForm(p => ({ ...p, activ: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Activ (apare în selecție serii)</span>
              </label>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveServiciu} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
