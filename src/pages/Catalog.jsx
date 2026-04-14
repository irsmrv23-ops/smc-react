import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const GRUPE = ['IST', 'TOR', 'HEP', 'IRP', 'IGI', 'GEN']

const GRUPE_CFG = {
  IST: { color: '#dc2626', light: '#fef2f2', border: '#fecaca', icon: '🧬', label: 'Infecții urogenitale / HPV / Biocenoze' },
  TOR: { color: '#d97706', light: '#fffbeb', border: '#fde68a', icon: '🦠', label: 'Infecții TORCH' },
  HEP: { color: '#ca8a04', light: '#fefce8', border: '#fef08a', icon: '🔶', label: 'Hepatite virale' },
  IRP: { color: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', icon: '🫁', label: 'Infecții respiratorii' },
  IGI: { color: '#0891b2', light: '#ecfeff', border: '#a5f3fc', icon: '🫀', label: 'Gastro-intestinale' },
  GEN: { color: '#7c3aed', light: '#f5f3ff', border: '#ddd6fe', icon: '🧪', label: 'Genetică moleculară' },
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
    if (!error) {
      setServicii(prev => [...prev, rec].sort((a, b) => a.grupa.localeCompare(b.grupa) || a.cod.localeCompare(b.cod)))
      setShowAdd(false)
      setForm({ cod: '', den: '', grupa: 'IST', activ: true })
    } else alert('Eroare: ' + error.message)
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

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Se încarcă...</div>

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">Catalog servicii</div>
          <div className="page-subtitle">
            {servicii.length} servicii total · <span style={{color:'#16a34a',fontWeight:600}}>{activi} active</span> · <span style={{color:'#94a3b8'}}>{inactivi} inactive</span>
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Serviciu nou</button>
        )}
      </div>

      <div style={{padding:'24px 32px'}}>

        {/* GRUPE BUTOANE MARI */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:28}}>
          <button onClick={() => setFiltruGrupa('')}
            style={{
              background: !filtruGrupa ? '#0f172a' : 'white',
              border: `2px solid ${!filtruGrupa ? '#0f172a' : '#e2e8f0'}`,
              borderRadius: 14, padding: '16px 8px', cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.2s',
              boxShadow: !filtruGrupa ? '0 6px 20px rgba(15,23,42,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
              transform: !filtruGrupa ? 'translateY(-2px)' : 'none',
            }}>
            <div style={{fontSize:24,marginBottom:6}}>📋</div>
            <div style={{fontSize:14,fontWeight:700,color:!filtruGrupa?'white':'#1e293b'}}>Toate</div>
            <div style={{fontSize:18,fontWeight:800,color:!filtruGrupa?'white':'#1e293b',marginTop:4}}>{servicii.length}</div>
          </button>
          {GRUPE.map(g => {
            const gc = GRUPE_CFG[g]
            const cnt = servicii.filter(s => s.grupa === g).length
            const actCnt = servicii.filter(s => s.grupa === g && s.activ).length
            const isAct = filtruGrupa === g
            return (
              <button key={g} onClick={() => setFiltruGrupa(isAct ? '' : g)}
                style={{
                  background: isAct ? gc.color : 'white',
                  border: `2px solid ${isAct ? gc.color : gc.border}`,
                  borderRadius: 14, padding: '16px 8px', cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.2s',
                  boxShadow: isAct ? `0 6px 20px ${gc.color}40` : '0 1px 3px rgba(0,0,0,0.06)',
                  transform: isAct ? 'translateY(-2px)' : 'none',
                }}>
                <div style={{fontSize:24,marginBottom:6}}>{gc.icon}</div>
                <div style={{fontSize:16,fontWeight:800,color:isAct?'white':gc.color}}>{g}</div>
                <div style={{fontSize:20,fontWeight:800,color:isAct?'white':gc.color,marginTop:4}}>{cnt}</div>
                <div style={{fontSize:10,color:isAct?'rgba(255,255,255,0.7)':gc.color,fontWeight:600,marginTop:2}}>{actCnt} active</div>
              </button>
            )
          })}
        </div>

        {/* FILTRE */}
        <div style={{display:'flex',gap:10,marginBottom:20,alignItems:'center'}}>
          <div style={{position:'relative',flex:1}}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Caută cod sau denumire..."
              className="form-control" style={{paddingLeft:16}} />
          </div>
          <div style={{display:'flex',gap:6}}>
            {['', 'activ', 'inactiv'].map(v => (
              <button key={v} onClick={() => setFiltruActiv(v)}
                style={{
                  padding:'8px 16px', borderRadius:10,
                  border:`2px solid ${filtruActiv===v ? v==='activ'?'#16a34a':v==='inactiv'?'#dc2626':'#1a56db' : '#e2e8f0'}`,
                  background: filtruActiv===v ? v==='activ'?'#f0fdf4':v==='inactiv'?'#fef2f2':'#eff6ff' : 'white',
                  color: filtruActiv===v ? v==='activ'?'#166534':v==='inactiv'?'#991b1b':'#1e40af' : '#64748b',
                  fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
                }}>
                {v === '' ? 'Toate' : v === 'activ' ? '✓ Active' : '✗ Inactive'}
              </button>
            ))}
          </div>
          <div style={{fontSize:13,color:'#94a3b8',fontWeight:500,flexShrink:0}}>
            {filtered.length} din {servicii.length}
          </div>
        </div>

        {/* LISTA SERVICII GRUPATE */}
        {filtruGrupa ? (
          // VIEW: O singură grupă — carduri mari
          <div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,padding:'16px 20px',background:'white',borderRadius:14,border:`2px solid ${GRUPE_CFG[filtruGrupa].border}`,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div style={{width:52,height:52,borderRadius:14,background:GRUPE_CFG[filtruGrupa].light,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>{GRUPE_CFG[filtruGrupa].icon}</div>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:GRUPE_CFG[filtruGrupa].color}}>{filtruGrupa}</div>
                <div style={{fontSize:13,color:'#64748b'}}>{GRUPE_CFG[filtruGrupa].label}</div>
              </div>
              <div style={{marginLeft:'auto',textAlign:'center'}}>
                <div style={{fontSize:28,fontWeight:800,color:GRUPE_CFG[filtruGrupa].color}}>{filtered.length}</div>
                <div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>servicii</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
              {filtered.map(s => (
                <ServiceCard key={s.id} s={s} gc={GRUPE_CFG[s.grupa]} isAdmin={isAdmin} onToggle={toggleActiv} onDelete={deleteServiciu} />
              ))}
            </div>
          </div>
        ) : (
          // VIEW: Toate grupele — tabel sau grupate
          <div>
            {GRUPE.map(g => {
              const list = filtered.filter(s => s.grupa === g)
              if (!list.length) return null
              const gc = GRUPE_CFG[g]
              return (
                <div key={g} style={{marginBottom:28}}>
                  {/* Header grupă */}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <div style={{width:36,height:36,borderRadius:10,background:gc.light,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{gc.icon}</div>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:15,fontWeight:800,color:gc.color}}>{g}</span>
                        <span style={{fontSize:12,color:'#64748b'}}>{gc.label}</span>
                        <span style={{background:gc.light,color:gc.color,border:`1px solid ${gc.border}`,padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{list.length} servicii</span>
                      </div>
                    </div>
                    <div style={{flex:1,height:1,background:'#f1f5f9',marginLeft:8}} />
                  </div>

                  {/* Grid servicii */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:10}}>
                    {list.map(s => (
                      <ServiceCard key={s.id} s={s} gc={gc} isAdmin={isAdmin} onToggle={toggleActiv} onDelete={deleteServiciu} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{background:'white',borderRadius:16,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:48,marginBottom:12}}>🔍</div>
            <div style={{fontSize:15,fontWeight:600}}>Niciun serviciu găsit</div>
          </div>
        )}
      </div>

      {/* MODAL ADD */}
      {showAdd && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header" style={{background:GRUPE_CFG[form.grupa]?.color||'#1a56db',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>{GRUPE_CFG[form.grupa]?.icon} Serviciu nou</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label className="form-label">Grupă metodologică</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {GRUPE.map(g => {
                    const gc = GRUPE_CFG[g]
                    return (
                      <button key={g} type="button" onClick={() => setForm(p => ({ ...p, grupa: g }))}
                        style={{padding:'10px 8px',borderRadius:10,border:`2px solid ${form.grupa===g?gc.color:gc.border}`,background:form.grupa===g?gc.light:'white',color:form.grupa===g?gc.color:'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',textAlign:'center',transition:'all 0.15s'}}>
                        <div style={{fontSize:18,marginBottom:2}}>{gc.icon}</div>{g}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="form-label">Cod serviciu *</label>
                <input type="text" className="form-control" value={form.cod}
                  onChange={e => setForm(p => ({ ...p, cod: e.target.value.toUpperCase() }))}
                  placeholder="ex. BM99" style={{fontFamily:'monospace',fontWeight:700,fontSize:16}} />
              </div>
              <div>
                <label className="form-label">Denumire *</label>
                <input type="text" className="form-control" value={form.den}
                  onChange={e => setForm(p => ({ ...p, den: e.target.value }))}
                  placeholder="ex. Parvovirus B19" />
              </div>
              <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 14px',borderRadius:10,border:`2px solid ${form.activ?'#16a34a':'#e2e8f0'}`,background:form.activ?'#f0fdf4':'#f8fafc',transition:'all 0.15s'}}>
                <input type="checkbox" checked={form.activ} onChange={e => setForm(p => ({ ...p, activ: e.target.checked }))} style={{width:18,height:18}} />
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:form.activ?'#166534':'#64748b'}}>{form.activ?'✓ Activ':'✗ Inactiv'}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>Apare în selecție la înregistrare serii</div>
                </div>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveServiciu} disabled={saving}>
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceCard({ s, gc, isAdmin, onToggle, onDelete }) {
  return (
    <div style={{
      background: 'white',
      border: `1px solid ${s.activ ? gc.border : '#e2e8f0'}`,
      borderLeft: `4px solid ${s.activ ? gc.color : '#e2e8f0'}`,
      borderRadius: 12, padding: '12px 14px',
      opacity: s.activ ? 1 : 0.55,
      transition: 'all 0.15s',
      display: 'flex', alignItems: 'center', gap: 12,
    }}
      onMouseOver={e => { if (s.activ) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
      onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>

      {/* Cod */}
      <div style={{
        background: s.activ ? gc.light : '#f8fafc',
        color: s.activ ? gc.color : '#94a3b8',
        fontFamily: 'monospace', fontWeight: 800, fontSize: 12,
        padding: '6px 10px', borderRadius: 8, flexShrink: 0, minWidth: 64, textAlign: 'center',
        border: `1px solid ${s.activ ? gc.border : '#e2e8f0'}`,
      }}>
        {s.cod}
      </div>

      {/* Denumire */}
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: 13, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{s.den}</div>
      </div>

      {/* Toggle + delete */}
      {isAdmin && (
        <div style={{display: 'flex', gap: 6, flexShrink: 0}}>
          <button onClick={() => onToggle(s.id, s.activ)}
            style={{
              background: s.activ ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${s.activ ? '#bbf7d0' : '#e2e8f0'}`,
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              color: s.activ ? '#166534' : '#94a3b8', transition: 'all 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = s.activ ? '#fef2f2' : '#f0fdf4'}
            onMouseOut={e => e.currentTarget.style.background = s.activ ? '#f0fdf4' : '#f8fafc'}>
            {s.activ ? '✓ Activ' : '✗ Inactiv'}
          </button>
          <button onClick={() => onDelete(s.id)}
            style={{background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: 14, padding: '4px'}}
            onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
            onMouseOut={e => e.currentTarget.style.color = '#e2e8f0'}>
            🗑️
          </button>
        </div>
      )}
    </div>
  )
}
