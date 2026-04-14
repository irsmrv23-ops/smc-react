import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const NIVELURI = [
  { id: 1, cod: 'MAN', label: 'Manual Calității', desc: 'Politica și obiectivele calității', color: '#1a56db', light: '#eff6ff', border: '#bfdbfe', icon: '📘', ref: '§8.2.2' },
  { id: 2, cod: 'PG',  label: 'Proceduri Generale', desc: 'PG-4.1 … PG-8.8', color: '#0f6e56', light: '#f0fdf4', border: '#bbf7d0', icon: '📗', ref: '§8.2' },
  { id: 3, cod: 'PS',  label: 'Proceduri Specifice', desc: 'IST · TOR · HEP · IRP · IGI · GEN', color: '#d97706', light: '#fffbeb', border: '#fde68a', icon: '📙', ref: '§7.3' },
  { id: 4, cod: 'F',   label: 'Formulare & Registre', desc: 'Înregistrări electronice', color: '#7c3aed', light: '#f5f3ff', border: '#ddd6fe', icon: '📋', ref: '§8.4' },
  { id: 5, cod: 'EXT', label: 'Documente Externe', desc: 'IFU · Standarde · Certificate', color: '#475569', light: '#f8fafc', border: '#e2e8f0', icon: '📦', ref: '§6.5' },
]

const GRUPE_PS = ['IST', 'TOR', 'HEP', 'IRP', 'IGI', 'GEN']

const GRUPE_PS_COLORS = {
  IST: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', label: 'Infecții urogenitale' },
  TOR: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', label: 'TORCH' },
  HEP: { bg: '#fefce8', border: '#fef08a', text: '#854d0e', label: 'Hepatite virale' },
  IRP: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', label: 'Infecții respiratorii' },
  IGI: { bg: '#f0fdfa', border: '#99f6e4', text: '#134e4a', label: 'Gastro-intestinale' },
  GEN: { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8', label: 'Genetică' },
}

const STATUS_OPTS = [
  { value: 'existent',  label: 'Existent',    bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  { value: 'prioritar', label: 'Prioritar',   bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  { value: 'elaborare', label: 'În elaborare', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  { value: 'lipsa',     label: 'Lipsă',       bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
]

function statusInfo(s) { return STATUS_OPTS.find(x => x.value === s) || STATUS_OPTS[0] }
function todayStr() { return new Date().toISOString().slice(0, 10) }

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
    const { data } = await supabase.from('docs').select('*').order('cod', { ascending: true })
    setDocs(data || [])
    setLoading(false)
  }

  function docsForNivel(n) {
    if (!n) return docs
    const tipuri = n.id === 1 ? ['MAN'] : n.id === 2 ? ['PG'] : n.id === 3 ? ['PS','IL'] : n.id === 4 ? ['F','REG'] : ['EXT','AH']
    let list = docs.filter(d => tipuri.includes(d.tip) || d.nivel === n.id)
    if (n.id === 3) list = list.filter(d => d.grupa === grupaPS)
    return list
  }

  async function saveDoc() {
    if (!form.cod.trim() || !form.titlu.trim()) { alert('Cod și titlu sunt obligatorii!'); return }
    if (docs.find(d => d.cod === form.cod && d.id !== form.id)) { alert('Codul există deja!'); return }
    setSaving(true)
    const rec = { ...form, id: form.id || form.cod, ts: new Date().toISOString() }
    const { error } = await supabase.from('docs').upsert(rec, { onConflict: 'id' })
    if (!error) { await loadDocs(); setShowAdd(false); setShowEdit(null); setForm(emptyForm) }
    else alert('Eroare: ' + error.message)
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
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `docs/${docId}/${docId}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documente')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) {
        alert('Eroare upload: ' + uploadError.message + '\n' + JSON.stringify(uploadError))
        setUploadingId(null)
        return
      }
      const { data: urlData } = supabase.storage.from('documente').getPublicUrl(path)
      await supabase.from('docs').update({ fisier: urlData.publicUrl }).eq('id', docId)
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, fisier: urlData.publicUrl } : d))
    } catch(e) { alert('Eroare: ' + e.message) }
    setUploadingId(null)
  }

  function openAdd(n) {
    const tipMap = { 1: 'MAN', 2: 'PG', 3: 'PS', 4: 'F', 5: 'EXT' }
    setForm({ ...emptyForm, tip: tipMap[n.id]||'PG', nivel: n.id, grupa: n.id === 3 ? grupaPS : '' })
    setShowAdd(true)
  }

  function openEdit(doc) { setForm({ ...doc }); setShowEdit(doc) }

  const totalFaraPDF = docs.filter(d => d.status === 'existent' && !d.fisier).length
  const currentDocs = docsForNivel(nivel)
  const currentNivel = nivel ? NIVELURI.find(n => n.id === nivel.id) : null

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Se încarcă...</div>

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">Documente SMC</div>
          <div className="page-subtitle">ISO 15189:2023 · 5 niveluri ierarhice · {docs.length} documente</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {totalFaraPDF > 0 && (
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'8px 14px',fontSize:13,color:'#991b1b',fontWeight:600}}>
              ⚠ {totalFaraPDF} fără PDF
            </div>
          )}
          {nivel && (
            <button className="btn btn-primary" onClick={() => openAdd(nivel)}>+ Adaugă</button>
          )}
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>

        {/* IERARHIE VIZUALĂ — 5 niveluri */}
        <div style={{marginBottom:32}}>
          {/* Titlu secțiune */}
          <div style={{fontSize:12,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:16}}>
            Structura documentației · Click pe nivel pentru a naviga
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:0,position:'relative'}}>
            {/* Linia verticală */}
            <div style={{position:'absolute',left:32,top:24,bottom:24,width:2,background:'linear-gradient(to bottom, #bfdbfe, #e9d5ff)',zIndex:0}} />

            {NIVELURI.map((n, idx) => {
              const isActive = nivel?.id === n.id
              const docCount = docsForNivel(n).length
              const lipsesc = docsForNivel(n).filter(d => d.status === 'lipsa').length
              const faraPDF = docsForNivel(n).filter(d => d.status === 'existent' && !d.fisier).length
              const width = `${100 - idx * 4}%`

              return (
                <div key={n.id} style={{display:'flex',alignItems:'stretch',marginBottom:8,position:'relative',zIndex:1}}>
                  {/* Connector dot */}
                  <div style={{
                    width:64,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    <div style={{
                      width:24,height:24,borderRadius:'50%',
                      background:isActive?n.color:'white',
                      border:`3px solid ${n.color}`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:10,fontWeight:700,color:isActive?'white':n.color,
                      boxShadow:isActive?`0 0 0 4px ${n.light}`:'none',
                      transition:'all 0.2s',zIndex:2,
                    }}>{n.id}</div>
                  </div>

                  {/* Card nivel */}
                  <button onClick={() => setNivel(isActive ? null : n)}
                    style={{
                      flex:1, maxWidth:width,
                      background:isActive?n.color:'white',
                      border:`2px solid ${isActive?n.color:n.border}`,
                      borderRadius:12,padding:'14px 20px',
                      cursor:'pointer',textAlign:'left',
                      transition:'all 0.2s',
                      boxShadow:isActive?`0 4px 16px ${n.color}40`:'0 1px 3px rgba(0,0,0,0.06)',
                      transform:isActive?'translateX(4px)':'none',
                      display:'flex',alignItems:'center',gap:16,
                    }}>
                    <span style={{fontSize:24,flexShrink:0}}>{n.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:700,color:isActive?'rgba(255,255,255,0.8)':'#94a3b8',letterSpacing:0.5}}>NIVEL {n.id}</span>
                        <span style={{fontSize:12,fontWeight:700,fontFamily:'monospace',color:isActive?'rgba(255,255,255,0.9)':n.color,background:isActive?'rgba(255,255,255,0.15)':n.light,padding:'1px 8px',borderRadius:6}}>{n.cod}</span>
                        <span style={{fontSize:11,color:isActive?'rgba(255,255,255,0.6)':'#94a3b8'}}>{n.ref}</span>
                      </div>
                      <div style={{fontSize:15,fontWeight:700,color:isActive?'white':n.color}}>{n.label}</div>
                      <div style={{fontSize:12,color:isActive?'rgba(255,255,255,0.7)':'#94a3b8',marginTop:2}}>{n.desc}</div>
                    </div>
                    <div style={{display:'flex',gap:12,alignItems:'center',flexShrink:0}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:22,fontWeight:800,color:isActive?'white':n.color}}>{docCount}</div>
                        <div style={{fontSize:10,color:isActive?'rgba(255,255,255,0.7)':'#94a3b8',fontWeight:600}}>DOC.</div>
                      </div>
                      {faraPDF > 0 && (
                        <div style={{background:isActive?'rgba(255,255,255,0.2)':'#fef2f2',color:isActive?'white':'#991b1b',padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700}}>
                          ⚠ {faraPDF} PDF
                        </div>
                      )}
                      {lipsesc > 0 && (
                        <div style={{background:isActive?'rgba(255,255,255,0.2)':'#fef2f2',color:isActive?'white':'#dc2626',padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700}}>
                          ✗ {lipsesc} lipsesc
                        </div>
                      )}
                      <div style={{color:isActive?'rgba(255,255,255,0.8)':'#cbd5e1',fontSize:20}}>
                        {isActive?'▼':'›'}
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* NIVEL 3 — GRUPE PS */}
        {nivel?.id === 3 && (
          <div style={{marginBottom:24}}>
            <div style={{fontSize:12,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>
              Selectați grupa metodologică
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
              {GRUPE_PS.map(g => {
                const gc = GRUPE_PS_COLORS[g]
                const cnt = docs.filter(d => d.grupa === g && (d.tip === 'PS' || d.tip === 'IL')).length
                const isAct = grupaPS === g
                return (
                  <button key={g} onClick={() => setGrupaPS(g)}
                    style={{
                      background:isAct?gc.text:gc.bg,
                      border:`2px solid ${isAct?gc.text:gc.border}`,
                      borderRadius:12,padding:'14px 8px',cursor:'pointer',textAlign:'center',
                      transition:'all 0.2s',
                      boxShadow:isAct?'0 4px 12px rgba(0,0,0,0.15)':'none',
                      transform:isAct?'translateY(-2px)':'none',
                    }}>
                    <div style={{fontSize:20,fontWeight:800,color:isAct?'white':gc.text}}>{g}</div>
                    <div style={{fontSize:10,color:isAct?'rgba(255,255,255,0.8)':gc.text,marginTop:4,fontWeight:600}}>{cnt} doc.</div>
                    <div style={{fontSize:9,color:isAct?'rgba(255,255,255,0.6)':gc.text,marginTop:2,opacity:0.8}}>{gc.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* TABEL DOCUMENTE */}
        {nivel && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:20}}>{currentNivel?.icon}</span>
                <div>
                  <div style={{fontWeight:700,color:'#1e293b',fontSize:15}}>{currentNivel?.label} {nivel?.id === 3 ? `— ${grupaPS}` : ''}</div>
                  <div style={{fontSize:12,color:'#94a3b8'}}>{currentDocs.length} documente</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => openAdd(nivel)}>+ Adaugă document</button>
            </div>

            <div className="table-wrapper">
              {currentDocs.length === 0 ? (
                <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
                  <div style={{fontSize:40,marginBottom:12}}>{currentNivel?.icon}</div>
                  <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>Niciun document în {currentNivel?.cod}</div>
                  <button className="btn btn-primary" onClick={() => openAdd(nivel)}>+ Adaugă primul document</button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Cod</th>
                      <th>Titlu</th>
                      <th>Ed./Rev.</th>
                      <th>Dată vigoare</th>
                      <th>Status</th>
                      <th>PDF</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDocs.map(d => {
                      const si = statusInfo(d.status)
                      return (
                        <tr key={d.id}>
                          <td><span style={{fontFamily:'monospace',fontWeight:700,fontSize:13,color:'#1a56db'}}>{d.cod}</span></td>
                          <td><span style={{fontSize:13,fontWeight:500,color:'#1e293b'}}>{d.titlu}</span></td>
                          <td><span style={{fontSize:12,color:'#64748b'}}>Ed.{d.editie||1}/Rev.{d.revizie||0}</span></td>
                          <td><span style={{fontSize:12,color:'#64748b'}}>{d.data_vigoare||'—'}</span></td>
                          <td>
                            <span style={{background:si.bg,color:si.color,border:`1px solid ${si.border}`,padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>
                              {si.label}
                            </span>
                          </td>
                          <td>
                            {d.fisier ? (
                              <button onClick={() => setShowPDF(d)}
                                style={{background:'#eff6ff',color:'#1a56db',border:'1px solid #bfdbfe',padding:'4px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                                📄 Vezi PDF
                              </button>
                            ) : (
                              <label style={{cursor:'pointer',background:'#f8fafc',color:'#94a3b8',border:'1px dashed #e2e8f0',padding:'4px 12px',borderRadius:8,fontSize:12,display:'inline-block'}}>
                                {uploadingId === d.id ? '⏳ Upload...' : '📎 Încarcă'}
                                <input type="file" accept=".pdf" style={{display:'none'}} onChange={e => uploadPDF(d.id, e.target.files[0])} />
                              </label>
                            )}
                          </td>
                          <td>
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={() => openEdit(d)}
                                style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'5px 10px',cursor:'pointer',fontSize:13}}>✏️</button>
                              <button onClick={() => deleteDoc(d.id)}
                                style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'5px 10px',cursor:'pointer',fontSize:13}}>🗑️</button>
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
      </div>

      {/* MODAL ADD/EDIT */}
      {(showAdd || showEdit) && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&(setShowAdd(false)||setShowEdit(null))}>
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header" style={{background: currentNivel?.color||'#1a56db',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>{showEdit?'Editare document':'Document nou'}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.8)'}}>{currentNivel?.cod} · {currentNivel?.label}</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label className="form-label">Cod document *</label>
                  <input type="text" className="form-control" value={form.cod} onChange={e=>setForm(p=>({...p,cod:e.target.value}))} placeholder="ex. PG-4.1" style={{fontFamily:'monospace'}} />
                </div>
                <div>
                  <label className="form-label">Tip</label>
                  <select className="form-control" value={form.tip} onChange={e=>setForm(p=>({...p,tip:e.target.value}))}>
                    {['MAN','PG','PS','IL','F','REG','EXT','AH'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Titlu document *</label>
                <input type="text" className="form-control" value={form.titlu} onChange={e=>setForm(p=>({...p,titlu:e.target.value}))} placeholder="ex. Procedura de control al documentelor" />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label className="form-label">Ediția</label>
                  <input type="number" min="1" className="form-control" value={form.editie} onChange={e=>setForm(p=>({...p,editie:parseInt(e.target.value)||1}))} />
                </div>
                <div>
                  <label className="form-label">Revizia</label>
                  <input type="number" min="0" className="form-control" value={form.revizie} onChange={e=>setForm(p=>({...p,revizie:parseInt(e.target.value)||0}))} />
                </div>
                <div>
                  <label className="form-label">Data intrării în vigoare</label>
                  <input type="date" className="form-control" value={form.data_vigoare} onChange={e=>setForm(p=>({...p,data_vigoare:e.target.value}))} />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    {STATUS_OPTS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              {form.tip === 'PS' && (
                <div>
                  <label className="form-label">Grupă metodologică</label>
                  <select className="form-control" value={form.grupa} onChange={e=>setForm(p=>({...p,grupa:e.target.value}))}>
                    <option value="">— selectați —</option>
                    {GRUPE_PS.map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">Responsabil</label>
                <input type="text" className="form-control" value={form.responsabil} onChange={e=>setForm(p=>({...p,responsabil:e.target.value}))} placeholder="ex. Croitoru Tatiana" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>{setShowAdd(false);setShowEdit(null);setForm(emptyForm)}}>Anulare</button>
              <button className="btn btn-primary" onClick={saveDoc} disabled={saving}>{saving?'Se salvează...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PDF */}
      {showPDF && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.85)',display:'flex',flexDirection:'column',zIndex:9999}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',background:'#1e293b',color:'white'}}>
            <span style={{fontFamily:'monospace',fontWeight:700}}>{showPDF.cod} — {showPDF.titlu}</span>
            <div style={{display:'flex',gap:12}}>
              <a href={showPDF.fisier} target="_blank" rel="noreferrer" style={{color:'#93c5fd',fontSize:13}}>↗ Deschide în tab nou</a>
              <button onClick={()=>setShowPDF(null)} style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:8,padding:'6px 12px',color:'white',cursor:'pointer',fontSize:16}}>✕</button>
            </div>
          </div>
          <iframe src={showPDF.fisier} style={{flex:1,width:'100%',border:'none'}} title={showPDF.titlu} />
        </div>
      )}
    </div>
  )
}
