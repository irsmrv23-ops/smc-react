import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIPURI_KIT = ['amplificare', 'extractie', 'control', 'reactiv', 'consumabil', 'altul']
const ECHIPAMENTE_LIST = [
  { id: 'DTprime-A5I842', den: 'DTprime 5M1 (A5I842)', tip: 'termocicler' },
  { id: 'DTprime-A5JN90', den: 'DTprime 5M1 (A5JN90)', tip: 'termocicler' },
  { id: 'DTprime-A5J776', den: 'DTprime 5M1 (A5J776)', tip: 'termocicler' },
  { id: 'DTprime2-R5N637', den: 'DTprime II 5M1 (R5N637)', tip: 'termocicler' },
  { id: 'RotorGene-R1016141', den: 'Rotor-Gene Q6 (R1016141)', tip: 'termocicler' },
  { id: 'QuantStudio-272526064', den: 'QuantStudio 5 (272526064)', tip: 'termocicler' },
  { id: 'GeneXpert-110009739', den: 'GeneXpert XVI (110009739)', tip: 'termocicler' },
  { id: 'SeqStudio', den: 'SeqStudio Genetic Analyzer', tip: 'secventiator' },
  { id: 'IonGeneStudio', den: 'Ion GeneStudio S5', tip: 'secventiator' },
  { id: 'Centrifuga1', den: 'Centrifugă (lab 1)', tip: 'centrifuga' },
  { id: 'Centrifuga2', den: 'Centrifugă (lab 2)', tip: 'centrifuga' },
  { id: 'HotaLaminar1', den: 'Hotă flux laminar (Sala 1)', tip: 'hota' },
  { id: 'HotaLaminar2', den: 'Hotă flux laminar (Sala 2)', tip: 'hota' },
  { id: 'Frigider1', den: 'Frigider reactivi (2-8°C)', tip: 'frigider' },
  { id: 'Congelator1', den: 'Congelator probe (-20°C)', tip: 'congelator' },
  { id: 'Congelator2', den: 'Congelator probe (-80°C)', tip: 'congelator' },
  { id: 'Balance1', den: 'Balanță analitică', tip: 'balanta' },
  { id: 'Pipeta1', den: 'Pipete multicanal (set)', tip: 'pipeta' },
  { id: 'Vortex1', den: 'Vortex mixer', tip: 'vortex' },
  { id: 'Termobloc1', den: 'Termobloc', tip: 'termobloc' },
]

const TIPURI_METRO = ['etalonare', 'verificare', 'mentenanta', 'reparatie', 'calificare']

function todayStr() { return new Date().toISOString().slice(0, 10) }
function daysUntil(d) { if (!d) return 9999; return Math.ceil((new Date(d) - new Date()) / 86400000) }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ro-RO') }

export default function Stocuri() {
  const [tab, setTab] = useState('stocuri')
  const [stoc, setStoc] = useState([])
  const [miscari, setMiscari] = useState([])
  const [metro, setMetro] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Stoc forms
  const [showAddKit, setShowAddKit] = useState(false)
  const [showMiscare, setShowMiscare] = useState(null)
  const [kitForm, setKitForm] = useState({ cod: '', den: '', tip: 'amplificare', producator: '', lot: '', expirare: '', cantitate: 1, teste_per_kit: 96, stoc_min: 1, obs: '' })
  const [miscareForm, setMiscareForm] = useState({ tip: 'intrare', cant: 1, motiv: '', data: todayStr() })

  // Metro forms
  const [showAddMetro, setShowAddMetro] = useState(false)
  const [metroForm, setMetroForm] = useState({ echipament: ECHIPAMENTE_LIST[0].den, tip: 'etalonare', data_ef: todayStr(), data_sc: '', exec_tip: 'extern', exec_firma: '', cert: '', cost: '', obs: '' })
  const [metroEch, setMetroEch] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [s, m, mt] = await Promise.all([
      supabase.from('stoc_data').select('*').order('cod', { ascending: true }),
      supabase.from('miscari').select('*').order('ts', { ascending: false }).limit(100),
      supabase.from('metro_data').select('*').order('data_sc', { ascending: true }),
    ])
    setStoc(s.data || [])
    setMiscari(m.data || [])
    setMetro(mt.data || [])
    setLoading(false)
  }

  // ── STOCURI ────────────────────────────────────────────────
  async function saveKit() {
    if (!kitForm.cod || !kitForm.den) { alert('Cod și denumire obligatorii!'); return }
    setSaving(true)
    const rec = { id: 'KIT-' + Date.now(), ...kitForm, cantitate: parseFloat(kitForm.cantitate) || 0, teste_per_kit: parseInt(kitForm.teste_per_kit) || 96, stoc_min: parseFloat(kitForm.stoc_min) || 1, ts: new Date().toISOString() }
    const { error } = await supabase.from('stoc_data').insert(rec)
    if (error) { alert('Eroare: ' + error.message) }
    else { setStoc(prev => [...prev, rec]); setShowAddKit(false); setKitForm({ cod: '', den: '', tip: 'amplificare', producator: '', lot: '', expirare: '', cantitate: 1, teste_per_kit: 96, stoc_min: 1, obs: '' }) }
    setSaving(false)
  }

  async function saveMiscare() {
    if (!miscareForm.cant || parseFloat(miscareForm.cant) <= 0) { alert('Introduceți cantitatea!'); return }
    setSaving(true)
    const kit = showMiscare
    const cant = parseFloat(miscareForm.cant)
    const newCant = miscareForm.tip === 'intrare' ? kit.cantitate + cant : Math.max(0, kit.cantitate - cant)
    const misRec = { id: 'MIS-' + Date.now(), kit_id: kit.id, kit_den: kit.den, kit_cod: kit.cod, tip: miscareForm.tip, cant, data: miscareForm.data, motiv: miscareForm.motiv, stoc_dupa: newCant, ts: new Date().toISOString() }
    const { error } = await supabase.from('miscari').insert(misRec)
    if (!error) {
      await supabase.from('stoc_data').update({ cantitate: newCant, ts: new Date().toISOString() }).eq('id', kit.id)
      setStoc(prev => prev.map(s => s.id === kit.id ? { ...s, cantitate: newCant } : s))
      setMiscari(prev => [misRec, ...prev])
      setShowMiscare(null)
      if (newCant <= kit.stoc_min) alert('⚠ Stoc minim atins pentru ' + kit.den + '!')
    }
    setSaving(false)
  }

  async function deleteKit(id) {
    if (!window.confirm('Ștergeți kitul din stoc?')) return
    await supabase.from('stoc_data').delete().eq('id', id)
    setStoc(prev => prev.filter(s => s.id !== id))
  }

  // ── METROLOGIE ─────────────────────────────────────────────
  async function saveMetro() {
    if (!metroForm.echipament || !metroForm.data_ef) { alert('Echipament și data sunt obligatorii!'); return }
    setSaving(true)
    const rec = { id: 'MTR-' + Date.now(), ...metroForm, cost: metroForm.cost ? parseFloat(metroForm.cost) : null, ts: new Date().toISOString() }
    const { error } = await supabase.from('metro_data').insert(rec)
    if (error) { alert('Eroare: ' + error.message) }
    else { setMetro(prev => [...prev, rec].sort((a, b) => (a.data_sc || '').localeCompare(b.data_sc || ''))); setShowAddMetro(false) }
    setSaving(false)
  }

  async function uploadMetroCert(metroId, file) {
    if (!file) return
    const path = `metro/${metroId}/${file.name}`
    const { error } = await supabase.storage.from('documente').upload(path, file, { upsert: true })
    if (error) { alert('Eroare upload: ' + error.message); return }
    const { data } = supabase.storage.from('documente').getPublicUrl(path)
    await supabase.from('metro_data').update({ cert_url: data.publicUrl }).eq('id', metroId)
    setMetro(prev => prev.map(m => m.id === metroId ? { ...m, cert_url: data.publicUrl } : m))
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Se încarcă...</div>

  const expirateKituri = stoc.filter(s => s.expirare && s.expirare < todayStr())
  const stocMinim = stoc.filter(s => s.cantitate <= s.stoc_min)
  const metroExpirate = metro.filter(m => m.data_sc && daysUntil(m.data_sc) < 0)
  const metroCurand = metro.filter(m => m.data_sc && daysUntil(m.data_sc) >= 0 && daysUntil(m.data_sc) <= 30)

  const echMetro = metroEch ? metro.filter(m => m.echipament === metroEch) : metro

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Stocuri & Metrologie</h1>
        <p className="text-sm text-gray-500">Kituri · Reactivi · Echipamente · Etalonare</p>
      </div>

      {/* Alerte */}
      {(expirateKituri.length > 0 || stocMinim.length > 0 || metroExpirate.length > 0 || metroCurand.length > 0) && (
        <div className="space-y-2 mb-6">
          {expirateKituri.map(k => (
            <div key={k.id} className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              ⚠ Kit expirat: <strong>{k.den}</strong> — expirat la {fmtDate(k.expirare)}
            </div>
          ))}
          {stocMinim.map(k => (
            <div key={k.id} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
              📦 Stoc minim: <strong>{k.den}</strong> — {k.cantitate} kituri rămase (minim: {k.stoc_min})
            </div>
          ))}
          {metroExpirate.map(m => (
            <div key={m.id} className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              🔧 Metrologie expirată: <strong>{m.echipament?.split('(')[0]?.trim()}</strong> — scadentă la {fmtDate(m.data_sc)}
            </div>
          ))}
          {metroCurand.map(m => (
            <div key={m.id} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
              🔧 Metrologie scadentă în {daysUntil(m.data_sc)} zile: <strong>{m.echipament?.split('(')[0]?.trim()}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'stocuri', label: 'Stocuri', icon: '📦' },
          { id: 'miscari', label: 'Mișcări', icon: '📋' },
          { id: 'metrologie', label: 'Metrologie', icon: '🔧' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
              ${tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ STOCURI ══════════════════════════════════════════ */}
      {tab === 'stocuri' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="grid grid-cols-3 gap-4 flex-1 mr-4">
              <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{stoc.length}</div>
                <div className="text-xs text-gray-400">Total kituri</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{expirateKituri.length}</div>
                <div className="text-xs text-red-400">Expirate</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{stocMinim.length}</div>
                <div className="text-xs text-amber-400">Stoc minim</div>
              </div>
            </div>
            <button onClick={() => setShowAddKit(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
              + Kit nou
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {stoc.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Niciun kit în stoc</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Cod</th>
                    <th className="px-4 py-3 text-left">Denumire</th>
                    <th className="px-4 py-3 text-left">Tip</th>
                    <th className="px-4 py-3 text-left">Lot</th>
                    <th className="px-4 py-3 text-left">Expiră</th>
                    <th className="px-4 py-3 text-left">Stoc</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stoc.map(s => {
                    const expirat = s.expirare && s.expirare < todayStr()
                    const minim = s.cantitate <= s.stoc_min
                    return (
                      <tr key={s.id} className={`hover:bg-gray-50 ${expirat ? 'bg-red-50' : minim ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700">{s.cod}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{s.den}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s.tip}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{s.lot || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={expirat ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {fmtDate(s.expirare)} {expirat ? '⚠' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${minim ? 'text-red-600' : 'text-gray-700'}`}>
                            {s.cantitate}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">/{s.stoc_min} min</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium
                            ${expirat ? 'bg-red-100 text-red-700' : minim ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {expirat ? 'Expirat' : minim ? 'Stoc minim' : 'OK'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => { setShowMiscare(s); setMiscareForm({ tip: 'intrare', cant: 1, motiv: '', data: todayStr() }) }}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                              ± Mișcare
                            </button>
                            <button onClick={() => deleteKit(s.id)}
                              className="text-gray-300 hover:text-red-500">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ MIȘCĂRI ══════════════════════════════════════════ */}
      {tab === 'miscari' && (
        <div className="bg-white rounded-xl border border-gray-200">
          {miscari.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Nicio mișcare înregistrată</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Kit</th>
                  <th className="px-4 py-3 text-left">Tip</th>
                  <th className="px-4 py-3 text-left">Cantitate</th>
                  <th className="px-4 py-3 text-left">Stoc după</th>
                  <th className="px-4 py-3 text-left">Motiv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {miscari.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{m.data}</td>
                    <td className="px-4 py-3 text-sm font-medium">{m.kit_den}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.tip === 'intrare' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.tip === 'intrare' ? '↑ Intrare' : '↓ Ieșire'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">{m.cant}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.stoc_dupa}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.motiv || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ═══ METROLOGIE ═══════════════════════════════════════ */}
      {tab === 'metrologie' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2 flex-wrap flex-1 mr-4">
              <button onClick={() => setMetroEch(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!metroEch ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600'}`}>
                Toate
              </button>
              {[...new Set(metro.map(m => m.echipament))].map(e => (
                <button key={e} onClick={() => setMetroEch(metroEch === e ? null : e)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${metroEch === e ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  {e?.split('(')[0]?.trim()}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddMetro(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
              + Înregistrare
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{metro.length}</div>
              <div className="text-xs text-gray-400">Total înregistrări</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{metroExpirate.length}</div>
              <div className="text-xs text-red-400">Expirate</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{metroCurand.length}</div>
              <div className="text-xs text-amber-400">Scadente în 30 zile</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {echMetro.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nicio înregistrare metrologie</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Echipament</th>
                    <th className="px-4 py-3 text-left">Tip</th>
                    <th className="px-4 py-3 text-left">Data efectuare</th>
                    <th className="px-4 py-3 text-left">Scadență</th>
                    <th className="px-4 py-3 text-left">Executant</th>
                    <th className="px-4 py-3 text-left">Certificat</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {echMetro.map(m => {
                    const days = daysUntil(m.data_sc)
                    const expirat = days < 0
                    const curand = days >= 0 && days <= 30
                    return (
                      <tr key={m.id} className={`hover:bg-gray-50 ${expirat ? 'bg-red-50' : curand ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium">{m.echipament?.split('(')[0]?.trim()}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs capitalize">{m.tip}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(m.data_ef)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={expirat ? 'text-red-600 font-medium' : curand ? 'text-amber-600 font-medium' : 'text-gray-600'}>
                            {fmtDate(m.data_sc)} {expirat ? `(${Math.abs(days)}z)` : curand ? `(${days}z)` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{m.exec_firma || m.exec_tip}</td>
                        <td className="px-4 py-3">
                          {m.cert_url ? (
                            <a href={m.cert_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline">📄 Vezi</a>
                          ) : (
                            <label className="cursor-pointer text-gray-400 hover:text-blue-600 text-sm">
                              📎 Upload
                              <input type="file" accept=".pdf" className="hidden"
                                onChange={e => uploadMetroCert(m.id, e.target.files[0])} />
                            </label>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${expirat ? 'bg-red-100 text-red-700' : curand ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {expirat ? '✗ Expirat' : curand ? '⏰ Curand' : '✓ Valabil'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ MODAL KIT NOU ════════════════════════════════════ */}
      {showAddKit && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">Kit / Reactiv nou</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cod *</label>
                  <input type="text" value={kitForm.cod} onChange={e => setKitForm(p => ({ ...p, cod: e.target.value }))}
                    placeholder="ex. KIT-CT-001" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                  <select value={kitForm.tip} onChange={e => setKitForm(p => ({ ...p, tip: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {TIPURI_KIT.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Denumire *</label>
                <input type="text" value={kitForm.den} onChange={e => setKitForm(p => ({ ...p, den: e.target.value }))}
                  placeholder="ex. AmpliSens Chlamydia trachomatis-FL" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producător</label>
                  <input type="text" value={kitForm.producator} onChange={e => setKitForm(p => ({ ...p, producator: e.target.value }))}
                    placeholder="ex. AmpliSens" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nr. lot</label>
                  <input type="text" value={kitForm.lot} onChange={e => setKitForm(p => ({ ...p, lot: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expirare</label>
                  <input type="date" value={kitForm.expirare} onChange={e => setKitForm(p => ({ ...p, expirare: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantitate</label>
                  <input type="number" min="0" step="0.5" value={kitForm.cantitate} onChange={e => setKitForm(p => ({ ...p, cantitate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teste/kit</label>
                  <input type="number" min="1" value={kitForm.teste_per_kit} onChange={e => setKitForm(p => ({ ...p, teste_per_kit: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stoc minim alertă</label>
                <input type="number" min="0" step="0.5" value={kitForm.stoc_min} onChange={e => setKitForm(p => ({ ...p, stoc_min: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddKit(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveKit} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL MIȘCARE ════════════════════════════════════ */}
      {showMiscare && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Mișcare stoc</h2>
              <p className="text-sm text-gray-500 mt-1">{showMiscare.den} · Stoc curent: <strong>{showMiscare.cantitate}</strong></p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {['intrare', 'iesire'].map(t => (
                  <button key={t} onClick={() => setMiscareForm(p => ({ ...p, tip: t }))}
                    className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors
                      ${miscareForm.tip === t ? t === 'intrare' ? 'bg-green-600 border-green-600 text-white' : 'bg-red-600 border-red-600 text-white' : 'border-gray-200 text-gray-600'}`}>
                    {t === 'intrare' ? '↑ Intrare' : '↓ Ieșire'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantitate</label>
                  <input type="number" min="0.5" step="0.5" value={miscareForm.cant}
                    onChange={e => setMiscareForm(p => ({ ...p, cant: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" value={miscareForm.data}
                    onChange={e => setMiscareForm(p => ({ ...p, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motiv</label>
                <input type="text" value={miscareForm.motiv}
                  onChange={e => setMiscareForm(p => ({ ...p, motiv: e.target.value }))}
                  placeholder="ex. Recepție lot nou, Utilizare serie IST"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className={`rounded-lg p-3 text-sm font-medium ${miscareForm.tip === 'intrare' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                Stoc după mișcare: {miscareForm.tip === 'intrare' ? showMiscare.cantitate + parseFloat(miscareForm.cant || 0) : Math.max(0, showMiscare.cantitate - parseFloat(miscareForm.cant || 0))}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowMiscare(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveMiscare} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL METROLOGIE NOU ═════════════════════════════ */}
      {showAddMetro && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">Înregistrare metrologie</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Echipament</label>
                <select value={metroForm.echipament} onChange={e => setMetroForm(p => ({ ...p, echipament: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {ECHIPAMENTE_LIST.map(e => <option key={e.id} value={e.den}>{e.den}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip intervenție</label>
                  <select value={metroForm.tip} onChange={e => setMetroForm(p => ({ ...p, tip: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {TIPURI_METRO.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Executant</label>
                  <select value={metroForm.exec_tip} onChange={e => setMetroForm(p => ({ ...p, exec_tip: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="extern">Firmă externă</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma executantă</label>
                <input type="text" value={metroForm.exec_firma} onChange={e => setMetroForm(p => ({ ...p, exec_firma: e.target.value }))}
                  placeholder="ex. MetroLab SRL" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data efectuare</label>
                  <input type="date" value={metroForm.data_ef} onChange={e => setMetroForm(p => ({ ...p, data_ef: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scadență următoare</label>
                  <input type="date" value={metroForm.data_sc} onChange={e => setMetroForm(p => ({ ...p, data_sc: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nr. certificat</label>
                  <input type="text" value={metroForm.cert} onChange={e => setMetroForm(p => ({ ...p, cert: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost (MDL)</label>
                  <input type="number" value={metroForm.cost} onChange={e => setMetroForm(p => ({ ...p, cost: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observații</label>
                <textarea value={metroForm.obs} rows={2} onChange={e => setMetroForm(p => ({ ...p, obs: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddMetro(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveMetro} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
