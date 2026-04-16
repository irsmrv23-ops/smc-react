import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const GRUPE = ['IST', 'TOR', 'HEP', 'IRP', 'IGI', 'GEN']
const GRUPE_COLORS = {
  IST: { color: '#dc2626', light: '#fef2f2', border: '#fecaca', label: 'Urogenitale' },
  TOR: { color: '#d97706', light: '#fffbeb', border: '#fde68a', label: 'TORCH' },
  HEP: { color: '#ca8a04', light: '#fefce8', border: '#fef08a', label: 'Hepatite' },
  IRP: { color: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', label: 'Respiratorii' },
  IGI: { color: '#0891b2', light: '#ecfeff', border: '#a5f3fc', label: 'Gastro' },
  GEN: { color: '#7c3aed', light: '#f5f3ff', border: '#ddd6fe', label: 'Genetică' },
}

const ECHIPAMENTE = [
  'DTprime 5M1 (A5I842)', 'DTprime 5M1 (A5JN90)', 'DTprime 5M1 (A5J776)',
  'DTprime II 5M1 (R5N637)', 'Rotor-Gene Q6', 'QuantStudio 5', 'GeneXpert XVI',
]
const PERSONAL = ['Rotari Ion','Croitoru Tatiana','Jentimir Valeria','Andrian Maria','Antropov Marina']

const TABS = [
  { id: 'serii', label: 'Serii zilnice', icon: '🔬', desc: 'Înregistrare probe zilnice' },
  { id: 'iqc', label: 'IQC', icon: '📊', desc: 'Control intern calitate' },
  { id: 'eqa', label: 'EQA', icon: '🌍', desc: 'Control extern calitate' },
  { id: 'ffp', label: 'Adecvare la scop', icon: '✅', desc: 'Validare metode' },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ro-RO') }

function LeveyJenningsChart({ data, mean, sd }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const pad = { top: 24, right: 20, bottom: 40, left: 56 }
    const chartW = W - pad.left - pad.right
    const chartH = H - pad.top - pad.bottom
    ctx.clearRect(0, 0, W, H)
    const m = mean || data.reduce((s, d) => s + d.ct, 0) / data.length
    const s = sd || Math.sqrt(data.reduce((sum, d) => sum + Math.pow(d.ct - m, 2), 0) / data.length) || 1
    const minY = m - s * 3.5, maxY = m + s * 3.5
    const toY = v => pad.top + chartH - ((v - minY) / (maxY - minY)) * chartH
    const toX = i => pad.left + (i / (data.length - 1 || 1)) * chartW

    // Background zones
    ctx.fillStyle = 'rgba(220,38,38,0.04)'
    ctx.fillRect(pad.left, pad.top, chartW, (chartH / 7))
    ctx.fillRect(pad.left, pad.top + chartH - (chartH / 7), chartW, (chartH / 7))
    ctx.fillStyle = 'rgba(234,179,8,0.06)'
    ctx.fillRect(pad.left, pad.top + chartH / 7, chartW, chartH / 7)
    ctx.fillRect(pad.left, pad.top + chartH - 2 * (chartH / 7), chartW, chartH / 7)
    ctx.fillStyle = 'rgba(34,197,94,0.06)'
    ctx.fillRect(pad.left, pad.top + 2 * (chartH / 7), chartW, 3 * (chartH / 7))

    const lines = [
      { v: m + 3*s, color: '#ef4444', label: '+3SD', w: 1.5, dash: [6,3] },
      { v: m + 2*s, color: '#f97316', label: '+2SD', w: 1, dash: [4,3] },
      { v: m + s,   color: '#eab308', label: '+1SD', w: 1, dash: [3,3] },
      { v: m,       color: '#22c55e', label: 'Mean', w: 2, dash: [] },
      { v: m - s,   color: '#eab308', label: '-1SD', w: 1, dash: [3,3] },
      { v: m - 2*s, color: '#f97316', label: '-2SD', w: 1, dash: [4,3] },
      { v: m - 3*s, color: '#ef4444', label: '-3SD', w: 1.5, dash: [6,3] },
    ]
    lines.forEach(l => {
      const y = toY(l.v)
      ctx.beginPath(); ctx.strokeStyle = l.color; ctx.lineWidth = l.w
      ctx.setLineDash(l.dash); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = l.color; ctx.font = '600 10px Inter, sans-serif'
      ctx.fillText(l.label, 4, y + 4)
    })
    if (data.length > 1) {
      ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5
      ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 4
      data.forEach((d, i) => { const x = toX(i), y = toY(d.ct); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
      ctx.stroke(); ctx.shadowBlur = 0
    }
    data.forEach((d, i) => {
      const x = toX(i), y = toY(d.ct)
      const ok = d.ct >= m - 2*s && d.ct <= m + 2*s
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = ok ? '#3b82f6' : '#ef4444'
      ctx.shadowColor = ok ? '#3b82f6' : '#ef4444'; ctx.shadowBlur = 6
      ctx.fill(); ctx.shadowBlur = 0
      ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke()
    })
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, sans-serif'
    data.forEach((d, i) => {
      if (i % Math.ceil(data.length / 10) === 0) ctx.fillText(d.data?.slice(5) || i, toX(i) - 12, H - 8)
    })
  }, [data, mean, sd])
  return <canvas ref={canvasRef} width={700} height={220} style={{width:'100%'}} />
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
  const [srvForm, setSrvForm] = useState({ srv: null, probe: '', cpCt: '', cpTinta: '', cnCt: '', cp_count: 0, calibratori_count: 0 })

  const [iqcGrupa, setIqcGrupa] = useState('IST')
  const [iqcSrv, setIqcSrv] = useState(null)

  const [activeProg, setActiveProg] = useState(null)
  const [showAddProg, setShowAddProg] = useState(false)
  const [showAddRez, setShowAddRez] = useState(false)
  const [progForm, setProgForm] = useState({ denumire: '', organizator: 'QCMD', an: new Date().getFullYear(), grupa: 'IST', runde_plan: 4 })
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
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  function evalCP(ct, tinta) { if (!ct || !tinta) return null; return Math.abs(parseFloat(ct) - parseFloat(tinta)) <= 2 ? 'acceptat' : 'respins' }
  function evalCN(ct) { if (ct === '' || ct === null || ct === undefined) return 'acceptat'; return parseFloat(ct) > 40 ? 'acceptat' : 'respins' }

  function getFilteredSrv() {
    if (srvSearch.trim()) {
      const q = srvSearch.toLowerCase()
      return servicii.filter(s => s.activ !== false && (s.cod.toLowerCase().includes(q) || (s.den||'').toLowerCase().includes(q))).slice(0, 10)
    }
    return servicii.filter(s => s.activ !== false && s.grupa === serieForm.grupa).slice(0, 10)
  }

  function addSrvToSerie() {
    if (!srvForm.srv) { alert('Selectați un serviciu!'); return }
    if (!srvForm.probe || parseInt(srvForm.probe) < 1) { alert('Introduceți nr. probe!'); return }
    const cpRez = evalCP(srvForm.cpCt, srvForm.cpTinta)
    const cnRez = evalCN(srvForm.cnCt)
    setSerieServicii(prev => [...prev, {
      srv_id: srvForm.srv.id, srv_cod: srvForm.srv.cod, srv_den: srvForm.srv.den,
      nr_probe: parseInt(srvForm.probe) || 0,
      cp_count: parseInt(srvForm.cp_count) || 0,
      calibratori_count: parseInt(srvForm.calibratori_count) || 0,
      cp: { ct: srvForm.cpCt, tinta: srvForm.cpTinta, rezultat: cpRez || 'acceptat' },
      cn: { ct: srvForm.cnCt, rezultat: cnRez },
      iqc_rezultat: (cpRez === 'respins' || cnRez === 'respins') ? 'respins' : 'acceptat',
    }])
    setSrvForm({ srv: null, probe: '', cpCt: '', cpTinta: '', cnCt: '', cp_count: 0, calibratori_count: 0 })
    setSrvSearch(''); setSrvFocused(false); setShowAddSrv(false)
  }

 async function saveSerie() {
  if (!serieServicii.length) {
    alert('Adăugați cel puțin un serviciu!')
    return
  }

  setSaving(true)

  try {
    const totalProbe = serieServicii.reduce((s, x) => s + (x.nr_probe || 0), 0)
    const allOk = serieServicii.every(s => s.iqc_rezultat === 'acceptat')

    const consumuri = serieServicii.map(s => ({
      srv_id: s.srv_id,
      srv_cod: s.srv_cod,
      total: (s.nr_probe || 0) + (s.cp_count || 0) + 1 + (s.calibratori_count || 0)
    }))

    const srvIds = [...new Set(consumuri.map(c => c.srv_id))]

    const { data: react, error: errReact } = await supabase
      .from('stock_items')
      .select('id, serviciu_id, tip_reagent, activ')
      .in('serviciu_id', srvIds)
      .eq('activ', true)

    if (errReact) {
      alert('Eroare la citirea reactivilor: ' + errReact.message)
      setSaving(false)
      return
    }

    const totalConsum = {}
    const mapSrvToName = {}

    consumuri.forEach(c => {
      const reactiviSrv = (react || []).filter(x => x.serviciu_id === c.srv_id)
      if (!reactiviSrv.length) {
        mapSrvToName[c.srv_cod] = 'Serviciul nu are reactivi setați în stock_items.'
        return
      }

      const add = (id, cant) => {
        if (!id) return
        if (!totalConsum[id]) totalConsum[id] = 0
        totalConsum[id] += cant
      }

      reactiviSrv.forEach(r => add(r.id, c.total))
    })

    const missingLinks = Object.keys(mapSrvToName)
    if (missingLinks.length) {
      alert('Nu poți salva seria. Lipsesc reactivii pentru: ' + missingLinks.join(', '))
      setSaving(false)
      return
    }

    const itemIds = Object.keys(totalConsum)

    if (itemIds.length) {
      const { data: balances, error: balErr } = await supabase
        .from('stock_balances')
        .select('*')
        .in('stock_item_id', itemIds)
        .eq('locatie', 'laborator')

      if (balErr) {
        alert('Eroare la citirea stocului laborator: ' + balErr.message)
        setSaving(false)
        return
      }

      for (const id of itemIds) {
        const bal = (balances || []).find(b => b.stock_item_id === id)
        const stoc = Number(bal?.cantitate_disponibila || 0)
        const necesar = Number(totalConsum[id] || 0)

        if (stoc < necesar) {
          alert(`Stoc insuficient în laborator!\nNecesar: ${necesar} teste\nDisponibil: ${stoc} teste`)
          setSaving(false)
          return
        }
      }

      const serieId = 'SER-' + Date.now()

      for (const id of itemIds) {
        const bal = (balances || []).find(b => b.stock_item_id === id)
        const current = Number(bal?.cantitate_disponibila || 0)
        const necesar = Number(totalConsum[id] || 0)

        const { error: updErr } = await supabase
          .from('stock_balances')
          .update({
            cantitate_disponibila: current - necesar,
            updated_at: new Date().toISOString()
          })
          .eq('stock_item_id', id)
          .eq('locatie', 'laborator')

        if (updErr) {
          alert('Eroare la actualizarea stocului: ' + updErr.message)
          setSaving(false)
          return
        }

        const { error: movErr } = await supabase
          .from('stock_movements')
          .insert({
            stock_item_id: id,
            tip_miscare: 'consum_lab',
            sursa: 'laborator',
            destinatie: null,
            cantitate: necesar,
            serviciu_id: null,
            serie_id: serieId,
            data_miscare: serieForm.data,
            motiv: `Consum automat la salvarea seriei ${serieForm.data}`,
            utilizator: serieForm.operator
          })

        if (movErr) {
          alert('Eroare la înregistrarea mișcării: ' + movErr.message)
          setSaving(false)
          return
        }
      }

      const serieRec = {
        id: serieId,
        data: serieForm.data,
        grupa: serieForm.grupa,
        echipament: serieForm.echipament,
        nr_probe: totalProbe,
        operator_nume: serieForm.operator,
        servicii: serieServicii,
        iqc_global: allOk ? 'acceptat' : 'respins',
        obs: serieForm.obs,
        ts: new Date().toISOString()
      }

      const iqcRecs = []
      serieServicii.forEach(s => {
        const base = {
          data: serieForm.data,
          grupa: serieForm.grupa,
          srv_cod: s.srv_cod,
          srv_den: s.srv_den,
          echipament: serieForm.echipament,
          operator_nume: serieForm.operator,
          ts: new Date().toISOString()
        }

        if (s.cp?.ct) {
          iqcRecs.push({
            ...base,
            id: 'IQC-CP-' + Date.now() + Math.random().toString(36).slice(2),
            tip: 'CP',
            ct: parseFloat(s.cp.ct),
            ct_tinta: parseFloat(s.cp.tinta),
            rezultat: s.cp.rezultat
          })
        }

        iqcRecs.push({
          ...base,
          id: 'IQC-CN-' + Date.now() + Math.random().toString(36).slice(2),
          tip: 'CN',
          ct: s.cn?.ct ? parseFloat(s.cn.ct) : null,
          rezultat: s.cn?.rezultat
        })
      })

      const { error } = await supabase.from('serii_data').insert(serieRec)

      if (!error && iqcRecs.length) {
        await supabase.from('iqc_data').insert(iqcRecs)
      }

      if (error) {
        alert('Eroare: ' + error.message)
      } else {
        alert('Serie salvată + stoc actualizat')
        setSerii(prev => [serieRec, ...prev])
        setIqc(prev => [...iqcRecs, ...prev])
        setShowAddSerie(false)
        setSerieServicii([])
      }
      setSaving(false)
      return
    }

    const serieRec = {
      id: 'SER-' + Date.now(),
      data: serieForm.data,
      grupa: serieForm.grupa,
      echipament: serieForm.echipament,
      nr_probe: totalProbe,
      operator_nume: serieForm.operator,
      servicii: serieServicii,
      iqc_global: allOk ? 'acceptat' : 'respins',
      obs: serieForm.obs,
      ts: new Date().toISOString()
    }

    const iqcRecs = []
    serieServicii.forEach(s => {
      const base = {
        data: serieForm.data,
        grupa: serieForm.grupa,
        srv_cod: s.srv_cod,
        srv_den: s.srv_den,
        echipament: serieForm.echipament,
        operator_nume: serieForm.operator,
        ts: new Date().toISOString()
      }

      if (s.cp?.ct) {
        iqcRecs.push({
          ...base,
          id: 'IQC-CP-' + Date.now() + Math.random().toString(36).slice(2),
          tip: 'CP',
          ct: parseFloat(s.cp.ct),
          ct_tinta: parseFloat(s.cp.tinta),
          rezultat: s.cp.rezultat
        })
      }

      iqcRecs.push({
        ...base,
        id: 'IQC-CN-' + Date.now() + Math.random().toString(36).slice(2),
        tip: 'CN',
        ct: s.cn?.ct ? parseFloat(s.cn.ct) : null,
        rezultat: s.cn?.rezultat
      })
    })

    const { error } = await supabase.from('serii_data').insert(serieRec)

    if (!error && iqcRecs.length) {
      await supabase.from('iqc_data').insert(iqcRecs)
    }

    if (error) {
      alert('Eroare: ' + error.message)
    } else {
      alert('Serie salvată')
      setSerii(prev => [serieRec, ...prev])
      setIqc(prev => [...iqcRecs, ...prev])
      setShowAddSerie(false)
      setSerieServicii([])
    }
  } catch (e) {
    console.error(e)
    alert('Eroare sistem')
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

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Se încarcă...</div>

  const filteredSrv = getFilteredSrv()
  const iqcForGrupa = iqc.filter(d => d.grupa === iqcGrupa && d.tip === 'CP' && d.ct)
  const iqcServices = [...new Set(iqcForGrupa.map(d => d.srv_cod).filter(Boolean))]
  const iqcForSrv = iqcSrv ? iqcForGrupa.filter(d => d.srv_cod === iqcSrv).slice(0, 30).reverse() : []
  const progData = eqaProg.find(p => p.id === activeProg)
  const rezForProg = eqaRez.filter(r => r.prog_id === activeProg)

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">Calitate</div>
          <div className="page-subtitle">IQC · EQA · Adecvare la scop · ISO 15189:2023 §7.3 · {servicii.length} servicii</div>
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>

        {/* TABS GRANDIOASE */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:32}}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? '#1a56db' : 'white',
                border: `2px solid ${tab === t.id ? '#1a56db' : '#e2e8f0'}`,
                borderRadius: 16, padding: '20px 16px', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.2s',
                boxShadow: tab === t.id ? '0 8px 24px rgba(26,86,219,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                transform: tab === t.id ? 'translateY(-3px)' : 'none',
              }}>
              <div style={{fontSize:32,marginBottom:10}}>{t.icon}</div>
              <div style={{fontSize:15,fontWeight:700,color:tab===t.id?'white':'#1e293b',marginBottom:4}}>{t.label}</div>
              <div style={{fontSize:11,color:tab===t.id?'rgba(255,255,255,0.75)':'#94a3b8'}}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* ═══ SERII ZILNICE ════════════════════════════════════ */}
        {tab === 'serii' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>{serii.length} serii înregistrate</div>
              <button className="btn btn-primary" style={{fontSize:14,padding:'10px 20px'}}
                onClick={() => { setShowAddSerie(true); setSerieServicii([]); setSerieForm({ data: todayStr(), grupa: 'IST', echipament: ECHIPAMENTE[0], operator: PERSONAL[0], obs: '' }) }}>
                + Serie zilnică nouă
              </button>
            </div>

            {serii.length === 0 ? (
              <div style={{background:'white',borderRadius:16,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:48,marginBottom:12}}>🔬</div>
                <div style={{fontSize:15,fontWeight:600}}>Nicio serie înregistrată</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th><th>Grupă</th><th>Echipament</th>
                      <th>Probe</th><th>Servicii</th><th>Operator</th><th>IQC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serii.map(s => {
                      const gc = GRUPE_COLORS[s.grupa]
                      return (
                        <tr key={s.id}>
                          <td style={{fontWeight:500}}>{s.data}</td>
                          <td><span style={{background:gc?.light,color:gc?.color,border:`1px solid ${gc?.border}`,padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>{s.grupa}</span></td>
                          <td style={{fontSize:12,color:'#64748b'}}>{s.echipament?.split('(')[0]?.trim()}</td>
                          <td style={{fontWeight:700,color:'#1e293b'}}>{s.nr_probe}</td>
                          <td style={{color:'#64748b'}}>{Array.isArray(s.servicii)?s.servicii.length:'—'}</td>
                          <td style={{color:'#64748b',fontSize:13}}>{s.operator_nume}</td>
                          <td><span style={{background:s.iqc_global==='acceptat'?'#f0fdf4':'#fef2f2',color:s.iqc_global==='acceptat'?'#166534':'#991b1b',border:`1px solid ${s.iqc_global==='acceptat'?'#bbf7d0':'#fecaca'}`,padding:'5px 14px',borderRadius:20,fontSize:12,fontWeight:700}}>{s.iqc_global==='acceptat'?'✓ OK':'✗ Respins'}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ IQC ══════════════════════════════════════════════ */}
        {tab === 'iqc' && (
          <div>
            {/* Grupe butoane mari */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:24}}>
              {GRUPE.map(g => {
                const gc = GRUPE_COLORS[g]
                const cnt = iqc.filter(d => d.grupa === g).length
                const ok = iqc.filter(d => d.grupa === g && d.rezultat === 'acceptat').length
                const pct = cnt ? Math.round(ok/cnt*100) : 100
                const isAct = iqcGrupa === g
                return (
                  <button key={g} onClick={() => { setIqcGrupa(g); setIqcSrv(null) }}
                    style={{
                      background: isAct ? gc.color : 'white',
                      border: `2px solid ${isAct ? gc.color : gc.border}`,
                      borderRadius: 16, padding: '16px 8px', cursor: 'pointer',
                      textAlign: 'center', transition: 'all 0.2s',
                      boxShadow: isAct ? `0 6px 20px ${gc.color}40` : '0 1px 3px rgba(0,0,0,0.06)',
                      transform: isAct ? 'translateY(-2px)' : 'none',
                    }}>
                    <div style={{fontSize:22,fontWeight:800,color:isAct?'white':gc.color}}>{g}</div>
                    <div style={{fontSize:11,color:isAct?'rgba(255,255,255,0.8)':gc.color,marginTop:4,fontWeight:600}}>{gc.label}</div>
                    <div style={{marginTop:8,fontSize:18,fontWeight:800,color:isAct?'white':gc.color}}>{cnt}</div>
                    <div style={{fontSize:10,color:isAct?'rgba(255,255,255,0.7)':gc.color,fontWeight:600}}>teste</div>
                    <div style={{marginTop:8,background:isAct?'rgba(255,255,255,0.2)':gc.light,borderRadius:99,height:4,overflow:'hidden'}}>
                      <div style={{width:pct+'%',height:'100%',background:isAct?'white':gc.color,borderRadius:99}} />
                    </div>
                    <div style={{fontSize:10,color:isAct?'rgba(255,255,255,0.8)':'#94a3b8',marginTop:4}}>{pct}% ok</div>
                  </button>
                )
              })}
            </div>

            {/* Stats */}
            {(() => {
              const g = iqc.filter(d => d.grupa === iqcGrupa)
              const luna = todayStr().slice(0,7)
              const lunaCrt = g.filter(d => d.data?.startsWith(luna))
              const ok = g.filter(d => d.rezultat === 'acceptat').length
              const gc = GRUPE_COLORS[iqcGrupa]
              return (
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
                  <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
                    <div style={{width:48,height:48,borderRadius:12,background:gc.light,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>📊</div>
                    <div><div style={{fontSize:28,fontWeight:800,color:gc.color}}>{g.length}</div><div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>Total IQC {iqcGrupa}</div></div>
                  </div>
                  <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
                    <div style={{width:48,height:48,borderRadius:12,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>📅</div>
                    <div><div style={{fontSize:28,fontWeight:800,color:'#16a34a'}}>{lunaCrt.length}</div><div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>Luna curentă</div></div>
                  </div>
                  <div style={{background:ok/(g.length||1)>=0.95?'#f0fdf4':'#fef2f2',border:`1px solid ${ok/(g.length||1)>=0.95?'#bbf7d0':'#fecaca'}`,borderRadius:14,padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
                    <div style={{width:48,height:48,borderRadius:12,background:ok/(g.length||1)>=0.95?'#dcfce7':'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{ok/(g.length||1)>=0.95?'✅':'⚠️'}</div>
                    <div><div style={{fontSize:28,fontWeight:800,color:ok/(g.length||1)>=0.95?'#16a34a':'#dc2626'}}>{g.length?Math.round(ok/g.length*100):0}%</div><div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>Rata acceptare</div></div>
                  </div>
                </div>
              )
            })()}

            {/* Servicii butoane */}
            {iqcServices.length > 0 && (
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                {iqcServices.map(cod => (
                  <button key={cod} onClick={() => setIqcSrv(iqcSrv === cod ? null : cod)}
                    style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${iqcSrv===cod?'#1a56db':'#e2e8f0'}`,background:iqcSrv===cod?'#1a56db':'white',color:iqcSrv===cod?'white':'#475569',fontSize:12,fontFamily:'monospace',fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}>
                    {cod}
                  </button>
                ))}
                {iqcSrv && <button onClick={() => setIqcSrv(null)} style={{padding:'6px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#94a3b8',fontSize:12,cursor:'pointer'}}>✕ Resetează</button>}
              </div>
            )}

            {/* Levey-Jennings */}
            {iqcSrv && iqcForSrv.length > 1 && (
              <div style={{background:'white',borderRadius:16,border:'1px solid #e2e8f0',padding:20,marginBottom:20,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                <div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:4}}>Grafic Levey-Jennings — {iqcSrv}</div>
                <div style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>Ultimele {iqcForSrv.length} valori CP · Linie verde = Mean</div>
                <LeveyJenningsChart data={iqcForSrv} />
              </div>
            )}

            {/* Tabel */}
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Data</th><th>Serviciu</th><th>Tip</th><th>Ct obținut</th><th>Ct țintă</th><th>Rezultat</th><th>Operator</th></tr></thead>
                <tbody>
                  {iqc.filter(d => d.grupa === iqcGrupa && (!iqcSrv || d.srv_cod === iqcSrv)).slice(0, 50).map(d => (
                    <tr key={d.id} style={{background:d.rezultat==='respins'?'#fef2f2':''}}>
                      <td>{d.data}</td>
                      <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#1a56db',fontSize:13}}>{d.srv_cod||'—'}</span></td>
                      <td><span style={{background:d.tip==='CP'?'#f0fdf4':'#f8fafc',color:d.tip==='CP'?'#166534':'#64748b',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{d.tip}</span></td>
                      <td style={{fontFamily:'monospace',fontWeight:600}}>{d.ct!=null?d.ct.toFixed(2):'—'}</td>
                      <td style={{fontFamily:'monospace',color:'#94a3b8'}}>{d.ct_tinta!=null?d.ct_tinta.toFixed(2):'—'}</td>
                      <td><span style={{background:d.rezultat==='acceptat'?'#f0fdf4':'#fef2f2',color:d.rezultat==='acceptat'?'#166534':'#991b1b',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{d.rezultat==='acceptat'?'✓ OK':'✗ Respins'}</span></td>
                      <td style={{color:'#94a3b8',fontSize:12}}>{d.operator_nume}</td>
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
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                {eqaProg.map(p => (
                  <button key={p.id} onClick={() => setActiveProg(p.id)}
                    style={{padding:'8px 16px',borderRadius:10,border:`2px solid ${activeProg===p.id?'#1a56db':'#e2e8f0'}`,background:activeProg===p.id?'#1a56db':'white',color:activeProg===p.id?'white':'#475569',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>
                    {p.denumire} ({p.an})
                  </button>
                ))}
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddProg(true)}>+ Program nou</button>
            </div>

            {progData && (
              <div style={{background:'white',borderRadius:16,border:'1px solid #e2e8f0',padding:24,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
                  <div>
                    <div style={{fontSize:18,fontWeight:700,color:'#1e293b'}}>{progData.denumire}</div>
                    <div style={{fontSize:13,color:'#64748b',marginTop:4}}>{progData.organizator} · {progData.an} · {progData.grupa} · {progData.runde_plan} runde planificate</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowAddRez(true)}>+ Rezultat rundă</button>
                </div>

                {/* Stats EQA */}
                {rezForProg.length > 0 && (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
                    <div style={{textAlign:'center',background:'#f8fafc',borderRadius:12,padding:16}}>
                      <div style={{fontSize:32,fontWeight:800,color:'#1a56db'}}>{rezForProg.length}/{progData.runde_plan}</div>
                      <div style={{fontSize:12,color:'#94a3b8',fontWeight:600,marginTop:4}}>Runde efectuate</div>
                    </div>
                    <div style={{textAlign:'center',background:'#f0fdf4',borderRadius:12,padding:16}}>
                      <div style={{fontSize:32,fontWeight:800,color:'#16a34a'}}>{rezForProg.filter(r=>r.eval==='satisfacator').length}</div>
                      <div style={{fontSize:12,color:'#16a34a',fontWeight:600,marginTop:4}}>Satisfăcătoare</div>
                    </div>
                    <div style={{textAlign:'center',background:rezForProg.filter(r=>r.eval==='nesatisfacator').length>0?'#fef2f2':'#f8fafc',borderRadius:12,padding:16}}>
                      <div style={{fontSize:32,fontWeight:800,color:rezForProg.filter(r=>r.eval==='nesatisfacator').length>0?'#dc2626':'#94a3b8'}}>{rezForProg.filter(r=>r.eval==='nesatisfacator').length}</div>
                      <div style={{fontSize:12,color:'#94a3b8',fontWeight:600,marginTop:4}}>Nesatisfăcătoare</div>
                    </div>
                  </div>
                )}

                <div className="table-wrapper">
                  {rezForProg.length === 0 ? (
                    <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>
                      <div style={{fontSize:40,marginBottom:12}}>🌍</div>
                      <div>Niciun rezultat înregistrat</div>
                    </div>
                  ) : (
                    <table>
                      <thead><tr><th>Runda</th><th>Data</th><th>Material</th><th>Rez. lab</th><th>Consens</th><th>Scor</th><th>Evaluare</th></tr></thead>
                      <tbody>
                        {rezForProg.map(r => (
                          <tr key={r.id}>
                            <td><span style={{fontWeight:800,color:'#1a56db',fontSize:15}}>R{r.runda}</span></td>
                            <td>{fmtDate(r.data)}</td>
                            <td style={{fontWeight:500}}>{r.material}</td>
                            <td style={{fontFamily:'monospace',fontWeight:600}}>{r.rez_lab}</td>
                            <td style={{fontFamily:'monospace',color:'#64748b'}}>{r.rez_consens}</td>
                            <td style={{fontWeight:600}}>{r.scor}</td>
                            <td><span style={{background:r.eval==='satisfacator'?'#f0fdf4':'#fef2f2',color:r.eval==='satisfacator'?'#166534':'#991b1b',padding:'5px 14px',borderRadius:20,fontSize:12,fontWeight:700}}>{r.eval==='satisfacator'?'✓ Satisfăcător':'✗ Nesatisf.'}</span></td>
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
            {/* Grupe */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:24}}>
              {GRUPE.map(g => {
                const gc = GRUPE_COLORS[g]
                const calc = calcFFP(g)
                const isAct = ffpGrupa === g
                return (
                  <button key={g} onClick={() => setFfpGrupa(g)}
                    style={{background:isAct?gc.color:'white',border:`2px solid ${isAct?gc.color:gc.border}`,borderRadius:14,padding:'14px 8px',cursor:'pointer',textAlign:'center',transition:'all 0.2s',boxShadow:isAct?`0 6px 20px ${gc.color}40`:'0 1px 3px rgba(0,0,0,0.06)',transform:isAct?'translateY(-2px)':'none'}}>
                    <div style={{fontSize:18,fontWeight:800,color:isAct?'white':gc.color,marginBottom:4}}>{g}</div>
                    {calc ? (
                      <><div style={{fontSize:14,fontWeight:700,color:isAct?'white':gc.color}}>CV: {calc.cv}%</div>
                      <div style={{fontSize:10,color:isAct?'rgba(255,255,255,0.7)':'#94a3b8',marginTop:2}}>{calc.n} valori</div></>
                    ) : <div style={{fontSize:10,color:isAct?'rgba(255,255,255,0.7)':'#94a3b8',marginTop:4}}>date insuf.</div>}
                  </button>
                )
              })}
            </div>

            {/* Calcule */}
            {(() => {
              const calc = calcFFP(ffpGrupa)
              const gc = GRUPE_COLORS[ffpGrupa]
              if (!calc) return (
                <div className="alert alert-warning" style={{marginBottom:20}}>
                  ⚠ Insuficiente date IQC pentru {ffpGrupa} (minim 5 valori CP). Înregistrați mai multe serii.
                </div>
              )
              return (
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
                  {[
                    {label:'Ct mediu CP',val:calc.mean,icon:'📍',color:'#1a56db',bg:'#eff6ff'},
                    {label:'Deviație standard',val:calc.sd,icon:'📐',color:'#7c3aed',bg:'#f5f3ff'},
                    {label:'CV% (precizie)',val:calc.cv+'%',icon:'📊',color:parseFloat(calc.cv)<=5?'#16a34a':'#dc2626',bg:parseFloat(calc.cv)<=5?'#f0fdf4':'#fef2f2'},
                    {label:`Rata acceptare (${calc.n} val.)`,val:calc.pctOk+'%',icon:'✅',color:calc.pctOk>=95?'#16a34a':'#d97706',bg:calc.pctOk>=95?'#f0fdf4':'#fffbeb'},
                  ].map((s,i)=>(
                    <div key={i} style={{background:'white',border:`1px solid ${s.bg==='#fef2f2'?'#fecaca':s.bg==='#fffbeb'?'#fde68a':'#e2e8f0'}`,borderRadius:14,padding:20,textAlign:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                      <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
                      <div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.val}</div>
                      <div style={{fontSize:11,color:'#94a3b8',fontWeight:600,marginTop:6}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Validări */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Validări metodă — {ffpGrupa}</div>
              <button className="btn btn-primary" onClick={()=>{setFfpForm(p=>({...p,grupa:ffpGrupa}));setShowAddFFP(true)}}>+ Adaugă validare</button>
            </div>
            <div className="table-wrapper">
              {ffp.filter(f=>f.grupa===ffpGrupa).length===0?(
                <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Nicio validare pentru {ffpGrupa}</div>
              ):(
                <table>
                  <thead><tr><th>Test</th><th>Metodă</th><th>Kit</th><th>Echipament</th><th>Obs.</th></tr></thead>
                  <tbody>
                    {ffp.filter(f=>f.grupa===ffpGrupa).map(f=>(
                      <tr key={f.id}>
                        <td style={{fontWeight:600}}>{f.tip_test}</td>
                        <td style={{color:'#64748b'}}>{f.metoda}</td>
                        <td style={{color:'#64748b'}}>{f.kit}</td>
                        <td style={{color:'#64748b',fontSize:12}}>{f.echipament?.split('(')[0]?.trim()}</td>
                        <td style={{color:'#94a3b8',fontSize:12}}>{f.obs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL SERIE NOUĂ ═════════════════════════════════ */}
      {showAddSerie && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddSerie(false)}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header" style={{background:GRUPE_COLORS[serieForm.grupa]?.color||'#1a56db',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>🔬 Serie zilnică nouă</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',background:'rgba(255,255,255,0.15)',padding:'4px 12px',borderRadius:8}}>{serieForm.data} · {serieForm.grupa}</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div><label className="form-label">Data</label><input type="date" className="form-control" value={serieForm.data} onChange={e=>setSerieForm(p=>({...p,data:e.target.value}))} /></div>
                <div><label className="form-label">Grupă</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6}}>
                    {GRUPE.map(g=>(
                      <button key={g} type="button" onClick={()=>setSerieForm(p=>({...p,grupa:g}))}
                        style={{padding:'8px 4px',borderRadius:8,border:`2px solid ${serieForm.grupa===g?GRUPE_COLORS[g].color:GRUPE_COLORS[g].border}`,background:serieForm.grupa===g?GRUPE_COLORS[g].color:GRUPE_COLORS[g].light,color:serieForm.grupa===g?'white':GRUPE_COLORS[g].color,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className="form-label">Echipament</label><select className="form-control" value={serieForm.echipament} onChange={e=>setSerieForm(p=>({...p,echipament:e.target.value}))}>{ECHIPAMENTE.map(e=><option key={e}>{e}</option>)}</select></div>
                <div><label className="form-label">Operator</label><select className="form-control" value={serieForm.operator} onChange={e=>setSerieForm(p=>({...p,operator:e.target.value}))}>{PERSONAL.map(p=><option key={p}>{p}</option>)}</select></div>
              </div>

              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>Servicii ({serieServicii.length})</div>
                  <button type="button" onClick={()=>{setShowAddSrv(true);setSrvSearch('');setSrvForm({srv:null,probe:'',cpCt:'',cpTinta:'',cnCt:'',cp_count:0,calibratori_count:0})}}
                    style={{background:'#eff6ff',color:'#1e40af',border:'1px solid #bfdbfe',padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                    + Adaugă serviciu
                  </button>
                </div>
                {serieServicii.length===0?(
                  <div style={{border:'2px dashed #e2e8f0',borderRadius:12,padding:24,textAlign:'center',color:'#94a3b8',fontSize:13}}>
                    Niciun serviciu. Apăsați "+ Adaugă serviciu".
                  </div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {serieServicii.map((s,i)=>(
                      <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:12,border:'1px solid #e2e8f0'}}>
                        <span style={{fontFamily:'monospace',fontWeight:700,color:'#1a56db',minWidth:70,fontSize:13}}>{s.srv_cod}</span>
                        <span style={{fontSize:12,color:'#64748b',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.srv_den}</span>
                        <span style={{fontSize:12,color:'#94a3b8'}}>{s.nr_probe}p</span>
                        <span style={{fontSize:12,color:'#94a3b8'}}>CP Ct:{s.cp.ct||'—'}</span>
                        <span style={{fontSize:12,color:'#94a3b8'}}>CP nr:{s.cp_count||0}</span>
                        <span style={{fontSize:12,color:'#94a3b8'}}>CN:{s.cn.ct||'—'}</span>
                        <span style={{fontSize:12,color:'#94a3b8'}}>Cal:{s.calibratori_count||0}</span>
                        <span style={{fontWeight:700,fontSize:14,color:s.iqc_rezultat==='acceptat'?'#16a34a':'#dc2626'}}>{s.iqc_rezultat==='acceptat'?'✓':'✗'}</span>
                        <button type="button" onClick={()=>setSerieServicii(prev=>prev.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'#e2e8f0',cursor:'pointer',fontSize:16}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div><label className="form-label">Observații</label><input type="text" className="form-control" value={serieForm.obs} onChange={e=>setSerieForm(p=>({...p,obs:e.target.value}))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>{setShowAddSerie(false);setSerieServicii([])}}>Anulare</button>
              <button className="btn btn-primary" onClick={saveSerie} disabled={saving||!serieServicii.length}>{saving?'Se salvează...':'✓ Salvează seria'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL SERVICIU ═══════════════════════════════════ */}
      {showAddSrv && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000,padding:16}}>
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-header" style={{background:'#1e293b',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>Adaugă serviciu</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>Grupă: <strong style={{color:'white'}}>{serieForm.grupa}</strong> · {servicii.filter(s=>s.grupa===serieForm.grupa).length} servicii</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label className="form-label">Caută serviciu</label>
                <input type="text" className="form-control" value={srvSearch} placeholder="Cod sau denumire... (ex. BM04)" autoFocus
                  onFocus={()=>setSrvFocused(true)} onBlur={()=>setTimeout(()=>setSrvFocused(false),200)}
                  onChange={e=>{setSrvSearch(e.target.value);setSrvForm(p=>({...p,srv:null}))}} />
                {(srvFocused||srvSearch)&&!srvForm.srv&&(
                  <div style={{border:'1px solid #e2e8f0',borderRadius:10,marginTop:6,maxHeight:200,overflowY:'auto',boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
                    {filteredSrv.length>0?filteredSrv.map(s=>(
                      <div key={s.id} onMouseDown={()=>{setSrvForm(p=>({...p,srv:s}));setSrvSearch(s.cod+' — '+s.den);setSrvFocused(false)}}
                        style={{padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid #f8fafc'}}
                        onMouseOver={e=>e.currentTarget.style.background='#eff6ff'} onMouseOut={e=>e.currentTarget.style.background='white'}>
                        <span style={{fontFamily:'monospace',fontWeight:700,color:'#1a56db',fontSize:12,minWidth:60}}>{s.cod}</span>
                        <span style={{fontSize:13,color:'#1e293b',flex:1}}>{s.den}</span>
                        <span style={{fontSize:10,color:'#94a3b8',background:'#f8fafc',padding:'2px 8px',borderRadius:6}}>{s.grupa}</span>
                      </div>
                    )):<div style={{padding:'16px',textAlign:'center',color:'#94a3b8',fontSize:13}}>{servicii.length===0?'⚠ Catalog gol':'Niciun serviciu găsit'}</div>}
                  </div>
                )}
                {srvForm.srv&&(
                  <div style={{marginTop:8,background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#1e40af'}}>{srvForm.srv.cod} — {srvForm.srv.den}</span>
                    <button type="button" onClick={()=>{setSrvForm(p=>({...p,srv:null}));setSrvSearch('')}} style={{background:'none',border:'none',color:'#93c5fd',cursor:'pointer',fontSize:16}}>✕</button>
                  </div>
                )}
              </div>
              <div><label className="form-label">Nr. probe pacienți</label><input type="number" min="1" className="form-control" value={srvForm.probe} onChange={e=>setSrvForm(p=>({...p,probe:e.target.value}))} /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Număr CP</label><input type="number" min="0" className="form-control" value={srvForm.cp_count} onChange={e=>setSrvForm(p=>({...p,cp_count:parseInt(e.target.value)||0}))} /></div>
                <div><label className="form-label">Număr calibratori</label><input type="number" min="0" className="form-control" value={srvForm.calibratori_count} onChange={e=>setSrvForm(p=>({...p,calibratori_count:parseInt(e.target.value)||0}))} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">CP — Ct obținut</label><input type="number" step="0.01" className="form-control" value={srvForm.cpCt} onChange={e=>setSrvForm(p=>({...p,cpCt:e.target.value}))} placeholder="ex. 28.45" style={{fontFamily:'monospace'}} /></div>
                <div><label className="form-label">CP — Ct țintă</label><input type="number" step="0.01" className="form-control" value={srvForm.cpTinta} onChange={e=>setSrvForm(p=>({...p,cpTinta:e.target.value}))} placeholder="ex. 28.00" style={{fontFamily:'monospace'}} /></div>
              </div>
              {srvForm.cpCt&&srvForm.cpTinta&&(
                <div className={evalCP(srvForm.cpCt,srvForm.cpTinta)==='acceptat'?'alert alert-success':'alert alert-danger'}>
                  CP: {evalCP(srvForm.cpCt,srvForm.cpTinta)==='acceptat'?'✓ Acceptat':'✗ Respins'} — deviație {Math.abs(parseFloat(srvForm.cpCt)-parseFloat(srvForm.cpTinta)).toFixed(2)} (limită ±2)
                </div>
              )}
              <div><label className="form-label">CN — Ct obținut <span style={{fontSize:11,fontWeight:400,color:'#94a3b8'}}>(lăsați gol dacă nedeterminat)</span></label>
                <input type="number" step="0.01" className="form-control" value={srvForm.cnCt} onChange={e=>setSrvForm(p=>({...p,cnCt:e.target.value}))} placeholder="Lăsați gol" style={{fontFamily:'monospace'}} />
              </div>
              {srvForm.cnCt!==''&&(
                <div className={evalCN(srvForm.cnCt)==='acceptat'?'alert alert-success':'alert alert-danger'}>
                  CN: {evalCN(srvForm.cnCt)==='acceptat'?`✓ Acceptat (Ct ${srvForm.cnCt} > 40)`:`✗ Respins (Ct ${srvForm.cnCt} ≤ 40)`}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowAddSrv(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={addSrvToSerie}>Adaugă serviciu</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EQA PROGRAM ════════════════════════════════ */}
      {showAddProg&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddProg(false)}>
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-header" style={{background:'#1a56db',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>🌍 Program EQA nou</div></div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label className="form-label">Denumire program</label><input type="text" className="form-control" value={progForm.denumire} onChange={e=>setProgForm(p=>({...p,denumire:e.target.value}))} placeholder="ex. QCMD Molecular Bacteriology 2026" /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Organizator</label><input type="text" className="form-control" value={progForm.organizator} onChange={e=>setProgForm(p=>({...p,organizator:e.target.value}))} /></div>
                <div><label className="form-label">An</label><input type="number" className="form-control" value={progForm.an} onChange={e=>setProgForm(p=>({...p,an:parseInt(e.target.value)}))} /></div>
                <div><label className="form-label">Grupă</label><select className="form-control" value={progForm.grupa} onChange={e=>setProgForm(p=>({...p,grupa:e.target.value}))}>{GRUPE.map(g=><option key={g}>{g}</option>)}</select></div>
                <div><label className="form-label">Runde planificate</label><input type="number" min="1" max="12" className="form-control" value={progForm.runde_plan} onChange={e=>setProgForm(p=>({...p,runde_plan:parseInt(e.target.value)}))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowAddProg(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveEQAProg} disabled={saving}>{saving?'...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EQA REZULTAT ═══════════════════════════════ */}
      {showAddRez&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddRez(false)}>
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-header" style={{background:'#1a56db',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>📋 Rezultat rundă EQA</div></div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Runda nr.</label><input type="number" min="1" className="form-control" value={rezForm.runda} onChange={e=>setRezForm(p=>({...p,runda:parseInt(e.target.value)}))} /></div>
                <div><label className="form-label">Data</label><input type="date" className="form-control" value={rezForm.data} onChange={e=>setRezForm(p=>({...p,data:e.target.value}))} /></div>
              </div>
              <div><label className="form-label">Material / Analit</label><input type="text" className="form-control" value={rezForm.material} onChange={e=>setRezForm(p=>({...p,material:e.target.value}))} placeholder="ex. Chlamydia trachomatis DNA" /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Rezultat lab</label><input type="text" className="form-control" value={rezForm.rez_lab} onChange={e=>setRezForm(p=>({...p,rez_lab:e.target.value}))} placeholder="ex. Pozitiv" /></div>
                <div><label className="form-label">Consens</label><input type="text" className="form-control" value={rezForm.rez_consens} onChange={e=>setRezForm(p=>({...p,rez_consens:e.target.value}))} placeholder="ex. Pozitiv" /></div>
                <div><label className="form-label">Scor</label><input type="text" className="form-control" value={rezForm.scor} onChange={e=>setRezForm(p=>({...p,scor:e.target.value}))} placeholder="ex. 100%" /></div>
                <div><label className="form-label">Evaluare</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {['satisfacator','nesatisfacator'].map(v=>(
                      <button key={v} type="button" onClick={()=>setRezForm(p=>({...p,eval:v}))}
                        style={{padding:'8px',borderRadius:8,border:`2px solid ${rezForm.eval===v?v==='satisfacator'?'#16a34a':'#dc2626':'#e2e8f0'}`,background:rezForm.eval===v?v==='satisfacator'?'#f0fdf4':'#fef2f2':'white',color:rezForm.eval===v?v==='satisfacator'?'#166534':'#991b1b':'#64748b',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        {v==='satisfacator'?'✓ Satisf.':'✗ Nesatisf.'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {rezForm.eval==='nesatisfacator'&&<div><label className="form-label">Acțiune corectivă</label><textarea className="form-control" rows={2} value={rezForm.ac} onChange={e=>setRezForm(p=>({...p,ac:e.target.value}))} style={{resize:'none'}} /></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowAddRez(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveEQARez} disabled={saving}>{saving?'...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL FFP ════════════════════════════════════════ */}
      {showAddFFP&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddFFP(false)}>
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-header" style={{background:'#16a34a',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>✅ Adaugă validare metodă</div></div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Grupă</label><select className="form-control" value={ffpForm.grupa} onChange={e=>setFfpForm(p=>({...p,grupa:e.target.value}))}>{GRUPE.map(g=><option key={g}>{g}</option>)}</select></div>
                <div><label className="form-label">Test / Analit</label><input type="text" className="form-control" value={ffpForm.tip_test} onChange={e=>setFfpForm(p=>({...p,tip_test:e.target.value}))} placeholder="ex. Chlamydia" /></div>
                <div><label className="form-label">Metodă</label><input type="text" className="form-control" value={ffpForm.metoda} onChange={e=>setFfpForm(p=>({...p,metoda:e.target.value}))} placeholder="ex. PCR Real-Time" /></div>
                <div><label className="form-label">Kit</label><input type="text" className="form-control" value={ffpForm.kit} onChange={e=>setFfpForm(p=>({...p,kit:e.target.value}))} placeholder="ex. AmpliSens CT-FL" /></div>
              </div>
              <div><label className="form-label">Echipament</label><select className="form-control" value={ffpForm.echipament} onChange={e=>setFfpForm(p=>({...p,echipament:e.target.value}))}>{ECHIPAMENTE.map(e=><option key={e}>{e}</option>)}</select></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowAddFFP(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveFFP} disabled={saving}>{saving?'...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
