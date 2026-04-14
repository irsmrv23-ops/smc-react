import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PERSONAL_LIST = [
  { id: 'rotari-ion', nume: 'Rotari Ion', functie: 'Șef laborator', rol: 'sef', initiale: 'RI', color: '#1a56db', light: '#eff6ff' },
  { id: 'croitoru-tatiana', nume: 'Croitoru Tatiana', functie: 'Resp. Managementul Calității', rol: 'rmc', initiale: 'CT', color: '#7c3aed', light: '#f5f3ff' },
  { id: 'jentimir-valeria', nume: 'Jentimir Valeria', functie: 'Biolog medical', rol: 'biolog', initiale: 'JV', color: '#0f6e56', light: '#f0fdf4' },
  { id: 'andrian-maria', nume: 'Andrian Maria', functie: 'Biolog medical', rol: 'biolog', initiale: 'AM', color: '#d97706', light: '#fffbeb' },
  { id: 'antropov-marina', nume: 'Antropov Marina', functie: 'Biolog medical', rol: 'biolog', initiale: 'MA', color: '#dc2626', light: '#fef2f2' },
]

const DOCS_OBL = ['CV','CONTRACT','FISA_POST','BULETIN','DIPLOMA','CERTIFICAT_SPEC','AUTORIZATIE','FISA_MEDICALA','VACCIN','FORMARE_INIT','EVAL_COMPETENTA','FORMARE_CONTINUA','BIOSIGURANTA','SECURITATE','ACORD_CONF','ACORD_PRELUCRARE']

const DOCS_OBLIGATORII = [
  { cod: 'CV', den: 'Curriculum Vitae', tip: 'angajare' },
  { cod: 'CONTRACT', den: 'Contract individual de muncă', tip: 'angajare' },
  { cod: 'FISA_POST', den: 'Fișa postului semnată', tip: 'angajare' },
  { cod: 'BULETIN', den: 'Copie buletin de identitate', tip: 'angajare' },
  { cod: 'DIPLOMA', den: 'Diplomă de studii (copie legalizată)', tip: 'calificare' },
  { cod: 'CERTIFICAT_SPEC', den: 'Certificat de specialitate', tip: 'calificare' },
  { cod: 'AUTORIZATIE', den: 'Autorizație de exercitare', tip: 'calificare' },
  { cod: 'FISA_MEDICALA', den: 'Fișă medicală periodică', tip: 'medical' },
  { cod: 'VACCIN', den: 'Carnet vaccinări (HepB)', tip: 'medical' },
  { cod: 'FORMARE_INIT', den: 'Formare inițială în laborator', tip: 'formare' },
  { cod: 'EVAL_COMPETENTA', den: 'Evaluare competență (anuală)', tip: 'formare' },
  { cod: 'FORMARE_CONTINUA', den: 'Certificate formare continuă', tip: 'formare' },
  { cod: 'BIOSIGURANTA', den: 'Instruire biosiguranță (anuală)', tip: 'formare' },
  { cod: 'SECURITATE', den: 'Instruire SSM (anuală)', tip: 'formare' },
  { cod: 'ACORD_CONF', den: 'Acord de confidențialitate', tip: 'confidentialitate' },
  { cod: 'ACORD_PRELUCRARE', den: 'Acord prelucrare date personale', tip: 'confidentialitate' },
]

const TIP_COLORS = {
  angajare: { bg: '#eff6ff', color: '#1e40af', label: 'Angajare' },
  calificare: { bg: '#f5f3ff', color: '#6d28d9', label: 'Calificări' },
  medical: { bg: '#fef2f2', color: '#991b1b', label: 'Medical' },
  formare: { bg: '#f0fdf4', color: '#166534', label: 'Formare' },
  confidentialitate: { bg: '#f8fafc', color: '#475569', label: 'Confidențialitate' },
}

const CONCEDIU_TIPURI = [
  { value: 'odihna', label: 'Concediu de odihnă', color: '#16a34a', light: '#f0fdf4' },
  { value: 'medical', label: 'Concediu medical', color: '#dc2626', light: '#fef2f2' },
  { value: 'maternitate', label: 'Maternitate/Paternitate', color: '#7c3aed', light: '#f5f3ff' },
  { value: 'nemotivat', label: 'Absență nemotivată', color: '#475569', light: '#f8fafc' },
  { value: 'studii', label: 'Concediu studii', color: '#1a56db', light: '#eff6ff' },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ro-RO') }
function isExpirat(doc) { return doc.expirare && doc.expirare < todayStr() }
function isExpiraCurand(doc) {
  if (!doc.expirare) return false
  const days = Math.ceil((new Date(doc.expirare) - new Date()) / 86400000)
  return days >= 0 && days <= 30
}
function isPersonInConcediu(personalId, concedii) {
  const today = todayStr()
  return (concedii || []).some(c => c.personal_id === personalId && c.data_start <= today && c.data_end >= today)
}
function calcCompletare(dosar) {
  if (!dosar?.length) return 0
  const coduri = dosar.map(d => d.cod)
  return Math.round(DOCS_OBL.filter(c => coduri.includes(c)).length / DOCS_OBL.length * 100)
}

export default function Personal() {
  const [dosare, setDosare] = useState({})
  const [concedii, setConcedii] = useState([])
  const [instruiri, setInstruiri] = useState([])
  const [substitutii, setSubstitutii] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [personalTab, setPersonalTab] = useState('dosar')
  const [mainTab, setMainTab] = useState('personal')
  const [showAdd, setShowAdd] = useState(false)
  const [showConcediu, setShowConcediu] = useState(false)
  const [showInstruire, setShowInstruire] = useState(false)
  const [showSubst, setShowSubst] = useState(false)
  const [form, setForm] = useState({ cod: '', den: '', tip: 'angajare', data: '', expirare: '', institutie: '', nr: '', obs: '' })
  const [concForm, setConcForm] = useState({ personal_id: '', tip: 'odihna', data_start: todayStr(), data_end: '', obs: '' })
  const [instrForm, setInstrForm] = useState({ _tip: 'interna', tema: '', data: todayStr(), durata: '', trainer: '', participanti: [], obs: '' })
  const [substForm, setSubstForm] = useState({ titular_id: '', inlocuitor_id: '', activitati: '', obs: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [d, c, i, s] = await Promise.all([
      supabase.from('dosar_data').select('*').order('ts', { ascending: false }),
      supabase.from('concedii').select('*').order('data_start', { ascending: false }),
      supabase.from('instruiri').select('*').order('data', { ascending: false }),
      supabase.from('substitutii').select('*').order('ts', { ascending: false }),
    ])
    const grouped = {}
    PERSONAL_LIST.forEach(p => grouped[p.id] = [])
    ;(d.data || []).forEach(doc => { if (grouped[doc.personal_id]) grouped[doc.personal_id].push(doc) })
    setDosare(grouped)
    setConcedii(c.data || [])
    setInstruiri(i.data || [])
    setSubstitutii(s.data || [])
    setLoading(false)
  }

  async function saveDoc() {
    if (!form.cod || !form.den) { alert('Cod și denumire obligatorii!'); return }
    setSaving(true)
    const rec = { id: 'DOS-' + Date.now(), personal_id: selected.id, ...form, ts: new Date().toISOString() }
    const { error } = await supabase.from('dosar_data').insert(rec)
    if (!error) { setDosare(prev => ({ ...prev, [selected.id]: [rec, ...(prev[selected.id] || [])] })); setShowAdd(false); setForm({ cod: '', den: '', tip: 'angajare', data: '', expirare: '', institutie: '', nr: '', obs: '' }) }
    setSaving(false)
  }

  async function deleteDoc(docId) {
    if (!window.confirm('Ștergeți?')) return
    await supabase.from('dosar_data').delete().eq('id', docId)
    setDosare(prev => ({ ...prev, [selected.id]: prev[selected.id].filter(d => d.id !== docId) }))
  }

  async function saveConcediu() {
    if (!concForm.personal_id || !concForm.data_start || !concForm.data_end) { alert('Completați toate câmpurile!'); return }
    if (concForm.data_end < concForm.data_start) { alert('Data final trebuie după data start!'); return }
    setSaving(true)
    const rec = { id: 'CON-' + Date.now(), ...concForm, ts: new Date().toISOString() }
    const { error } = await supabase.from('concedii').insert(rec)
    if (!error) { setConcedii(prev => [rec, ...prev]); setShowConcediu(false) }
    setSaving(false)
  }

  async function saveInstruire() {
    if (!instrForm.tema || !instrForm.data) { alert('Tema și data sunt obligatorii!'); return }
    setSaving(true)
    const rec = { id: 'INS-' + Date.now(), tip: instrForm._tip, tema: instrForm.tema, data: instrForm.data, durata: instrForm.durata, trainer: instrForm.trainer, participanti: instrForm.participanti, obs: instrForm.obs, ts: new Date().toISOString() }
    const { error } = await supabase.from('instruiri').insert(rec)
    if (!error) { setInstruiri(prev => [rec, ...prev]); setShowInstruire(false); setInstrForm({ _tip: 'interna', tema: '', data: todayStr(), durata: '', trainer: '', participanti: [], obs: '' }) }
    setSaving(false)
  }

  async function uploadPV(instrId, file) {
    if (!file) return
    const path = `instruiri/${instrId}/${file.name}`
    const { error } = await supabase.storage.from('documente').upload(path, file, { upsert: true })
    if (error) { alert('Eroare: ' + error.message); return }
    const { data } = supabase.storage.from('documente').getPublicUrl(path)
    await supabase.from('instruiri').update({ pv_url: data.publicUrl }).eq('id', instrId)
    setInstruiri(prev => prev.map(i => i.id === instrId ? { ...i, pv_url: data.publicUrl } : i))
  }

  async function saveSubstitutie() {
    if (!substForm.titular_id || !substForm.inlocuitor_id) { alert('Selectați titularul și înlocuitorul!'); return }
    if (substForm.titular_id === substForm.inlocuitor_id) { alert('Nu pot fi aceeași persoană!'); return }
    setSaving(true)
    const rec = { id: 'SUB-' + Date.now(), ...substForm, ts: new Date().toISOString() }
    const { error } = await supabase.from('substitutii').insert(rec)
    if (!error) { setSubstitutii(prev => [rec, ...prev]); setShowSubst(false) }
    setSaving(false)
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Se încarcă...</div>

  const today = todayStr()

  // ── DOSAR INDIVIDUAL ───────────────────────────────────────
  if (selected) {
    const dosar = dosare[selected.id] || []
    const completare = calcCompletare(dosar)
    const coduriFata = dosar.map(d => d.cod)
    const lipsesc = DOCS_OBLIGATORII.filter(d => !coduriFata.includes(d.cod))
    const inConcediu = isPersonInConcediu(selected.id, concedii)
    const concAct = concedii.find(c => c.personal_id === selected.id && c.data_start <= today && c.data_end >= today)
    const expirate = dosar.filter(d => isExpirat(d))
    const expiraCurand = dosar.filter(d => isExpiraCurand(d))

    return (
      <div>
        {/* Header */}
        <div className="page-header">
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <button onClick={() => setSelected(null)} style={{background:'#f1f5f9',border:'none',borderRadius:10,padding:'8px 14px',cursor:'pointer',fontSize:13,color:'#64748b',fontWeight:600}}>← Înapoi</button>
            <div style={{width:48,height:48,borderRadius:'50%',background:selected.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,flexShrink:0}}>{selected.initiale}</div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18,fontWeight:700,color:'#0f172a'}}>{selected.nume}</span>
                {inConcediu && <span style={{background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa',padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600}}>🏖️ Concediu → {fmtDate(concAct?.data_end)}</span>}
              </div>
              <div style={{fontSize:13,color:'#64748b',marginTop:2}}>{selected.functie}</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:32,fontWeight:800,color:completare>=80?'#16a34a':completare>=50?'#d97706':'#dc2626'}}>{completare}%</div>
              <div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>DOSAR COMPLET</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Adaugă document</button>
          </div>
        </div>

        <div style={{padding:'24px 32px'}}>
          {/* Progres */}
          <div style={{background:'#f1f5f9',borderRadius:99,height:10,marginBottom:24,overflow:'hidden'}}>
            <div style={{width:completare+'%',height:'100%',background:completare>=80?'#16a34a':completare>=50?'#d97706':'#dc2626',borderRadius:99,transition:'width 0.6s ease'}} />
          </div>

          {/* Alerte */}
          {expirate.length > 0 && (
            <div className="alert alert-danger" style={{marginBottom:12}}>
              ⚠ <strong>{expirate.length} documente expirate:</strong> {expirate.map(d=>d.den).join(', ')}
            </div>
          )}
          {expiraCurand.length > 0 && (
            <div className="alert alert-warning" style={{marginBottom:12}}>
              ⏰ <strong>{expiraCurand.length} documente expiră în 30 zile:</strong> {expiraCurand.map(d=>d.den).join(', ')}
            </div>
          )}

          {/* Sub-tabs */}
          <div className="tabs" style={{marginBottom:24}}>
            {[{id:'dosar',l:'📁 Dosar'},{id:'concedii',l:'🏖️ Concedii'},{id:'instruiri',l:'📚 Instruiri'}].map(t=>(
              <button key={t.id} className={`tab-btn ${personalTab===t.id?'active':''}`} onClick={()=>setPersonalTab(t.id)}>{t.l}</button>
            ))}
          </div>

          {/* DOSAR */}
          {personalTab === 'dosar' && (
            <div>
              {lipsesc.length > 0 && (
                <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:20,marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#dc2626',marginBottom:12}}>⚠ Lipsesc {lipsesc.length} documente obligatorii:</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {lipsesc.map(d=>(
                      <button key={d.cod} onClick={()=>{setForm(p=>({...p,cod:d.cod,den:d.den,tip:d.tip}));setShowAdd(true)}}
                        style={{background:'#fef2f2',border:'1px dashed #fecaca',color:'#991b1b',padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer'}}>
                        + {d.den.slice(0,28)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grupare pe tip */}
              {Object.entries(TIP_COLORS).map(([tip, tc]) => {
                const docs = dosar.filter(d => d.tip === tip)
                if (!docs.length) return null
                return (
                  <div key={tip} style={{marginBottom:16}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <div style={{background:tc.bg,color:tc.color,padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{tc.label}</div>
                      <div style={{flex:1,height:1,background:'#f1f5f9'}} />
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10}}>
                      {docs.map(d=>(
                        <div key={d.id} style={{background:'white',border:`1px solid ${isExpirat(d)?'#fecaca':isExpiraCurand(d)?'#fde68a':'#e2e8f0'}`,borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
                          <div style={{width:36,height:36,borderRadius:8,background:tc.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:10,fontWeight:700,color:tc.color,flexShrink:0}}>{d.cod.slice(0,6)}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.den}</div>
                            <div style={{fontSize:11,color:isExpirat(d)?'#dc2626':isExpiraCurand(d)?'#d97706':'#94a3b8',marginTop:2}}>
                              {d.data?`Eliberat: ${fmtDate(d.data)}`:''}
                              {d.expirare?` · Expiră: ${fmtDate(d.expirare)}`:''}
                              {isExpirat(d)?' ⚠ EXPIRAT':''}
                              {isExpiraCurand(d)?' ⏰':''}
                            </div>
                          </div>
                          <button onClick={()=>deleteDoc(d.id)} style={{background:'none',border:'none',color:'#e2e8f0',cursor:'pointer',fontSize:16,flexShrink:0}}>🗑️</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* CONCEDII */}
          {personalTab === 'concedii' && (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Concedii — {selected.nume}</div>
                <button className="btn btn-primary" onClick={()=>{setConcForm(p=>({...p,personal_id:selected.id}));setShowConcediu(true)}}>+ Înregistrare</button>
              </div>
              {concedii.filter(c=>c.personal_id===selected.id).length===0?(
                <div style={{background:'white',borderRadius:14,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}>
                  <div style={{fontSize:40,marginBottom:12}}>🏖️</div>
                  <div>Niciun concediu înregistrat</div>
                </div>
              ):(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                  {concedii.filter(c=>c.personal_id===selected.id).map(c=>{
                    const days = Math.ceil((new Date(c.data_end)-new Date(c.data_start))/86400000)+1
                    const activ = c.data_start<=today&&c.data_end>=today
                    const tipInfo = CONCEDIU_TIPURI.find(t=>t.value===c.tip)
                    return (
                      <div key={c.id} style={{background:activ?tipInfo?.light||'#f8fafc':'white',border:`2px solid ${activ?tipInfo?.color||'#e2e8f0':'#e2e8f0'}`,borderRadius:14,padding:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                          <span style={{background:tipInfo?.light,color:tipInfo?.color,padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700,border:`1px solid ${tipInfo?.color}30`}}>{tipInfo?.label||c.tip}</span>
                          {activ&&<span style={{background:tipInfo?.color,color:'white',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>ACTIV</span>}
                        </div>
                        <div style={{fontSize:24,fontWeight:800,color:tipInfo?.color||'#1e293b',marginBottom:4}}>{days} zile</div>
                        <div style={{fontSize:12,color:'#64748b'}}>{fmtDate(c.data_start)} → {fmtDate(c.data_end)}</div>
                        {c.obs&&<div style={{fontSize:12,color:'#94a3b8',marginTop:6}}>{c.obs}</div>}
                        <button onClick={async()=>{if(!window.confirm('Ștergeți?'))return;await supabase.from('concedii').delete().eq('id',c.id);setConcedii(prev=>prev.filter(x=>x.id!==c.id))}}
                          style={{marginTop:10,background:'none',border:'none',color:'#e2e8f0',cursor:'pointer',fontSize:12}}>🗑️ Șterge</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* INSTRUIRI PER PERSOANĂ */}
          {personalTab === 'instruiri' && (
            <div>
              <div style={{fontSize:13,color:'#64748b',marginBottom:16}}>Instruiri la care a participat <strong>{selected.nume}</strong>:</div>
              <div className="table-wrapper">
                {instruiri.filter(i=>Array.isArray(i.participanti)&&i.participanti.includes(selected.id)).length===0?(
                  <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Nicio instruire. Adăugați din secțiunea "Instruiri".</div>
                ):(
                  <table>
                    <thead><tr><th>Data</th><th>Tip</th><th>Tema</th><th>Trainer</th><th>PV</th></tr></thead>
                    <tbody>
                      {instruiri.filter(i=>Array.isArray(i.participanti)&&i.participanti.includes(selected.id)).map(i=>(
                        <tr key={i.id}>
                          <td>{fmtDate(i.data)}</td>
                          <td><span style={{background:i.tip==='interna'?'#eff6ff':'#f0fdf4',color:i.tip==='interna'?'#1e40af':'#166534',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{i.tip==='interna'?'Internă':'Externă'}</span></td>
                          <td style={{fontWeight:500}}>{i.tema}</td>
                          <td style={{color:'#64748b'}}>{i.trainer||'—'}</td>
                          <td>{i.pv_url?<a href={i.pv_url} target="_blank" rel="noreferrer" style={{color:'#1a56db',fontWeight:600,fontSize:13}}>📄 PV</a>:'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL ADD DOC */}
        {showAdd&&(
          <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
            <div className="modal" style={{maxWidth:480}}>
              <div className="modal-header" style={{background:selected.color,borderRadius:'20px 20px 0 0'}}>
                <div className="modal-title" style={{color:'white'}}>Adaugă document</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.8)'}}>{selected.nume}</div>
              </div>
              <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <label className="form-label">Document</label>
                  <select className="form-control" value={form.cod} onChange={e=>{const tmpl=DOCS_OBLIGATORII.find(d=>d.cod===e.target.value);if(tmpl)setForm(p=>({...p,cod:tmpl.cod,den:tmpl.den,tip:tmpl.tip}));else setForm(p=>({...p,cod:e.target.value}))}}>
                    <option value="">— selectați —</option>
                    {DOCS_OBLIGATORII.map(d=><option key={d.cod} value={d.cod}>{d.cod} — {d.den.slice(0,35)}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Denumire</label><input type="text" className="form-control" value={form.den} onChange={e=>setForm(p=>({...p,den:e.target.value}))} /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  <div><label className="form-label">Data eliberării</label><input type="date" className="form-control" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))} /></div>
                  <div><label className="form-label">Data expirării</label><input type="date" className="form-control" value={form.expirare} onChange={e=>setForm(p=>({...p,expirare:e.target.value}))} /></div>
                </div>
                <div><label className="form-label">Instituție emitentă</label><input type="text" className="form-control" value={form.institutie} onChange={e=>setForm(p=>({...p,institutie:e.target.value}))} placeholder="ex. USMF" /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Anulare</button>
                <button className="btn btn-primary" onClick={saveDoc} disabled={saving}>{saving?'...':'Salvează'}</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CONCEDIU */}
        {showConcediu&&(
          <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowConcediu(false)}>
            <div className="modal" style={{maxWidth:440}}>
              <div className="modal-header" style={{background:'#d97706',borderRadius:'20px 20px 0 0'}}>
                <div className="modal-title" style={{color:'white'}}>🏖️ Înregistrare concediu</div>
              </div>
              <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
                <div><label className="form-label">Tip concediu</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {CONCEDIU_TIPURI.map(t=>(
                      <button key={t.value} type="button" onClick={()=>setConcForm(p=>({...p,tip:t.value}))}
                        style={{padding:'10px',borderRadius:10,border:`2px solid ${concForm.tip===t.value?t.color:'#e2e8f0'}`,background:concForm.tip===t.value?t.light:'white',color:concForm.tip===t.value?t.color:'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  <div><label className="form-label">Data start *</label><input type="date" className="form-control" value={concForm.data_start} onChange={e=>setConcForm(p=>({...p,data_start:e.target.value}))} /></div>
                  <div><label className="form-label">Data end *</label><input type="date" className="form-control" value={concForm.data_end} onChange={e=>setConcForm(p=>({...p,data_end:e.target.value}))} /></div>
                </div>
                {concForm.data_start&&concForm.data_end&&(
                  <div className="alert alert-info">Durata: <strong>{Math.ceil((new Date(concForm.data_end)-new Date(concForm.data_start))/86400000)+1} zile</strong></div>
                )}
                <div><label className="form-label">Observații</label><input type="text" className="form-control" value={concForm.obs} onChange={e=>setConcForm(p=>({...p,obs:e.target.value}))} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={()=>setShowConcediu(false)}>Anulare</button>
                <button className="btn btn-primary" onClick={saveConcediu} disabled={saving}>{saving?'...':'Salvează'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── LISTA PRINCIPALĂ ────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Personal</div>
          <div className="page-subtitle">Dosare · Concedii · Instruiri · Substituție · ISO 15189:2023 §6.2</div>
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>
        <div className="tabs" style={{marginBottom:24}}>
          {[{id:'personal',l:'👤 Personal'},{id:'instruiri',l:'📚 Instruiri'},{id:'substitutie',l:'🔄 Substituție'}].map(t=>(
            <button key={t.id} className={`tab-btn ${mainTab===t.id?'active':''}`} onClick={()=>setMainTab(t.id)}>{t.l}</button>
          ))}
        </div>

        {/* GRID PERSONAL */}
        {mainTab==='personal'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:20}}>
            {PERSONAL_LIST.map(p=>{
              const dosar = dosare[p.id]||[]
              const completare = calcCompletare(dosar)
              const lipsesc = DOCS_OBL.filter(cod=>!dosar.find(d=>d.cod===cod)).length
              const expirate = dosar.filter(d=>isExpirat(d)).length
              const inConcediu = isPersonInConcediu(p.id,concedii)
              const concAct = concedii.find(c=>c.personal_id===p.id&&c.data_start<=today&&c.data_end>=today)
              const instruiriP = instruiri.filter(i=>Array.isArray(i.participanti)&&i.participanti.includes(p.id)).length

              return (
                <div key={p.id} onClick={()=>{setSelected(p);setPersonalTab('dosar')}}
                  style={{background:'white',borderRadius:16,border:`1px solid ${inConcediu?'#fed7aa':'#e2e8f0'}`,padding:20,cursor:'pointer',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}
                  onMouseOver={e=>e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'}
                  onMouseOut={e=>e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'}>

                  {/* Header card */}
                  <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:16}}>
                    <div style={{width:52,height:52,borderRadius:'50%',background:p.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,flexShrink:0,boxShadow:`0 4px 12px ${p.color}40`}}>
                      {p.initiale}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{p.nume}</div>
                      <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{p.functie}</div>
                      {inConcediu&&<div style={{marginTop:6,background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,display:'inline-block'}}>🏖️ Concediu → {fmtDate(concAct?.data_end)}</div>}
                    </div>
                    <div style={{fontSize:22,color:'#e2e8f0'}}>›</div>
                  </div>

                  {/* Progres */}
                  <div style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <span style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.5}}>Dosar complet</span>
                      <span style={{fontSize:16,fontWeight:800,color:completare>=80?'#16a34a':completare>=50?'#d97706':'#dc2626'}}>{completare}%</span>
                    </div>
                    <div style={{background:'#f1f5f9',borderRadius:99,height:8,overflow:'hidden'}}>
                      <div style={{width:completare+'%',height:'100%',background:completare>=80?p.color:completare>=50?'#d97706':'#dc2626',borderRadius:99,transition:'width 0.6s'}} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:14}}>
                    <div style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'10px 6px'}}>
                      <div style={{fontSize:20,fontWeight:800,color:'#1e293b'}}>{dosar.length}</div>
                      <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,marginTop:2}}>DOC.</div>
                    </div>
                    <div style={{textAlign:'center',background:lipsesc>0?'#fef2f2':'#f0fdf4',borderRadius:10,padding:'10px 6px'}}>
                      <div style={{fontSize:20,fontWeight:800,color:lipsesc>0?'#dc2626':'#16a34a'}}>{lipsesc}</div>
                      <div style={{fontSize:10,color:lipsesc>0?'#dc2626':'#16a34a',fontWeight:600,marginTop:2}}>LIPSESC</div>
                    </div>
                    <div style={{textAlign:'center',background:expirate>0?'#fef2f2':'#f8fafc',borderRadius:10,padding:'10px 6px'}}>
                      <div style={{fontSize:20,fontWeight:800,color:expirate>0?'#dc2626':'#94a3b8'}}>{expirate}</div>
                      <div style={{fontSize:10,color:expirate>0?'#dc2626':'#94a3b8',fontWeight:600,marginTop:2}}>EXPIR.</div>
                    </div>
                    <div style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'10px 6px'}}>
                      <div style={{fontSize:20,fontWeight:800,color:'#1a56db'}}>{instruiriP}</div>
                      <div style={{fontSize:10,color:'#1a56db',fontWeight:600,marginTop:2}}>INSTR.</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* INSTRUIRI GLOBALE */}
        {mainTab==='instruiri'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Toate instruirile ({instruiri.length})</div>
              <button className="btn btn-primary" onClick={()=>setShowInstruire(true)}>+ Instruire nouă</button>
            </div>
            {instruiri.length===0?(
              <div style={{background:'white',borderRadius:14,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:40,marginBottom:12}}>📚</div>
                <div>Nicio instruire înregistrată</div>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
                {instruiri.map(i=>(
                  <div key={i.id} style={{background:'white',borderRadius:14,border:`2px solid ${i.tip==='interna'?'#bfdbfe':'#bbf7d0'}`,padding:18}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                      <span style={{background:i.tip==='interna'?'#eff6ff':'#f0fdf4',color:i.tip==='interna'?'#1e40af':'#166534',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{i.tip==='interna'?'🏥 Internă':'🌍 Externă'}</span>
                      <span style={{fontSize:12,color:'#94a3b8'}}>{fmtDate(i.data)}</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:'#1e293b',marginBottom:8}}>{i.tema}</div>
                    <div style={{fontSize:12,color:'#64748b',marginBottom:10}}>
                      {i.trainer&&<span>👤 {i.trainer}</span>}
                      {i.durata&&<span style={{marginLeft:12}}>⏱ {i.durata}h</span>}
                    </div>
                    {Array.isArray(i.participanti)&&i.participanti.length>0&&(
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                        {i.participanti.map(id=>{const p=PERSONAL_LIST.find(x=>x.id===id);return p?(<div key={id} style={{width:28,height:28,borderRadius:'50%',background:p.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}} title={p.nume}>{p.initiale}</div>):null})}
                      </div>
                    )}
                    <div>
                      {i.pv_url?<a href={i.pv_url} target="_blank" rel="noreferrer" style={{background:'#eff6ff',color:'#1a56db',padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:600,textDecoration:'none'}}>📄 Proces verbal</a>:(
                        <label style={{background:'#f8fafc',border:'1px dashed #e2e8f0',color:'#94a3b8',padding:'5px 14px',borderRadius:8,fontSize:12,cursor:'pointer',display:'inline-block'}}>
                          📎 Upload PV
                          <input type="file" accept=".pdf" style={{display:'none'}} onChange={e=>uploadPV(i.id,e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSTITUȚIE */}
        {mainTab==='substitutie'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Plan de substituție personal</div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>ISO 15189:2023 §6.2.1 — Continuitatea serviciilor</div>
              </div>
              <button className="btn btn-primary" onClick={()=>setShowSubst(true)}>+ Adaugă</button>
            </div>
            <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
              {substitutii.length===0?(
                <div style={{background:'white',borderRadius:14,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8',gridColumn:'1/-1'}}>
                  <div style={{fontSize:40,marginBottom:12}}>🔄</div>
                  <div>Niciun plan definit. Definiți cine înlocuiește pe cine.</div>
                </div>
              ):substitutii.map(s=>{
                const tit = PERSONAL_LIST.find(p=>p.id===s.titular_id)
                const inl = PERSONAL_LIST.find(p=>p.id===s.inlocuitor_id)
                const titInConcediu = isPersonInConcediu(s.titular_id,concedii)
                return (
                  <div key={s.id} style={{background:titInConcediu?'#fff7ed':'white',border:`2px solid ${titInConcediu?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:18}}>
                    {titInConcediu&&<div style={{background:'#fed7aa',color:'#c2410c',padding:'4px 12px',borderRadius:8,fontSize:11,fontWeight:700,marginBottom:12,display:'inline-block'}}>🔄 ACTIV ACUM</div>}
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{width:44,height:44,borderRadius:'50%',background:tit?.color||'#94a3b8',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,margin:'0 auto 4px'}}>{tit?.initiale}</div>
                        <div style={{fontSize:11,color:'#64748b',fontWeight:600}}>{tit?.nume?.split(' ')[0]}</div>
      </div>
                      <div style={{fontSize:24,color:'#94a3b8',flex:1,textAlign:'center'}}>→</div>
                      <div style={{textAlign:'center'}}>
                        <div style={{width:44,height:44,borderRadius:'50%',background:inl?.color||'#94a3b8',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,margin:'0 auto 4px'}}>{inl?.initiale}</div>
                        <div style={{fontSize:11,color:'#64748b',fontWeight:600}}>{inl?.nume?.split(' ')[0]}</div>
                      </div>
                    </div>
                    {s.activitati&&<div style={{fontSize:12,color:'#64748b',background:'#f8fafc',borderRadius:8,padding:'8px 12px'}}>{s.activitati}</div>}
                    <button onClick={async()=>{if(!window.confirm('Ștergeți?'))return;await supabase.from('substitutii').delete().eq('id',s.id);setSubstitutii(prev=>prev.filter(x=>x.id!==s.id))}}
                      style={{marginTop:10,background:'none',border:'none',color:'#e2e8f0',cursor:'pointer',fontSize:12}}>🗑️ Șterge</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL INSTRUIRE */}
      {showInstruire&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowInstruire(false)}>
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header" style={{background:'#1a56db',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>📚 Instruire nouă</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {['interna','externa'].map(t=>(
                  <button key={t} type="button" onClick={()=>setInstrForm(p=>({...p,_tip:t}))}
                    style={{padding:'12px',borderRadius:12,border:`2px solid ${instrForm._tip===t?'#1a56db':'#e2e8f0'}`,background:instrForm._tip===t?'#eff6ff':'white',color:instrForm._tip===t?'#1e40af':'#64748b',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                    {t==='interna'?'🏥 Internă':'🌍 Externă'}
                  </button>
                ))}
              </div>
              <div><label className="form-label">Tema *</label><input type="text" className="form-control" value={instrForm.tema} onChange={e=>setInstrForm(p=>({...p,tema:e.target.value}))} placeholder="ex. Biosiguranță în laboratorul de biologie moleculară" /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Data *</label><input type="date" className="form-control" value={instrForm.data} onChange={e=>setInstrForm(p=>({...p,data:e.target.value}))} /></div>
                <div><label className="form-label">Durata (ore)</label><input type="number" step="0.5" className="form-control" value={instrForm.durata} onChange={e=>setInstrForm(p=>({...p,durata:e.target.value}))} /></div>
              </div>
              <div><label className="form-label">Trainer / Instituție</label><input type="text" className="form-control" value={instrForm.trainer} onChange={e=>setInstrForm(p=>({...p,trainer:e.target.value}))} /></div>
              <div>
                <label className="form-label">Participanți</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
                  {PERSONAL_LIST.map(p=>(
                    <label key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`2px solid ${instrForm.participanti.includes(p.id)?p.color:'#e2e8f0'}`,background:instrForm.participanti.includes(p.id)?p.light:'white',cursor:'pointer',transition:'all 0.15s'}}>
                      <input type="checkbox" checked={instrForm.participanti.includes(p.id)}
                        onChange={e=>setInstrForm(prev=>({...prev,participanti:e.target.checked?[...prev.participanti,p.id]:prev.participanti.filter(x=>x!==p.id)}))}
                        style={{display:'none'}} />
                      <div style={{width:28,height:28,borderRadius:'50%',background:p.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>{p.initiale}</div>
                      <span style={{fontSize:12,fontWeight:500,color:instrForm.participanti.includes(p.id)?p.color:'#64748b'}}>{p.nume.split(' ')[0]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowInstruire(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveInstruire} disabled={saving}>{saving?'...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUBSTITUȚIE */}
      {showSubst&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowSubst(false)}>
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header" style={{background:'#475569',borderRadius:'20px 20px 0 0'}}>
              <div className="modal-title" style={{color:'white'}}>🔄 Plan de substituție</div>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label className="form-label">Titular (persoana care lipsește) *</label>
                <select className="form-control" value={substForm.titular_id} onChange={e=>setSubstForm(p=>({...p,titular_id:e.target.value}))}>
                  <option value="">— selectați —</option>
                  {PERSONAL_LIST.map(p=><option key={p.id} value={p.id}>{p.nume}</option>)}
                </select>
              </div>
              <div><label className="form-label">Înlocuitor *</label>
                <select className="form-control" value={substForm.inlocuitor_id} onChange={e=>setSubstForm(p=>({...p,inlocuitor_id:e.target.value}))}>
                  <option value="">— selectați —</option>
                  {PERSONAL_LIST.filter(p=>p.id!==substForm.titular_id).map(p=><option key={p.id} value={p.id}>{p.nume}</option>)}
                </select>
              </div>
              <div><label className="form-label">Activități acoperite</label>
                <textarea className="form-control" rows={3} value={substForm.activitati} onChange={e=>setSubstForm(p=>({...p,activitati:e.target.value}))} placeholder="ex. Procesare probe IST, IQC, serii zilnice" style={{resize:'none'}} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowSubst(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveSubstitutie} disabled={saving}>{saving?'...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
