import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SALI = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 1A']
const PERSONAL = ['Rotari Ion', 'Croitoru Tatiana', 'Jentimir Valeria', 'Andrian Maria', 'Antropov Marina']
const TEMP_MIN = 18, TEMP_MAX = 24, UMID_MIN = 65, UMID_MAX = 75

function todayStr() { return new Date().toISOString().slice(0, 10) }
function nowTime() { return new Date().toTimeString().slice(0, 5) }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ro-RO') }
function isWorkday() { const d = new Date().getDay(); return d >= 1 && d <= 5 }

export default function Registre() {
  const [tab, setTab] = useState('temperatura')
  const [tempData, setTempData] = useState([])
  const [uvData, setUvData] = useState([])
  const [uvLampi, setUvLampi] = useState({ 'Sala 1': 0, 'Sala 2': 0, 'Sala 3': 0, 'Sala 1A': 0 })
  const [curData, setCurData] = useState([])
  const [solutii, setSolutii] = useState([])
  const [deseuri, setDeseuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Active sala per tab
  const [tempSala, setTempSala] = useState('Sala 1')
  const [uvSala, setUvSala] = useState('Sala 1')
  const [curSala, setCurSala] = useState('Sala 1')

  // Modals
  const [showTemp, setShowTemp] = useState(false)
  const [showUV, setShowUV] = useState(false)
  const [showUVConfig, setShowUVConfig] = useState(false)
  const [showCur, setShowCur] = useState(false)
  const [showSolutii, setShowSolutii] = useState(false)
  const [showDeseu, setShowDeseu] = useState(false)
  const [showRaportDeseu, setShowRaportDeseu] = useState(false)

  // Forms
  const [tempForm, setTempForm] = useState({ sala: 'Sala 1', temp: '', umid: '', responsabil: PERSONAL[0] })
  const [uvForm, setUvForm] = useState({ sala: 'Sala 1', interval: '08:00-08:30', specialist: PERSONAL[0] })
  const [uvConfigSala, setUvConfigSala] = useState('Sala 1')
  const [uvConfigOre, setUvConfigOre] = useState('')
  const [curForm, setCurForm] = useState({ sala: 'Sala 1', solutie: '', operator: PERSONAL[0], obs: '' })
  const [nouaSolutie, setNouaSolutie] = useState('')
  const [deseuForm, setDeseuForm] = useState({ cantitate: '', responsabil: PERSONAL[0] })
  const [rapLuna, setRapLuna] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [t, uv, ul, c, s, d] = await Promise.all([
      supabase.from('temp_data').select('*').order('ts', { ascending: false }).limit(200),
      supabase.from('uv_data').select('*').order('ts', { ascending: false }).limit(200),
      supabase.from('uv_lampi').select('*'),
      supabase.from('curatenie_data').select('*').order('ts', { ascending: false }).limit(100),
      supabase.from('solutii').select('*').order('ts', { ascending: false }),
      supabase.from('deseuri_data').select('*').order('ts', { ascending: false }).limit(100),
    ])
    setTempData(t.data || [])
    setUvData(uv.data || [])
    const lampiObj = { 'Sala 1': 0, 'Sala 2': 0, 'Sala 3': 0, 'Sala 1A': 0 }
    ;(ul.data || []).forEach(l => { lampiObj[l.sala] = parseFloat(l.ore) || 0 })
    setUvLampi(lampiObj)
    setCurData(c.data || [])
    setSolutii(s.data || [])
    setDeseuri(d.data || [])
    setLoading(false)
  }

  // ── TEMPERATURĂ ────────────────────────────────────────────
  async function saveTemp() {
    const temp = parseFloat(tempForm.temp)
    const umid = parseFloat(tempForm.umid)
    if (isNaN(temp) || isNaN(umid)) { alert('Introduceți temperatura și umiditatea!'); return }
    setSaving(true)
    const rec = {
      id: 'TEMP-' + Date.now(),
      data: todayStr(), ora: nowTime(),
      sala: tempForm.sala, temp, umid,
      responsabil: tempForm.responsabil,
      ts: new Date().toISOString(),
    }
    const { error } = await supabase.from('temp_data').insert(rec)
    if (!error) {
      setTempData(prev => [rec, ...prev])
      setShowTemp(false)
      setTempForm(p => ({ ...p, temp: '', umid: '' }))
      const tempOk = temp >= TEMP_MIN && temp <= TEMP_MAX
      const umidOk = umid >= UMID_MIN && umid <= UMID_MAX
      if (!tempOk || !umidOk) {
        alert(`⚠ Valori în afara limitelor!\n${!tempOk ? `Temperatură: ${temp}°C (18–24°C)\n` : ''}${!umidOk ? `Umiditate: ${umid}% (65–75%)` : ''}`)
      }
    }
    setSaving(false)
  }

  // ── LAMPĂ UV ───────────────────────────────────────────────
  async function saveUV() {
    const d = new Date()
    if (d.getDay() === 0 || d.getDay() === 6) { alert('Iradierea UV se efectuează doar Luni–Vineri!'); return }
    setSaving(true)
    const sala = uvForm.sala
    const oreCurente = uvLampi[sala] || 0
    const oreDupa = Math.max(0, oreCurente - 0.5)
    const rec = {
      id: 'UV-' + Date.now(),
      data: todayStr(), interval: uvForm.interval, sala,
      specialist: uvForm.specialist,
      ore_inainte: oreCurente, ore_dupa: oreDupa,
      ts: new Date().toISOString(),
    }
    const { error } = await supabase.from('uv_data').insert(rec)
    if (!error) {
      await supabase.from('uv_lampi').upsert({ sala, ore: oreDupa, updated: new Date().toISOString() }, { onConflict: 'sala' })
      setUvData(prev => [rec, ...prev])
      setUvLampi(prev => ({ ...prev, [sala]: oreDupa }))
      setShowUV(false)
      if (oreDupa < 100) alert(`⚠ Lampă UV ${sala}: doar ${oreDupa.toFixed(1)} ore rămase! Planificați înlocuirea.`)
    }
    setSaving(false)
  }

  async function saveUVConfig() {
    const ore = parseFloat(uvConfigOre)
    if (isNaN(ore) || ore < 0) { alert('Introduceți orele valabile!'); return }
    await supabase.from('uv_lampi').upsert({ sala: uvConfigSala, ore, updated: new Date().toISOString() }, { onConflict: 'sala' })
    setUvLampi(prev => ({ ...prev, [uvConfigSala]: ore }))
    setUvConfigOre('')
    setShowUVConfig(false)
  }

  // ── CURĂȚENIE ──────────────────────────────────────────────
  async function saveCuratenie() {
    if (!curForm.solutie) { alert('Selectați soluția dezinfectantă!'); return }
    setSaving(true)
    const rec = {
      id: 'CUR-' + Date.now(),
      sala: curForm.sala, data_ef: todayStr(),
      solutie: curForm.solutie,
      operator: curForm.operator, obs: curForm.obs,
      supervizat_la: null, supervizat_de: null,
      ts: new Date().toISOString(),
    }
    const { error } = await supabase.from('curatenie_data').insert(rec)
    if (!error) {
      setCurData(prev => [rec, ...prev])
      setShowCur(false)
      setCurForm(p => ({ ...p, obs: '' }))
      // Check solutie > 6 luni
      const sol = solutii.find(s => s.den === curForm.solutie)
      if (sol) {
        const days = Math.floor((new Date() - new Date(sol.data)) / 86400000)
        if (days > 180) alert(`⚠ Soluția "${sol.den}" se folosește de ${days} zile (>6 luni)!\nSchimbați soluția dezinfectantă!`)
      }
    }
    setSaving(false)
  }

  async function supervizareCuratenie(id) {
    const updates = { supervizat_la: todayStr(), supervizat_de: PERSONAL[0], ts: new Date().toISOString() }
    await supabase.from('curatenie_data').update(updates).eq('id', id)
    setCurData(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  async function addSolutie() {
    if (!nouaSolutie.trim()) return
    const rec = { id: 'SOL-' + Date.now(), den: nouaSolutie.trim(), data: todayStr(), ts: new Date().toISOString() }
    await supabase.from('solutii').insert(rec)
    setSolutii(prev => [rec, ...prev])
    setNouaSolutie('')
  }

  async function deleteSolutie(id) {
    await supabase.from('solutii').delete().eq('id', id)
    setSolutii(prev => prev.filter(s => s.id !== id))
  }

  // ── DEȘEURI ────────────────────────────────────────────────
  async function saveDeseu() {
    const cant = parseFloat(deseuForm.cantitate)
    if (!cant || cant <= 0) { alert('Introduceți cantitatea!'); return }
    setSaving(true)
    const rec = {
      id: 'DES-' + Date.now(),
      data: todayStr(), ora: nowTime(),
      sectia: 'Biologie Moleculară', cod: '18.01.03',
      cantitate: cant, responsabil: deseuForm.responsabil,
      ts: new Date().toISOString(),
    }
    const { error } = await supabase.from('deseuri_data').insert(rec)
    if (!error) { setDeseuri(prev => [rec, ...prev]); setShowDeseu(false); setDeseuForm(p => ({ ...p, cantitate: '' })) }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Se încarcă...</div>

  const tabs = [
    { id: 'temperatura', label: 'Temperatură & Umiditate', icon: '🌡️' },
    { id: 'uv', label: 'Lampă UV', icon: '💡' },
    { id: 'curatenie', label: 'Curățenie', icon: '🧹' },
    { id: 'deseuri', label: 'Deșeuri biologice', icon: '🗑️' },
  ]

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Registre electronice</h1>
        <p className="text-sm text-gray-500">Înregistrări zilnice · ISO 15189:2023 §6.3</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
              ${tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ TEMPERATURĂ ══════════════════════════════════════ */}
      {tab === 'temperatura' && (
        <div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
            Limite: 🌡️ 18–24°C · 💧 65–75% · PG-6.3/F-01
          </div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {SALI.map(s => (
              <button key={s} onClick={() => setTempSala(s)}
                className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors
                  ${tempSala === s ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                {s}
              </button>
            ))}
            <button onClick={() => { setTempForm(p => ({ ...p, sala: tempSala })); setShowTemp(true) }}
              className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Citire nouă
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {tempData.filter(d => d.sala === tempSala).length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nicio citire pentru {tempSala}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Ora</th>
                    <th className="px-4 py-3 text-left">Temperatură</th>
                    <th className="px-4 py-3 text-left">Umiditate</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Responsabil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tempData.filter(d => d.sala === tempSala).slice(0, 60).map(d => {
                    const tOk = d.temp >= TEMP_MIN && d.temp <= TEMP_MAX
                    const uOk = d.umid >= UMID_MIN && d.umid <= UMID_MAX
                    const ok = tOk && uOk
                    return (
                      <tr key={d.id} className={ok ? '' : 'bg-red-50'}>
                        <td className="px-4 py-3 text-sm">{fmtDate(d.data)}</td>
                        <td className="px-4 py-3 text-sm font-mono">{d.ora}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-sm ${tOk ? 'text-gray-700' : 'text-red-600'}`}>
                            {d.temp}°C {!tOk && '⚠'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-sm ${uOk ? 'text-gray-700' : 'text-red-600'}`}>
                            {d.umid}% {!uOk && '⚠'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {ok ? '✓ OK' : '✗ Depășit'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{d.responsabil}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ LAMPĂ UV ══════════════════════════════════════════ */}
      {tab === 'uv' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            {SALI.map(s => {
              const ore = uvLampi[s] || 0
              const col = ore < 100 ? 'text-red-600' : ore < 500 ? 'text-amber-600' : 'text-green-600'
              return (
                <button key={s} onClick={() => setUvSala(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors
                    ${uvSala === s ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                  {s} <span className={`text-xs ml-1 ${uvSala === s ? 'text-purple-200' : col}`}>({ore.toFixed(0)}h)</span>
                </button>
              )
            })}
            <div className="ml-auto flex gap-2">
              <button onClick={() => setShowUVConfig(true)} className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm">⚙️ Config</button>
              <button onClick={() => { setUvForm(p => ({ ...p, sala: uvSala })); setShowUV(true) }}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                + Iradiere
              </button>
            </div>
          </div>

          {/* Ore valabilitate card */}
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 32 }}>💡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9' }}>{uvSala} — Ore valabilitate</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: uvLampi[uvSala] < 100 ? '#dc2626' : uvLampi[uvSala] < 500 ? '#d97706' : '#16a34a' }}>
                {(uvLampi[uvSala] || 0).toFixed(1)} ore rămase
              </div>
              {(uvLampi[uvSala] || 0) < 100 && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>⚠ Lampă aproape de final! Înlocuiți curând.</div>}
              {(uvLampi[uvSala] || 0) === 0 && <div style={{ fontSize: 12, color: '#d97706' }}>Configurați orele inițiale cu butonul ⚙️ Config</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {uvData.filter(d => d.sala === uvSala).length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nicio iradiere pentru {uvSala}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Interval</th>
                    <th className="px-4 py-3 text-left">Ore după</th>
                    <th className="px-4 py-3 text-left">Specialist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {uvData.filter(d => d.sala === uvSala).slice(0, 60).map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{fmtDate(d.data)}</td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-purple-700">{d.interval}</td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: parseFloat(d.ore_dupa) < 100 ? '#dc2626' : '#16a34a' }}>
                        {parseFloat(d.ore_dupa || 0).toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.specialist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ CURĂȚENIE ════════════════════════════════════════ */}
      {tab === 'curatenie' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            {SALI.map(s => (
              <button key={s} onClick={() => setCurSala(s)}
                className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors
                  ${curSala === s ? 'bg-green-600 border-green-600 text-white' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
                {s}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button onClick={() => setShowSolutii(true)} className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm">🧴 Soluții</button>
              <button onClick={() => { setCurForm(p => ({ ...p, sala: curSala })); setShowCur(true) }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                ✓ Confirmă curățenie
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {curData.filter(d => d.sala === curSala).length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nicio curățenie pentru {curSala}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Nr.</th>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Soluție dezinfectantă</th>
                    <th className="px-4 py-3 text-left">Efectuat de</th>
                    <th className="px-4 py-3 text-left">Supervizat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {curData.filter(d => d.sala === curSala).map((d, i, arr) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-400">{arr.length - i}</td>
                      <td className="px-4 py-3 text-sm">{fmtDate(d.data_ef)}</td>
                      <td className="px-4 py-3 text-sm">{d.solutie}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{d.operator}</td>
                      <td className="px-4 py-3">
                        {d.supervizat_la ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">✓ {fmtDate(d.supervizat_la)}</span>
                        ) : (
                          <button onClick={() => supervizareCuratenie(d.id)}
                            className="px-2 py-1 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50">
                            Supervizează
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ DEȘEURI ══════════════════════════════════════════ */}
      {tab === 'deseuri' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-500">
              Total luna curentă: <strong>
                {deseuri.filter(d => d.data?.startsWith(todayStr().slice(0, 7))).reduce((s, d) => s + (d.cantitate || 0), 0).toFixed(2)} kg
              </strong>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowRaportDeseu(true)}
                className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm">
                📊 Raport lunar
              </button>
              <button onClick={() => setShowDeseu(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                + Înregistrare
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {deseuri.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nicio înregistrare</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Ora</th>
                    <th className="px-4 py-3 text-left">Secția</th>
                    <th className="px-4 py-3 text-left">Cod</th>
                    <th className="px-4 py-3 text-left">Cantitate</th>
                    <th className="px-4 py-3 text-left">Responsabil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deseuri.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{fmtDate(d.data)}</td>
                      <td className="px-4 py-3 text-sm font-mono">{d.ora}</td>
                      <td className="px-4 py-3 text-sm">{d.sectia}</td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-red-700">{d.cod}</td>
                      <td className="px-4 py-3 text-sm font-bold">{d.cantitate} kg</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{d.responsabil}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ MODAL TEMPERATURĂ ════════════════════════════════ */}
      {showTemp && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">🌡️ Citire Temperatură & Umiditate</h2>
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '6px 12px', marginTop: 8, fontSize: 12, color: '#1e40af' }}>
                {fmtDate(todayStr())} · {nowTime()} · <strong>Data blocată</strong>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incăperea</label>
                <select value={tempForm.sala} onChange={e => setTempForm(p => ({ ...p, sala: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {SALI.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (°C)</label>
                  <input type="number" step="0.1" value={tempForm.temp}
                    onChange={e => setTempForm(p => ({ ...p, temp: e.target.value }))}
                    placeholder="ex. 21.5"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Umiditate (%)</label>
                  <input type="number" step="0.1" value={tempForm.umid}
                    onChange={e => setTempForm(p => ({ ...p, umid: e.target.value }))}
                    placeholder="ex. 68.0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              {tempForm.temp && tempForm.umid && (
                <div style={{
                  background: (parseFloat(tempForm.temp) >= TEMP_MIN && parseFloat(tempForm.temp) <= TEMP_MAX && parseFloat(tempForm.umid) >= UMID_MIN && parseFloat(tempForm.umid) <= UMID_MAX) ? '#d1fae5' : '#fee2e2',
                  color: (parseFloat(tempForm.temp) >= TEMP_MIN && parseFloat(tempForm.temp) <= TEMP_MAX && parseFloat(tempForm.umid) >= UMID_MIN && parseFloat(tempForm.umid) <= UMID_MAX) ? '#065f46' : '#991b1b',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600
                }}>
                  🌡️ {parseFloat(tempForm.temp) >= TEMP_MIN && parseFloat(tempForm.temp) <= TEMP_MAX ? '✓' : '✗'} {tempForm.temp}°C &nbsp;·&nbsp;
                  💧 {parseFloat(tempForm.umid) >= UMID_MIN && parseFloat(tempForm.umid) <= UMID_MAX ? '✓' : '✗'} {tempForm.umid}%
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsabil</label>
                <select value={tempForm.responsabil} onChange={e => setTempForm(p => ({ ...p, responsabil: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {PERSONAL.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowTemp(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveTemp} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL UV ════════════════════════════════════════ */}
      {showUV && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">💡 Iradiere UV</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incăperea</label>
                <select value={uvForm.sala} onChange={e => setUvForm(p => ({ ...p, sala: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {SALI.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interval iradiere</label>
                <select value={uvForm.interval} onChange={e => setUvForm(p => ({ ...p, interval: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="08:00-08:30">08:00 – 08:30</option>
                  <option value="14:00-14:30">14:00 – 14:30</option>
                </select>
              </div>
              <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                <span style={{ color: '#6d28d9', fontWeight: 600 }}>Ore curente {uvForm.sala}: </span>
                <span style={{ fontWeight: 700 }}>{(uvLampi[uvForm.sala] || 0).toFixed(1)}h</span>
                <span style={{ color: '#9ca3af', marginLeft: 8 }}>→ după iradiere: {Math.max(0, (uvLampi[uvForm.sala] || 0) - 0.5).toFixed(1)}h</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialist</label>
                <select value={uvForm.specialist} onChange={e => setUvForm(p => ({ ...p, specialist: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {PERSONAL.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowUV(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveUV} disabled={saving} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Confirmă iradierea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL UV CONFIG ═════════════════════════════════ */}
      {showUVConfig && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">⚙️ Configurare Lampă UV</h2></div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {SALI.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f9fafb', borderRadius: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, minWidth: 70 }}>{s}</span>
                    <span style={{ fontSize: 13, color: uvLampi[s] < 100 ? '#dc2626' : '#16a34a' }}>{(uvLampi[s] || 0).toFixed(1)}h</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sala</label>
                <select value={uvConfigSala} onChange={e => setUvConfigSala(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {SALI.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ore valabilitate rămase</label>
                <input type="number" step="0.5" min="0" value={uvConfigOre}
                  onChange={e => setUvConfigOre(e.target.value)}
                  placeholder="ex. 8000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowUVConfig(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Închide</button>
              <button onClick={saveUVConfig} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg">Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CURĂȚENIE ══════════════════════════════════ */}
      {showCur && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">🧹 Curățenie generală</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incăperea</label>
                <select value={curForm.sala} onChange={e => setCurForm(p => ({ ...p, sala: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {SALI.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soluție dezinfectantă</label>
                {solutii.length === 0 ? (
                  <div style={{ color: '#d97706', fontSize: 13 }}>⚠ Nu există soluții configurate. Mergeți la "🧴 Soluții".</div>
                ) : (
                  <select value={curForm.solutie} onChange={e => setCurForm(p => ({ ...p, solutie: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">— selectați —</option>
                    {solutii.map(s => {
                      const days = Math.floor((new Date() - new Date(s.data)) / 86400000)
                      return <option key={s.id} value={s.den}>{s.den} {days > 180 ? '⚠ >6 luni' : `(${days}z)`}</option>
                    })}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Efectuat de</label>
                <select value={curForm.operator} onChange={e => setCurForm(p => ({ ...p, operator: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {PERSONAL.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observații</label>
                <input type="text" value={curForm.obs} onChange={e => setCurForm(p => ({ ...p, obs: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowCur(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveCuratenie} disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : '✓ Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL SOLUȚII ════════════════════════════════════ */}
      {showSolutii && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">🧴 Soluții dezinfectante</h2></div>
            <div className="p-6 space-y-3">
              {solutii.map(s => {
                const days = Math.floor((new Date() - new Date(s.data)) / 86400000)
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.den}</div>
                      <div style={{ fontSize: 11, color: days > 180 ? '#dc2626' : '#9ca3af' }}>
                        Din {fmtDate(s.data)} · {days} zile {days > 180 ? '⚠ Schimbați!' : ''}
                      </div>
                    </div>
                    <button onClick={() => deleteSolutie(s.id)} style={{ color: '#d1d5db', cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}>🗑️</button>
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input type="text" value={nouaSolutie} onChange={e => setNouaSolutie(e.target.value)}
                  placeholder="ex. Chloramine 1%"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <button onClick={addSolutie} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">+</button>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <button onClick={() => setShowSolutii(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Închide</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL DEȘEU ══════════════════════════════════════ */}
      {showDeseu && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">🗑️ Predare deșeuri biologice</h2></div>
            <div className="p-6 space-y-4">
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>
                <div>Secția: <strong>Biologie Moleculară</strong></div>
                <div>Cod: <strong style={{ color: '#dc2626', fontFamily: 'monospace' }}>18.01.03</strong></div>
                <div>Data: <strong>{fmtDate(todayStr())}</strong> · Ora: <strong>{nowTime()}</strong></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantitate (kg)</label>
                <input type="number" step="0.1" min="0.1" value={deseuForm.cantitate}
                  onChange={e => setDeseuForm(p => ({ ...p, cantitate: e.target.value }))}
                  placeholder="ex. 2.5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsabil</label>
                <select value={deseuForm.responsabil} onChange={e => setDeseuForm(p => ({ ...p, responsabil: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {PERSONAL.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowDeseu(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveDeseu} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Înregistrează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL RAPORT DEȘEURI ════════════════════════════ */}
      {showRaportDeseu && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">📊 Raport lunar deșeuri biologice</h2>
              <button onClick={() => setShowRaportDeseu(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={rapLuna} onChange={e => setRapLuna(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— toate lunile —</option>
                  {[...new Set(deseuri.map(d => d.data?.slice(0, 7)))].sort().reverse().map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              {(() => {
                const list = rapLuna ? deseuri.filter(d => d.data?.startsWith(rapLuna)) : deseuri
                const total = list.reduce((s, d) => s + (d.cantitate || 0), 0)
                return (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 16, padding: '12px', background: '#fff5f5', borderRadius: 8, border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{total.toFixed(2)} kg</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Total deșeuri · Cod 18.01.03 · {rapLuna || 'Toate perioadele'}</div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#fee2e2' }}>
                          {['Data', 'Ora', 'Secția', 'Cod', 'Cantitate (kg)', 'Responsabil'].map(h => (
                            <th key={h} style={{ border: '1px solid #fca5a5', padding: '6px 8px', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {list.map(d => (
                          <tr key={d.id}>
                            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px' }}>{fmtDate(d.data)}</td>
                            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', fontFamily: 'monospace' }}>{d.ora}</td>
                            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px' }}>{d.sectia}</td>
                            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>{d.cod}</td>
                            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', fontWeight: 700 }}>{d.cantitate}</td>
                            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px' }}>{d.responsabil}</td>
                          </tr>
                        ))}
                        <tr style={{ background: '#fef2f2', fontWeight: 700 }}>
                          <td colSpan={4} style={{ border: '1px solid #fca5a5', padding: '6px 8px', textAlign: 'right' }}>TOTAL:</td>
                          <td style={{ border: '1px solid #fca5a5', padding: '6px 8px', color: '#dc2626' }}>{total.toFixed(2)} kg</td>
                          <td style={{ border: '1px solid #fca5a5', padding: '6px 8px' }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
