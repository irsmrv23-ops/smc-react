import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TIPURI_KIT = ['amplificare', 'extractie', 'control', 'reactiv', 'consumabil', 'altul']
const TIPURI_KIT_COLORS = {
  amplificare: { color: '#1a56db', bg: '#eff6ff', icon: '🧬' },
  extractie:   { color: '#7c3aed', bg: '#f5f3ff', icon: '🧪' },
  control:     { color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
  reactiv:     { color: '#d97706', bg: '#fffbeb', icon: '⚗️' },
  consumabil:  { color: '#64748b', bg: '#f8fafc', icon: '📦' },
  altul:       { color: '#475569', bg: '#f1f5f9', icon: '🔧' },
}

const ECHIPAMENTE_LIST = [
  { id: 'DTprime-A5I842',   den: 'DTprime 5M1 (A5I842)',       tip: 'Termocicler' },
  { id: 'DTprime-A5JN90',   den: 'DTprime 5M1 (A5JN90)',       tip: 'Termocicler' },
  { id: 'DTprime-A5J776',   den: 'DTprime 5M1 (A5J776)',       tip: 'Termocicler' },
  { id: 'DTprime2-R5N637',  den: 'DTprime II 5M1 (R5N637)',    tip: 'Termocicler' },
  { id: 'RotorGene',        den: 'Rotor-Gene Q6',               tip: 'Termocicler' },
  { id: 'QuantStudio',      den: 'QuantStudio 5',               tip: 'Termocicler' },
  { id: 'GeneXpert',        den: 'GeneXpert XVI',               tip: 'Termocicler' },
  { id: 'SeqStudio',        den: 'SeqStudio Genetic Analyzer',  tip: 'Secvențiator' },
  { id: 'IonGeneStudio',    den: 'Ion GeneStudio S5',           tip: 'Secvențiator' },
  { id: 'Centrifuga1',      den: 'Centrifugă (lab 1)',          tip: 'Centrifugă' },
  { id: 'Centrifuga2',      den: 'Centrifugă (lab 2)',          tip: 'Centrifugă' },
  { id: 'HotaLaminar1',     den: 'Hotă flux laminar (Sala 1)', tip: 'Hotă' },
  { id: 'HotaLaminar2',     den: 'Hotă flux laminar (Sala 2)', tip: 'Hotă' },
  { id: 'Frigider1',        den: 'Frigider reactivi (2–8°C)',   tip: 'Frigider' },
  { id: 'Congelator1',      den: 'Congelator probe (–20°C)',    tip: 'Congelator' },
  { id: 'Congelator2',      den: 'Congelator probe (–80°C)',    tip: 'Congelator' },
  { id: 'Balance1',         den: 'Balanță analitică',           tip: 'Balanță' },
  { id: 'Pipeta1',          den: 'Pipete multicanal (set)',     tip: 'Pipetă' },
  { id: 'Vortex1',          den: 'Vortex mixer',                tip: 'Agitator' },
  { id: 'Termobloc1',       den: 'Termobloc',                   tip: 'Termobloc' },
]

const TIPURI_METRO = ['etalonare', 'verificare', 'mentenanta', 'reparatie', 'calificare']
const METRO_COLORS = {
  etalonare:   { color: '#1a56db', bg: '#eff6ff', icon: '📐' },
  verificare:  { color: '#7c3aed', bg: '#f5f3ff', icon: '🔍' },
  mentenanta:  { color: '#d97706', bg: '#fffbeb', icon: '🔧' },
  reparatie:   { color: '#dc2626', bg: '#fef2f2', icon: '🛠️' },
  calificare:  { color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
}

const TIP_ECH_ICONS = {
  'Termocicler': '🔬', 'Secvențiator': '🧬', 'Centrifugă': '⚙️',
  'Hotă': '🌬️', 'Frigider': '❄️', 'Congelator': '🧊',
  'Balanță': '⚖️', 'Pipetă': '💉', 'Agitator': '🔄', 'Termobloc': '🌡️',
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function daysUntil(d) { if (!d) return 9999; return Math.ceil((new Date(d) - new Date()) / 86400000) }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ro-RO') }

export default function Stocuri() {
  const [tab, setTab] = useState('stocuri')
  const [stoc, setStoc] = useState([])
  const [miscari, setMiscari] = useState([])
  const [metro, setMetro] = useState([])
  const [servicii, setServicii] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddKit, setShowAddKit] = useState(false)
  const [showMiscare, setShowMiscare] = useState(null)
  const [showAddMetro, setShowAddMetro] = useState(false)
  const [metroEch, setMetroEch] = useState(null)
  const [filtruTip, setFiltruTip] = useState('')
  const [kitForm, setKitForm] = useState({ cod: '', den: '', tip: 'amplificare', producator: '', lot: '', expirare: '', cantitate: 1, teste_per_kit: 96, stoc_min: 1, serviciu_id: '', obs: '' })
  const [miscareForm, setMiscareForm] = useState({ tip: 'intrare', cant: 1, motiv: '', data: todayStr() })
  const [metroForm, setMetroForm] = useState({ echipament: ECHIPAMENTE_LIST[0].den, tip: 'etalonare', data_ef: todayStr(), data_sc: '', exec_tip: 'extern', exec_firma: '', cert: '', cost: '', obs: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [itemsRes, balancesRes, movementsRes, mt, srv] = await Promise.all([
      supabase.from('stock_items').select('*').order('ref', { ascending: true }),
      supabase.from('stock_balances').select('*').eq('locatie', 'laborator'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('metro_data').select('*').order('data_sc', { ascending: true }),
      supabase.from('servicii').select('*').eq('activ', true).order('cod', { ascending: true }),
    ])

    const items = itemsRes.data || []
    const balances = balancesRes.data || []
    const services = srv.data || []

    const stocView = items.map(item => {
      const bal = balances.find(b => b.stock_item_id === item.id)
      const serv = services.find(s => s.id === item.serviciu_id)
      return {
        id: item.id,
        cod: item.ref,
        den: item.denumire,
        tip: item.tip_reagent === 'control_intern' ? 'control' : item.tip_reagent,
        producator: item.producator,
        lot: item.lot || '',
        expirare: item.expirare || '',
        cantitate: bal?.cantitate_disponibila || 0,
        stoc_min: item.stoc_minim || 0,
        teste_per_kit: item.cantitate_teste || 0,
        serviciu_id: item.serviciu_id || '',
        serviciu_cod: serv?.cod || '',
        serviciu_den: serv?.den || '',
      }
    })

    const miscariView = (movementsRes.data || []).map(m => ({
      id: m.id,
      kit_id: m.stock_item_id,
      kit_den: items.find(i => i.id === m.stock_item_id)?.denumire || '—',
      kit_cod: items.find(i => i.id === m.stock_item_id)?.ref || '—',
      tip: m.tip_miscare === 'intrare_central' || m.tip_miscare === 'transfer_lab' ? 'intrare' : 'iesire',
      cant: Math.abs(m.cantitate || 0),
      data: m.data_miscare,
      motiv: m.motiv,
      stoc_dupa: '',
    }))

    setStoc(stocView)
    setMiscari(miscariView)
    setMetro(mt.data || [])
    setServicii(services)
    setLoading(false)
  }

  async function saveKit() {
    if (!kitForm.cod || !kitForm.den) { alert('Cod și denumire obligatorii!'); return }
    setSaving(true)

    const itemRec = {
      ref: kitForm.cod,
      denumire: kitForm.den,
      producator: kitForm.producator || null,
      tip_reagent: kitForm.tip === 'control' ? 'control_intern' : (['amplificare','extractie'].includes(kitForm.tip) ? kitForm.tip : 'amplificare'),
      serviciu_id: kitForm.serviciu_id || null,
      cantitate_teste: parseInt(kitForm.teste_per_kit) || 96,
      stoc_minim: parseFloat(kitForm.stoc_min) || 1,
      activ: true,
      lot: kitForm.lot || null,
      expirare: kitForm.expirare || null,
    }

    const { data: inserted, error } = await supabase.from('stock_items').insert(itemRec).select().single()

    if (!error && inserted) {
      const startQty = parseFloat(kitForm.cantitate) || 0
      await supabase.from('stock_balances').insert({
        stock_item_id: inserted.id,
        locatie: 'laborator',
        cantitate_disponibila: startQty,
      })

      if (startQty > 0) {
        await supabase.from('stock_movements').insert({
          stock_item_id: inserted.id,
          tip_miscare: 'corectie',
          sursa: null,
          destinatie: 'laborator',
          cantitate: startQty,
          data_miscare: todayStr(),
          motiv: 'Stoc inițial',
          utilizator: 'sistem'
        })
      }

      await loadAll()
      setShowAddKit(false)
      setKitForm({ cod: '', den: '', tip: 'amplificare', producator: '', lot: '', expirare: '', cantitate: 1, teste_per_kit: 96, stoc_min: 1, serviciu_id: '', obs: '' })
    } else {
      alert('Eroare: ' + error.message)
    }
    setSaving(false)
  }

  async function saveMiscare() {
    const cant = parseFloat(miscareForm.cant)
    if (!cant || cant <= 0) { alert('Introduceți cantitatea!'); return }
    setSaving(true)
    const kit = showMiscare
    const newCant = miscareForm.tip === 'intrare' ? kit.cantitate + cant : Math.max(0, kit.cantitate - cant)

    const { error } = await supabase
      .from('stock_balances')
      .update({ cantitate_disponibila: newCant, updated_at: new Date().toISOString() })
      .eq('stock_item_id', kit.id)
      .eq('locatie', 'laborator')

    if (!error) {
      const misRec = {
        stock_item_id: kit.id,
        tip_miscare: miscareForm.tip === 'intrare' ? 'corectie' : 'consum_lab',
        sursa: miscareForm.tip === 'intrare' ? null : 'laborator',
        destinatie: miscareForm.tip === 'intrare' ? 'laborator' : null,
        cantitate: miscareForm.tip === 'intrare' ? cant : -cant,
        data_miscare: miscareForm.data,
        motiv: miscareForm.motiv,
        utilizator: 'manual'
      }
      await supabase.from('stock_movements').insert(misRec)
      await loadAll()
      setShowMiscare(null)
      if (newCant <= kit.stoc_min) alert(`⚠ Stoc minim atins pentru ${kit.den}!`)
    }
    setSaving(false)
  }

  async function deleteKit(id) {
    if (!window.confirm('Ștergeți kitul din stoc?')) return
    await supabase.from('stock_items').delete().eq('id', id)
    setStoc(prev => prev.filter(s => s.id !== id))
  }

  async function saveMetro() {
    if (!metroForm.echipament || !metroForm.data_ef) { alert('Echipament și data obligatorii!'); return }
    setSaving(true)
    const rec = { id: 'MTR-' + Date.now(), ...metroForm, cost: metroForm.cost ? parseFloat(metroForm.cost) : null, ts: new Date().toISOString() }
    const { error } = await supabase.from('metro_data').insert(rec)
    if (!error) { setMetro(prev => [...prev, rec].sort((a, b) => (a.data_sc||'').localeCompare(b.data_sc||''))); setShowAddMetro(false) }
    setSaving(false)
  }

  async function uploadMetroCert(metroId, file) {
    if (!file) return
    const path = `metro/${metroId}/${file.name}`
    const { error } = await supabase.storage.from('documente').upload(path, file, { upsert: true })
    if (error) { alert('Eroare: ' + error.message); return }
    const { data } = supabase.storage.from('documente').getPublicUrl(path)
    await supabase.from('metro_data').update({ cert_url: data.publicUrl }).eq('id', metroId)
    setMetro(prev => prev.map(m => m.id === metroId ? { ...m, cert_url: data.publicUrl } : m))
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Se încarcă...</div>

  const expirateKituri = stoc.filter(s => s.expirare && s.expirare < todayStr())
  const stocMinim = stoc.filter(s => s.cantitate <= s.stoc_min)
  const metroExpirate = metro.filter(m => m.data_sc && daysUntil(m.data_sc) < 0)
  const metroCurand = metro.filter(m => m.data_sc && daysUntil(m.data_sc) >= 0 && daysUntil(m.data_sc) <= 30)
  const filteredStoc = stoc.filter(s => !filtruTip || s.tip === filtruTip)
  const echMetro = metroEch ? metro.filter(m => m.echipament === metroEch) : metro

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">Stocuri & Metrologie</div>
          <div className="page-subtitle">Kituri · Reactivi · Echipamente · Etalonare</div>
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>

        {/* ALERTE */}
        {(expirateKituri.length > 0 || stocMinim.length > 0 || metroExpirate.length > 0 || metroCurand.length > 0) && (
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:24}}>
            {expirateKituri.map(k => (
              <div key={k.id} className="alert alert-danger">⚠ Kit expirat: <strong>{k.den}</strong> — expirat la {fmtDate(k.expirare)}</div>
            ))}
            {stocMinim.filter(k => k.expirare >= todayStr() || !k.expirare).map(k => (
              <div key={k.id} className="alert alert-warning">📦 Stoc minim: <strong>{k.den}</strong> — {k.cantitate} kituri (minim: {k.stoc_min})</div>
            ))}
            {metroExpirate.map(m => (
              <div key={m.id} className="alert alert-danger">🔧 Metrologie expirată: <strong>{m.echipament?.split('(')[0]?.trim()}</strong> — scadentă la {fmtDate(m.data_sc)}</div>
            ))}
            {metroCurand.map(m => (
              <div key={m.id} className="alert alert-warning">🔧 Metrologie scadentă în {daysUntil(m.data_sc)} zile: <strong>{m.echipament?.split('(')[0]?.trim()}</strong></div>
            ))}
          </div>
        )}

        {/* TABS GRANDIOASE */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:32}}>
          {[
            { id: 'stocuri',    icon: '📦', label: 'Stocuri',    desc: `${stoc.length} kituri · ${expirateKituri.length} expirate`,       alert: expirateKituri.length + stocMinim.length },
            { id: 'miscari',    icon: '📋', label: 'Mișcări',    desc: `${miscari.length} înregistrări recente`,                           alert: 0 },
            { id: 'metrologie', icon: '🔧', label: 'Metrologie', desc: `${metro.length} echipamente · ${metroExpirate.length} expirate`,    alert: metroExpirate.length + metroCurand.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? '#1a56db' : 'white',
                border: `2px solid ${tab === t.id ? '#1a56db' : t.alert > 0 ? '#fde68a' : '#e2e8f0'}`,
                borderRadius: 16, padding: '20px 20px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s', position: 'relative',
                boxShadow: tab === t.id ? '0 8px 24px rgba(26,86,219,0.3)' : t.alert > 0 ? '0 2px 8px rgba(217,119,6,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                transform: tab === t.id ? 'translateY(-3px)' : 'none',
              }}>
              {t.alert > 0 && tab !== t.id && (
                <div style={{position:'absolute',top:12,right:12,background:'#dc2626',color:'white',width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700}}>{t.alert}</div>
              )}
              <div style={{fontSize:32,marginBottom:10}}>{t.icon}</div>
              <div style={{fontSize:16,fontWeight:700,color:tab===t.id?'white':'#1e293b',marginBottom:4}}>{t.label}</div>
              <div style={{fontSize:12,color:tab===t.id?'rgba(255,255,255,0.75)':'#94a3b8'}}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* ═══ STOCURI ══════════════════════════════════════════ */}
        {tab === 'stocuri' && (
          <div>
            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
              {[
                { label: 'Total kituri', val: stoc.length, color: '#1a56db', bg: '#eff6ff', icon: '📦' },
                { label: 'Expirate', val: expirateKituri.length, color: '#dc2626', bg: '#fef2f2', icon: '⚠️' },
                { label: 'Stoc minim', val: stocMinim.length, color: '#d97706', bg: '#fffbeb', icon: '📉' },
                { label: 'OK', val: stoc.length - expirateKituri.length - stocMinim.length, color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
              ].map((s, i) => (
                <div key={i} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:20,display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{s.icon}</div>
                  <div><div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.val}</div><div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>{s.label}</div></div>
                </div>
              ))}
            </div>

            {/* Filtre tip */}
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
              <button onClick={()=>setFiltruTip('')} style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${!filtruTip?'#1a56db':'#e2e8f0'}`,background:!filtruTip?'#1a56db':'white',color:!filtruTip?'white':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>Toate</button>
              {TIPURI_KIT.map(t=>{const tc=TIPURI_KIT_COLORS[t];return(
                <button key={t} onClick={()=>setFiltruTip(t===filtruTip?'':t)} style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${filtruTip===t?tc.color:'#e2e8f0'}`,background:filtruTip===t?tc.bg:'white',color:filtruTip===t?tc.color:'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>
                  {tc.icon} {t}
                </button>
              )})}
              <button className="btn btn-primary" style={{marginLeft:'auto'}} onClick={()=>setShowAddKit(true)}>+ Kit nou</button>
            </div>

            {/* Grid kituri */}
            {filteredStoc.length === 0 ? (
              <div style={{background:'white',borderRadius:16,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:48,marginBottom:12}}>📦</div>
                <div style={{fontSize:15,fontWeight:600}}>Niciun kit în stoc</div>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
                {filteredStoc.map(s => {
                  const expirat = s.expirare && s.expirare < todayStr()
                  const minim = s.cantitate <= s.stoc_min
                  const tc = TIPURI_KIT_COLORS[s.tip] || TIPURI_KIT_COLORS.altul
                  const pct = Math.min(100, Math.round(s.cantitate / (s.stoc_min * 3) * 100))
                  return (
                    <div key={s.id} style={{background:'white',borderRadius:16,border:`2px solid ${expirat?'#fecaca':minim?'#fde68a':'#e2e8f0'}`,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',transition:'all 0.2s'}}
                      onMouseOver={e=>e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'}
                      onMouseOut={e=>e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:40,height:40,borderRadius:10,background:tc.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{tc.icon}</div>
                          <div>
                            <div style={{fontFamily:'monospace',fontWeight:700,fontSize:13,color:tc.color}}>{s.cod}</div>
                            <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'capitalize'}}>{s.tip}</div>
                          </div>
                        </div>
                        <div>
                          {expirat && <span style={{background:'#fef2f2',color:'#991b1b',border:'1px solid #fecaca',padding:'3px 8px',borderRadius:8,fontSize:10,fontWeight:700}}>⚠ EXPIRAT</span>}
                          {!expirat && minim && <span style={{background:'#fffbeb',color:'#92400e',border:'1px solid #fde68a',padding:'3px 8px',borderRadius:8,fontSize:10,fontWeight:700}}>📉 MINIM</span>}
                        </div>
                      </div>
                      <div style={{fontSize:14,fontWeight:600,color:'#1e293b',marginBottom:4,lineHeight:1.3}}>{s.den}</div>
                      {s.serviciu_cod && <div style={{fontSize:12,color:'#1a56db',marginBottom:6,fontWeight:600}}>{s.serviciu_cod} · {s.serviciu_den}</div>}
                      {s.producator && <div style={{fontSize:12,color:'#94a3b8',marginBottom:10}}>{s.producator} {s.lot && `· Lot: ${s.lot}`}</div>}
                      {s.expirare && <div style={{fontSize:12,color:expirat?'#dc2626':'#64748b',marginBottom:10}}>Expiră: {fmtDate(s.expirare)}</div>}

                      {/* Bară stoc */}
                      <div style={{marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>STOC</span>
                          <span style={{fontSize:16,fontWeight:800,color:minim?'#dc2626':'#1e293b'}}>{s.cantitate} <span style={{fontSize:11,fontWeight:400,color:'#94a3b8'}}>/ min {s.stoc_min}</span></span>
                        </div>
                        <div style={{background:'#f1f5f9',borderRadius:99,height:8,overflow:'hidden'}}>
                          <div style={{width:Math.max(5,pct)+'%',height:'100%',background:expirat?'#dc2626':minim?'#d97706':'#1a56db',borderRadius:99,transition:'width 0.6s'}} />
                        </div>
                      </div>

                      <button onClick={()=>{setShowMiscare(s);setMiscareForm({tip:'intrare',cant:1,motiv:'',data:todayStr()})}}
                        style={{width:'100%',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'8px',fontSize:13,fontWeight:600,color:'#475569',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all 0.15s'}}
                        onMouseOver={e=>{e.currentTarget.style.background='#eff6ff';e.currentTarget.style.color='#1a56db';e.currentTarget.style.borderColor='#bfdbfe'}}
                        onMouseOut={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.color='#475569';e.currentTarget.style.borderColor='#e2e8f0'}}>
                        ± Înregistrare mișcare
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ MIȘCĂRI ══════════════════════════════════════════ */}
        {tab === 'miscari' && (
          <div className="table-wrapper">
            {miscari.length === 0 ? (
              <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:48,marginBottom:12}}>📋</div>
                <div>Nicio mișcare înregistrată</div>
              </div>
            ) : (
              <table>
                <thead><tr><th>Data</th><th>Kit</th><th>Tip</th><th>Cantitate</th><th>Stoc după</th><th>Motiv</th></tr></thead>
                <tbody>
                  {miscari.map(m => (
                    <tr key={m.id}>
                      <td>{m.data}</td>
                      <td style={{fontWeight:500}}>{m.kit_den}</td>
                      <td><span style={{background:m.tip==='intrare'?'#f0fdf4':'#fef2f2',color:m.tip==='intrare'?'#166534':'#991b1b',border:`1px solid ${m.tip==='intrare'?'#bbf7d0':'#fecaca'}`,padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>{m.tip==='intrare'?'↑ Intrare':'↓ Ieșire'}</span></td>
                      <td style={{fontWeight:700,fontSize:16}}>{m.cant}</td>
                      <td style={{color:'#64748b'}}>{m.stoc_dupa}</td>
                      <td style={{color:'#94a3b8'}}>{m.motiv||'—'}</td>
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
            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
              {[
                {label:'Total înregistrări',val:metro.length,color:'#1a56db',bg:'#eff6ff',icon:'📊'},
                {label:'Expirate',val:metroExpirate.length,color:'#dc2626',bg:'#fef2f2',icon:'⚠️'},
                {label:'Scadente în 30 zile',val:metroCurand.length,color:'#d97706',bg:'#fffbeb',icon:'⏰'},
              ].map((s,i)=>(
                <div key={i} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:20,display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                  <div style={{width:44,height:44,borderRadius:12,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{s.icon}</div>
                  <div><div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.val}</div><div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>{s.label}</div></div>
                </div>
              ))}
            </div>

            {/* Filtre echipamente */}
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
              <button onClick={()=>setMetroEch(null)} style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${!metroEch?'#1a56db':'#e2e8f0'}`,background:!metroEch?'#1a56db':'white',color:!metroEch?'white':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>Toate</button>
              {[...new Set(metro.map(m=>m.echipament))].map(e=>{
                const shortName = e?.split('(')[0]?.trim()
                const ech = ECHIPAMENTE_LIST.find(x=>x.den===e)
                const icon = TIP_ECH_ICONS[ech?.tip] || '🔧'
                const isAct = metroEch === e
                return (
                  <button key={e} onClick={()=>setMetroEch(isAct?null:e)} style={{padding:'6px 12px',borderRadius:8,border:`2px solid ${isAct?'#1a56db':'#e2e8f0'}`,background:isAct?'#eff6ff':'white',color:isAct?'#1a56db':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>
                    {icon} {shortName}
                  </button>
                )
              })}
              <button className="btn btn-primary" style={{marginLeft:'auto'}} onClick={()=>setShowAddMetro(true)}>+ Înregistrare</button>
            </div>

            {/* Grid metrologie */}
            {echMetro.length === 0 ? (
              <div style={{background:'white',borderRadius:16,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:48,marginBottom:12}}>🔧</div>
                <div>Nicio înregistrare metrologie</div>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
                {echMetro.map(m => {
                  const days = daysUntil(m.data_sc)
                  const expirat = days < 0
                  const curand = days >= 0 && days <= 30
                  const mc = METRO_COLORS[m.tip] || METRO_COLORS.etalonare
                  const ech = ECHIPAMENTE_LIST.find(x=>x.den===m.echipament)
                  const echIcon = TIP_ECH_ICONS[ech?.tip] || '🔧'
                  return (
                    <div key={m.id} style={{background:'white',borderRadius:16,border:`2px solid ${expirat?'#fecaca':curand?'#fde68a':'#e2e8f0'}`,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:40,height:40,borderRadius:10,background:mc.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{mc.icon}</div>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:mc.color,textTransform:'capitalize'}}>{m.tip}</div>
                            <div style={{fontSize:10,color:'#94a3b8'}}>{ech?.tip || ''}</div>
                          </div>
                        </div>
                        <span style={{background:expirat?'#fef2f2':curand?'#fffbeb':'#f0fdf4',color:expirat?'#991b1b':curand?'#92400e':'#166534',border:`1px solid ${expirat?'#fecaca':curand?'#fde68a':'#bbf7d0'}`,padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>
                          {expirat?'✗ Expirat':curand?`⏰ ${days}z`:'✓ Valabil'}
                        </span>
                      </div>
                      <div style={{fontSize:15,fontWeight:700,color:'#1e293b',marginBottom:4}}>{echIcon} {m.echipament?.split('(')[0]?.trim()}</div>
                      {m.echipament?.includes('(') && <div style={{fontSize:12,color:'#94a3b8',fontFamily:'monospace',marginBottom:10}}>({m.echipament.match(/\(([^)]+)\)/)?.[1]})</div>}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14,fontSize:12}}>
                        <div style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px'}}>
                          <div style={{color:'#94a3b8',fontWeight:600,fontSize:10,marginBottom:2}}>DATA EFECTUARE</div>
                          <div style={{fontWeight:600,color:'#1e293b'}}>{fmtDate(m.data_ef)}</div>
                        </div>
                        <div style={{background:expirat?'#fef2f2':curand?'#fffbeb':'#f8fafc',borderRadius:8,padding:'8px 10px'}}>
                          <div style={{color:'#94a3b8',fontWeight:600,fontSize:10,marginBottom:2}}>SCADENȚĂ</div>
                          <div style={{fontWeight:700,color:expirat?'#dc2626':curand?'#d97706':'#1e293b'}}>{fmtDate(m.data_sc)}</div>
                        </div>
                      </div>
                      {m.exec_firma && <div style={{fontSize:12,color:'#64748b',marginBottom:10}}>🏢 {m.exec_firma}</div>}
                      {m.cert && <div style={{fontSize:12,color:'#64748b',fontFamily:'monospace',marginBottom:10}}>📜 {m.cert}</div>}
                      <div>
                        {m.cert_url ? (
                          <a href={m.cert_url} target="_blank" rel="noreferrer" style={{background:'#eff6ff',color:'#1a56db',border:'1px solid #bfdbfe',padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,textDecoration:'none',display:'inline-block'}}>📄 Certificat</a>
                        ) : (
                          <label style={{background:'#f8fafc',border:'1px dashed #e2e8f0',color:'#94a3b8',padding:'6px 14px',borderRadius:8,fontSize:12,cursor:'pointer',display:'inline-block'}}>
                            📎 Upload certificat
                            <input type="file" accept=".pdf" style={{display:'none'}} onChange={e=>uploadMetroCert(m.id,e.target.files[0])} />
                          </label>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ MODAL KIT NOU ════════════════════════════════════ */}
      {showAddKit && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddKit(false)}>
          <div className="modal" style={{maxWidth:540}}>
            <div className="modal-header" style={{background:TIPURI_KIT_COLORS[kitForm.tip]?.color||'#1a56db',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>{TIPURI_KIT_COLORS[kitForm.tip]?.icon} Kit / Reactiv nou</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label className="form-label">Tip kit</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {TIPURI_KIT.map(t=>{const tc=TIPURI_KIT_COLORS[t];return(
                    <button key={t} type="button" onClick={()=>setKitForm(p=>({...p,tip:t}))}
                      style={{padding:'10px 8px',borderRadius:10,border:`2px solid ${kitForm.tip===t?tc.color:'#e2e8f0'}`,background:kitForm.tip===t?tc.bg:'white',color:kitForm.tip===t?tc.color:'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',textAlign:'center'}}>
                      <div style={{fontSize:18,marginBottom:3}}>{tc.icon}</div>{t}
                    </button>
                  )})}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Cod *</label><input type="text" className="form-control" value={kitForm.cod} onChange={e=>setKitForm(p=>({...p,cod:e.target.value}))} placeholder="ex. KIT-CT-001" style={{fontFamily:'monospace'}} /></div>
                <div><label className="form-label">Producător</label><input type="text" className="form-control" value={kitForm.producator} onChange={e=>setKitForm(p=>({...p,producator:e.target.value}))} placeholder="ex. AmpliSens" /></div>
              </div>
              <div><label className="form-label">Denumire *</label><input type="text" className="form-control" value={kitForm.den} onChange={e=>setKitForm(p=>({...p,den:e.target.value}))} placeholder="ex. AmpliSens Chlamydia trachomatis-FL" /></div>
              <div>
                <label className="form-label">Serviciu asociat</label>
                <select className="form-control" value={kitForm.serviciu_id} onChange={e=>setKitForm(p=>({...p,serviciu_id:e.target.value}))}>
                  <option value="">— selectați serviciul —</option>
                  {servicii.map(s => <option key={s.id} value={s.id}>{s.cod} — {s.den}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
                <div><label className="form-label">Nr. lot</label><input type="text" className="form-control" value={kitForm.lot} onChange={e=>setKitForm(p=>({...p,lot:e.target.value}))} style={{fontFamily:'monospace'}} /></div>
                <div><label className="form-label">Expirare</label><input type="date" className="form-control" value={kitForm.expirare} onChange={e=>setKitForm(p=>({...p,expirare:e.target.value}))} /></div>
                <div><label className="form-label">Teste/kit</label><input type="number" min="1" className="form-control" value={kitForm.teste_per_kit} onChange={e=>setKitForm(p=>({...p,teste_per_kit:e.target.value}))} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Cantitate inițială</label><input type="number" min="0" step="0.5" className="form-control" value={kitForm.cantitate} onChange={e=>setKitForm(p=>({...p,cantitate:e.target.value}))} /></div>
                <div><label className="form-label">Stoc minim alertă</label><input type="number" min="0" step="0.5" className="form-control" value={kitForm.stoc_min} onChange={e=>setKitForm(p=>({...p,stoc_min:e.target.value}))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowAddKit(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveKit} disabled={saving}>{saving?'...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL MIȘCARE ════════════════════════════════════ */}
      {showMiscare && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowMiscare(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-header" style={{background:miscareForm.tip==='intrare'?'#16a34a':'#dc2626',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>{miscareForm.tip==='intrare'?'↑ Intrare stoc':'↓ Ieșire stoc'}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.8)'}}>{showMiscare.den}</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {['intrare','iesire'].map(t=>(
                  <button key={t} type="button" onClick={()=>setMiscareForm(p=>({...p,tip:t}))}
                    style={{padding:'14px',borderRadius:12,border:`2px solid ${miscareForm.tip===t?t==='intrare'?'#16a34a':'#dc2626':'#e2e8f0'}`,background:miscareForm.tip===t?t==='intrare'?'#f0fdf4':'#fef2f2':'white',color:miscareForm.tip===t?t==='intrare'?'#166534':'#991b1b':'#64748b',fontSize:14,fontWeight:700,cursor:'pointer',transition:'all 0.15s',textAlign:'center'}}>
                    {t==='intrare'?'↑ Intrare':'↓ Ieșire'}
                  </button>
                ))}
              </div>
              <div style={{background:'#f8fafc',borderRadius:12,padding:'14px 16px',textAlign:'center'}}>
                <div style={{fontSize:12,color:'#94a3b8',fontWeight:600,marginBottom:4}}>STOC CURENT</div>
                <div style={{fontSize:32,fontWeight:800,color:'#1e293b'}}>{showMiscare.cantitate}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Cantitate</label><input type="number" min="0.5" step="0.5" className="form-control" value={miscareForm.cant} onChange={e=>setMiscareForm(p=>({...p,cant:e.target.value}))} style={{fontSize:18,fontWeight:700,textAlign:'center'}} /></div>
                <div><label className="form-label">Data</label><input type="date" className="form-control" value={miscareForm.data} onChange={e=>setMiscareForm(p=>({...p,data:e.target.value}))} /></div>
              </div>
              <div style={{background:miscareForm.tip==='intrare'?'#f0fdf4':'#fef2f2',borderRadius:12,padding:'12px 16px',textAlign:'center'}}>
                <div style={{fontSize:11,color:'#94a3b8',fontWeight:600,marginBottom:4}}>STOC DUPĂ MIȘCARE</div>
                <div style={{fontSize:28,fontWeight:800,color:miscareForm.tip==='intrare'?'#16a34a':'#dc2626'}}>
                  {miscareForm.tip==='intrare'?showMiscare.cantitate+parseFloat(miscareForm.cant||0):Math.max(0,showMiscare.cantitate-parseFloat(miscareForm.cant||0))}
                </div>
              </div>
              <div><label className="form-label">Motiv</label><input type="text" className="form-control" value={miscareForm.motiv} onChange={e=>setMiscareForm(p=>({...p,motiv:e.target.value}))} placeholder="ex. Recepție lot nou, Utilizare serie IST" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowMiscare(null)}>Anulare</button>
              <button className="btn" onClick={saveMiscare} disabled={saving}
                style={{background:miscareForm.tip==='intrare'?'#16a34a':'#dc2626',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}}>
                {saving?'...':miscareForm.tip==='intrare'?'✓ Confirmă intrarea':'✓ Confirmă ieșirea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL METROLOGIE ═════════════════════════════════ */}
      {showAddMetro && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddMetro(false)}>
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header" style={{background:METRO_COLORS[metroForm.tip]?.color||'#1a56db',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>{METRO_COLORS[metroForm.tip]?.icon} Înregistrare metrologie</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label className="form-label">Tip intervenție</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
                  {TIPURI_METRO.map(t=>{const mc=METRO_COLORS[t];return(
                    <button key={t} type="button" onClick={()=>setMetroForm(p=>({...p,tip:t}))}
                      style={{padding:'10px 6px',borderRadius:10,border:`2px solid ${metroForm.tip===t?mc.color:'#e2e8f0'}`,background:metroForm.tip===t?mc.bg:'white',color:metroForm.tip===t?mc.color:'#64748b',fontSize:11,fontWeight:600,cursor:'pointer',textAlign:'center'}}>
                      <div style={{fontSize:18,marginBottom:3}}>{mc.icon}</div>{t}
                    </button>
                  )})}
                </div>
              </div>
              <div><label className="form-label">Echipament</label>
                <select className="form-control" value={metroForm.echipament} onChange={e=>setMetroForm(p=>({...p,echipament:e.target.value}))}>
                  {ECHIPAMENTE_LIST.map(e=><option key={e.id} value={e.den}>{TIP_ECH_ICONS[e.tip]||'🔧'} {e.den}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Executant</label>
                  <select className="form-control" value={metroForm.exec_tip} onChange={e=>setMetroForm(p=>({...p,exec_tip:e.target.value}))}>
                    <option value="extern">Firmă externă</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div><label className="form-label">Firma executantă</label><input type="text" className="form-control" value={metroForm.exec_firma} onChange={e=>setMetroForm(p=>({...p,exec_firma:e.target.value}))} placeholder="ex. MetroLab SRL" /></div>
                <div><label className="form-label">Data efectuare</label><input type="date" className="form-control" value={metroForm.data_ef} onChange={e=>setMetroForm(p=>({...p,data_ef:e.target.value}))} /></div>
                <div><label className="form-label">Scadență</label><input type="date" className="form-control" value={metroForm.data_sc} onChange={e=>setMetroForm(p=>({...p,data_sc:e.target.value}))} /></div>
                <div><label className="form-label">Nr. certificat</label><input type="text" className="form-control" value={metroForm.cert} onChange={e=>setMetroForm(p=>({...p,cert:e.target.value}))} /></div>
                <div><label className="form-label">Cost (MDL)</label><input type="number" className="form-control" value={metroForm.cost} onChange={e=>setMetroForm(p=>({...p,cost:e.target.value}))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowAddMetro(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveMetro} disabled={saving}>{saving?'...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
