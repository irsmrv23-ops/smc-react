import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SALI = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 1A']
const PERSONAL = ['Rotari Ion','Croitoru Tatiana','Jentimir Valeria','Andrian Maria','Antropov Marina']
const TEMP_MIN = 20, TEMP_MAX = 25, UMID_MIN = 30, UMID_MAX = 50

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

  const [tempSala, setTempSala] = useState('Sala 1')
  const [uvSala, setUvSala] = useState('Sala 1')
  const [curSala, setCurSala] = useState('Sala 1')

  const [showTemp, setShowTemp] = useState(false)
  const [showUV, setShowUV] = useState(false)
  const [showUVConfig, setShowUVConfig] = useState(false)
  const [showCur, setShowCur] = useState(false)
  const [showSolutii, setShowSolutii] = useState(false)
  const [showDeseu, setShowDeseu] = useState(false)
  const [showRaportDeseu, setShowRaportDeseu] = useState(false)

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

  async function saveTemp() {
    const temp = parseFloat(tempForm.temp)
    const umid = parseFloat(tempForm.umid)
    if (isNaN(temp) || isNaN(umid)) { alert('Introduceți temperatura și umiditatea!'); return }
    setSaving(true)
    const rec = { id: 'TEMP-' + Date.now(), data: todayStr(), ora: nowTime(), sala: tempForm.sala, temp, umid, responsabil: tempForm.responsabil, ts: new Date().toISOString() }
    const { error } = await supabase.from('temp_data').insert(rec)
    if (!error) {
      setTempData(prev => [rec, ...prev])
      setShowTemp(false)
      setTempForm(p => ({ ...p, temp: '', umid: '' }))
      const ok = temp >= TEMP_MIN && temp <= TEMP_MAX && umid >= UMID_MIN && umid <= UMID_MAX
      if (!ok) alert(`⚠ Valori în afara limitelor!\n${temp < TEMP_MIN || temp > TEMP_MAX ? `Temperatură: ${temp}°C (18–24°C)\n` : ''}${umid < UMID_MIN || umid > UMID_MAX ? `Umiditate: ${umid}% (65–75%)` : ''}`)
    }
    setSaving(false)
  }

  async function saveUV() {
    const d = new Date()
    if (d.getDay() === 0 || d.getDay() === 6) { alert('Iradierea UV se efectuează doar Luni–Vineri!'); return }
    setSaving(true)
    const sala = uvForm.sala
    const oreCurente = uvLampi[sala] || 0
    const oreDupa = Math.max(0, oreCurente - 0.5)
    const rec = { id: 'UV-' + Date.now(), data: todayStr(), interval: uvForm.interval, sala, specialist: uvForm.specialist, ore_inainte: oreCurente, ore_dupa: oreDupa, ts: new Date().toISOString() }
    const { error } = await supabase.from('uv_data').insert(rec)
    if (!error) {
      await supabase.from('uv_lampi').upsert({ sala, ore: oreDupa, updated: new Date().toISOString() }, { onConflict: 'sala' })
      setUvData(prev => [rec, ...prev])
      setUvLampi(prev => ({ ...prev, [sala]: oreDupa }))
      setShowUV(false)
      if (oreDupa < 100) alert(`⚠ Lampă UV ${sala}: ${oreDupa.toFixed(1)} ore rămase!`)
    }
    setSaving(false)
  }

  async function saveUVConfig() {
    const ore = parseFloat(uvConfigOre)
    if (isNaN(ore) || ore < 0) { alert('Introduceți orele!'); return }
    await supabase.from('uv_lampi').upsert({ sala: uvConfigSala, ore, updated: new Date().toISOString() }, { onConflict: 'sala' })
    setUvLampi(prev => ({ ...prev, [uvConfigSala]: ore }))
    setUvConfigOre('')
    setShowUVConfig(false)
  }

  async function saveCuratenie() {
    if (!curForm.solutie) { alert('Selectați soluția dezinfectantă!'); return }
    setSaving(true)
    const rec = { id: 'CUR-' + Date.now(), sala: curForm.sala, data_ef: todayStr(), solutie: curForm.solutie, operator: curForm.operator, obs: curForm.obs, ts: new Date().toISOString() }
    const { error } = await supabase.from('curatenie_data').insert(rec)
    if (!error) {
      setCurData(prev => [rec, ...prev])
      setShowCur(false)
      setCurForm(p => ({ ...p, obs: '' }))
      const sol = solutii.find(s => s.den === curForm.solutie)
      if (sol && Math.floor((new Date() - new Date(sol.data)) / 86400000) > 180)
        alert(`⚠ Soluția "${sol.den}" se folosește de >6 luni! Schimbați soluția.`)
    }
    setSaving(false)
  }

  async function supervizareCuratenie(id) {
    const updates = { supervizat_la: todayStr(), supervizat_de: PERSONAL[0], ts: new Date().toISOString() }
    await supabase.from('curatenie_data').update(updates).eq('id', id)
    setCurData(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  async function saveDeseu() {
    const cant = parseFloat(deseuForm.cantitate)
    if (!cant || cant <= 0) { alert('Introduceți cantitatea!'); return }
    setSaving(true)
    const rec = { id: 'DES-' + Date.now(), data: todayStr(), ora: nowTime(), sectia: 'Biologie Moleculară', cod: '18.01.03', cantitate: cant, responsabil: deseuForm.responsabil, ts: new Date().toISOString() }
    const { error } = await supabase.from('deseuri_data').insert(rec)
    if (!error) { setDeseuri(prev => [rec, ...prev]); setShowDeseu(false); setDeseuForm(p => ({ ...p, cantitate: '' })) }
    setSaving(false)
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Se încarcă...</div>

  const TABS_CFG = [
    { id: 'temperatura', icon: '🌡️', label: 'Temperatură & Umiditate', desc: 'Monitorizare 4 săli · PG-6.3/F-01', color: '#1a56db' },
    { id: 'uv',          icon: '💡', label: 'Lampă UV',               desc: '2×/zi L–V · Ore valabilitate',    color: '#7c3aed' },
    { id: 'curatenie',   icon: '🧹', label: 'Curățenie',              desc: 'Soluții dezinfectante · Supervizare', color: '#16a34a' },
    { id: 'deseuri',     icon: '🗑️', label: 'Deșeuri biologice',      desc: 'Cod 18.01.03 · Raport lunar',    color: '#dc2626' },
  ]

  const today = todayStr()
  const tempAzi = SALI.filter(s => tempData.some(t => t.sala === s && t.data === today))
  const uvAzi = SALI.filter(s => uvData.some(u => u.sala === s && u.data === today))
  const totalDeseuLuna = deseuri.filter(d => d.data?.startsWith(today.slice(0,7))).reduce((s,d)=>s+(d.cantitate||0),0)

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">Registre electronice</div>
          <div className="page-subtitle">Înregistrări zilnice · ISO 15189:2023 §6.3</div>
        </div>
        {/* Status rapid */}
        <div style={{display:'flex',gap:10}}>
          {SALI.map(s => {
            const tOk = tempAzi.includes(s)
            const uOk = uvAzi.includes(s)
            return (
              <div key={s} style={{textAlign:'center',background:tOk&&uOk?'#f0fdf4':'#fef2f2',border:`1px solid ${tOk&&uOk?'#bbf7d0':'#fecaca'}`,borderRadius:10,padding:'6px 12px',minWidth:64}}>
                <div style={{fontSize:11,fontWeight:700,color:'#475569'}}>{s}</div>
                <div style={{display:'flex',gap:4,justifyContent:'center',marginTop:4}}>
                  <span style={{fontSize:14}}>{tOk?'🌡️✓':'🌡️✗'}</span>
                  <span style={{fontSize:14}}>{uOk?'💡✓':'💡✗'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>

        {/* TABS GRANDIOASE */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:32}}>
          {TABS_CFG.map(t => {
            const isAct = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  background: isAct ? t.color : 'white',
                  border: `2px solid ${isAct ? t.color : '#e2e8f0'}`,
                  borderRadius: 16, padding: '20px 16px', cursor: 'pointer',
                  textAlign: 'center', transition: 'all 0.2s',
                  boxShadow: isAct ? `0 8px 24px ${t.color}40` : '0 1px 3px rgba(0,0,0,0.06)',
                  transform: isAct ? 'translateY(-3px)' : 'none',
                }}>
                <div style={{fontSize:32,marginBottom:10}}>{t.icon}</div>
                <div style={{fontSize:14,fontWeight:700,color:isAct?'white':'#1e293b',marginBottom:4}}>{t.label}</div>
                <div style={{fontSize:11,color:isAct?'rgba(255,255,255,0.75)':'#94a3b8'}}>{t.desc}</div>
              </button>
            )
          })}
        </div>

        {/* ═══ TEMPERATURĂ ══════════════════════════════════════ */}
        {tab === 'temperatura' && (
          <div>
            <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#1e40af',fontWeight:500}}>
              📏 Limite: <strong>20–25°C</strong> · <strong>30–50% umiditate relativă</strong> · FDA/CDC/ISO 15189 · PG-6.3/F-01
            </div>

            {/* Selector săli + buton */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
              {SALI.map(s => {
                const ultimaCitire = tempData.filter(t => t.sala === s)[0]
                const aziOk = tempAzi.includes(s)
                const isAct = tempSala === s
                return (
                  <button key={s} onClick={() => setTempSala(s)}
                    style={{
                      background: isAct ? '#1a56db' : 'white',
                      border: `2px solid ${isAct ? '#1a56db' : aziOk ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: 14, padding: '16px', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s',
                      boxShadow: isAct ? '0 6px 20px rgba(26,86,219,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                      transform: isAct ? 'translateY(-2px)' : 'none',
                    }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div style={{fontSize:15,fontWeight:700,color:isAct?'white':'#1e293b'}}>{s}</div>
                      <span style={{fontSize:12,fontWeight:700,color:isAct?'rgba(255,255,255,0.8)':aziOk?'#16a34a':'#dc2626'}}>{aziOk?'✓ OK azi':'✗ Lipsă'}</span>
                    </div>
                    {ultimaCitire ? (
                      <div>
                        <div style={{fontSize:22,fontWeight:800,color:isAct?'white':ultimaCitire.temp>=TEMP_MIN&&ultimaCitire.temp<=TEMP_MAX?'#16a34a':'#dc2626'}}>{ultimaCitire.temp}°C</div>
                        <div style={{fontSize:13,color:isAct?'rgba(255,255,255,0.8)':ultimaCitire.umid>=UMID_MIN&&ultimaCitire.umid<=UMID_MAX?'#16a34a':'#dc2626'}}>{ultimaCitire.umid}% umid.</div>
                        <div style={{fontSize:11,color:isAct?'rgba(255,255,255,0.6)':'#94a3b8',marginTop:4}}>{ultimaCitire.ora} · {fmtDate(ultimaCitire.data)}</div>
                      </div>
                    ) : (
                      <div style={{fontSize:13,color:isAct?'rgba(255,255,255,0.6)':'#94a3b8'}}>Nicio citire</div>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>{tempSala} — Ultimele citiri</div>
              <button className="btn btn-primary" onClick={() => { setTempForm(p => ({ ...p, sala: tempSala })); setShowTemp(true) }}>
                + Citire nouă
              </button>
            </div>

            <div className="table-wrapper">
              {tempData.filter(d => d.sala === tempSala).length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>🌡️</div><div>Nicio citire pentru {tempSala}</div></div>
              ) : (
                <table>
                  <thead><tr><th>Data</th><th>Ora</th><th>Temperatură</th><th>Umiditate</th><th>Status</th><th>Responsabil</th></tr></thead>
                  <tbody>
                    {tempData.filter(d => d.sala === tempSala).slice(0, 60).map(d => {
                      const tOk = d.temp >= TEMP_MIN && d.temp <= TEMP_MAX
                      const uOk = d.umid >= UMID_MIN && d.umid <= UMID_MAX
                      const ok = tOk && uOk
                      return (
                        <tr key={d.id} style={{background:ok?'':' #fef2f2'}}>
                          <td>{fmtDate(d.data)}</td>
                          <td style={{fontFamily:'monospace',fontWeight:600}}>{d.ora}</td>
                          <td><span style={{fontWeight:700,fontSize:15,color:tOk?'#16a34a':'#dc2626'}}>{d.temp}°C {!tOk&&'⚠'}</span></td>
                          <td><span style={{fontWeight:700,fontSize:15,color:uOk?'#16a34a':'#dc2626'}}>{d.umid}% {!uOk&&'⚠'}</span></td>
                          <td><span style={{background:ok?'#f0fdf4':'#fef2f2',color:ok?'#166534':'#991b1b',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{ok?'✓ OK':'✗ Depășit'}</span></td>
                          <td style={{color:'#64748b',fontSize:13}}>{d.responsabil}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ LAMPĂ UV ═════════════════════════════════════════ */}
        {tab === 'uv' && (
          <div>
            {/* Carduri săli UV */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
              {SALI.map(s => {
                const ore = uvLampi[s] || 0
                const isAct = uvSala === s
                const stare = ore < 100 ? 'critic' : ore < 500 ? 'atentie' : 'ok'
                const stareColor = stare === 'critic' ? '#dc2626' : stare === 'atentie' ? '#d97706' : '#16a34a'
                const stareBg = stare === 'critic' ? '#fef2f2' : stare === 'atentie' ? '#fffbeb' : '#f0fdf4'
                const pct = Math.min(100, ore / 80)
                const has8 = uvData.some(u => u.sala === s && u.data === today && u.interval === '08:00-08:30')
                const has14 = uvData.some(u => u.sala === s && u.data === today && u.interval === '14:00-14:30')
                return (
                  <button key={s} onClick={() => setUvSala(s)}
                    style={{
                      background: isAct ? '#7c3aed' : 'white',
                      border: `2px solid ${isAct ? '#7c3aed' : stare === 'critic' ? '#fecaca' : '#e2e8f0'}`,
                      borderRadius: 14, padding: '16px', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s',
                      boxShadow: isAct ? '0 6px 20px rgba(124,58,237,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                      transform: isAct ? 'translateY(-2px)' : 'none',
                    }}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{fontSize:15,fontWeight:700,color:isAct?'white':'#1e293b'}}>{s}</div>
                      <span style={{fontSize:20}}>{isAct?'💡':'🔆'}</span>
                    </div>
                    <div style={{fontSize:24,fontWeight:800,color:isAct?'white':stareColor}}>{ore.toFixed(0)}h</div>
                    <div style={{fontSize:11,color:isAct?'rgba(255,255,255,0.7)':stareColor,fontWeight:600,marginBottom:8}}>ore rămase</div>
                    <div style={{background:isAct?'rgba(255,255,255,0.2)':stareBg,borderRadius:99,height:6,marginBottom:8,overflow:'hidden'}}>
                      <div style={{width:pct+'%',height:'100%',background:isAct?'white':stareColor,borderRadius:99}} />
                    </div>
                    <div style={{display:'flex',gap:6,fontSize:11,color:isAct?'rgba(255,255,255,0.8)':'#94a3b8'}}>
                      <span style={{background:isAct?'rgba(255,255,255,0.2)':has8?'#f0fdf4':'#fef2f2',color:isAct?'white':has8?'#16a34a':'#dc2626',padding:'2px 8px',borderRadius:20,fontWeight:700}}>08:00 {has8?'✓':'✗'}</span>
                      <span style={{background:isAct?'rgba(255,255,255,0.2)':has14?'#f0fdf4':'#fef2f2',color:isAct?'white':has14?'#16a34a':'#dc2626',padding:'2px 8px',borderRadius:20,fontWeight:700}}>14:00 {has14?'✓':'✗'}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>{uvSala} — Iradieri înregistrate</div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-outline" onClick={() => setShowUVConfig(true)}>⚙️ Configurare ore</button>
                <button className="btn" style={{background:'#7c3aed',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}}
                  onClick={() => { setUvForm(p => ({ ...p, sala: uvSala })); setShowUV(true) }}>
                  + Iradiere UV
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              {uvData.filter(d => d.sala === uvSala).length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>💡</div><div>Nicio iradiere pentru {uvSala}</div></div>
              ) : (
                <table>
                  <thead><tr><th>Data</th><th>Interval</th><th>Ore înainte</th><th>Ore după</th><th>Specialist</th></tr></thead>
                  <tbody>
                    {uvData.filter(d => d.sala === uvSala).slice(0, 60).map(d => (
                      <tr key={d.id}>
                        <td>{fmtDate(d.data)}</td>
                        <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#7c3aed',fontSize:14}}>{d.interval}</span></td>
                        <td style={{color:'#64748b'}}>{parseFloat(d.ore_inainte||0).toFixed(1)}h</td>
                        <td><span style={{fontWeight:700,fontSize:15,color:parseFloat(d.ore_dupa||0)<100?'#dc2626':'#16a34a'}}>{parseFloat(d.ore_dupa||0).toFixed(1)}h</span></td>
                        <td style={{color:'#64748b'}}>{d.specialist}</td>
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
            {/* Carduri săli curățenie */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
              {SALI.map(s => {
                const ultimaCur = curData.filter(c => c.sala === s)[0]
                const isAct = curSala === s
                const days = ultimaCur ? Math.floor((new Date() - new Date(ultimaCur.data_ef)) / 86400000) : 999
                const stare = days > 14 ? 'critic' : days > 7 ? 'atentie' : 'ok'
                const stareColor = stare === 'critic' ? '#dc2626' : stare === 'atentie' ? '#d97706' : '#16a34a'
                return (
                  <button key={s} onClick={() => setCurSala(s)}
                    style={{
                      background: isAct ? '#16a34a' : 'white',
                      border: `2px solid ${isAct ? '#16a34a' : stare === 'critic' ? '#fecaca' : '#e2e8f0'}`,
                      borderRadius: 14, padding: '16px', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s',
                      boxShadow: isAct ? '0 6px 20px rgba(22,163,74,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                      transform: isAct ? 'translateY(-2px)' : 'none',
                    }}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{fontSize:15,fontWeight:700,color:isAct?'white':'#1e293b'}}>{s}</div>
                      <span style={{fontSize:20}}>🧹</span>
                    </div>
                    {ultimaCur ? (
                      <div>
                        <div style={{fontSize:22,fontWeight:800,color:isAct?'white':stareColor}}>{days === 0 ? 'Azi' : `${days}z`}</div>
                        <div style={{fontSize:11,color:isAct?'rgba(255,255,255,0.7)':stareColor,fontWeight:600}}>de la ultima curățenie</div>
                        <div style={{fontSize:11,color:isAct?'rgba(255,255,255,0.6)':'#94a3b8',marginTop:6}}>{ultimaCur.solutie?.slice(0,20)}</div>
                      </div>
                    ) : (
                      <div style={{fontSize:13,color:isAct?'rgba(255,255,255,0.7)':'#94a3b8'}}>Nicio înregistrare</div>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>{curSala} — Registru curățenie</div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-outline" onClick={() => setShowSolutii(true)}>🧴 Soluții ({solutii.length})</button>
                <button className="btn" style={{background:'#16a34a',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}}
                  onClick={() => { setCurForm(p => ({ ...p, sala: curSala })); setShowCur(true) }}>
                  ✓ Confirmă curățenie
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              {curData.filter(d => d.sala === curSala).length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>🧹</div><div>Nicio curățenie pentru {curSala}</div></div>
              ) : (
                <table>
                  <thead><tr><th>Nr.</th><th>Data</th><th>Soluție dezinfectantă</th><th>Efectuat de</th><th>Supervizat</th></tr></thead>
                  <tbody>
                    {curData.filter(d => d.sala === curSala).map((d, i, arr) => (
                      <tr key={d.id}>
                        <td style={{fontWeight:700,color:'#94a3b8'}}>{arr.length - i}</td>
                        <td style={{fontWeight:500}}>{fmtDate(d.data_ef)}</td>
                        <td>{d.solutie}</td>
                        <td style={{color:'#64748b'}}>{d.operator}</td>
                        <td>
                          {d.supervizat_la ? (
                            <span style={{background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>✓ {fmtDate(d.supervizat_la)}</span>
                          ) : (
                            <button onClick={() => supervizareCuratenie(d.id)}
                              style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:12,fontWeight:600,color:'#475569'}}>
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
            {/* Stats luna */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
              <div style={{background:'white',border:'1px solid #fecaca',borderRadius:14,padding:20,display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
                <div style={{width:44,height:44,borderRadius:12,background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🗑️</div>
                <div><div style={{fontSize:28,fontWeight:800,color:'#dc2626'}}>{totalDeseuLuna.toFixed(2)} kg</div><div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>Luna curentă · Cod 18.01.03</div></div>
              </div>
              <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:20,display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📊</div>
                <div><div style={{fontSize:28,fontWeight:800,color:'#1e293b'}}>{deseuri.filter(d=>d.data?.startsWith(today.slice(0,7))).length}</div><div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>Înregistrări luna curentă</div></div>
              </div>
              <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:20,display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📦</div>
                <div><div style={{fontSize:28,fontWeight:800,color:'#1e293b'}}>{deseuri.length}</div><div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>Total înregistrări</div></div>
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Registru predare deșeuri biologice</div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-outline" onClick={() => setShowRaportDeseu(true)}>📊 Raport lunar</button>
                <button className="btn" style={{background:'#dc2626',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}}
                  onClick={() => setShowDeseu(true)}>
                  + Înregistrare
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              {deseuri.length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>🗑️</div><div>Nicio înregistrare</div></div>
              ) : (
                <table>
                  <thead><tr><th>Data</th><th>Ora</th><th>Secția</th><th>Cod</th><th>Cantitate</th><th>Responsabil</th></tr></thead>
                  <tbody>
                    {deseuri.map(d => (
                      <tr key={d.id}>
                        <td style={{fontWeight:500}}>{fmtDate(d.data)}</td>
                        <td style={{fontFamily:'monospace',fontWeight:600}}>{d.ora}</td>
                        <td style={{color:'#64748b'}}>{d.sectia}</td>
                        <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#dc2626',fontSize:13}}>{d.cod}</span></td>
                        <td><span style={{fontWeight:800,fontSize:16,color:'#1e293b'}}>{d.cantitate}</span><span style={{fontSize:12,color:'#94a3b8',marginLeft:4}}>kg</span></td>
                        <td style={{color:'#64748b'}}>{d.responsabil}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL TEMPERATURĂ ════════════════════════════════ */}
      {showTemp && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowTemp(false)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-header" style={{background:'#1a56db',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>🌡️ Citire Temperatură & Umiditate</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',background:'rgba(255,255,255,0.15)',padding:'4px 12px',borderRadius:8}}>📅 {fmtDate(todayStr())} · {nowTime()} · Data blocată</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label className="form-label">Încăperea</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {SALI.map(s=>(
                    <button key={s} type="button" onClick={()=>setTempForm(p=>({...p,sala:s}))}
                      style={{padding:'10px',borderRadius:10,border:`2px solid ${tempForm.sala===s?'#1a56db':'#e2e8f0'}`,background:tempForm.sala===s?'#eff6ff':'white',color:tempForm.sala===s?'#1e40af':'#64748b',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label className="form-label">Temperatura (°C)</label>
                  <input type="number" step="0.1" className="form-control" value={tempForm.temp} onChange={e=>setTempForm(p=>({...p,temp:e.target.value}))} placeholder="ex. 21.5" style={{fontSize:18,textAlign:'center',fontWeight:700}} />
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:4,textAlign:'center'}}>Limite: 20–25°C</div>
                </div>
                <div>
                  <label className="form-label">Umiditate (%)</label>
                  <input type="number" step="0.1" className="form-control" value={tempForm.umid} onChange={e=>setTempForm(p=>({...p,umid:e.target.value}))} placeholder="ex. 68.0" style={{fontSize:18,textAlign:'center',fontWeight:700}} />
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:4,textAlign:'center'}}>Limite: 30–50%</div>
                </div>
              </div>
              {tempForm.temp && tempForm.umid && (
                <div style={{
                  background: parseFloat(tempForm.temp)>=TEMP_MIN&&parseFloat(tempForm.temp)<=TEMP_MAX&&parseFloat(tempForm.umid)>=UMID_MIN&&parseFloat(tempForm.umid)<=UMID_MAX?'#f0fdf4':'#fef2f2',
                  border: `1px solid ${parseFloat(tempForm.temp)>=TEMP_MIN&&parseFloat(tempForm.temp)<=TEMP_MAX&&parseFloat(tempForm.umid)>=UMID_MIN&&parseFloat(tempForm.umid)<=UMID_MAX?'#bbf7d0':'#fecaca'}`,
                  borderRadius: 10, padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: 14,
                  color: parseFloat(tempForm.temp)>=TEMP_MIN&&parseFloat(tempForm.temp)<=TEMP_MAX&&parseFloat(tempForm.umid)>=UMID_MIN&&parseFloat(tempForm.umid)<=UMID_MAX?'#166534':'#991b1b'
                }}>
                  {parseFloat(tempForm.temp)>=TEMP_MIN&&parseFloat(tempForm.temp)<=TEMP_MAX?'✓':'✗'} {tempForm.temp}°C &nbsp;·&nbsp;
                  {parseFloat(tempForm.umid)>=UMID_MIN&&parseFloat(tempForm.umid)<=UMID_MAX?'✓':'✗'} {tempForm.umid}%
                </div>
              )}
              <div><label className="form-label">Responsabil</label>
                <select className="form-control" value={tempForm.responsabil} onChange={e=>setTempForm(p=>({...p,responsabil:e.target.value}))}>
                  {PERSONAL.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowTemp(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveTemp} disabled={saving}>{saving?'...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL UV ═════════════════════════════════════════ */}
      {showUV && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowUV(false)}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-header" style={{background:'#7c3aed',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>💡 Iradiere UV</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label className="form-label">Încăperea</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {SALI.map(s=>(
                    <button key={s} type="button" onClick={()=>setUvForm(p=>({...p,sala:s}))}
                      style={{padding:'10px',borderRadius:10,border:`2px solid ${uvForm.sala===s?'#7c3aed':'#e2e8f0'}`,background:uvForm.sala===s?'#f5f3ff':'white',color:uvForm.sala===s?'#6d28d9':'#64748b',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="form-label">Interval iradiere</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {['08:00-08:30','14:00-14:30'].map(iv=>(
                    <button key={iv} type="button" onClick={()=>setUvForm(p=>({...p,interval:iv}))}
                      style={{padding:'12px',borderRadius:10,border:`2px solid ${uvForm.interval===iv?'#7c3aed':'#e2e8f0'}`,background:uvForm.interval===iv?'#f5f3ff':'white',color:uvForm.interval===iv?'#6d28d9':'#64748b',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                      {iv}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
                <div style={{fontSize:11,color:'#94a3b8',fontWeight:600,marginBottom:4}}>ORE RĂMASE — {uvForm.sala}</div>
                <div style={{fontSize:28,fontWeight:800,color:'#7c3aed'}}>{(uvLampi[uvForm.sala]||0).toFixed(1)}h</div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>→ după iradiere: {Math.max(0,(uvLampi[uvForm.sala]||0)-0.5).toFixed(1)}h</div>
              </div>
              <div><label className="form-label">Specialist</label>
                <select className="form-control" value={uvForm.specialist} onChange={e=>setUvForm(p=>({...p,specialist:e.target.value}))}>
                  {PERSONAL.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowUV(false)}>Anulare</button>
              <button className="btn" style={{background:'#7c3aed',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveUV} disabled={saving}>
                {saving?'...':'✓ Confirmă iradierea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL UV CONFIG ══════════════════════════════════ */}
      {showUVConfig && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowUVConfig(false)}>
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal-header" style={{background:'#475569',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>⚙️ Configurare Lampă UV</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{background:'#f8fafc',borderRadius:10,padding:12}}>
                {SALI.map(s=>(
                  <div key={s} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{fontWeight:600,fontSize:13}}>{s}</span>
                    <span style={{fontWeight:700,color:uvLampi[s]<100?'#dc2626':'#16a34a'}}>{(uvLampi[s]||0).toFixed(1)}h</span>
                  </div>
                ))}
              </div>
              <div><label className="form-label">Sala</label>
                <select className="form-control" value={uvConfigSala} onChange={e=>setUvConfigSala(e.target.value)}>
                  {SALI.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="form-label">Ore valabilitate rămase</label>
                <input type="number" step="0.5" min="0" className="form-control" value={uvConfigOre} onChange={e=>setUvConfigOre(e.target.value)} placeholder="ex. 8000" style={{fontSize:18,textAlign:'center',fontWeight:700}} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowUVConfig(false)}>Închide</button>
              <button className="btn btn-primary" onClick={saveUVConfig}>Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CURĂȚENIE ══════════════════════════════════ */}
      {showCur && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCur(false)}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-header" style={{background:'#16a34a',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>🧹 Curățenie generală</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label className="form-label">Încăperea</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {SALI.map(s=>(
                    <button key={s} type="button" onClick={()=>setCurForm(p=>({...p,sala:s}))}
                      style={{padding:'10px',borderRadius:10,border:`2px solid ${curForm.sala===s?'#16a34a':'#e2e8f0'}`,background:curForm.sala===s?'#f0fdf4':'white',color:curForm.sala===s?'#166534':'#64748b',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="form-label">Soluție dezinfectantă</label>
                {solutii.length === 0 ? (
                  <div className="alert alert-warning">⚠ Nu există soluții. Configurați din butonul "🧴 Soluții".</div>
                ) : (
                  <select className="form-control" value={curForm.solutie} onChange={e=>setCurForm(p=>({...p,solutie:e.target.value}))}>
                    <option value="">— selectați —</option>
                    {solutii.map(s => {
                      const days = Math.floor((new Date()-new Date(s.data))/86400000)
                      return <option key={s.id} value={s.den}>{s.den} {days>180?'⚠ >6 luni':`(${days}z)`}</option>
                    })}
                  </select>
                )}
              </div>
              <div><label className="form-label">Efectuat de</label>
                <select className="form-control" value={curForm.operator} onChange={e=>setCurForm(p=>({...p,operator:e.target.value}))}>
                  {PERSONAL.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div><label className="form-label">Observații</label><input type="text" className="form-control" value={curForm.obs} onChange={e=>setCurForm(p=>({...p,obs:e.target.value}))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowCur(false)}>Anulare</button>
              <button className="btn" style={{background:'#16a34a',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveCuratenie} disabled={saving}>
                {saving?'...':'✓ Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL SOLUȚII ════════════════════════════════════ */}
      {showSolutii && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowSolutii(false)}>
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal-header" style={{background:'#16a34a',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>🧴 Soluții dezinfectante</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:10}}>
              {solutii.map(s=>{
                const days=Math.floor((new Date()-new Date(s.data))/86400000)
                return(
                  <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,background:'#f8fafc',borderRadius:10,padding:'10px 14px',border:`1px solid ${days>180?'#fecaca':'#e2e8f0'}`}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600}}>{s.den}</div>
                      <div style={{fontSize:11,color:days>180?'#dc2626':'#94a3b8'}}>{fmtDate(s.data)} · {days}z {days>180?'⚠ Schimbați!':''}</div>
                    </div>
                    <button onClick={async()=>{await supabase.from('solutii').delete().eq('id',s.id);setSolutii(prev=>prev.filter(x=>x.id!==s.id))}} style={{background:'none',border:'none',color:'#e2e8f0',cursor:'pointer',fontSize:16}}>🗑️</button>
                  </div>
                )
              })}
              <div style={{display:'flex',gap:8,marginTop:4}}>
                <input type="text" className="form-control" value={nouaSolutie} onChange={e=>setNouaSolutie(e.target.value)} placeholder="ex. Chloramine 1%" />
                <button className="btn btn-primary" onClick={async()=>{if(!nouaSolutie.trim())return;const rec={id:'SOL-'+Date.now(),den:nouaSolutie.trim(),data:todayStr(),ts:new Date().toISOString()};await supabase.from('solutii').insert(rec);setSolutii(prev=>[rec,...prev]);setNouaSolutie('')}}>+</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowSolutii(false)}>Închide</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL DEȘEU ══════════════════════════════════════ */}
      {showDeseu && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowDeseu(false)}>
          <div className="modal" style={{maxWidth:380}}>
            <div className="modal-header" style={{background:'#dc2626',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>🗑️ Predare deșeuri biologice</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{background:'#f8fafc',borderRadius:12,padding:'14px 16px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13}}>
                  <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600}}>SECȚIA</span><div style={{fontWeight:600,marginTop:2}}>Biologie Moleculară</div></div>
                  <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600}}>COD DEȘEU</span><div style={{fontWeight:700,color:'#dc2626',fontFamily:'monospace',marginTop:2}}>18.01.03</div></div>
                  <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600}}>DATA</span><div style={{fontWeight:600,marginTop:2}}>{fmtDate(todayStr())}</div></div>
                  <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600}}>ORA</span><div style={{fontWeight:600,marginTop:2}}>{nowTime()}</div></div>
                </div>
              </div>
              <div>
                <label className="form-label">Cantitate (kg)</label>
                <input type="number" step="0.1" min="0.1" className="form-control" value={deseuForm.cantitate} onChange={e=>setDeseuForm(p=>({...p,cantitate:e.target.value}))} placeholder="ex. 2.5" style={{fontSize:24,textAlign:'center',fontWeight:800}} />
              </div>
              <div><label className="form-label">Responsabil</label>
                <select className="form-control" value={deseuForm.responsabil} onChange={e=>setDeseuForm(p=>({...p,responsabil:e.target.value}))}>
                  {PERSONAL.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowDeseu(false)}>Anulare</button>
              <button className="btn" style={{background:'#dc2626',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveDeseu} disabled={saving}>
                {saving?'...':'✓ Înregistrează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL RAPORT DEȘEURI ════════════════════════════ */}
      {showRaportDeseu && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowRaportDeseu(false)}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header" style={{background:'#dc2626',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>📊 Raport lunar deșeuri biologice</div>
              <button onClick={()=>setShowRaportDeseu(false)} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',color:'white',fontSize:16}}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                <select className="form-control" value={rapLuna} onChange={e=>setRapLuna(e.target.value)}>
                  <option value="">— toate lunile —</option>
                  {[...new Set(deseuri.map(d=>d.data?.slice(0,7)))].sort().reverse().map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              {(() => {
                const list = rapLuna ? deseuri.filter(d=>d.data?.startsWith(rapLuna)) : deseuri
                const total = list.reduce((s,d)=>s+(d.cantitate||0),0)
                return (
                  <div>
                    <div style={{textAlign:'center',marginBottom:16,background:'#fef2f2',borderRadius:12,padding:16,border:'1px solid #fecaca'}}>
                      <div style={{fontSize:36,fontWeight:800,color:'#dc2626'}}>{total.toFixed(2)} kg</div>
                      <div style={{fontSize:12,color:'#94a3b8'}}>Total · Cod 18.01.03 · {rapLuna||'Toate perioadele'}</div>
                    </div>
                    <div className="table-wrapper">
                      <table style={{fontSize:12}}>
                        <thead><tr><th>Data</th><th>Ora</th><th>Secția</th><th>Cod</th><th>Cantitate</th><th>Responsabil</th></tr></thead>
                        <tbody>
                          {list.map(d=>(
                            <tr key={d.id}>
                              <td>{fmtDate(d.data)}</td><td style={{fontFamily:'monospace'}}>{d.ora}</td>
                              <td>{d.sectia}</td><td style={{fontFamily:'monospace',fontWeight:700,color:'#dc2626'}}>{d.cod}</td>
                              <td style={{fontWeight:700}}>{d.cantitate} kg</td><td>{d.responsabil}</td>
                            </tr>
                          ))}
                          <tr style={{background:'#fef2f2',fontWeight:700}}>
                            <td colSpan={4} style={{textAlign:'right'}}>TOTAL:</td>
                            <td style={{color:'#dc2626'}}>{total.toFixed(2)} kg</td><td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
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
