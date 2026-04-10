import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SALI = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 1A']
const PERSONAL_IDS = ['rotari-ion', 'croitoru-tatiana', 'jentimir-valeria', 'andrian-maria', 'antropov-marina']
const DOCS_OBL = ['CV','CONTRACT','FISA_POST','BULETIN','DIPLOMA','CERTIFICAT_SPEC','AUTORIZATIE','FISA_MEDICALA','VACCIN','FORMARE_INIT','EVAL_COMPETENTA','FORMARE_CONTINUA','BIOSIGURANTA','SECURITATE','ACORD_CONF','ACORD_PRELUCRARE']

function todayStr() { return new Date().toISOString().slice(0, 10) }
function getMonday() {
  const d = new Date(); const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().slice(0, 10)
}
function isWorkday() { const d = new Date().getDay(); return d >= 1 && d <= 5 }
function daysUntil(d) { if (!d) return 9999; return Math.ceil((new Date(d) - new Date()) / 86400000) }

export default function Dashboard({ onNavigate, moldacData, onMoldacChange }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showMoldacEdit, setShowMoldacEdit] = useState(false)
  const [moldacInput, setMoldacInput] = useState(moldacData || '2025-05-01')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const today = todayStr()
    const luna = today.slice(0, 7)
    const monday = getMonday()
    const hour = new Date().getHours()

    const [docs, dosare, iqc, nc, metro, stoc, temp, uv, cur, eqaRez] = await Promise.all([
      supabase.from('docs').select('id,cod,titlu,tip,status,fisier'),
      supabase.from('dosar_data').select('personal_id,cod'),
      supabase.from('iqc_data').select('id,data,grupa,srv_cod,rezultat,tip').order('data', { ascending: false }).limit(200),
      supabase.from('nc_data').select('id,cod,data,status,descriere,actiune_corectiva,tip').order('data', { ascending: false }),
      supabase.from('metro_data').select('id,echipament,data_sc,tip'),
      supabase.from('stoc_data').select('id,cod,den,cantitate,stoc_min,expirare'),
      supabase.from('temp_data').select('data,sala').gte('data', today),
      supabase.from('uv_data').select('data,sala,interval').gte('data', today),
      supabase.from('curatenie_data').select('data_ef,sala').gte('data_ef', monday),
      supabase.from('eqa_rez').select('id,eval,ac'),
    ])

    setData({
      docs: docs.data || [],
      dosare: dosare.data || [],
      iqc: iqc.data || [],
      nc: nc.data || [],
      metro: metro.data || [],
      stoc: stoc.data || [],
      temp: temp.data || [],
      uv: uv.data || [],
      cur: cur.data || [],
      eqaRez: eqaRez.data || [],
      today, luna, monday, hour,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-96">
      <div className="text-4xl mb-4">🔬</div>
      <div className="text-gray-500">Se calculează scorurile...</div>
    </div>
  )

  const { docs, dosare, iqc, nc, metro, stoc, temp, uv, cur, eqaRez, today, luna, hour } = data

  // ── CALCULE SCORURI ────────────────────────────────────────

  // 1. DOCUMENTE
  const docsExistente = docs.filter(d => d.status === 'existent')
  const docsCuPDF = docsExistente.filter(d => d.fisier)
  const docsScore = docsExistente.length ? Math.round(docsCuPDF.length / docsExistente.length * 100) : 0

  // 2. PERSONAL
  const dosarePerPers = {}
  PERSONAL_IDS.forEach(id => dosarePerPers[id] = [])
  dosare.forEach(d => { if (dosarePerPers[d.personal_id]) dosarePerPers[d.personal_id].push(d.cod) })
  const persComplete = PERSONAL_IDS.filter(id => DOCS_OBL.every(cod => dosarePerPers[id].includes(cod))).length
  const persScore = Math.round(persComplete / PERSONAL_IDS.length * 100)

  // 3. IQC
  const iqcLuna = iqc.filter(d => d.data?.startsWith(luna))
  const iqcOk = iqcLuna.filter(d => d.rezultat === 'acceptat').length
  const iqcScore = iqcLuna.length ? Math.round(iqcOk / iqcLuna.length * 100) : 100

  // 4. REGISTRE
  const tempAzi = SALI.filter(s => temp.some(t => t.sala === s)).length
  const uvAzi = SALI.filter(s => {
    const has8 = uv.some(u => u.sala === s && u.interval === '08:00-08:30')
    const has14 = uv.some(u => u.sala === s && u.interval === '14:00-14:30')
    if (hour >= 15) return has8 && has14
    if (hour >= 9) return has8
    return true
  }).length
  const curSapt = SALI.filter(s => cur.some(c => c.sala === s)).length
  const regScore = Math.round((tempAzi + uvAzi + curSapt) / (SALI.length * 3) * 100)

  const scores = [
    { id: 'documente', label: 'Documente SMC', icon: '📄', score: docsScore, sub: `${docsCuPDF.length}/${docsExistente.length} cu PDF`, nav: 'documente' },
    { id: 'personal', label: 'Personal', icon: '👤', score: persScore, sub: `${persComplete}/${PERSONAL_IDS.length} dosare complete`, nav: 'personal' },
    { id: 'iqc', label: 'IQC', icon: '🔬', score: iqcScore, sub: `${iqcOk}/${iqcLuna.length} acceptate luna curentă`, nav: 'calitate' },
    { id: 'registre', label: 'Registre', icon: '📋', score: regScore, sub: `Temp/UV/Curățenie azi`, nav: 'registre' },
  ]

  // ── ALERTE CRITICE ─────────────────────────────────────────
  const critice = []

  // NC >30 zile fără acțiune
  nc.filter(n => n.status !== 'inchis').forEach(n => {
    const days = Math.floor((new Date() - new Date(n.data)) / 86400000)
    if (days > 30) critice.push({
      icon: '⚠️', text: `NC deschisă ${days} zile: ${n.cod}`,
      sub: (n.descriere || '').slice(0, 60),
      nav: 'nc'
    })
  })

  // IQC respins fără NC
  const grupeRespinse = [...new Set(iqc.filter(d => d.rezultat === 'respins' && d.data === today).map(d => d.grupa))]
  grupeRespinse.forEach(g => {
    const hasNC = nc.some(n => n.data === today && (n.tip === 'iqc' || (n.descriere || '').includes(g)))
    if (!hasNC) critice.push({
      icon: '🔴', text: `IQC respins fără NC: Grupa ${g}`,
      sub: 'NC obligatorie — deschideți imediat',
      nav: 'nc', urgent: true
    })
  })

  // Metrologie expirată
  metro.filter(m => m.data_sc && daysUntil(m.data_sc) < 0).forEach(m => {
    critice.push({
      icon: '🔧', text: `Metrologie expirată: ${m.echipament?.split('(')[0]?.trim()}`,
      sub: `Scadentă la ${m.data_sc}`,
      nav: 'stocuri'
    })
  })

  // Kituri expirate
  stoc.filter(s => s.expirare && s.expirare < today).forEach(s => {
    critice.push({
      icon: '📦', text: `Kit expirat: ${s.den}`,
      sub: `Expirat la ${s.expirare}`,
      nav: 'stocuri'
    })
  })

  // Dosare incomplete
  PERSONAL_IDS.forEach((id, idx) => {
    const names = ['Rotari Ion','Croitoru Tatiana','Jentimir Valeria','Andrian Maria','Antropov Marina']
    const lipsesc = DOCS_OBL.filter(cod => !dosarePerPers[id].includes(cod)).length
    if (lipsesc > 0) critice.push({
      icon: '👤', text: `Dosar incomplet: ${names[idx]}`,
      sub: `${lipsesc} documente obligatorii lipsesc`,
      nav: 'personal'
    })
  })

  // Documente fără PDF
  docsExistente.filter(d => !d.fisier).forEach(d => {
    critice.push({
      icon: '📄', text: `Document fără PDF: ${d.cod}`,
      sub: d.titlu?.slice(0, 50),
      nav: 'documente'
    })
  })

  // ── ALERTE IMPORTANTE ──────────────────────────────────────
  const importante = []

  // Curățenie neefectuată săptămâna curentă
  if (isWorkday()) {
    SALI.forEach(s => {
      if (!cur.some(c => c.sala === s)) {
        importante.push({
          icon: '🧹', text: `Curățenie neefectuată: ${s}`,
          sub: 'Săptămâna curentă fără înregistrare',
          nav: 'registre'
        })
      }
    })
  }

  // Temperatură neintrodusă după ora 12
  if (isWorkday() && hour >= 12) {
    SALI.forEach(s => {
      if (!temp.some(t => t.sala === s)) {
        importante.push({
          icon: '🌡️', text: `Temperatură neintrodusă: ${s}`,
          sub: 'Nicio citire astăzi după ora 12:00',
          nav: 'registre'
        })
      }
    })
  }

  // UV neiradiată
  if (isWorkday()) {
    SALI.forEach(s => {
      const has8 = uv.some(u => u.sala === s && u.interval === '08:00-08:30')
      const has14 = uv.some(u => u.sala === s && u.interval === '14:00-14:30')
      if (hour >= 9 && !has8) importante.push({
        icon: '💡', text: `UV 08:00 neiradiată: ${s}`,
        sub: 'Intervalul 08:00-08:30 neînregistrat',
        nav: 'registre'
      })
      if (hour >= 15 && !has14) importante.push({
        icon: '💡', text: `UV 14:00 neiradiată: ${s}`,
        sub: 'Intervalul 14:00-14:30 neînregistrat',
        nav: 'registre'
      })
    })
  }

  // Stoc la minim
  stoc.filter(s => s.cantitate <= s.stoc_min && s.cantitate > 0).forEach(s => {
    importante.push({
      icon: '📦', text: `Stoc minim: ${s.den}`,
      sub: `${s.cantitate} kituri rămase (minim: ${s.stoc_min})`,
      nav: 'stocuri'
    })
  })

  // EQA nesatisfăcător fără AC
  eqaRez.filter(r => r.eval === 'nesatisfacator' && !r.ac).forEach(() => {
    importante.push({
      icon: '🌍', text: 'EQA nesatisfăcător fără acțiune corectivă',
      sub: 'Introduceți AC în modulul Calitate',
      nav: 'calitate'
    })
  })

  // ── MOLDAC ─────────────────────────────────────────────────
  const moldacDate = moldacData || '2025-05-01'
  const moldacDays = daysUntil(moldacDate)

  const scoreColor = s => s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626'
  const scoreBg = s => s >= 80 ? '#f0fdf4' : s >= 60 ? '#fffbeb' : '#fef2f2'
  const scoreBorder = s => s >= 80 ? '#bbf7d0' : s >= 60 ? '#fde68a' : '#fecaca'

  return (
    <div className="p-6 max-w-6xl">

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard SMC</h1>
          <p className="text-sm text-gray-500">Laborator Biologie Moleculară · {new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => loadAll()} style={{ border: '1px solid #e5e7eb', background: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
            ↻ Actualizează
          </button>
          <button onClick={() => setShowMoldacEdit(true)}
            style={{
              background: moldacDays <= 30 ? '#dc2626' : moldacDays <= 60 ? '#d97706' : '#1d4ed8',
              color: 'white', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none'
            }}>
            📅 MOLDAC: {moldacDays > 0 ? `${moldacDays} zile` : moldacDays === 0 ? 'AZI!' : `${Math.abs(moldacDays)}z în urmă`}
          </button>
        </div>
      </div>

      {/* ── SCORURI CATEGORII ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {scores.map(s => (
          <button key={s.id} onClick={() => onNavigate && onNavigate(s.nav)}
            style={{
              background: scoreBg(s.score), border: `1px solid ${scoreBorder(s.score)}`,
              borderRadius: 12, padding: 16, textAlign: 'left', cursor: 'pointer',
              transition: 'transform 0.1s', display: 'block', width: '100%'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <span style={{ fontSize: 26, fontWeight: 700, color: scoreColor(s.score) }}>{s.score}%</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{s.sub}</div>
            <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 4, height: 6 }}>
              <div style={{ width: s.score + '%', height: '100%', background: scoreColor(s.score), borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
          </button>
        ))}
      </div>

      {/* ── ALERTE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Critice */}
        <div style={{ background: 'white', border: '1px solid #fecaca', borderTop: '3px solid #dc2626', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#dc2626', fontSize: 14 }}>🔴 Alerte critice</span>
            <span style={{ background: '#dc2626', color: 'white', borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>{critice.length}</span>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {critice.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#16a34a', fontSize: 13 }}>✓ Nicio alertă critică</div>
            ) : critice.map((a, i) => (
              <button key={i} onClick={() => onNavigate && onNavigate(a.nav)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #fee2e2', cursor: 'pointer', background: a.urgent ? '#fff5f5' : 'white', display: 'flex', gap: 10, alignItems: 'flex-start', border: 'none', borderBottom: '1px solid #fee2e2' }}
                onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseOut={e => e.currentTarget.style.background = a.urgent ? '#fff5f5' : 'white'}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.sub}</div>
                </div>
                <span style={{ color: '#d1d5db', fontSize: 16, flexShrink: 0 }}>›</span>
              </button>
            ))}
          </div>
        </div>

        {/* Importante */}
        <div style={{ background: 'white', border: '1px solid #fde68a', borderTop: '3px solid #d97706', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #fef3c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#d97706', fontSize: 14 }}>🟡 Alerte importante</span>
            <span style={{ background: '#d97706', color: 'white', borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>{importante.length}</span>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {importante.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#16a34a', fontSize: 13 }}>✓ Nicio alertă importantă</div>
            ) : importante.map((a, i) => (
              <button key={i} onClick={() => onNavigate && onNavigate(a.nav)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 16px', cursor: 'pointer', background: 'white', display: 'flex', gap: 10, alignItems: 'flex-start', border: 'none', borderBottom: '1px solid #fef3c7' }}
                onMouseOver={e => e.currentTarget.style.background = '#fffbeb'}
                onMouseOut={e => e.currentTarget.style.background = 'white'}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.sub}</div>
                </div>
                <span style={{ color: '#d1d5db', fontSize: 16, flexShrink: 0 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATISTICI RAPIDE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {[
          { label: 'NC deschise', val: nc.filter(n => n.status !== 'inchis').length, color: '#dc2626' },
          { label: 'IQC luna', val: iqcLuna.length, color: '#2563eb' },
          { label: 'Kituri stoc', val: stoc.length, color: '#7c3aed' },
          { label: 'Metrologie OK', val: metro.filter(m => !m.data_sc || daysUntil(m.data_sc) >= 0).length, color: '#16a34a' },
          { label: 'Documente total', val: docs.length, color: '#0891b2' },
          { label: 'Personal', val: PERSONAL_IDS.length, color: '#d97706' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── MODAL MOLDAC ── */}
      {showMoldacEdit && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 360 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📅 Data vizitei MOLDAC</h2>
            </div>
            <div style={{ padding: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Data planificată audit MOLDAC
              </label>
              <input type="date" value={moldacInput} onChange={e => setMoldacInput(e.target.value)}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowMoldacEdit(false)}
                style={{ padding: '8px 16px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#6b7280' }}>
                Anulare
              </button>
              <button onClick={() => { onMoldacChange && onMoldacChange(moldacInput); setShowMoldacEdit(false) }}
                style={{ padding: '8px 16px', fontSize: 13, background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}