import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PERSONAL_LIST = [
  { id: 'rotari-ion',       nume: 'Rotari Ion',       functie: 'Șef laborator',          rol: 'sef',   initiale: 'RI', color: '#1a56db', light: '#eff6ff' },
  { id: 'croitoru-tatiana', nume: 'Croitoru Tatiana', functie: 'RMC / Biolog medical',   rol: 'rmc',   initiale: 'CT', color: '#7c3aed', light: '#f5f3ff' },
  { id: 'jentimir-valeria', nume: 'Jentimir Valeria', functie: 'Biolog medical',          rol: 'biolog',initiale: 'JV', color: '#0f6e56', light: '#f0fdf4' },
  { id: 'andrian-maria',    nume: 'Andrian Maria',    functie: 'Biolog medical',          rol: 'biolog',initiale: 'AM', color: '#d97706', light: '#fffbeb' },
  { id: 'antropov-marina',  nume: 'Antropov Marina',  functie: 'Biolog medical',          rol: 'biolog',initiale: 'MA', color: '#dc2626', light: '#fef2f2' },
]

const DOCS_OFICIALE = [
  { cod: 'PG-6.2/F-01', den: 'Lista de evidență personal',                 tip: 'auto',   descriere: 'Generată automat din aplicație' },
  { cod: 'PG-6.2/F-02', den: 'Fișa postului',                              tip: 'upload', descriere: 'Scan semnat de angajat și șef' },
  { cod: 'PG-6.2/F-03', den: 'Declarația de confidențialitate angajat',    tip: 'upload', descriere: 'Scan semnat de angajat' },
  { cod: 'PG-6.2/F-04', den: 'Fișa profesională',                         tip: 'upload', descriere: 'Formular standard semnat DRU' },
  { cod: 'PG-6.2/F-05', den: 'Fișa de evaluare profesională / competență', tip: 'upload', descriere: 'Scan semnat' },
  { cod: 'PG-6.2/F-06', den: 'Plan de instruiri externe',                  tip: 'link',   descriere: 'Vezi tab Instruiri → Externe' },
  { cod: 'PG-6.2/F-07', den: 'Plan de instruiri interne',                  tip: 'link',   descriere: 'Vezi tab Instruiri → Interne' },
  { cod: 'PG-6.2/F-08', den: 'Proces verbal de instruire',                 tip: 'link',   descriere: 'Vezi tab Instruiri → PV' },
  { cod: 'PG-6.2/F-09', den: 'Lista de substituire personal',              tip: 'link',   descriere: 'Vezi tab Substituție' },
  { cod: 'PG-6.2/F-10', den: 'Program de instruire personal nou angajat',  tip: 'upload', descriere: 'Scan program semnat' },
]

const TIP_COLORS = {
  auto:   { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  upload: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  link:   { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
}

const CONCEDIU_TIPURI = [
  { value: 'odihna',      label: 'Concediu de odihnă',     color: '#16a34a', light: '#f0fdf4' },
  { value: 'medical',     label: 'Concediu medical',        color: '#dc2626', light: '#fef2f2' },
  { value: 'maternitate', label: 'Maternitate/Paternitate', color: '#7c3aed', light: '#f5f3ff' },
  { value: 'nemotivat',   label: 'Absență nemotivată',      color: '#475569', light: '#f8fafc' },
  { value: 'studii',      label: 'Concediu studii',         color: '#1a56db', light: '#eff6ff' },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ro-RO') }
function isLastDayOfMonth() { const d = new Date(); return d.getDate() === new Date(d.getFullYear(), d.getMonth()+1, 0).getDate() }
function isInConcediu(personalId, concedii) { const t = todayStr(); return (concedii||[]).some(c => c.personal_id === personalId && c.data_start <= t && c.data_end >= t) }

export default function Personal({ userRol }) {
  const [dosare, setDosare] = useState({})
  const [concedii, setConcedii] = useState([])
  const [instruiri, setInstruiri] = useState([])
  const [substitutii, setSubstitutii] = useState([])
  const [propuneri, setPropuneri] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [selected, setSelected] = useState(null)
  const [personalTab, setPersonalTab] = useState('dosar')
  const [mainTab, setMainTab] = useState('personal')
  const [showConcediu, setShowConcediu] = useState(false)
  const [showInstruire, setShowInstruire] = useState(false)
  const [showSubst, setShowSubst] = useState(false)
  const [showPropunere, setShowPropunere] = useState(false)
  const [showRaport, setShowRaport] = useState(false)
  const [concForm, setConcForm] = useState({ personal_id: '', tip: 'odihna', data_start: todayStr(), data_end: '', obs: '' })
  const [instrForm, setInstrForm] = useState({ _tip: 'interna', tema: '', data: todayStr(), durata: '', trainer: '', participanti: [], obs: '' })
  const [substForm, setSubstForm] = useState({ titular_id: '', inlocuitor_id: '', activitati: '' })
  const [propForm, setPropForm] = useState({ text: '', categorie: 'sugestie' })
  const [rapLuna, setRapLuna] = useState(todayStr().slice(0,7))

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (isLastDayOfMonth() && propuneri.filter(p => p.data?.startsWith(todayStr().slice(0,7))).length > 0) {
      setTimeout(() => alert('⚠ Astăzi este ultima zi a lunii!\nImprimați și semnați Registrul de propuneri (PG-6.2/R-01) pentru a fi prezentat conducerii.'), 2000)
    }
  }, [propuneri])

  async function loadAll() {
    setLoading(true)
    // Creare tabel propuneri dacă nu există — gestionat prin Supabase
    const [d, c, i, s, p] = await Promise.all([
      supabase.from('dosar_data').select('*').order('ts', { ascending: false }),
      supabase.from('concedii').select('*').order('data_start', { ascending: false }),
      supabase.from('instruiri').select('*').order('data', { ascending: false }),
      supabase.from('substitutii').select('*').order('ts', { ascending: false }),
      supabase.from('propuneri').select('*').order('ts', { ascending: false }),
    ])
    const grouped = {}
    PERSONAL_LIST.forEach(p => grouped[p.id] = [])
    ;(d.data||[]).forEach(doc => { if (grouped[doc.personal_id]) grouped[doc.personal_id].push(doc) })
    setDosare(grouped)
    setConcedii(c.data||[])
    setInstruiri(i.data||[])
    setSubstitutii(s.data||[])
    setPropuneri(p.data||[])
    setLoading(false)
  }

  async function uploadDocPDF(personalId, codDoc, file) {
    if (!file) return
    setUploading(codDoc)
    try {
      const safeId = personalId.replace(/[^a-z0-9-]/gi, '-')
      const safeCod = codDoc.replace(/[^a-z0-9-]/gi, '-')
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `personal/${safeId}/${safeCod}.${ext}`
      const { error: upErr } = await supabase.storage.from('documente').upload(path, file, { upsert: true })
      if (upErr) { alert('Eroare upload: ' + upErr.message); setUploading(null); return }
      const { data: urlData } = supabase.storage.from('documente').getPublicUrl(path)
      const existing = (dosare[personalId]||[]).find(d => d.cod === codDoc)
      if (existing) {
        await supabase.from('dosar_data').update({ fisier: urlData.publicUrl, ts: new Date().toISOString() }).eq('id', existing.id)
        setDosare(prev => ({ ...prev, [personalId]: prev[personalId].map(d => d.cod === codDoc ? { ...d, fisier: urlData.publicUrl } : d) }))
      } else {
        const rec = { id: 'DOS-' + Date.now(), personal_id: personalId, cod: codDoc, den: DOCS_OFICIALE.find(d=>d.cod===codDoc)?.den||codDoc, fisier: urlData.publicUrl, data: todayStr(), ts: new Date().toISOString() }
        await supabase.from('dosar_data').insert(rec)
        setDosare(prev => ({ ...prev, [personalId]: [rec, ...(prev[personalId]||[])] }))
      }
    } catch(e) { alert('Eroare: ' + e.message) }
    setUploading(null)
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
    const path = `instruiri/${instrId}/${instrId}.pdf`
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

  async function savePropunere() {
    if (!propForm.text.trim()) { alert('Introduceți textul propunerii!'); return }
    setSaving(true)
    const rec = { id: 'PRO-' + Date.now(), text: propForm.text.trim(), categorie: propForm.categorie, autor_id: userRol?.personal_id||'', autor_nume: userRol?.nume||'', data: todayStr(), ts: new Date().toISOString() }
    const { error } = await supabase.from('propuneri').insert(rec)
    if (!error) { setPropuneri(prev => [rec, ...prev]); setShowPropunere(false); setPropForm({ text: '', categorie: 'sugestie' }) }
    setSaving(false)
  }

  function genF01() {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>PG-6.2/F-01</title>
    <style>body{font-family:Arial,sans-serif;margin:20mm;font-size:11px}h2{color:#1a56db;font-size:14px;text-align:center}
    table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:6px 10px}th{background:#f8fafc;font-weight:600}</style></head><body>
    <div style="text-align:center;border-bottom:2px solid #1a56db;padding-bottom:12px;margin-bottom:20px">
      <div style="font-size:11px;color:#64748b">Invitro Diagnostics SRL · Laborator Biologie Moleculară · Chișinău</div>
      <h2>LISTA DE EVIDENȚĂ PERSONAL</h2>
      <div style="font-size:11px">Cod: PG-6.2/F-01 · Ed.01 · Data: ${fmtDate(todayStr())}</div>
    </div>
    <table><thead><tr><th>#</th><th>Nume Prenume</th><th>Funcția</th><th>Data angajării</th><th>Semnătura</th></tr></thead><tbody>
    ${PERSONAL_LIST.map((p,i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${p.nume}</td><td>${p.functie}</td><td></td><td style="min-width:80px"></td></tr>`).join('')}
    </tbody></table>
    <div style="margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:60px">
      <div style="text-align:center"><div style="border-top:1px solid #374151;padding-top:8px;margin-top:40px;font-size:10px"><strong>Rotari Ion</strong><br>Șef laborator</div></div>
      <div style="text-align:center"><div style="border-top:1px solid #374151;padding-top:8px;margin-top:40px;font-size:10px"><strong>Croitoru Tatiana</strong><br>Responsabil MC</div></div>
    </div></body></html>`)
    win.document.close(); setTimeout(() => win.print(), 500)
  }

  function genRaportPropuneri(luna) {
    const list = propuneri.filter(p => p.data?.startsWith(luna))
    if (!list.length) { alert('Nicio propunere în luna ' + luna); return }
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>PG-6.2/R-01 ${luna}</title>
    <style>body{font-family:Arial,sans-serif;margin:20mm;font-size:11px}h2{color:#1a56db;font-size:14px;text-align:center}
    table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:6px 10px}th{background:#f8fafc;font-weight:600}</style></head><body>
    <div style="text-align:center;border-bottom:2px solid #1a56db;padding-bottom:12px;margin-bottom:20px">
      <div style="font-size:11px;color:#64748b">Invitro Diagnostics SRL · Laborator Biologie Moleculară</div>
      <h2>REGISTRU PROPUNERI, SUGESTII, OPINII PERSONAL</h2>
      <div style="font-size:11px">Cod: PG-6.2/R-01 · Ed.01 · Perioada: ${luna} · Generat: ${fmtDate(todayStr())}</div>
    </div>
    <table><thead><tr><th>#</th><th>Data</th><th>Autor</th><th>Categorie</th><th>Conținut</th><th>Semnătură</th></tr></thead><tbody>
    ${list.map((p,i)=>`<tr><td>${i+1}</td><td>${fmtDate(p.data)}</td><td>${p.autor_nume||'—'}</td><td style="text-transform:capitalize">${p.categorie}</td><td>${p.text}</td><td style="min-width:60px"></td></tr>`).join('')}
    </tbody></table>
    <div style="margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:60px">
      <div style="text-align:center"><div style="border-top:1px solid #374151;padding-top:8px;margin-top:40px;font-size:10px"><strong>Rotari Ion</strong><br>Șef laborator · Data: ___________</div></div>
      <div style="text-align:center"><div style="border-top:1px solid #374151;padding-top:8px;margin-top:40px;font-size:10px"><strong>Croitoru Tatiana</strong><br>Responsabil MC · Data: ___________</div></div>
    </div></body></html>`)
    win.document.close(); setTimeout(() => win.print(), 500)
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Se încarcă...</div>

  const today = todayStr()
  const luniPropuneri = [...new Set(propuneri.map(p=>p.data?.slice(0,7)))].filter(Boolean).sort().reverse()

  // ── DOSAR INDIVIDUAL ──────────────────────────────────────
  if (selected) {
    const dosar = dosare[selected.id]||[]
    const uploadedCods = dosar.map(d=>d.cod)
    const totalUp = DOCS_OFICIALE.filter(d=>d.tip==='upload').length
    const completate = DOCS_OFICIALE.filter(d=>d.tip==='upload'&&uploadedCods.includes(d.cod)).length
    const pct = Math.round(completate/totalUp*100)
    const inConcediu = isInConcediu(selected.id, concedii)
    const concAct = concedii.find(c=>c.personal_id===selected.id&&c.data_start<=today&&c.data_end>=today)

    return (
      <div>
        <div className="page-header">
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <button onClick={()=>setSelected(null)} style={{background:'#f1f5f9',border:'none',borderRadius:10,padding:'8px 14px',cursor:'pointer',fontSize:13,color:'#64748b',fontWeight:600}}>← Înapoi</button>
            <div style={{width:48,height:48,borderRadius:'50%',background:selected.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,flexShrink:0,boxShadow:`0 4px 12px ${selected.color}40`}}>{selected.initiale}</div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18,fontWeight:700,color:'#0f172a'}}>{selected.nume}</span>
                {inConcediu&&<span style={{background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa',padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600}}>🏖️ Concediu → {fmtDate(concAct?.data_end)}</span>}
              </div>
              <div style={{fontSize:13,color:'#64748b',marginTop:2}}>{selected.functie}</div>
            </div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:32,fontWeight:800,color:pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626'}}>{pct}%</div>
            <div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>DOSAR COMPLET</div>
          </div>
        </div>

        <div style={{padding:'24px 32px'}}>
          <div style={{background:'#f1f5f9',borderRadius:99,height:10,marginBottom:24,overflow:'hidden'}}>
            <div style={{width:pct+'%',height:'100%',background:pct>=80?selected.color:pct>=50?'#d97706':'#dc2626',borderRadius:99,transition:'width 0.6s'}} />
          </div>

          <div className="tabs" style={{marginBottom:24}}>
            {[{id:'dosar',l:'📁 Dosar PG-6.2'},{id:'concedii',l:'🏖️ Concedii'},{id:'instruiri',l:'📚 Instruiri'}].map(t=>(
              <button key={t.id} className={`tab-btn ${personalTab===t.id?'active':''}`} onClick={()=>setPersonalTab(t.id)}>{t.l}</button>
            ))}
          </div>

          {personalTab==='dosar'&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {DOCS_OFICIALE.map(doc=>{
                const tc = TIP_COLORS[doc.tip]
                const inDosar = dosar.find(d=>d.cod===doc.cod)
                const hasFile = inDosar?.fisier
                const isUp = uploading===doc.cod
                return (
                  <div key={doc.cod} style={{background:'white',borderRadius:14,border:`1px solid ${hasFile||doc.tip!=='upload'?'#e2e8f0':'#fecaca'}`,borderLeft:`4px solid ${hasFile||doc.tip!=='upload'?selected.color:'#dc2626'}`,padding:'14px 20px',display:'flex',alignItems:'center',gap:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                    <div style={{background:tc.bg,color:tc.color,border:`1px solid ${tc.border}`,fontFamily:'monospace',fontWeight:700,fontSize:11,padding:'5px 10px',borderRadius:8,flexShrink:0,minWidth:130,textAlign:'center'}}>{doc.cod}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>{doc.den}</div>
                      <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{doc.descriere}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                      {doc.tip==='auto'&&(
                        <button onClick={genF01} style={{background:'#eff6ff',color:'#1e40af',border:'1px solid #bfdbfe',padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>🖨️ Generează PDF</button>
                      )}
                      {doc.tip==='upload'&&(
                        <>
                          {hasFile&&<a href={hasFile} target="_blank" rel="noreferrer" style={{background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0',padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,textDecoration:'none'}}>📄 Vezi PDF</a>}
                          <label style={{background:hasFile?'#f8fafc':'#1a56db',color:hasFile?'#64748b':'white',border:`1px solid ${hasFile?'#e2e8f0':'#1a56db'}`,padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-block'}}>
                            {isUp?'⏳ Upload...':hasFile?'🔄 Înlocuiește':'📎 Încarcă PDF'}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>uploadDocPDF(selected.id,doc.cod,e.target.files[0])} />
                          </label>
                          <span style={{fontSize:18}}>{hasFile?'✅':'❌'}</span>
                        </>
                      )}
                      {doc.tip==='link'&&(
                        <button onClick={()=>{setSelected(null);setMainTab(doc.cod.includes('F-09')?'substitutie':'instruiri')}}
                          style={{background:'#f5f3ff',color:'#6d28d9',border:'1px solid #ddd6fe',padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                          🔗 Vezi modul
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {personalTab==='concedii'&&(
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:600}}>Concedii — {selected.nume}</div>
                <button className="btn btn-primary" onClick={()=>{setConcForm(p=>({...p,personal_id:selected.id}));setShowConcediu(true)}}>+ Înregistrare</button>
              </div>
              {concedii.filter(c=>c.personal_id===selected.id).length===0?(
                <div style={{background:'white',borderRadius:14,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>🏖️</div><div>Niciun concediu</div></div>
              ):(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                  {concedii.filter(c=>c.personal_id===selected.id).map(c=>{
                    const days=Math.ceil((new Date(c.data_end)-new Date(c.data_start))/86400000)+1
                    const activ=c.data_start<=today&&c.data_end>=today
                    const ti=CONCEDIU_TIPURI.find(t=>t.value===c.tip)
                    return (
                      <div key={c.id} style={{background:activ?ti?.light:'white',border:`2px solid ${activ?ti?.color:'#e2e8f0'}`,borderRadius:14,padding:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                          <span style={{background:ti?.light,color:ti?.color,padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>{ti?.label||c.tip}</span>
                          {activ&&<span style={{background:ti?.color,color:'white',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>ACTIV</span>}
                        </div>
                        <div style={{fontSize:24,fontWeight:800,color:ti?.color}}>{days} zile</div>
                        <div style={{fontSize:12,color:'#64748b',marginTop:4}}>{fmtDate(c.data_start)} → {fmtDate(c.data_end)}</div>
                        <button onClick={async()=>{if(!window.confirm('Ștergeți?'))return;await supabase.from('concedii').delete().eq('id',c.id);setConcedii(prev=>prev.filter(x=>x.id!==c.id))}}
                          style={{marginTop:10,background:'none',border:'none',color:'#e2e8f0',cursor:'pointer',fontSize:12}}>🗑️ Șterge</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {personalTab==='instruiri'&&(
            <div>
              <div style={{fontSize:13,color:'#64748b',marginBottom:16}}>Instruiri la care a participat <strong>{selected.nume}</strong>:</div>
              <div className="table-wrapper">
                {instruiri.filter(i=>Array.isArray(i.participanti)&&i.participanti.includes(selected.id)).length===0?(
                  <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Nicio instruire.</div>
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
                          <td>{i.pv_url?<a href={i.pv_url} target="_blank" rel="noreferrer" style={{color:'#1a56db',fontWeight:600}}>📄 PV</a>:'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {showConcediu&&(
          <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowConcediu(false)}>
            <div className="modal" style={{maxWidth:440}}>
              <div className="modal-header" style={{background:'#d97706',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>🏖️ Înregistrare concediu</div></div>
              <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
                <div><label className="form-label">Tip concediu</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {CONCEDIU_TIPURI.map(t=>(
                      <button key={t.value} type="button" onClick={()=>setConcForm(p=>({...p,tip:t.value}))}
                        style={{padding:'10px',borderRadius:10,border:`2px solid ${concForm.tip===t.value?t.color:'#e2e8f0'}`,background:concForm.tip===t.value?t.light:'white',color:concForm.tip===t.value?t.color:'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  <div><label className="form-label">Data start *</label><input type="date" className="form-control" value={concForm.data_start} onChange={e=>setConcForm(p=>({...p,data_start:e.target.value}))} /></div>
                  <div><label className="form-label">Data end *</label><input type="date" className="form-control" value={concForm.data_end} onChange={e=>setConcForm(p=>({...p,data_end:e.target.value}))} /></div>
                </div>
                {concForm.data_start&&concForm.data_end&&<div className="alert alert-info">Durata: <strong>{Math.ceil((new Date(concForm.data_end)-new Date(concForm.data_start))/86400000)+1} zile</strong></div>}
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

  // ── LISTA PRINCIPALĂ ──────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Personal</div>
          <div className="page-subtitle">Dosare PG-6.2 · Concedii · Instruiri · Substituție · Registru propuneri</div>
        </div>
        {isLastDayOfMonth()&&propuneri.filter(p=>p.data?.startsWith(todayStr().slice(0,7))).length>0&&(
          <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:10,padding:'8px 14px',fontSize:13,color:'#92400e',fontWeight:600}}>⚠ Ultima zi — imprimați R-01!</div>
        )}
      </div>

      <div style={{padding:'24px 32px'}}>
        <div className="tabs" style={{marginBottom:24}}>
          {[
            {id:'personal',    l:'👤 Personal'},
            {id:'instruiri',   l:'📚 Instruiri'},
            {id:'substitutie', l:'🔄 Substituție'},
            {id:'propuneri',   l:`💬 Propuneri (${propuneri.filter(p=>p.data?.startsWith(todayStr().slice(0,7))).length} luna aceasta)`},
          ].map(t=>(
            <button key={t.id} className={`tab-btn ${mainTab===t.id?'active':''}`} onClick={()=>setMainTab(t.id)}>{t.l}</button>
          ))}
        </div>

        {mainTab==='personal'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:20}}>
            {PERSONAL_LIST.map(p=>{
              const dosar=dosare[p.id]||[]
              const uploadedCods=dosar.map(d=>d.cod)
              const totalUp=DOCS_OFICIALE.filter(d=>d.tip==='upload').length
              const completate=DOCS_OFICIALE.filter(d=>d.tip==='upload'&&uploadedCods.includes(d.cod)).length
              const lipsesc=totalUp-completate
              const pct=Math.round(completate/totalUp*100)
              const inConcediu=isInConcediu(p.id,concedii)
              const concAct=concedii.find(c=>c.personal_id===p.id&&c.data_start<=today&&c.data_end>=today)
              const instruiriP=instruiri.filter(i=>Array.isArray(i.participanti)&&i.participanti.includes(p.id)).length
              return (
                <div key={p.id} onClick={()=>setSelected(p)}
                  style={{background:'white',borderRadius:16,border:`1px solid ${inConcediu?'#fed7aa':'#e2e8f0'}`,padding:20,cursor:'pointer',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}
                  onMouseOver={e=>e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'}
                  onMouseOut={e=>e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:16}}>
                    <div style={{width:52,height:52,borderRadius:'50%',background:p.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,flexShrink:0,boxShadow:`0 4px 12px ${p.color}40`}}>{p.initiale}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{p.nume}</div>
                      <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{p.functie}</div>
                      {inConcediu&&<div style={{marginTop:6,background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,display:'inline-block'}}>🏖️ → {fmtDate(concAct?.data_end)}</div>}
                    </div>
                    <div style={{fontSize:22,color:'#e2e8f0'}}>›</div>
                  </div>
                  <div style={{marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase'}}>Dosar PG-6.2</span>
                      <span style={{fontSize:16,fontWeight:800,color:pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626'}}>{pct}%</span>
                    </div>
                    <div style={{background:'#f1f5f9',borderRadius:99,height:8,overflow:'hidden'}}>
                      <div style={{width:pct+'%',height:'100%',background:pct>=80?p.color:pct>=50?'#d97706':'#dc2626',borderRadius:99,transition:'width 0.6s'}} />
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                    <div style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'10px 6px'}}>
                      <div style={{fontSize:20,fontWeight:800,color:'#1e293b'}}>{completate}/{totalUp}</div>
                      <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,marginTop:2}}>ÎNCĂRCATE</div>
                    </div>
                    <div style={{textAlign:'center',background:lipsesc>0?'#fef2f2':'#f0fdf4',borderRadius:10,padding:'10px 6px'}}>
                      <div style={{fontSize:20,fontWeight:800,color:lipsesc>0?'#dc2626':'#16a34a'}}>{lipsesc}</div>
                      <div style={{fontSize:10,color:lipsesc>0?'#dc2626':'#16a34a',fontWeight:600,marginTop:2}}>LIPSESC</div>
                    </div>
                    <div style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'10px 6px'}}>
                      <div style={{fontSize:20,fontWeight:800,color:'#1a56db'}}>{instruiriP}</div>
                      <div style={{fontSize:10,color:'#1a56db',fontWeight:600,marginTop:2}}>INSTRUIRI</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {mainTab==='instruiri'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Toate instruirile ({instruiri.length})</div>
              <button className="btn btn-primary" onClick={()=>setShowInstruire(true)}>+ Instruire nouă</button>
            </div>
            {instruiri.length===0?(
              <div style={{background:'white',borderRadius:14,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>📚</div><div>Nicio instruire</div></div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
                {instruiri.map(i=>(
                  <div key={i.id} style={{background:'white',borderRadius:14,border:`2px solid ${i.tip==='interna'?'#bfdbfe':'#bbf7d0'}`,padding:18}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                      <span style={{background:i.tip==='interna'?'#eff6ff':'#f0fdf4',color:i.tip==='interna'?'#1e40af':'#166534',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{i.tip==='interna'?'🏥 Internă':'🌍 Externă'}</span>
                      <span style={{fontSize:12,color:'#94a3b8'}}>{fmtDate(i.data)}</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:'#1e293b',marginBottom:8}}>{i.tema}</div>
                    {i.trainer&&<div style={{fontSize:12,color:'#64748b',marginBottom:8}}>👤 {i.trainer}{i.durata?` · ⏱ ${i.durata}h`:''}</div>}
                    {Array.isArray(i.participanti)&&i.participanti.length>0&&(
                      <div style={{display:'flex',gap:6,marginBottom:10}}>
                        {i.participanti.map(id=>{const p=PERSONAL_LIST.find(x=>x.id===id);return p?(<div key={id} style={{width:28,height:28,borderRadius:'50%',background:p.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}} title={p.nume}>{p.initiale}</div>):null})}
                      </div>
                    )}
                    {i.pv_url?<a href={i.pv_url} target="_blank" rel="noreferrer" style={{background:'#eff6ff',color:'#1a56db',padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:600,textDecoration:'none'}}>📄 PV</a>:(
                      <label style={{background:'#f8fafc',border:'1px dashed #e2e8f0',color:'#94a3b8',padding:'5px 14px',borderRadius:8,fontSize:12,cursor:'pointer',display:'inline-block'}}>
                        📎 Upload PV<input type="file" accept=".pdf" style={{display:'none'}} onChange={e=>uploadPV(i.id,e.target.files[0])} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mainTab==='substitutie'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div><div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Plan de substituție · PG-6.2/F-09</div></div>
              <button className="btn btn-primary" onClick={()=>setShowSubst(true)}>+ Adaugă</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
              {substitutii.length===0?(
                <div style={{background:'white',borderRadius:14,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8',gridColumn:'1/-1'}}><div style={{fontSize:40,marginBottom:12}}>🔄</div><div>Niciun plan definit.</div></div>
              ):substitutii.map(s=>{
                const tit=PERSONAL_LIST.find(p=>p.id===s.titular_id)
                const inl=PERSONAL_LIST.find(p=>p.id===s.inlocuitor_id)
                const titInC=isInConcediu(s.titular_id,concedii)
                return (
                  <div key={s.id} style={{background:titInC?'#fff7ed':'white',border:`2px solid ${titInC?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:18}}>
                    {titInC&&<div style={{background:'#fed7aa',color:'#c2410c',padding:'4px 12px',borderRadius:8,fontSize:11,fontWeight:700,marginBottom:12,display:'inline-block'}}>🔄 ACTIV ACUM</div>}
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                      <div style={{textAlign:'center'}}><div style={{width:44,height:44,borderRadius:'50%',background:tit?.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,margin:'0 auto 4px'}}>{tit?.initiale}</div><div style={{fontSize:11,color:'#64748b'}}>{tit?.nume?.split(' ')[0]}</div></div>
                      <div style={{fontSize:24,color:'#94a3b8',flex:1,textAlign:'center'}}>→</div>
                      <div style={{textAlign:'center'}}><div style={{width:44,height:44,borderRadius:'50%',background:inl?.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,margin:'0 auto 4px'}}>{inl?.initiale}</div><div style={{fontSize:11,color:'#64748b'}}>{inl?.nume?.split(' ')[0]}</div></div>
                    </div>
                    {s.activitati&&<div style={{fontSize:12,color:'#64748b',background:'#f8fafc',borderRadius:8,padding:'8px 12px'}}>{s.activitati}</div>}
                    <button onClick={async()=>{if(!window.confirm('Ștergeți?'))return;await supabase.from('substitutii').delete().eq('id',s.id);setSubstitutii(prev=>prev.filter(x=>x.id!==s.id))}}
                      style={{marginTop:10,background:'none',border:'none',color:'#e2e8f0',cursor:'pointer',fontSize:12}}>🗑️</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {mainTab==='propuneri'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Registru propuneri, sugestii, opinii personal</div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>PG-6.2/R-01 · Ed.01 · Prezentat conducerii lunar</div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-outline" onClick={()=>setShowRaport(true)}>📊 Raport lunar</button>
                <button className="btn btn-primary" onClick={()=>setShowPropunere(true)}>+ Adaugă</button>
              </div>
            </div>
            {luniPropuneri.length>0&&(
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                {luniPropuneri.map(l=>(
                  <span key={l} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:20,padding:'4px 14px',fontSize:12,fontWeight:600,color:'#475569'}}>
                    {l} · {propuneri.filter(p=>p.data?.startsWith(l)).length}
                  </span>
                ))}
              </div>
            )}
            {propuneri.length===0?(
              <div style={{background:'white',borderRadius:14,border:'1px solid #e2e8f0',padding:60,textAlign:'center',color:'#94a3b8'}}>
                <div style={{fontSize:40,marginBottom:12}}>💬</div>
                <div style={{fontSize:15,fontWeight:600}}>Nicio propunere înregistrată</div>
                <div style={{fontSize:13,color:'#94a3b8',marginTop:8}}>Fiecare angajat poate introduce propuneri, sugestii sau opinii</div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {propuneri.map(p=>{
                  const autor=PERSONAL_LIST.find(x=>x.id===p.autor_id)
                  const catC=p.categorie==='sugestie'?{bg:'#eff6ff',color:'#1e40af'}:p.categorie==='opinie'?{bg:'#f5f3ff',color:'#6d28d9'}:{bg:'#f0fdf4',color:'#166534'}
                  return (
                    <div key={p.id} style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',padding:'14px 20px',display:'flex',gap:16,alignItems:'flex-start',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:autor?.color||'#94a3b8',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,flexShrink:0}}>{autor?.initiale||'?'}</div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                          <span style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>{p.autor_nume||'Anonim'}</span>
                          <span style={{background:catC.bg,color:catC.color,padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,textTransform:'capitalize'}}>{p.categorie}</span>
                          <span style={{fontSize:11,color:'#94a3b8',marginLeft:'auto'}}>{fmtDate(p.data)}</span>
                        </div>
                        <div style={{fontSize:14,color:'#374151',lineHeight:1.5}}>{p.text}</div>
                      </div>
                      {(userRol?.rol==='admin'||userRol?.rol==='rmc')&&(
                        <button onClick={async()=>{if(!window.confirm('Ștergeți?'))return;await supabase.from('propuneri').delete().eq('id',p.id);setPropuneri(prev=>prev.filter(x=>x.id!==p.id))}}
                          style={{background:'none',border:'none',color:'#e2e8f0',cursor:'pointer',fontSize:16,flexShrink:0}}
                          onMouseOver={e=>e.currentTarget.style.color='#dc2626'} onMouseOut={e=>e.currentTarget.style.color='#e2e8f0'}>🗑️</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL INSTRUIRE */}
      {showInstruire&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowInstruire(false)}>
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header" style={{background:'#1a56db',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>📚 Instruire nouă</div></div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {['interna','externa'].map(t=>(
                  <button key={t} type="button" onClick={()=>setInstrForm(p=>({...p,_tip:t}))}
                    style={{padding:'12px',borderRadius:12,border:`2px solid ${instrForm._tip===t?'#1a56db':'#e2e8f0'}`,background:instrForm._tip===t?'#eff6ff':'white',color:instrForm._tip===t?'#1e40af':'#64748b',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                    {t==='interna'?'🏥 Internă':'🌍 Externă'}
                  </button>
                ))}
              </div>
              <div><label className="form-label">Tema *</label><input type="text" className="form-control" value={instrForm.tema} onChange={e=>setInstrForm(p=>({...p,tema:e.target.value}))} /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div><label className="form-label">Data *</label><input type="date" className="form-control" value={instrForm.data} onChange={e=>setInstrForm(p=>({...p,data:e.target.value}))} /></div>
                <div><label className="form-label">Durata (ore)</label><input type="number" step="0.5" className="form-control" value={instrForm.durata} onChange={e=>setInstrForm(p=>({...p,durata:e.target.value}))} /></div>
              </div>
              <div><label className="form-label">Trainer / Instituție</label><input type="text" className="form-control" value={instrForm.trainer} onChange={e=>setInstrForm(p=>({...p,trainer:e.target.value}))} /></div>
              <div>
                <label className="form-label">Participanți</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
                  {PERSONAL_LIST.map(p=>(
                    <label key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`2px solid ${instrForm.participanti.includes(p.id)?p.color:'#e2e8f0'}`,background:instrForm.participanti.includes(p.id)?p.light:'white',cursor:'pointer'}}>
                      <input type="checkbox" checked={instrForm.participanti.includes(p.id)} onChange={e=>setInstrForm(prev=>({...prev,participanti:e.target.checked?[...prev.participanti,p.id]:prev.participanti.filter(x=>x!==p.id)}))} style={{display:'none'}} />
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
            <div className="modal-header" style={{background:'#475569',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>🔄 Plan de substituție</div></div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label className="form-label">Titular *</label>
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
                <textarea className="form-control" rows={3} value={substForm.activitati} onChange={e=>setSubstForm(p=>({...p,activitati:e.target.value}))} style={{resize:'none'}} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowSubst(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveSubstitutie} disabled={saving}>{saving?'...':'Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROPUNERE */}
      {showPropunere&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowPropunere(false)}>
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-header" style={{background:'#1a56db',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>💬 Propunere / Sugestie / Opinie</div></div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label className="form-label">Categorie</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[{v:'sugestie',l:'💡 Sugestie',c:'#1e40af',bg:'#eff6ff'},{v:'opinie',l:'💭 Opinie',c:'#6d28d9',bg:'#f5f3ff'},{v:'propunere',l:'📋 Propunere',c:'#166534',bg:'#f0fdf4'}].map(cat=>(
                    <button key={cat.v} type="button" onClick={()=>setPropForm(p=>({...p,categorie:cat.v}))}
                      style={{padding:'10px',borderRadius:10,border:`2px solid ${propForm.categorie===cat.v?cat.c:'#e2e8f0'}`,background:propForm.categorie===cat.v?cat.bg:'white',color:propForm.categorie===cat.v?cat.c:'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                      {cat.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Conținut *</label>
                <textarea className="form-control" rows={5} value={propForm.text} onChange={e=>setPropForm(p=>({...p,text:e.target.value}))} placeholder="Descrieți propunerea, sugestia sau opinia dvs..." style={{resize:'none'}} />
              </div>
              <div className="alert alert-info" style={{fontSize:12}}>ℹ Propunerea va fi înregistrată cu numele dvs. și prezentată conducerii la sfârșitul lunii.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowPropunere(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={savePropunere} disabled={saving}>{saving?'...':'Trimite'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RAPORT */}
      {showRaport&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowRaport(false)}>
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-header" style={{background:'#1a56db',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>📊 Raport lunar PG-6.2/R-01</div></div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label className="form-label">Luna</label>
                <select className="form-control" value={rapLuna} onChange={e=>setRapLuna(e.target.value)}>
                  {luniPropuneri.length===0?<option value={todayStr().slice(0,7)}>{todayStr().slice(0,7)}</option>:luniPropuneri.map(l=><option key={l} value={l}>{l} · {propuneri.filter(p=>p.data?.startsWith(l)).length} propuneri</option>)}
                </select>
              </div>
              <div style={{background:'#f8fafc',borderRadius:12,padding:16,fontSize:13}}>
                <div style={{fontWeight:600,marginBottom:8}}>Sumar {rapLuna}:</div>
                {['sugestie','opinie','propunere'].map(cat=>{
                  const cnt=propuneri.filter(p=>p.data?.startsWith(rapLuna)&&p.categorie===cat).length
                  return cnt>0?<div key={cat} style={{color:'#475569',marginBottom:4}}>• {cat.charAt(0).toUpperCase()+cat.slice(1)}: <strong>{cnt}</strong></div>:null
                })}
                {propuneri.filter(p=>p.data?.startsWith(rapLuna)).length===0&&<div style={{color:'#94a3b8'}}>Nicio propunere în această lună.</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowRaport(false)}>Închide</button>
              <button className="btn btn-primary" onClick={()=>genRaportPropuneri(rapLuna)}>🖨️ Printează R-01</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
