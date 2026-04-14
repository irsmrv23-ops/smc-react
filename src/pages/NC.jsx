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

const PERSONAL = ['Rotari Ion','Croitoru Tatiana','Jentimir Valeria','Andrian Maria','Antropov Marina']

const STATUS = {
  deschis:     { label: 'Deschisă',     bg: '#dc2626', light: '#fef2f2', border: '#fecaca', text: '#991b1b', dot: '#dc2626' },
  investigare: { label: 'Investigare',  bg: '#d97706', light: '#fffbeb', border: '#fde68a', text: '#92400e', dot: '#d97706' },
  inchis:      { label: 'Închisă',      bg: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', text: '#166534', dot: '#16a34a' },
}

const SEV = {
  minora:   { label: 'Minoră',   color: '#64748b', bg: '#f1f5f9' },
  moderata: { label: 'Moderată', color: '#d97706', bg: '#fffbeb' },
  majora:   { label: 'Majoră',   color: '#ea580c', bg: '#fff7ed' },
  critica:  { label: 'Critică',  color: '#dc2626', bg: '#fef2f2' },
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function nextCod(list) {
  const yr = new Date().getFullYear().toString().slice(-2)
  const nums = list.filter(n => n.cod?.includes(`-${yr}-`)).map(n => parseInt(n.cod.split('-').pop()) || 0)
  return `NC-BM-${yr}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,'0')}`
}
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ro-RO') }
function daysSince(d) { return Math.floor((new Date() - new Date(d)) / 86400000) }

export default function NC() {
  const [ncData, setNcData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [showClose, setShowClose] = useState(null)
  const [saving, setSaving] = useState(false)
  const [acText, setAcText] = useState('')
  const [form, setForm] = useState({
    data: todayStr(), tip: 'altul', zona: '', detectat_nume: '',
    descriere: '', cauza: '', actiune_imediata: '', severitate: 'moderata',
  })

  useEffect(() => { loadNC() }, [])

  async function loadNC() {
    setLoading(true)
    const { data } = await supabase.from('nc_data').select('*').order('data', { ascending: false })
    setNcData(data || [])
    setLoading(false)
  }

  async function saveNC() {
    if (!form.descriere.trim()) { alert('Descrieți neconformitatea!'); return }
    setSaving(true)
    const rec = {
      id: 'NC-' + Date.now(), cod: nextCod(ncData),
      data: form.data, tip: form.tip, zona: form.zona,
      detectat_nume: form.detectat_nume, descriere: form.descriere,
      cauza: form.cauza, actiune_imediata: form.actiune_imediata,
      severitate: form.severitate, status: 'deschis',
      actiune_corectiva: '', data_inchidere: null,
      ts: new Date().toISOString(),
    }
    const { error } = await supabase.from('nc_data').insert(rec)
    if (!error) {
      setNcData(prev => [rec, ...prev])
      setShowAdd(false)
      setForm({ data: todayStr(), tip: 'altul', zona: '', detectat_nume: '', descriere: '', cauza: '', actiune_imediata: '', severitate: 'moderata' })
    } else alert('Eroare: ' + error.message)
    setSaving(false)
  }

  async function setStatus(id, status) {
    const { error } = await supabase.from('nc_data').update({ status, ts: new Date().toISOString() }).eq('id', id)
    if (!error) {
      setNcData(prev => prev.map(n => n.id === id ? { ...n, status } : n))
      setShowDetail(prev => prev?.id === id ? { ...prev, status } : prev)
    }
  }

  async function closeNC() {
    if (!acText.trim() && !window.confirm('Nu ați introdus acțiunea corectivă. Continuați?')) return
    setSaving(true)
    const updates = { status: 'inchis', actiune_corectiva: acText, data_inchidere: todayStr(), ts: new Date().toISOString() }
    const { error } = await supabase.from('nc_data').update(updates).eq('id', showClose.id)
    if (!error) {
      setNcData(prev => prev.map(n => n.id === showClose.id ? { ...n, ...updates } : n))
      setShowClose(null); setShowDetail(null); setAcText('')
    }
    setSaving(false)
  }

  const filtered = filter === 'all' ? ncData : ncData.filter(n => n.status === filter)
  const counts = {
    all: ncData.length,
    deschis: ncData.filter(n => n.status === 'deschis').length,
    investigare: ncData.filter(n => n.status === 'investigare').length,
    inchis: ncData.filter(n => n.status === 'inchis').length,
  }

  // Raport lunar
  function genRaport() {
    const luna = todayStr().slice(0,7)
    const list = ncData.filter(n => n.data?.startsWith(luna))
    if (!list.length) { alert('Nicio NC în luna curentă.'); return }
    const win = window.open('','_blank')
    const total = list.length
    const inchise = list.filter(n => n.status === 'inchis').length
    win.document.write(`<html><head><title>Raport NC ${luna}</title>
    <style>body{font-family:Arial,sans-serif;margin:20mm;font-size:12px}
    h1{color:#1a56db;font-size:18px}h2{font-size:14px;margin-top:16px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:6px 10px;text-align:left}
    th{background:#f8fafc;font-weight:600}tr:nth-child(even){background:#f8fafc}
    .badge{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
    .d{background:#fee2e2;color:#991b1b}.i{background:#fef3c7;color:#92400e}.c{background:#dcfce7;color:#166534}
    </style></head><body>
    <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #1a56db;padding-bottom:16px">
      <div style="font-size:11px;color:#64748b">Laborator Biologie Moleculară · Invitro Diagnostics SRL</div>
      <h1>RAPORT NECONFORMITĂȚI</h1>
      <div style="font-size:13px;font-weight:600">Perioada: ${luna} · Generat: ${fmtDate(todayStr())}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;text-align:center">
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px"><div style="font-size:24px;font-weight:700;color:#1a56db">${total}</div><div style="font-size:11px;color:#64748b">Total NC</div></div>
      <div style="border:1px solid #fecaca;border-radius:8px;padding:12px;background:#fef2f2"><div style="font-size:24px;font-weight:700;color:#dc2626">${list.filter(n=>n.status==='deschis').length}</div><div style="font-size:11px;color:#dc2626">Deschise</div></div>
      <div style="border:1px solid #fde68a;border-radius:8px;padding:12px;background:#fffbeb"><div style="font-size:24px;font-weight:700;color:#d97706">${list.filter(n=>n.status==='investigare').length}</div><div style="font-size:11px;color:#d97706">Investigare</div></div>
      <div style="border:1px solid #bbf7d0;border-radius:8px;padding:12px;background:#f0fdf4"><div style="font-size:24px;font-weight:700;color:#16a34a">${inchise}</div><div style="font-size:11px;color:#16a34a">Închise</div></div>
    </div>
    <table><thead><tr><th>Cod</th><th>Data</th><th>Tip</th><th>Descriere</th><th>AC</th><th>Status</th><th>Închis la</th></tr></thead><tbody>
    ${list.map(n=>`<tr>
      <td style="font-family:monospace;font-weight:700;color:#1a56db">${n.cod}</td>
      <td>${fmtDate(n.data)}</td><td>${TIPURI.find(t=>t.value===n.tip)?.label||n.tip}</td>
      <td>${(n.descriere||'').slice(0,60)}${(n.descriere||'').length>60?'...':''}</td>
      <td style="color:#16a34a">${n.actiune_corectiva||'—'}</td>
      <td><span class="badge ${n.status==='inchis'?'c':n.status==='investigare'?'i':'d'}">${STATUS[n.status]?.label||n.status}</span></td>
      <td>${n.data_inchidere?fmtDate(n.data_inchidere):'—'}</td>
    </tr>`).join('')}
    </tbody></table>
    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:40px">
      <div style="text-align:center"><div style="border-top:1px solid #374151;padding-top:8px;margin-top:48px;font-size:11px"><strong>Croitoru Tatiana</strong><br>Responsabil MC</div></div>
      <div style="text-align:center"><div style="border-top:1px solid #374151;padding-top:8px;margin-top:48px;font-size:11px"><strong>Rotari Ion</strong><br>Șef laborator</div></div>
      <div style="text-align:center"><div style="border-top:1px solid #374151;padding-top:8px;margin-top:48px;font-size:11px">Data: ${fmtDate(todayStr())}</div></div>
    </div>
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Se încarcă...</div>

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">Neconformități</div>
          <div className="page-subtitle">ISO 15189:2023 §8.7 · Cod automat NC-BM-YY-NNN</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-outline" onClick={genRaport}>📊 Raport lunar</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ NC nouă</button>
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>

        {/* FILTRE — butoane mari colorate ca UPU */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:32}}>
          {[
            { key: 'all',        label: 'Toate',       icon: '📋', bg: '#f8fafc', border: '#e2e8f0', text: '#334155', val: counts.all },
            { key: 'deschis',    label: 'Deschise',    icon: '🔴', bg: '#fef2f2', border: '#fecaca', text: '#991b1b', val: counts.deschis },
            { key: 'investigare',label: 'Investigare', icon: '🟡', bg: '#fffbeb', border: '#fde68a', text: '#92400e', val: counts.investigare },
            { key: 'inchis',     label: 'Închise',     icon: '🟢', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', val: counts.inchis },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? (f.key === 'deschis' ? '#dc2626' : f.key === 'investigare' ? '#d97706' : f.key === 'inchis' ? '#16a34a' : '#1a56db') : f.bg,
                border: `2px solid ${filter === f.key ? 'transparent' : f.border}`,
                borderRadius: 14, padding: '20px 16px', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.2s',
                boxShadow: filter === f.key ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                transform: filter === f.key ? 'translateY(-2px)' : 'none',
              }}>
              <div style={{fontSize:28,marginBottom:8}}>{f.icon}</div>
              <div style={{fontSize:36,fontWeight:800,color: filter === f.key ? 'white' : f.text,lineHeight:1}}>{f.val}</div>
              <div style={{fontSize:13,fontWeight:600,color: filter === f.key ? 'rgba(255,255,255,0.9)' : f.text,marginTop:6}}>{f.label}</div>
            </button>
          ))}
        </div>

        {/* LISTA NC */}
        {filtered.length === 0 ? (
          <div style={{background:'white',borderRadius:14,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontSize:16,fontWeight:600}}>Nicio neconformitate {filter !== 'all' ? STATUS[filter]?.label?.toLowerCase() : ''}</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {filtered.map(n => {
              const st = STATUS[n.status] || STATUS.deschis
              const days = daysSince(n.data)
              const isOld = n.status !== 'inchis' && days > 30
              return (
                <div key={n.id} onClick={() => setShowDetail(n)}
                  style={{
                    background: 'white', borderRadius: 14, border: `1px solid ${st.border}`,
                    borderLeft: `5px solid ${st.bg}`, padding: '16px 20px',
                    cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}>

                  {/* Status dot */}
                  <div style={{width:12,height:12,borderRadius:'50%',background:st.bg,flexShrink:0,boxShadow:`0 0 0 3px ${st.light}`}} />

                  {/* Cod */}
                  <div style={{fontFamily:'monospace',fontWeight:700,fontSize:14,color:'#1a56db',minWidth:120,flexShrink:0}}>{n.cod}</div>

                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:'#1e293b',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.descriere}</div>
                    <div style={{fontSize:12,color:'#94a3b8',display:'flex',gap:12,flexWrap:'wrap'}}>
                      <span>{fmtDate(n.data)}</span>
                      <span>·</span>
                      <span>{TIPURI.find(t=>t.value===n.tip)?.label||n.tip}</span>
                      {n.zona && <><span>·</span><span>{n.zona}</span></>}
                      {n.detectat_nume && <><span>·</span><span>{n.detectat_nume}</span></>}
                    </div>
                  </div>

                  {/* Severitate */}
                  {n.severitate && (
                    <div style={{background:SEV[n.severitate]?.bg||'#f1f5f9',color:SEV[n.severitate]?.color||'#64748b',padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:600,flexShrink:0}}>
                      {SEV[n.severitate]?.label||n.severitate}
                    </div>
                  )}

                  {/* Zile */}
                  {n.status !== 'inchis' && (
                    <div style={{textAlign:'center',flexShrink:0}}>
                      <div style={{fontSize:20,fontWeight:800,color:isOld?'#dc2626':'#64748b'}}>{days}</div>
                      <div style={{fontSize:10,color:isOld?'#dc2626':'#94a3b8',fontWeight:600}}>ZILE</div>
                    </div>
                  )}

                  {/* Status badge */}
                  <div style={{background:st.light,color:st.text,border:`1px solid ${st.border}`,padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:700,flexShrink:0}}>
                    {st.label}
                  </div>

                  <div style={{color:'#cbd5e1',fontSize:18}}>›</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL: NC NOUĂ */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header" style={{background:'#1a56db',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>+ Neconformitate nouă</div>
              <div style={{fontFamily:'monospace',fontSize:13,color:'rgba(255,255,255,0.7)',background:'rgba(255,255,255,0.15)',padding:'4px 12px',borderRadius:8}}>{nextCod(ncData)}</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div>
                  <label className="form-label">Data</label>
                  <input type="date" className="form-control" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))} />
                </div>
                <div>
                  <label className="form-label">Tip</label>
                  <select className="form-control" value={form.tip} onChange={e=>setForm(p=>({...p,tip:e.target.value}))}>
                    {TIPURI.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Zonă / Grupă</label>
                  <input type="text" className="form-control" value={form.zona} placeholder="ex. IST, Sala 2" onChange={e=>setForm(p=>({...p,zona:e.target.value}))} />
                </div>
                <div>
                  <label className="form-label">Detectat de</label>
                  <select className="form-control" value={form.detectat_nume} onChange={e=>setForm(p=>({...p,detectat_nume:e.target.value}))}>
                    <option value="">— selectați —</option>
                    {PERSONAL.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Descriere neconformitate *</label>
                <textarea className="form-control" rows={3} value={form.descriere} onChange={e=>setForm(p=>({...p,descriere:e.target.value}))} placeholder="Descrieți detaliat..." style={{resize:'none'}} />
              </div>
              <div>
                <label className="form-label">Cauza probabilă</label>
                <textarea className="form-control" rows={2} value={form.cauza} onChange={e=>setForm(p=>({...p,cauza:e.target.value}))} style={{resize:'none'}} />
              </div>
              <div>
                <label className="form-label">Acțiune imediată</label>
                <textarea className="form-control" rows={2} value={form.actiune_imediata} onChange={e=>setForm(p=>({...p,actiune_imediata:e.target.value}))} style={{resize:'none'}} />
              </div>
              <div>
                <label className="form-label">Severitate</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {Object.entries(SEV).map(([k,v])=>(
                    <button key={k} type="button" onClick={()=>setForm(p=>({...p,severitate:k}))}
                      style={{padding:'10px 8px',borderRadius:10,border:`2px solid ${form.severitate===k?v.color:'#e2e8f0'}`,background:form.severitate===k?v.bg:'white',color:form.severitate===k?v.color:'#94a3b8',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveNC} disabled={saving}>{saving?'Se salvează...':'Salvează NC'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALII */}
      {showDetail && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowDetail(null)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header" style={{background:STATUS[showDetail.status]?.bg||'#1a56db',borderRadius:'20px 20px 0 0'}}>
              <div>
                <div className="modal-title" style={{color:'white'}}>{showDetail.cod}</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:4}}>{STATUS[showDetail.status]?.label} · {fmtDate(showDetail.data)}</div>
              </div>
              <button onClick={()=>setShowDetail(null)} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',color:'white',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:13}}>
                <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600,textTransform:'uppercase'}}>Tip</span><div style={{fontWeight:600,marginTop:4}}>{TIPURI.find(t=>t.value===showDetail.tip)?.label||showDetail.tip}</div></div>
                <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600,textTransform:'uppercase'}}>Zonă</span><div style={{fontWeight:600,marginTop:4}}>{showDetail.zona||'—'}</div></div>
                <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600,textTransform:'uppercase'}}>Detectat de</span><div style={{fontWeight:600,marginTop:4}}>{showDetail.detectat_nume||'—'}</div></div>
                <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600,textTransform:'uppercase'}}>Severitate</span><div style={{fontWeight:600,marginTop:4,color:SEV[showDetail.severitate]?.color||'#64748b'}}>{SEV[showDetail.severitate]?.label||'—'}</div></div>
              </div>
              <div style={{background:'#f8fafc',borderRadius:10,padding:14}}>
                <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',marginBottom:6}}>Descriere</div>
                <div style={{fontSize:14,color:'#1e293b'}}>{showDetail.descriere}</div>
              </div>
              {showDetail.cauza && <div style={{background:'#f8fafc',borderRadius:10,padding:14}}>
                <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',marginBottom:6}}>Cauza</div>
                <div style={{fontSize:14,color:'#1e293b'}}>{showDetail.cauza}</div>
              </div>}
              {showDetail.actiune_imediata && <div style={{background:'#f8fafc',borderRadius:10,padding:14}}>
                <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',marginBottom:6}}>Acțiune imediată</div>
                <div style={{fontSize:14,color:'#1e293b'}}>{showDetail.actiune_imediata}</div>
              </div>}
              {showDetail.actiune_corectiva && <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:14}}>
                <div style={{fontSize:11,fontWeight:600,color:'#166534',textTransform:'uppercase',marginBottom:6}}>Acțiune corectivă</div>
                <div style={{fontSize:14,color:'#166534'}}>{showDetail.actiune_corectiva}</div>
              </div>}
              {showDetail.data_inchidere && <div style={{fontSize:13,color:'#16a34a',fontWeight:600}}>✓ Închisă la: {fmtDate(showDetail.data_inchidere)}</div>}
            </div>
            {showDetail.status !== 'inchis' && (
              <div className="modal-footer" style={{gap:10}}>
                {showDetail.status === 'deschis' && (
                  <button className="btn" onClick={()=>setStatus(showDetail.id,'investigare')}
                    style={{background:'#fffbeb',color:'#92400e',border:'2px solid #fde68a'}}>
                    🟡 Pune în investigare
                  </button>
                )}
                <button className="btn btn-success" onClick={()=>{setShowClose(showDetail);setAcText('')}}>
                  ✓ Închide NC
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ÎNCHIDERE */}
      {showClose && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-header" style={{background:'#16a34a',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>✓ Închidere {showClose.cod}</div>
            </div>
            <div className="modal-body">
              <div style={{fontSize:13,color:'#64748b',marginBottom:16,background:'#f8fafc',borderRadius:10,padding:12}}>
                {showClose.descriere?.slice(0,100)}...
              </div>
              <label className="form-label">Acțiunea corectivă implementată</label>
              <textarea className="form-control" rows={4} value={acText} onChange={e=>setAcText(e.target.value)}
                placeholder="Descrieți acțiunea corectivă implementată..." style={{resize:'none'}} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowClose(null)}>Anulare</button>
              <button className="btn btn-success" onClick={closeNC} disabled={saving}>{saving?'Se salvează...':'✓ Confirmă închiderea'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
