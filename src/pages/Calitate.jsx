import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const GRUPE = ['IST', 'TOR', 'HEP', 'IRP', 'IGI', 'GEN']
const ECHIPAMENTE = [
  'DTprime 5M1 (A5I842)', 'DTprime 5M1 (A5JN90)', 'DTprime 5M1 (A5J776)',
  'DTprime II 5M1 (R5N637)', 'Rotor-Gene Q6', 'QuantStudio 5', 'GeneXpert XVI',
]
const PERSONAL = ['Rotari Ion','Croitoru Tatiana','Jentimir Valeria','Andrian Maria','Antropov Marina']
const TABS = [
  { id: 'serii', label: 'Serii zilnice', icon: '🔬' },
  { id: 'iqc', label: 'IQC', icon: '📊' },
  { id: 'eqa', label: 'EQA', icon: '🌍' },
  { id: 'ffp', label: 'Adecvare la scop', icon: '✅' },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }

function LeveyJenningsChart({ data, mean, sd }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const pad = { top: 20, right: 20, bottom: 40, left: 50 }
    const chartW = W - pad.left - pad.right
    const chartH = H - pad.top - pad.bottom
    ctx.clearRect(0, 0, W, H)
    const m = mean || data.reduce((s, d) => s + d.ct, 0) / data.length
    const s = sd || Math.sqrt(data.reduce((sum, d) => sum + Math.pow(d.ct - m, 2), 0) / data.length) || 1
    const minY = m - s * 3.5, maxY = m + s * 3.5
    const toY = v => pad.top + chartH - ((v - minY) / (maxY - minY)) * chartH
    const toX = i => pad.left + (i / (data.length - 1 || 1)) * chartW
    const lines = [
      { v: m + 3*s, color: '#ef4444', label: '+3SD', dash: [4,4] },
      { v: m + 2*s, color: '#f97316', label: '+2SD', dash: [3,3] },
      { v: m + s,   color: '#eab308', label: '+1SD', dash: [2,2] },
      { v: m,       color: '#22c55e', label: 'Mean', dash: [] },
      { v: m - s,   color: '#eab308', label: '-1SD', dash: [2,2] },
      { v: m - 2*s, color: '#f97316', label: '-2SD', dash: [3,3] },
      { v: m - 3*s, color: '#ef4444', label: '-3SD', dash: [4,4] },
    ]
    lines.forEach(l => {
      const y = toY(l.v)
      ctx.beginPath(); ctx.strokeStyle = l.color; ctx.lineWidth = l.label === 'Mean' ? 2 : 1
      ctx.setLineDash(l.dash); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
      ctx.setLineDash([]); ctx.fillStyle = l.color; ctx.font = '10px Arial'; ctx.fillText(l.label, 2, y + 4)
    })
    if (data.length > 1) {
      ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5
      data.forEach((d, i) => { const x = toX(i), y = toY(d.ct); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
      ctx.stroke()
    }
    data.forEach((d, i) => {
      const x = toX(i), y = toY(d.ct)
      const ok = d.ct >= m - 2*s && d.ct <= m + 2*s
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = ok ? '#3b82f6' : '#ef4444'; ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
    })
    ctx.fillStyle = '#9ca3af'; ctx.font = '9px Arial'
    data.forEach((d, i) => { if (i % Math.ceil(data.length / 10) === 0) ctx.fillText(d.data?.slice(5) || i, toX(i) - 10, H - 8) })
  }, [data, mean, sd])
  return <canvas ref={canvasRef} width={600} height={200} className="w-full" />
}

export default function Calitate() {
  const [tab, setTab] = useState('serii')
  const [serii, setSerii] = useState([])
  const [iqc, setIqc] = useState([])
  const [eqaProg, setEqaProg] = useState([])
  const [eqaRez, setEqaRez] = useState([])
  const [ffp, setFfp] = useState([])
  const [servicii, setServicii] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showAddSerie, setShowAddSerie] = useState(false)
  const [serieServicii, setSerieServicii] = useState([])
  const [showAddSrv, setShowAddSrv] = useState(false)
  const [srvSearch, setSrvSearch] = useState('')
  const [srvFocused, setSrvFocused] = useState(false)
  const [serieForm, setSerieForm] = useState({ data: todayStr(), grupa: 'IST', echipament: ECHIPAMENTE[0], operator: PERSONAL[0], obs: '' })
  const [srvForm, setSrvForm] = useState({ srv: null, probe: '', cpCt: '', cpTinta: '', cnCt: '' })

  const [iqcGrupa, setIqcGrupa] = useState('IST')
  const [iqcSrv, setIqcSrv] = useState(null)

  const [activeProg, setActiveProg] = useState(null)
  const [showAddProg, setShowAddProg] = useState(false)
  const [showAddRez, setShowAddRez] = useState(false)
  const [progForm, setProgForm] = useState({ denumire: '', organizator: 'QCMD', an: new Date().getFullYear(), grupa: 'IST', runde_plan: 4, obs: '' })
  const [rezForm, setRezForm] = useState({ runda: 1, data: todayStr(), material: '', rez_lab: '', rez_consens: '', scor: '', eval: 'satisfacator', ac: '' })

  const [showAddFFP, setShowAddFFP] = useState(false)
  const [ffpGrupa, setFfpGrupa] = useState('IST')
  const [ffpForm, setFfpForm] = useState({ grupa: 'IST', tip_test: '', metoda: '', kit: '', echipament: ECHIPAMENTE[0], obs: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const srvRes = await supabase.from('servicii').select('*').order('cod', { ascending: true })
      setServicii(srvRes.data || [])
      const [s, i, ep, er, f] = await Promise.all([
        supabase.from('serii_data').select('*').order('data', { ascending: false }).limit(100),
        supabase.from('iqc_data').select('*').order('data', { ascending: false }).limit(500),
        supabase.from('eqa_prog').select('*').order('an', { ascending: false }),
        supabase.from('eqa_rez').select('*').order('runda', { ascending: true }),
        supabase.from('ffp_data').select('*').order('grupa', { ascending: true }),
      ])
      setSerii(s.data || [])
      setIqc(i.data || [])
      setEqaProg(ep.data || [])
      setEqaRez(er.data || [])
      setFfp(f.data || [])
      if (ep.data?.length) setActiveProg(ep.data[0].id)
    } catch(e) {
      console.error('loadAll error:', e.message)
    }
    setLoading(false)
  }

  function evalCP(ct, tinta) {
    if (!ct || !tinta) return null
    return Math.abs(parseFloat(ct) - parseFloat(tinta)) <= 2 ? 'acceptat' : 'respins'
  }
  function evalCN(ct) {
    if (ct === '' || ct === null || ct === undefined) return 'acceptat'
    return parseFloat(ct) > 40 ? 'acceptat' : 'respins'
  }

  // ── Filtrare servicii ─────────────────────────────────────
  // Caută în TOATE serviciile (nu doar grupa curentă) când există text de căutare
  // Când nu e text, arată serviciile grupei curente
  function getFilteredSrv() {
    if (srvSearch.trim()) {
      const q = srvSearch.toLowerCase()
      return servicii.filter(s =>
        s.activ !== false && (
          s.cod.toLowerCase().includes(q) ||
          (s.den || '').toLowerCase().includes(q)
        )
      ).slice(0, 10)
    }
    return servicii.filter(s => s.activ !== false && s.grupa === serieForm.grupa).slice(0, 10)
  }

  function addSrvToSerie() {
    if (!srvForm.srv) { alert('Selectați un serviciu!'); return }
    if (!srvForm.probe || parseInt(srvForm.probe) < 1) { alert('Introduceți nr. probe!'); return }
    const cpRez = evalCP(srvForm.cpCt, srvForm.cpTinta)
    const cnRez = evalCN(srvForm.cnCt)
    setSerieServicii(prev => [...prev, {
      srv_id: srvForm.srv.id,
      srv_cod: srvForm.srv.cod,
      srv_den: srvForm.srv.den,
      nr_probe: parseInt(srvForm.probe),
      cp: { ct: srvForm.cpCt, tinta: srvForm.cpTinta, rezultat: cpRez || 'acceptat' },
      cn: { ct: srvForm.cnCt, rezultat: cnRez },
      iqc_rezultat: (cpRez === 'respins' || cnRez === 'respins') ? 'respins' : 'acceptat',
    }])
    setSrvForm({ srv: null, probe: '', cpCt: '', cpTinta: '', cnCt: '' })
    setSrvSearch('')
    setSrvFocused(false)
    setShowAddSrv(false)
  }

  async function saveSerie() {
    if (!serieServicii.length) { alert('Adăugați cel puțin un serviciu!'); return }
    setSaving(true)
    const totalProbe = serieServicii.reduce((s, x) => s + x.nr_probe, 0)
    const allOk = serieServicii.every(s => s.iqc_rezultat === 'acceptat')
    const serieRec = {
      id: 'SER-' + Date.now(),
      data: serieForm.data, grupa: serieForm.grupa,
      echipament: serieForm.echipament, nr_probe: totalProbe,
      operator_nume: serieForm.operator, servicii: serieServicii,
      iqc_global: allOk ? 'acceptat' : 'respins',
      obs: serieForm.obs, ts: new Date().toISOString(),
    }
    const iqcRecs = []
    serieServicii.forEach(s => {
      const base = {
        data: serieForm.data, grupa: serieForm.grupa,
        srv_cod: s.srv_cod, srv_den: s.srv_den,
        echipament: serieForm.echipament, operator_nume: serieForm.operator,
        ts: new Date().toISOString()
      }
      if (s.cp.ct) iqcRecs.push({ ...base, id: 'IQC-CP-' + Date.now() + '-' + s.srv_id, tip: 'CP', ct: parseFloat(s.cp.ct), ct_tinta: parseFloat(s.cp.tinta), rezultat: s.cp.rezultat })
      iqcRecs.push({ ...base, id: 'IQC-CN-' + Date.now() + Math.random().toString(36).slice(2) + '-' + s.srv_id, tip: 'CN', ct: s.cn.ct ? parseFloat(s.cn.ct) : null, rezultat: s.cn.rezultat })
    })
    const { error } = await supabase.from('serii_data').insert(serieRec)
    if (!error && iqcRecs.length) await supabase.from('iqc_data').insert(iqcRecs)
    if (error) { alert('Eroare: ' + error.message) }
    else {
      setSerii(prev => [serieRec, ...prev])
      setIqc(prev => [...iqcRecs, ...prev])
      setShowAddSerie(false)
      setSerieServicii([])
      setSerieForm(p => ({ ...p, obs: '' }))
    }
    setSaving(false)
  }

  async function saveEQAProg() {
    if (!progForm.denumire) { alert('Introduceți denumirea!'); return }
    setSaving(true)
    const rec = { id: 'EQAP-' + Date.now(), ...progForm, ts: new Date().toISOString() }
    const { error } = await supabase.from('eqa_prog').insert(rec)
    if (!error) { setEqaProg(prev => [rec, ...prev]); setActiveProg(rec.id); setShowAddProg(false) }
    setSaving(false)
  }

  async function saveEQARez() {
    if (!rezForm.material) { alert('Introduceți materialul!'); return }
    setSaving(true)
    const rec = { id: 'EQAR-' + Date.now(), prog_id: activeProg, ...rezForm, ts: new Date().toISOString() }
    const { error } = await supabase.from('eqa_rez').insert(rec)
    if (!error) { setEqaRez(prev => [...prev, rec]); setShowAddRez(false) }
    setSaving(false)
  }

  function calcFFP(grupa) {
    const list = iqc.filter(d => d.grupa === grupa && d.tip === 'CP' && d.ct && d.ct_tinta)
    if (list.length < 5) return null
    const vals = list.map(d => d.ct)
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const sd = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length)
    const accepted = list.filter(d => d.rezultat === 'acceptat').length
    return { mean: mean.toFixed(2), sd: sd.toFixed(2), cv: (sd / mean * 100).toFixed(1), n: list.length, pctOk: Math.round(accepted / list.length * 100) }
  }

  async function saveFFP() {
    setSaving(true)
    const rec = { id: 'FFP-' + Date.now(), ...ffpForm, ts: new Date().toISOString() }
    const { error } = await supabase.from('ffp_data').insert(rec)
    if (!error) { setFfp(prev => [rec, ...prev]); setShowAddFFP(false) }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Se încarcă...</div>

  const filteredSrv = getFilteredSrv()
  const iqcForGrupa = iqc.filter(d => d.grupa === iqcGrupa && d.tip === 'CP' && d.ct)
  const iqcServices = [...new Set(iqcForGrupa.map(d => d.srv_cod).filter(Boolean))]
  const iqcForSrv = iqcSrv ? iqcForGrupa.filter(d => d.srv_cod === iqcSrv).slice(0, 30).reverse() : []
  const progData = eqaProg.find(p => p.id === activeProg)
  const rezForProg = eqaRez.filter(r => r.prog_id === activeProg)

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Calitate</h1>
        <p className="text-sm text-gray-500">IQC · EQA · Adecvare la scop · ISO 15189:2023 §7.3 · {servicii.length} servicii în catalog</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
              ${tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ SERII ZILNICE ════════════════════════════════════ */}
      {tab === 'serii' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-500">{serii.length} serii înregistrate</div>
            <button onClick={() => { setShowAddSerie(true); setSerieServicii([]) }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Serie nouă
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200">
            {serii.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nicio serie înregistrată</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Grupă</th>
                    <th className="px-4 py-3 text-left">Echipament</th>
                    <th className="px-4 py-3 text-left">Probe</th>
                    <th className="px-4 py-3 text-left">Servicii</th>
                    <th className="px-4 py-3 text-left">Operator</th>
                    <th className="px-4 py-3 text-left">IQC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {serii.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{s.data}</td>
                      <td className="px-4 py-3"><span className="font-bold text-blue-700 text-sm">{s.grupa}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.echipament?.split('(')[0]?.trim()}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.nr_probe}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{Array.isArray(s.servicii) ? s.servicii.length : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.operator_nume}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.iqc_global === 'acceptat' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.iqc_global === 'acceptat' ? '✓ OK' : '✗ Respins'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ IQC ══════════════════════════════════════════════ */}
      {tab === 'iqc' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {GRUPE.map(g => (
              <button key={g} onClick={() => { setIqcGrupa(g); setIqcSrv(null) }}
                className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-colors
                  ${iqcGrupa === g ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                {g}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(() => {
              const g = iqc.filter(d => d.grupa === iqcGrupa)
              const luna = todayStr().slice(0, 7)
              const lunaCrt = g.filter(d => d.data?.startsWith(luna))
              const ok = g.filter(d => d.rezultat === 'acceptat').length
              return <>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{g.length}</div>
                  <div className="text-xs text-gray-400">Total IQC {iqcGrupa}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{lunaCrt.length}</div>
                  <div className="text-xs text-green-400">Luna curentă</div>
                </div>
                <div className={`border rounded-xl p-4 text-center ${ok / (g.length || 1) >= 0.95 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`text-2xl font-bold ${ok / (g.length || 1) >= 0.95 ? 'text-green-600' : 'text-red-600'}`}>
                    {g.length ? Math.round(ok / g.length * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-400">Rata acceptare</div>
                </div>
              </>
            })()}
          </div>
          {iqcServices.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {iqcServices.map(cod => (
                <button key={cod} onClick={() => setIqcSrv(iqcSrv === cod ? null : cod)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors
                    ${iqcSrv === cod ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  {cod}
                </button>
              ))}
            </div>
          )}
          {iqcSrv && iqcForSrv.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <div className="text-sm font-medium text-gray-700 mb-3">
                Grafic Levey-Jennings — {iqcSrv} (ultimele {iqcForSrv.length} valori CP)
              </div>
              <LeveyJenningsChart data={iqcForSrv} />
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Serviciu</th>
                  <th className="px-4 py-3 text-left">Tip</th>
                  <th className="px-4 py-3 text-left">Ct obținut</th>
                  <th className="px-4 py-3 text-left">Ct țintă</th>
                  <th className="px-4 py-3 text-left">Rezultat</th>
                  <th className="px-4 py-3 text-left">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {iqc.filter(d => d.grupa === iqcGrupa && (!iqcSrv || d.srv_cod === iqcSrv)).slice(0, 50).map(d => (
                  <tr key={d.id} className={`hover:bg-gray-50 ${d.rezultat === 'respins' ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-sm">{d.data}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-blue-700">{d.srv_cod || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.tip === 'CP' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.tip}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{d.ct != null ? d.ct.toFixed(2) : '—'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-400">{d.ct_tinta != null ? d.ct_tinta.toFixed(2) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.rezultat === 'acceptat' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {d.rezultat === 'acceptat' ? '✓ OK' : '✗ Respins'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{d.operator_nume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ EQA ══════════════════════════════════════════════ */}
      {tab === 'eqa' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2 flex-wrap">
              {eqaProg.map(p => (
                <button key={p.id} onClick={() => setActiveProg(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                    ${activeProg === p.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  {p.denumire} ({p.an})
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddProg(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">+ Program nou</button>
          </div>
          {progData && (
            <div className="bg-white border border-gray-200 rounded-xl mb-4 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-800">{progData.denumire}</div>
                  <div className="text-sm text-gray-500">{progData.organizator} · {progData.an} · {progData.grupa} · {progData.runde_plan} runde</div>
                </div>
                <button onClick={() => setShowAddRez(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ Rezultat rundă</button>
              </div>
              <div className="mt-4">
                {rezForProg.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">Niciun rezultat înregistrat</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left">Runda</th><th className="px-4 py-2 text-left">Data</th>
                        <th className="px-4 py-2 text-left">Material</th><th className="px-4 py-2 text-left">Rez. lab</th>
                        <th className="px-4 py-2 text-left">Consens</th><th className="px-4 py-2 text-left">Scor</th>
                        <th className="px-4 py-2 text-left">Evaluare</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rezForProg.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-bold text-blue-700">R{r.runda}</td>
                          <td className="px-4 py-2 text-sm">{r.data}</td>
                          <td className="px-4 py-2 text-sm">{r.material}</td>
                          <td className="px-4 py-2 text-sm font-mono">{r.rez_lab}</td>
                          <td className="px-4 py-2 text-sm font-mono">{r.rez_consens}</td>
                          <td className="px-4 py-2 text-sm">{r.scor}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.eval === 'satisfacator' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {r.eval === 'satisfacator' ? '✓ Satisfăcător' : '✗ Nesatisfăcător'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ADECVARE LA SCOP ═════════════════════════════════ */}
      {tab === 'ffp' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {GRUPE.map(g => (
              <button key={g} onClick={() => setFfpGrupa(g)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors
                  ${ffpGrupa === g ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600'}`}>
                {g}
              </button>
            ))}
          </div>
          {(() => {
            const calc = calcFFP(ffpGrupa)
            if (!calc) return <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-700">Insuficiente date IQC (minim 5 valori CP). Înregistrați mai multe serii.</div>
            return (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{calc.mean}</div>
                  <div className="text-xs text-blue-400">Ct mediu CP</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{calc.sd}</div>
                  <div className="text-xs text-purple-400">SD</div>
                </div>
                <div className={`border rounded-xl p-4 text-center ${parseFloat(calc.cv) <= 5 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`text-2xl font-bold ${parseFloat(calc.cv) <= 5 ? 'text-green-600' : 'text-red-600'}`}>{calc.cv}%</div>
                  <div className="text-xs text-gray-400">CV% (precizie)</div>
                </div>
                <div className={`border rounded-xl p-4 text-center ${calc.pctOk >= 95 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`text-2xl font-bold ${calc.pctOk >= 95 ? 'text-green-600' : 'text-amber-600'}`}>{calc.pctOk}%</div>
                  <div className="text-xs text-gray-400">Rata acceptare ({calc.n} val.)</div>
                </div>
              </div>
            )
          })()}
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium text-gray-700">Validări — {ffpGrupa}</div>
            <button onClick={() => { setFfpForm(p => ({ ...p, grupa: ffpGrupa })); setShowAddFFP(true) }}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ Adaugă validare</button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200">
            {ffp.filter(f => f.grupa === ffpGrupa).length === 0 ? (
              <div className="p-6 text-center text-gray-400">Nicio validare înregistrată pentru {ffpGrupa}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Test</th><th className="px-4 py-3 text-left">Metodă</th>
                    <th className="px-4 py-3 text-left">Kit</th><th className="px-4 py-3 text-left">Echipament</th>
                    <th className="px-4 py-3 text-left">Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ffp.filter(f => f.grupa === ffpGrupa).map(f => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{f.tip_test}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{f.metoda}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{f.kit}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{f.echipament?.split('(')[0]?.trim()}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{f.obs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ MODAL SERIE NOUĂ ═════════════════════════════════ */}
      {showAddSerie && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Înregistrare serie zilnică</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" value={serieForm.data} onChange={e => setSerieForm(p => ({ ...p, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grupă</label>
                  <select value={serieForm.grupa} onChange={e => setSerieForm(p => ({ ...p, grupa: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {GRUPE.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Echipament</label>
                  <select value={serieForm.echipament} onChange={e => setSerieForm(p => ({ ...p, echipament: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {ECHIPAMENTE.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <select value={serieForm.operator} onChange={e => setSerieForm(p => ({ ...p, operator: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {PERSONAL.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium text-gray-700">Servicii ({serieServicii.length})</div>
                  <button onClick={() => { setShowAddSrv(true); setSrvSearch(''); setSrvForm({ srv: null, probe: '', cpCt: '', cpTinta: '', cnCt: '' }) }}
                    className="text-blue-600 text-sm hover:underline">+ Adaugă serviciu</button>
                </div>
                {serieServicii.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm">
                    Niciun serviciu. Apăsați "+ Adaugă serviciu".
                  </div>
                ) : (
                  <div className="space-y-2">
                    {serieServicii.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <span className="font-mono text-xs font-bold text-blue-700 w-20">{s.srv_cod}</span>
                        <span className="text-xs text-gray-600 flex-1">{s.srv_den?.slice(0, 30)}</span>
                        <span className="text-xs">{s.nr_probe}p</span>
                        <span className="text-xs text-gray-400">CP:{s.cp.ct||'—'}</span>
                        <span className="text-xs text-gray-400">CN:{s.cn.ct||'—'}</span>
                        <span className={`text-xs font-bold ${s.iqc_rezultat === 'acceptat' ? 'text-green-600' : 'text-red-600'}`}>
                          {s.iqc_rezultat === 'acceptat' ? '✓' : '✗'}
                        </span>
                        <button onClick={() => setSerieServicii(prev => prev.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-500 text-sm">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observații</label>
                <input type="text" value={serieForm.obs} onChange={e => setSerieForm(p => ({ ...p, obs: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => { setShowAddSerie(false); setSerieServicii([]) }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveSerie} disabled={saving || !serieServicii.length}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : '✓ Salvează seria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL ADAUGARE SERVICIU ══════════════════════════ */}
      {showAddSrv && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Adaugă serviciu în serie</h2>
              <p className="text-xs text-gray-400 mt-1">Grupă selectată: <strong>{serieForm.grupa}</strong> · {servicii.filter(s => s.grupa === serieForm.grupa).length} servicii disponibile</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serviciu</label>
                <input
                  type="text"
                  value={srvSearch}
                  placeholder="Caută cod sau denumire... (ex. BM04)"
                  autoFocus
                  onFocus={() => setSrvFocused(true)}
                  onBlur={() => setTimeout(() => setSrvFocused(false), 200)}
                  onChange={e => { setSrvSearch(e.target.value); setSrvForm(p => ({ ...p, srv: null })) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                {(srvFocused || srvSearch) && !srvForm.srv && (
                  <div className="border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-sm">
                    {filteredSrv.length > 0 ? filteredSrv.map(s => (
                      <div
                        key={s.id}
                        onMouseDown={() => { setSrvForm(p => ({ ...p, srv: s })); setSrvSearch(s.cod + ' — ' + s.den); setSrvFocused(false) }}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 text-xs w-16 flex-shrink-0">{s.cod}</span>
                        <span className="text-gray-700">{s.den}</span>
                        <span className="ml-auto text-xs text-gray-400">{s.grupa}</span>
                      </div>
                    )) : (
                      <div className="px-3 py-3 text-gray-400 text-sm text-center">
                        {servicii.length === 0 ? '⚠ Catalogul de servicii este gol' : 'Niciun serviciu găsit'}
                      </div>
                    )}
                  </div>
                )}
                {srvForm.srv && (
                  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800 flex justify-between items-center">
                    <span><strong>{srvForm.srv.cod}</strong> — {srvForm.srv.den}</span>
                    <button onClick={() => { setSrvForm(p => ({ ...p, srv: null })); setSrvSearch('') }}
                      className="text-blue-400 hover:text-blue-600 ml-2">✕</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nr. probe pacienți</label>
                <input type="number" min="1" value={srvForm.probe}
                  onChange={e => setSrvForm(p => ({ ...p, probe: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CP — Ct obținut</label>
                  <input type="number" step="0.01" value={srvForm.cpCt}
                    onChange={e => setSrvForm(p => ({ ...p, cpCt: e.target.value }))}
                    placeholder="ex. 28.45"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CP — Ct țintă</label>
                  <input type="number" step="0.01" value={srvForm.cpTinta}
                    onChange={e => setSrvForm(p => ({ ...p, cpTinta: e.target.value }))}
                    placeholder="ex. 28.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                </div>
              </div>
              {srvForm.cpCt && srvForm.cpTinta && (
                <div className={`rounded-lg px-3 py-2 text-sm font-medium ${evalCP(srvForm.cpCt, srvForm.cpTinta) === 'acceptat' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  CP: {evalCP(srvForm.cpCt, srvForm.cpTinta) === 'acceptat' ? '✓ Acceptat' : '✗ Respins'} — deviație {Math.abs(parseFloat(srvForm.cpCt) - parseFloat(srvForm.cpTinta)).toFixed(2)} (limită ±2)
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CN — Ct obținut <span className="text-gray-400 font-normal text-xs">(lăsați gol dacă nedeterminat)</span>
                </label>
                <input type="number" step="0.01" value={srvForm.cnCt}
                  onChange={e => setSrvForm(p => ({ ...p, cnCt: e.target.value }))}
                  placeholder="Lăsați gol dacă nedeterminat"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
              </div>
              {srvForm.cnCt !== '' && (
                <div className={`rounded-lg px-3 py-2 text-sm font-medium ${evalCN(srvForm.cnCt) === 'acceptat' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  CN: {evalCN(srvForm.cnCt) === 'acceptat' ? `✓ Acceptat (Ct ${srvForm.cnCt} > 40)` : `✗ Respins (Ct ${srvForm.cnCt} ≤ 40)`}
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddSrv(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={addSrvToSerie}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">
                Adaugă serviciu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EQA PROGRAM NOU ════════════════════════════ */}
      {showAddProg && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">Program EQA nou</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Denumire program</label>
                <input type="text" value={progForm.denumire} onChange={e => setProgForm(p => ({ ...p, denumire: e.target.value }))}
                  placeholder="ex. QCMD Molecular Bacteriology 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organizator</label>
                  <input type="text" value={progForm.organizator} onChange={e => setProgForm(p => ({ ...p, organizator: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">An</label>
                  <input type="number" value={progForm.an} onChange={e => setProgForm(p => ({ ...p, an: parseInt(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grupă</label>
                  <select value={progForm.grupa} onChange={e => setProgForm(p => ({ ...p, grupa: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {GRUPE.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Runde planificate</label>
                  <input type="number" min="1" max="12" value={progForm.runde_plan}
                    onChange={e => setProgForm(p => ({ ...p, runde_plan: parseInt(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddProg(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveEQAProg} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EQA REZULTAT RUNDĂ ═════════════════════════ */}
      {showAddRez && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">Rezultat rundă EQA</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Runda nr.</label>
                  <input type="number" min="1" value={rezForm.runda} onChange={e => setRezForm(p => ({ ...p, runda: parseInt(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" value={rezForm.data} onChange={e => setRezForm(p => ({ ...p, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material / Analit</label>
                <input type="text" value={rezForm.material} onChange={e => setRezForm(p => ({ ...p, material: e.target.value }))}
                  placeholder="ex. Chlamydia trachomatis DNA"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rezultat lab</label>
                  <input type="text" value={rezForm.rez_lab} onChange={e => setRezForm(p => ({ ...p, rez_lab: e.target.value }))}
                    placeholder="ex. Pozitiv" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consens</label>
                  <input type="text" value={rezForm.rez_consens} onChange={e => setRezForm(p => ({ ...p, rez_consens: e.target.value }))}
                    placeholder="ex. Pozitiv" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scor</label>
                  <input type="text" value={rezForm.scor} onChange={e => setRezForm(p => ({ ...p, scor: e.target.value }))}
                    placeholder="ex. 100%" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evaluare</label>
                  <select value={rezForm.eval} onChange={e => setRezForm(p => ({ ...p, eval: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="satisfacator">Satisfăcător</option>
                    <option value="nesatisfacator">Nesatisfăcător</option>
                  </select>
                </div>
              </div>
              {rezForm.eval === 'nesatisfacator' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Acțiune corectivă</label>
                  <textarea value={rezForm.ac} rows={2} onChange={e => setRezForm(p => ({ ...p, ac: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddRez(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveEQARez} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL FFP ════════════════════════════════════════ */}
      {showAddFFP && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">Adaugă validare metodă</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grupă</label>
                  <select value={ffpForm.grupa} onChange={e => setFfpForm(p => ({ ...p, grupa: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {GRUPE.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test / Analit</label>
                  <input type="text" value={ffpForm.tip_test} onChange={e => setFfpForm(p => ({ ...p, tip_test: e.target.value }))}
                    placeholder="ex. Chlamydia trachomatis"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metodă</label>
                  <input type="text" value={ffpForm.metoda} onChange={e => setFfpForm(p => ({ ...p, metoda: e.target.value }))}
                    placeholder="ex. PCR Real-Time"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kit</label>
                  <input type="text" value={ffpForm.kit} onChange={e => setFfpForm(p => ({ ...p, kit: e.target.value }))}
                    placeholder="ex. AmpliSens CT-FL"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Echipament</label>
                <select value={ffpForm.echipament} onChange={e => setFfpForm(p => ({ ...p, echipament: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {ECHIPAMENTE.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observații</label>
                <textarea value={ffpForm.obs} rows={2} onChange={e => setFfpForm(p => ({ ...p, obs: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddFFP(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveFFP} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
