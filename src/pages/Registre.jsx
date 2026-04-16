import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SALI = ['Sala 1 (pre-PCR)', 'Sala 2 (pre-PCR)', 'Sala 3 (PCR)', 'Sala 1A (recepție)']
const SALI_SHORT = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 1A']

const FRIGIDERE = [
  { id: 'frg-1', den: 'Frigider GN 700.00 NMV (OZTI)', sn: '791907NMV00250007', tip: 'frigider',   temp_min: 2,   temp_max: 8  },
  { id: 'frg-2', den: 'Frigider CM105S',                sn: 'A596690320',       tip: 'frigider',   temp_min: 2,   temp_max: 8  },
  { id: 'con-1', den: 'Congelator Tefcold UF50GCP',     sn: '0012',             tip: 'congelator', temp_min: -25, temp_max: -18 },
  { id: 'con-2', den: 'Congelator GN 700.00 LMV (OZTI)',sn: '791907LMV00250008',tip: 'congelator', temp_min: -25, temp_max: -18 },
]

const PERSONAL = ['Rotari Ion','Croitoru Tatiana','Jentimir Valeria','Andrian Maria','Antropov Marina']
const TEMP_MIN = 20, TEMP_MAX = 25, UMID_MIN = 30, UMID_MAX = 50

// ── ECHIPAMENTE COMPLETE (din lista de inventar) ──────────────────────────
const HOTE = [
  { id: 'hota-U5379', den: 'Hotă flux laminar Safemate EZ1.8 (Bioair)', sn: 'U5379',           inv: 'ECHMED21326', sala: 'Sala 1' },
  { id: 'hota-U5380', den: 'Hotă flux laminar Safemate EZ1.8 (Bioair)', sn: 'U5380',           inv: 'ECHMED21325', sala: 'Sala 2' },
  { id: 'hota-99292', den: 'Hotă flux laminar Laminar-S (LamSystems)',  sn: '221.150.99.292',  inv: 'ECHMED137',   sala: 'Sala 3' },
  { id: 'hota-00108', den: 'Hotă flux laminar Laminar-S (LamSystems)',  sn: '221.150.00.108',  inv: 'ECHMED898',   sala: 'Sala 1A'},
]

const AMPLIFICATOARE = [
  { id: 'amp-rotor',    den: 'Amplificator Rotor-Gene Q6 (QIAGEN)',                     sn: 'R1016141',         inv: 'ECHMED159',   tip: 'Real-Time PCR' },
  { id: 'amp-A5I842',   den: 'Amplificator DTprime 5M1 (DNA-Tehnology)',                 sn: 'A5I842',           inv: 'ECHMED21320', tip: 'Real-Time PCR' },
  { id: 'amp-A5JN90',   den: 'Amplificator DTprime 5M1 (DNA-Tehnology)',                 sn: 'A5JN90',           inv: 'ECHMED24229', tip: 'Real-Time PCR' },
  { id: 'amp-A5J776',   den: 'Amplificator DTprime 5M1 (DNA-Tehnology)',                 sn: 'A5J776',           inv: 'ECHMED22156', tip: 'Real-Time PCR' },
  { id: 'amp-R5N637',   den: 'Amplificator DTprime II 5M1 (DNA-Tehnology)',               sn: 'R5N637',           inv: 'ECHMED26875', tip: 'Real-Time PCR' },
  { id: 'amp-QS5',      den: 'Amplificator QuantStudio 5 (ThermoFisher)',                sn: '272526064',        inv: 'ECHMED21335', tip: 'Real-Time PCR' },
  { id: 'amp-simpli',   den: 'Amplificator SimpliAmp Thermal Cycler (ThermoFisher)',     sn: '2280019044697',    inv: 'ECHMED994',   tip: 'Endpoint PCR'  },
  { id: 'amp-genexp',   den: 'Sistem GeneXpert XVI (Cepheid)',                           sn: '110009739',        inv: 'ECHMED24401', tip: 'RT-PCR automat'},
  { id: 'amp-seqst',    den: 'Analizator Genetic SeqStudio (ThermoFisher)',              sn: '232001183',        inv: 'ECHMED989',   tip: 'Secvențiere'   },
  { id: 'amp-ionS5',    den: 'Sistem secvențiere Ion GeneStudio S5 (ThermoFisher)',      sn: '2774919020333',    inv: 'ECHMED990',   tip: 'NGS'           },
]

const CENTRIFUGE = [
  { id: 'cen-0003924', den: 'Centrifugă MIKRO 200R (Hettich)',     sn: '0003924-04-00', inv: 'ECHMED892'   },
  { id: 'cen-0001467', den: 'Centrifugă MIKRO 220 (Hettich)',      sn: '0001467-10',    inv: 'ECHMED24374' },
  { id: 'cen-0000802', den: 'Centrifugă MIKRO 220 (Hettich)',      sn: '0000802-09',    inv: 'ECHMED958'   },
  { id: 'cen-0002431', den: 'Centrifugă MIKRO 185 (Hettich)',      sn: '0002431-02',    inv: 'ECHMED21577' },
  { id: 'cen-0038501', den: 'Centrifugă EBA 200 (Hettich)',        sn: '0038501-06',    inv: 'ECHMED25211' },
]

const VORTEXURI = [
  { id: 'vor-FV2400a', den: 'Mini Centrifugă Vortex Microspin FV-2400 (Biosan)',     sn: '01020118010011', inv: 'ECHMED140'   },
  { id: 'vor-FV2400b', den: 'Mini Centrifugă Vortex Microspin FV-2400 (Biosan)',     sn: '01020120122927', inv: 'ECHMED21515' },
  { id: 'vor-FV2400c', den: 'Mini Centrifugă Vortex Microspin FV-2400 (Biosan)',     sn: '01020118050279', inv: 'ECHMED1032'  },
  { id: 'vor-FV2400d', den: 'Mini Centrifugă Vortex Microspin FV-2400 (Biosan)',     sn: '01020120122917', inv: 'ECHMED21578' },
  { id: 'vor-FVL240a', den: 'Mini Centrifugă Vortex Combi-Spin FVL-2400N (Biosan)', sn: '01020220010025', inv: 'ECHMED20079' },
  { id: 'vor-FVL240b', den: 'Mini Centrifugă Vortex Combi-Spin FVL-2400N (Biosan)', sn: '01020220010009', inv: 'ECHMED20080' },
]

// Toate echipamentele pentru mentenanță preventivă
const ECH_MENTENTA = [
  ...AMPLIFICATOARE,
  ...HOTE,
  ...CENTRIFUGE,
  ...VORTEXURI,
]

const TABS = [
  { id: 'temperatura',  icon: '🌡️', label: 'Temperatură încăperi',     cod: 'PG-6.3/F-01', color: '#1a56db' },
  { id: 'frigidere',    icon: '❄️',  label: 'Frigidere & Congelatoare', cod: 'PG-6.3/F-02', color: '#0891b2' },
  { id: 'uv',           icon: '💡', label: 'Lampă UV',                  cod: 'F-501/e',     color: '#7c3aed' },
  { id: 'curatenie',    icon: '🧹', label: 'Curățenie generală',        cod: 'F-502/e',     color: '#16a34a' },
  { id: 'frig_cur',     icon: '🧊', label: 'Curățenie frigider',        cod: 'PG-6.3/F-05', color: '#0891b2' },
  { id: 'mediu',        icon: '📊', label: 'Condiții mediu',            cod: 'PG-6.3/F-04', color: '#d97706' },
  { id: 'neautorizati', icon: '🚫', label: 'Persoane neautorizate',     cod: 'PG-6.3/R-01', color: '#dc2626' },
  { id: 'deseuri',      icon: '🗑️', label: 'Deșeuri biologice',        cod: '18.01.03',    color: '#475569' },
  { id: 'mentenanta',   icon: '🔧', label: 'Mentenanță preventivă',    cod: 'PG-6.3',      color: '#7c3aed' },
  { id: 'lucru_ech',    icon: '📋', label: 'Evidență lucru echipamente',cod: 'PG-6.3/R-02', color: '#0891b2' },
  { id: 'bioingineri',  icon: '👨‍🔧', label: 'Chemări bioingineri',      cod: 'PG-6.3/R-03', color: '#16a34a' },
  { id: 'instructiuni', icon: '📁', label: 'Instrucțiuni echipament',   cod: 'PG-6.5',      color: '#475569' },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }
function nowTime()  { return new Date().toTimeString().slice(0, 5) }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ro-RO') }

// ── MODUL CURĂȚENIE — 3 sub-tab-uri ─────────────────────────
function CuratenieModule({ solutii, setSolutii, curData, setCurData, today, SALI, SALI_SHORT, PERSONAL }) {
  const [subTab, setSubTab] = useState('zilnica')
  const [saving, setSaving] = useState(false)

  // Zilnică state
  const [zilnicaData, setZilnicaData] = useState([])
  const [showZilnica, setShowZilnica] = useState(false)
  const [zilnicaForm, setZilnicaForm] = useState({ sala: SALI[0], activitate: '', solutie: '', introdus_de: PERSONAL[0] })

  // Săptămânală state
  const [saptData, setSaptData] = useState([])
  const [showSapt, setShowSapt] = useState(false)
  const [saptForm, setSaptForm] = useState({ activitati: '', solutie: '', introdus_de: PERSONAL[0], supervizat_de: '' })

  // F-502/e state
  const [f502Data, setF502Data] = useState([])
  const [showF502, setShowF502] = useState(false)
  const [f502Form, setF502Form] = useState({ sala: SALI[0], solutie: '', concentratie: '', timp_actiune: '', suprafata: '', efectuat_de: PERSONAL[0], supervizat_de: '', obs: '' })

  // Soluții
  const [showSol, setShowSol] = useState(false)
  const [nouaSol, setNouaSol] = useState({ den: '', concentratie: '', producator: '' })

  function todayStr() { return new Date().toISOString().slice(0, 10) }
  function nowTime() { return new Date().toTimeString().slice(0, 5) }
  function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('ro-RO') }
  function isMonday() { return new Date().getDay() === 1 }

  useEffect(() => { loadCuratenie() }, [])

  // Alertă zilnică
  useEffect(() => {
    const ora = new Date().getHours()
    if (ora >= 7 && ora <= 9) {
      const key = 'alert_cur_' + todayStr()
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1')
        setTimeout(() => alert('⏰ Reminder zilnic!\nVerificați și introduceți înregistrările de curățenie ale femeii de serviciu:\n• 07:00 — Curățarea și dezinfectarea suprafețelor\n• 07:10 — Curățenie umedă\nSau introduceți-le acum dacă nu sunt.'), 1500)
      }
    }
    if (isMonday()) {
      const key = 'alert_sapt_' + todayStr()
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1')
        setTimeout(() => alert('📅 Luni — Curățenie generală săptămânală!\nVerificați dacă femeia de serviciu a efectuat curățenia săptămânală (geamuri, pereți, zone acces limitat) și introduceți în registru.'), 3000)
      }
    }
  }, [])

  async function loadCuratenie() {
    const [z, s, f] = await Promise.all([
      supabase.from('curatenie_zilnica').select('*').order('ts', { ascending: false }).limit(300),
      supabase.from('curatenie_sapt').select('*').order('ts', { ascending: false }).limit(100),
      supabase.from('curatenie_f502').select('*').order('ts', { ascending: false }).limit(200),
    ])
    setZilnicaData(z.data || [])
    setSaptData(s.data || [])
    setF502Data(f.data || [])
  }

  async function saveZilnica() {
    if (!zilnicaForm.activitate) { alert('Selectați activitatea!'); return }
    setSaving(true)
    const rec = { id: 'ZIL-' + Date.now(), data: todayStr(), ora: nowTime(), sala: zilnicaForm.sala, activitate: zilnicaForm.activitate, solutie: zilnicaForm.solutie, introdus_de: zilnicaForm.introdus_de, ts: new Date().toISOString() }
    const { error } = await supabase.from('curatenie_zilnica').insert(rec)
    if (!error) { setZilnicaData(prev => [rec, ...prev]); setShowZilnica(false); setZilnicaForm(p => ({ ...p, activitate: '', solutie: '' })) }
    else alert('Eroare: ' + error.message)
    setSaving(false)
  }

  async function saveSapt() {
    if (!saptForm.activitati) { alert('Selectați activitățile!'); return }
    setSaving(true)
    const rec = { id: 'SAPT-' + Date.now(), data: todayStr(), activitati: saptForm.activitati, solutie: saptForm.solutie, introdus_de: saptForm.introdus_de, supervizat_de: saptForm.supervizat_de, supervizat_la: saptForm.supervizat_de ? todayStr() : null, ts: new Date().toISOString() }
    const { error } = await supabase.from('curatenie_sapt').insert(rec)
    if (!error) { setSaptData(prev => [rec, ...prev]); setShowSapt(false); setSaptForm(p => ({ ...p, activitati: '', solutie: '', supervizat_de: '' })) }
    else alert('Eroare: ' + error.message)
    setSaving(false)
  }

  async function supervizSapt(id) {
    await supabase.from('curatenie_sapt').update({ supervizat_de: PERSONAL[0], supervizat_la: todayStr() }).eq('id', id)
    setSaptData(prev => prev.map(s => s.id === id ? { ...s, supervizat_de: PERSONAL[0], supervizat_la: todayStr() } : s))
  }

  async function saveF502() {
    if (!f502Form.sala || !f502Form.solutie || !f502Form.efectuat_de) { alert('Completați câmpurile obligatorii!'); return }
    setSaving(true)
    const rec = { id: 'F502-' + Date.now(), data: todayStr(), ora: nowTime(), ...f502Form, suprafata: f502Form.suprafata ? parseFloat(f502Form.suprafata) : null, ts: new Date().toISOString() }
    const { error } = await supabase.from('curatenie_f502').insert(rec)
    if (!error) { setF502Data(prev => [rec, ...prev]); setShowF502(false); setF502Form(p => ({ ...p, solutie: '', concentratie: '', timp_actiune: '', suprafata: '', supervizat_de: '', obs: '' })) }
    else alert('Eroare: ' + error.message)
    setSaving(false)
  }

  async function supervizF502(id) {
    await supabase.from('curatenie_f502').update({ supervizat_de: PERSONAL[0] }).eq('id', id)
    setF502Data(prev => prev.map(f => f.id === id ? { ...f, supervizat_de: PERSONAL[0] } : f))
  }

  async function addSolutie() {
    if (!nouaSol.den.trim()) { alert('Introduceți denumirea!'); return }
    const rec = { id: 'SOL-' + Date.now(), ...nouaSol, ts: new Date().toISOString() }
    await supabase.from('solutii').insert(rec)
    setSolutii(prev => [rec, ...prev])
    setNouaSol({ den: '', concentratie: '', producator: '' })
  }

  // Status săptămâna curentă
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); startOfWeek.setHours(0,0,0,0)
  const saptAceasta = saptData.some(s => new Date(s.data) >= startOfWeek)
  const zilnicaAziCount = zilnicaData.filter(z => z.data === today).length

  return (
    <div>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#166534', fontWeight: 500 }}>
        📋 Curățenie generală · F-502/e MS RM nr.630/2016 · PG-6.3 PO-AM.01
      </div>

      {/* Status rapid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: zilnicaAziCount >= 3 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${zilnicaAziCount >= 3 ? '#bbf7d0' : '#fecaca'}`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: zilnicaAziCount >= 3 ? '#16a34a' : '#dc2626' }}>{zilnicaAziCount}/3</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4 }}>ÎNREG. ZILNICE AZI</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>07:00 · 13:30 · 16:00</div>
        </div>
        <div style={{ background: saptAceasta ? '#f0fdf4' : '#fef2f2', border: `1px solid ${saptAceasta ? '#bbf7d0' : '#fecaca'}`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: saptAceasta ? '#16a34a' : '#dc2626' }}>{saptAceasta ? '✓' : '✗'}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4 }}>CURĂȚENIE SĂPTĂMÂNALĂ</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Săptămâna curentă</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>{f502Data.filter(f => f.data?.startsWith(today.slice(0, 7))).length}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4 }}>F-502/e LUNA CURENTĂ</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Personal laborator</div>
        </div>
      </div>

      {/* Sub-tab-uri */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { id: 'zilnica', icon: '🧹', label: 'Zilnică', desc: 'Femeie serviciu · 07:00 / 13:30 / 16:00', color: '#16a34a' },
          { id: 'saptamanala', icon: '📅', label: 'Săptămânală', desc: 'Femeie serviciu · Luni · Supervizare', color: '#d97706' },
          { id: 'f502', icon: '📋', label: 'F-502/e Oficial', desc: 'Personal laborator · Registru tipizat', color: '#1a56db' },
        ].map(t => {
          const isAct = subTab === t.id
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              style={{ background: isAct ? t.color : 'white', border: `2px solid ${isAct ? t.color : '#e2e8f0'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', boxShadow: isAct ? `0 6px 20px ${t.color}40` : '0 1px 3px rgba(0,0,0,0.06)', transform: isAct ? 'translateY(-2px)' : 'none' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isAct ? 'white' : '#1e293b', marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: isAct ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>{t.desc}</div>
            </button>
          )
        })}
      </div>

      {/* ── ZILNICĂ ── */}
      {subTab === 'zilnica' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Curățenie zilnică — Femeie serviciu</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Introduceți datele de pe foaia fizică</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setShowSol(true)}>🧴 Soluții ({solutii.length})</button>
              <button className="btn" style={{ background: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }} onClick={() => setShowZilnica(true)}>+ Înregistrare</button>
            </div>
          </div>
          <div className="table-wrapper">
            {zilnicaData.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 36, marginBottom: 12 }}>🧹</div><div>Nicio înregistrare</div></div>
            ) : (
              <table>
                <thead><tr><th>#</th><th>Data</th><th>Ora</th><th>Sala</th><th>Activitatea</th><th>Soluție</th><th>Introdus de</th></tr></thead>
                <tbody>
                  {zilnicaData.map((d, i, a) => (
                    <tr key={d.id} style={{ background: d.data === today ? '#f0fdf4' : '' }}>
                      <td style={{ fontWeight: 700, color: '#94a3b8' }}>{a.length - i}</td>
                      <td style={{ fontWeight: d.data === today ? 700 : 400 }}>{fmtDate(d.data)}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#16a34a' }}>{d.ora}</td>
                      <td style={{ fontSize: 12 }}>{d.sala}</td>
                      <td style={{ fontSize: 12 }}>{d.activitate}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{d.solutie || '—'}</td>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{d.introdus_de}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── SĂPTĂMÂNALĂ ── */}
      {subTab === 'saptamanala' && (
        <div>
          {!saptAceasta && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
              ⚠ Curățenia generală săptămânală nu a fost înregistrată săptămâna aceasta!
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Curățenie săptămânală — Femeie serviciu</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Efectuată Luni · Supervizare obligatorie</div>
            </div>
            <button className="btn" style={{ background: '#d97706', color: 'white', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }} onClick={() => setShowSapt(true)}>+ Înregistrare</button>
          </div>
          <div className="table-wrapper">
            {saptData.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 36, marginBottom: 12 }}>📅</div><div>Nicio înregistrare</div></div>
            ) : (
              <table>
                <thead><tr><th>#</th><th>Data</th><th>Activități</th><th>Soluție</th><th>Introdus de</th><th>Supervizat</th></tr></thead>
                <tbody>
                  {saptData.map((d, i, a) => (
                    <tr key={d.id} style={{ background: new Date(d.data) >= startOfWeek ? '#fffbeb' : '' }}>
                      <td style={{ fontWeight: 700, color: '#94a3b8' }}>{a.length - i}</td>
                      <td style={{ fontWeight: 500 }}>{fmtDate(d.data)}</td>
                      <td style={{ fontSize: 12 }}>{d.activitati}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{d.solutie || '—'}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{d.introdus_de}</td>
                      <td>{d.supervizat_de ? <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>✓ {d.supervizat_de}</span> : <button onClick={() => supervizSapt(d.id)} style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#92400e' }}>Supervizează</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── F-502/e ── */}
      {subTab === 'f502' && (
        <div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1e40af', fontWeight: 500 }}>
            📋 Formular tipizat F-502/e · Aprobat MS RM nr.630/08.08.2016 · Efectuat de personalul laboratorului
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Registru curățenie generală și dezinfecție</div>
            <button className="btn btn-primary" onClick={() => setShowF502(true)}>+ Înregistrare F-502/e</button>
          </div>
          <div className="table-wrapper">
            {f502Data.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}><div style={{ fontSize: 36, marginBottom: 12 }}>📋</div><div>Nicio înregistrare</div></div>
            ) : (
              <table>
                <thead><tr><th>#</th><th>Data</th><th>Ora</th><th>Sala/Încăpere</th><th>Soluție dezinfectantă</th><th>Concentrație</th><th>Timp acțiune</th><th>Suprafața m²</th><th>Efectuat de</th><th>Supervizat</th></tr></thead>
                <tbody>
                  {f502Data.map((d, i, a) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 700, color: '#94a3b8' }}>{a.length - i}</td>
                      <td style={{ fontWeight: 500 }}>{fmtDate(d.data)}</td>
                      <td style={{ fontFamily: 'monospace' }}>{d.ora}</td>
                      <td style={{ fontWeight: 500 }}>{d.sala}</td>
                      <td style={{ fontWeight: 600, color: '#1a56db' }}>{d.solutie}</td>
                      <td style={{ color: '#64748b' }}>{d.concentratie || '—'}</td>
                      <td style={{ color: '#64748b' }}>{d.timp_actiune || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{d.suprafata ? `${d.suprafata} m²` : '—'}</td>
                      <td style={{ color: '#64748b' }}>{d.efectuat_de}</td>
                      <td>{d.supervizat_de ? <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>✓ {d.supervizat_de}</span> : <button onClick={() => supervizF502(d.id)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#475569' }}>Supervizează</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL ZILNICĂ */}
      {showZilnica && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowZilnica(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header" style={{ background: '#16a34a', borderRadius: '20px 20px 0 0' }}><div className="modal-title" style={{ color: 'white' }}>🧹 Curățenie zilnică</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Date de pe foaia femeii de serviciu</div></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="form-label">Sala</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {SALI.map((s, i) => <button key={s} type="button" onClick={() => setZilnicaForm(p => ({ ...p, sala: s }))} style={{ padding: '8px', borderRadius: 10, border: `2px solid ${zilnicaForm.sala === s ? '#16a34a' : '#e2e8f0'}`, background: zilnicaForm.sala === s ? '#f0fdf4' : 'white', color: zilnicaForm.sala === s ? '#166534' : '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{SALI_SHORT[i]}</button>)}
                </div>
              </div>
              <div><label className="form-label">Activitatea efectuată</label>
                <select className="form-control" value={zilnicaForm.activitate} onChange={e => setZilnicaForm(p => ({ ...p, activitate: e.target.value }))}>
                  <option value="">— selectați —</option>
                  <optgroup label="Dimineața (07:00)">
                    <option>07:00 — Curățarea și dezinfectarea suprafețelor</option>
                    <option>07:10 — Curățenie umedă cu apă curată</option>
                  </optgroup>
                  <optgroup label="Amiaza (13:30)">
                    <option>13:30 — Evacuare deșeuri menajere</option>
                    <option>13:30 — Curățenie umedă cu apă curată</option>
                    <option>13:30 — Dezinfectarea mânerelor ușilor</option>
                  </optgroup>
                  <optgroup label="După-amiaza (16:00)">
                    <option>16:00 — Evacuare deșeuri menajere</option>
                  </optgroup>
                </select>
              </div>
              <div><label className="form-label">Soluție dezinfectantă (opțional)</label>
                <select className="form-control" value={zilnicaForm.solutie} onChange={e => setZilnicaForm(p => ({ ...p, solutie: e.target.value }))}>
                  <option value="">— fără soluție —</option>
                  {solutii.map(s => <option key={s.id} value={s.den}>{s.den}{s.concentratie ? ` (${s.concentratie})` : ''}</option>)}
                </select>
              </div>
              <div><label className="form-label">Introdus de</label>
                <select className="form-control" value={zilnicaForm.introdus_de} onChange={e => setZilnicaForm(p => ({ ...p, introdus_de: e.target.value }))}>
                  {PERSONAL.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowZilnica(false)}>Anulare</button>
              <button className="btn" style={{ background: '#16a34a', color: 'white', padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }} onClick={saveZilnica} disabled={saving}>{saving ? '...' : '✓ Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SĂPTĂMÂNALĂ */}
      {showSapt && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSapt(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ background: '#d97706', borderRadius: '20px 20px 0 0' }}><div className="modal-title" style={{ color: 'white' }}>📅 Curățenie săptămânală</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Femeie serviciu · {fmtDate(todayStr())} · Supervizare obligatorie</div></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, fontSize: 12, color: '#92400e' }}>
                Toate sălile: Sala 1, Sala 2, Sala 3, Sala 1A
              </div>
              <div><label className="form-label">Activitățile efectuate</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['Spălarea geamurilor și pervazurilor', 'Spălarea pereților cu dezinfectant', 'Dezinfectarea scaunelor', 'Curățenie zone acces limitat (sub frigidere, mese)'].map(act => (
                    <label key={act} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px solid ${saptForm.activitati.includes(act) ? '#d97706' : '#e2e8f0'}`, background: saptForm.activitati.includes(act) ? '#fffbeb' : 'white', cursor: 'pointer', fontSize: 12 }}>
                      <input type="checkbox" checked={saptForm.activitati.includes(act)}
                        onChange={e => {
                          const arr = saptForm.activitati ? saptForm.activitati.split(', ').filter(Boolean) : []
                          const nou = e.target.checked ? [...arr, act] : arr.filter(a => a !== act)
                          setSaptForm(p => ({ ...p, activitati: nou.join(', ') }))
                        }} />
                      {act}
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="form-label">Soluție dezinfectantă</label>
                <select className="form-control" value={saptForm.solutie} onChange={e => setSaptForm(p => ({ ...p, solutie: e.target.value }))}>
                  <option value="">— selectați —</option>
                  {solutii.map(s => <option key={s.id} value={s.den}>{s.den}{s.concentratie ? ` (${s.concentratie})` : ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label className="form-label">Introdus de</label>
                  <select className="form-control" value={saptForm.introdus_de} onChange={e => setSaptForm(p => ({ ...p, introdus_de: e.target.value }))}>
                    {PERSONAL.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Supervizat de (opțional)</label>
                  <select className="form-control" value={saptForm.supervizat_de} onChange={e => setSaptForm(p => ({ ...p, supervizat_de: e.target.value }))}>
                    <option value="">— mai târziu —</option>
                    {PERSONAL.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowSapt(false)}>Anulare</button>
              <button className="btn" style={{ background: '#d97706', color: 'white', padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }} onClick={saveSapt} disabled={saving}>{saving ? '...' : '✓ Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL F-502/e */}
      {showF502 && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowF502(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header" style={{ background: '#1a56db', borderRadius: '20px 20px 0 0' }}><div className="modal-title" style={{ color: 'white' }}>📋 F-502/e Curățenie & Dezinfecție</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Formular tipizat MS RM nr.630/2016</div></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="form-label">Sala / Încăperea *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {SALI.map((s, i) => <button key={s} type="button" onClick={() => setF502Form(p => ({ ...p, sala: s }))} style={{ padding: '8px', borderRadius: 10, border: `2px solid ${f502Form.sala === s ? '#1a56db' : '#e2e8f0'}`, background: f502Form.sala === s ? '#eff6ff' : 'white', color: f502Form.sala === s ? '#1e40af' : '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{SALI_SHORT[i]}</button>)}
                </div>
              </div>
              <div><label className="form-label">Soluție dezinfectantă *</label>
                <select className="form-control" value={f502Form.solutie} onChange={e => setF502Form(p => ({ ...p, solutie: e.target.value }))}>
                  <option value="">— selectați —</option>
                  {solutii.map(s => <option key={s.id} value={s.den}>{s.den}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Concentrație (%)</label><input type="text" className="form-control" value={f502Form.concentratie} onChange={e => setF502Form(p => ({ ...p, concentratie: e.target.value }))} placeholder="ex. 1%" /></div>
                <div><label className="form-label">Timp acțiune (min)</label><input type="text" className="form-control" value={f502Form.timp_actiune} onChange={e => setF502Form(p => ({ ...p, timp_actiune: e.target.value }))} placeholder="ex. 30 min" /></div>
                <div><label className="form-label">Suprafața (m²)</label><input type="number" step="0.1" className="form-control" value={f502Form.suprafata} onChange={e => setF502Form(p => ({ ...p, suprafata: e.target.value }))} placeholder="ex. 25" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label className="form-label">Efectuat de *</label>
                  <select className="form-control" value={f502Form.efectuat_de} onChange={e => setF502Form(p => ({ ...p, efectuat_de: e.target.value }))}>
                    {PERSONAL.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="form-label">Supervizat de (opțional)</label>
                  <select className="form-control" value={f502Form.supervizat_de} onChange={e => setF502Form(p => ({ ...p, supervizat_de: e.target.value }))}>
                    <option value="">— mai târziu —</option>
                    {PERSONAL.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="form-label">Observații</label><input type="text" className="form-control" value={f502Form.obs} onChange={e => setF502Form(p => ({ ...p, obs: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowF502(false)}>Anulare</button>
              <button className="btn btn-primary" onClick={saveF502} disabled={saving}>{saving ? '...' : '✓ Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SOLUȚII */}
      {showSol && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSol(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header" style={{ background: '#16a34a', borderRadius: '20px 20px 0 0' }}><div className="modal-title" style={{ color: 'white' }}>🧴 Soluții dezinfectante</div></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {solutii.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.den} {s.concentratie && <span style={{ color: '#64748b', fontWeight: 400 }}>({s.concentratie})</span>}</div>
                    {s.producator && <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.producator}</div>}
                  </div>
                  <button onClick={async () => { await supabase.from('solutii').delete().eq('id', s.id); setSolutii(prev => prev.filter(x => x.id !== s.id)) }} style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                </div>
              ))}
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="text" className="form-control" value={nouaSol.den} onChange={e => setNouaSol(p => ({ ...p, den: e.target.value }))} placeholder="Denumire soluție" style={{ gridColumn: '1/-1' }} />
                <input type="text" className="form-control" value={nouaSol.concentratie} onChange={e => setNouaSol(p => ({ ...p, concentratie: e.target.value }))} placeholder="Concentrație" />
                <input type="text" className="form-control" value={nouaSol.producator} onChange={e => setNouaSol(p => ({ ...p, producator: e.target.value }))} placeholder="Producător" />
                <button className="btn btn-primary" style={{ gridColumn: '1/-1' }} onClick={addSolutie}>+ Adaugă soluție</button>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowSol(false)}>Închide</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Registre() {
  const [tab, setTab] = useState('temperatura')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [tempData, setTempData]       = useState([])
  const [frigData, setFrigData]       = useState([])
  const [uvData, setUvData]           = useState([])
  const [uvLampi, setUvLampi]         = useState({})
  const [curData, setCurData]         = useState([])
  const [frigCurData, setFrigCurData] = useState([])
  const [mediuData, setMediuData]     = useState([])
  const [neautData, setNeautData]     = useState([])
  const [deseuriData, setDeseuriData] = useState([])
  const [solutii, setSolutii]         = useState([])

  const [tempSala,   setTempSala]   = useState(SALI[0])
  const [frigSel,    setFrigSel]    = useState(FRIGIDERE[0].id)
  const [uvSala,     setUvSala]     = useState(SALI[0])
  const [curSala,    setCurSala]    = useState(SALI[0])
  const [frigCurSel, setFrigCurSel] = useState(FRIGIDERE[0].id)

  const [showTemp,    setShowTemp]    = useState(false)
  const [showFrig,    setShowFrig]    = useState(false)
  const [showUV,      setShowUV]      = useState(false)
  const [showUVCfg,   setShowUVCfg]   = useState(false)
  const [showCur,     setShowCur]     = useState(false)
  const [showFrigCur, setShowFrigCur] = useState(false)
  const [showMediu,   setShowMediu]   = useState(false)
  const [showNeaut,   setShowNeaut]   = useState(false)
  const [showDeseu,   setShowDeseu]   = useState(false)
  const [showRapDes,  setShowRapDes]  = useState(false)
  const [showSol,     setShowSol]     = useState(false)
  const [nouaSol,     setNouaSol]     = useState('')
  const [rapLuna,     setRapLuna]     = useState(todayStr().slice(0,7))

  // ── Mentenanță preventivă ──────────────────────────────────────────────
  const [mentData,     setMentData]     = useState([])
  const [showMent,     setShowMent]     = useState(false)
  const [mentEchSel,   setMentEchSel]   = useState('all')
  const [mentForm,     setMentForm]     = useState({ ech_id: ECH_MENTENTA[0].id, ech_den: ECH_MENTENTA[0].den, tip: 'zilnic', actiune: '', operator: PERSONAL[0], obs: '', pv_url: '' })
  const [mentUploadId, setMentUploadId] = useState(null)

  // ── Evidență lucru echipamente ─────────────────────────────────────────
  const [lucruData,    setLucruData]    = useState([])
  const [showLucru,    setShowLucru]    = useState(false)
  const [lucruEchSel,  setLucruEchSel]  = useState('all')
  const [lucruForm,    setLucruForm]    = useState({ ech_id: '', ech_den: '', ora_start: nowTime(), ora_stop: '', operator: PERSONAL[0], obs: '' })

  // ── Chemări bioingineri ────────────────────────────────────────────────
  const [bioData,      setBioData]      = useState([])
  const [showBio,      setShowBio]      = useState(false)
  const [bioForm,      setBioForm]      = useState({ data: todayStr(), ech_id: '', ech_den: '', problema: '', actiune: '', bioingineer: '', data_inchidere: '', pv_url: '', obs: '' })
  const [bioUploadId,  setBioUploadId]  = useState(null)

  // ── Instrucțiuni echipament ────────────────────────────────────────────
  const [instrData,    setInstrData]    = useState([])
  const [showInstr,    setShowInstr]    = useState(false)
  const [instrForm,    setInstrForm]    = useState({ ech_id: '', ech_den: '', tip_doc: 'IFU', limba: 'RO', obs: '' })
  const [instrUploadId,setInstrUploadId]= useState(null)

  const [tF, setTF] = useState({ sala: SALI[0], temp: '', umid: '', responsabil: PERSONAL[0] })
  const [fF, setFF] = useState({ frig_id: FRIGIDERE[0].id, temp: '', responsabil: PERSONAL[0] })
  const [uF, setUF] = useState({ sala: SALI[0], interval: '08:00-08:30', specialist: PERSONAL[0] })
  const [uCfgSala, setUCfgSala] = useState(SALI[0])
  const [uCfgOre,  setUCfgOre]  = useState('')
  const [cF, setCF] = useState({ sala: SALI[0], solutie: '', operator: PERSONAL[0], obs: '' })
  const [fcF, setFcF] = useState({ frig_id: FRIGIDERE[0].id, tip: 'curatenie', operator: PERSONAL[0], dezgheat: false, obs: '' })
  const [mF, setMF] = useState({ sala: SALI[0], temp: '', umid: '', presiune: '', obs: '', responsabil: PERSONAL[0] })
  const [nF, setNF] = useState({ nume: '', institutie: '', scop: '', ora_intrare: nowTime(), ora_iesire: '', insotit_de: PERSONAL[0] })
  const [dF, setDF] = useState({ cantitate: '', responsabil: PERSONAL[0] })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [t,fr,uv,ul,c,fc,m,n,d,s] = await Promise.all([
      supabase.from('temp_data').select('*').order('ts',{ascending:false}).limit(300),
      supabase.from('frig_data').select('*').order('ts',{ascending:false}).limit(300),
      supabase.from('uv_data').select('*').order('ts',{ascending:false}).limit(300),
      supabase.from('uv_lampi').select('*'),
      supabase.from('curatenie_data').select('*').order('ts',{ascending:false}).limit(200),
      supabase.from('frig_curatenie').select('*').order('ts',{ascending:false}).limit(200),
      supabase.from('mediu_data').select('*').order('ts',{ascending:false}).limit(200),
      supabase.from('neautorizati').select('*').order('ts',{ascending:false}).limit(200),
      supabase.from('deseuri_data').select('*').order('ts',{ascending:false}).limit(200),
      supabase.from('solutii').select('*').order('ts',{ascending:false}),
    ])
    setTempData(t.data||[]);setFrigData(fr.data||[]);setUvData(uv.data||[])
    const lo={};(ul.data||[]).forEach(l=>{lo[l.sala]=parseFloat(l.ore)||0});setUvLampi(lo)
    setCurData(c.data||[]);setFrigCurData(fc.data||[]);setMediuData(m.data||[])
    setNeautData(n.data||[]);setDeseuriData(d.data||[]);setSolutii(s.data||[])
    // Sesiunea 2
    const [mt,lu,bi,ins] = await Promise.all([
      supabase.from('mentenanta_data').select('*').order('ts',{ascending:false}).limit(500),
      supabase.from('lucru_echipamente').select('*').order('ts',{ascending:false}).limit(500),
      supabase.from('bioingineri_data').select('*').order('data',{ascending:false}).limit(200),
      supabase.from('instructiuni_data').select('*').order('ts',{ascending:false}).limit(200),
    ])
    setMentData(mt.data||[]);setLucruData(lu.data||[]);setBioData(bi.data||[]);setInstrData(ins.data||[])
    setLoading(false)
  }

  // ── FUNCȚII MENTENANȚĂ ──────────────────────────────────────────────────
  async function saveMent() {
    if(!mentForm.ech_id||!mentForm.actiune){alert('Completați echipamentul și acțiunea!');return}
    setSaving(true)
    const rec={id:'MENT-'+Date.now(),data:todayStr(),ora:nowTime(),...mentForm,ts:new Date().toISOString()}
    const{error}=await supabase.from('mentenanta_data').insert(rec)
    if(!error){setMentData(p=>[rec,...p]);setShowMent(false);setMentForm(p=>({...p,actiune:'',obs:'',pv_url:''}))}
    else alert('Eroare: '+error.message)
    setSaving(false)
  }

  async function uploadMentPV(id, file) {
    if(!file)return; setMentUploadId(id)
    const path=`mentenanta/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
    const{error}=await supabase.storage.from('documente').upload(path,file,{upsert:true})
    if(error){alert('Eroare upload: '+error.message);setMentUploadId(null);return}
    const{data}=supabase.storage.from('documente').getPublicUrl(path)
    await supabase.from('mentenanta_data').update({pv_url:data.publicUrl}).eq('id',id)
    setMentData(p=>p.map(m=>m.id===id?{...m,pv_url:data.publicUrl}:m))
    setMentUploadId(null)
  }

  // ── FUNCȚII LUCRU ECHIPAMENTE ───────────────────────────────────────────
  async function saveLucru() {
    if(!lucruForm.ech_id||!lucruForm.ora_start){alert('Selectați echipamentul!');return}
    setSaving(true)
    const rec={id:'LCR-'+Date.now(),data:todayStr(),...lucruForm,ts:new Date().toISOString()}
    const{error}=await supabase.from('lucru_echipamente').insert(rec)
    if(!error){setLucruData(p=>[rec,...p]);setShowLucru(false);setLucruForm(p=>({...p,ora_start:nowTime(),ora_stop:'',obs:''}))}
    else alert('Eroare: '+error.message)
    setSaving(false)
  }

  async function inchideLucru(id) {
    const ora=nowTime()
    await supabase.from('lucru_echipamente').update({ora_stop:ora}).eq('id',id)
    setLucruData(p=>p.map(l=>l.id===id?{...l,ora_stop:ora}:l))
  }

  // ── FUNCȚII BIOINGINERI ─────────────────────────────────────────────────
  async function saveBio() {
    if(!bioForm.ech_id||!bioForm.problema){alert('Completați echipamentul și problema!');return}
    setSaving(true)
    const rec={id:'BIO-'+Date.now(),...bioForm,status:'deschis',ts:new Date().toISOString()}
    const{error}=await supabase.from('bioingineri_data').insert(rec)
    if(!error){
      setBioData(p=>[rec,...p]);setShowBio(false)
      setBioForm(p=>({...p,ech_id:'',ech_den:'',problema:'',actiune:'',bioingineer:'',data_inchidere:'',pv_url:'',obs:''}))
      // Alertă +1zi
      const d1=new Date();d1.setDate(d1.getDate()+1)
      const key='bio_alert_'+rec.id;localStorage.setItem(key,d1.toISOString().slice(0,10))
    }
    else alert('Eroare: '+error.message)
    setSaving(false)
  }

  async function inchideBio(id, actiune, pv_url) {
    const updates={status:'inchis',actiune:actiune||'Rezolvat',data_inchidere:todayStr(),pv_url:pv_url||''}
    await supabase.from('bioingineri_data').update(updates).eq('id',id)
    setBioData(p=>p.map(b=>b.id===id?{...b,...updates}:b))
  }

  async function uploadBioPV(id, file) {
    if(!file)return; setBioUploadId(id)
    const path=`bioingineri/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
    const{error}=await supabase.storage.from('documente').upload(path,file,{upsert:true})
    if(error){alert('Eroare: '+error.message);setBioUploadId(null);return}
    const{data}=supabase.storage.from('documente').getPublicUrl(path)
    await supabase.from('bioingineri_data').update({pv_url:data.publicUrl}).eq('id',id)
    setBioData(p=>p.map(b=>b.id===id?{...b,pv_url:data.publicUrl}:b))
    setBioUploadId(null)
  }

  // ── FUNCȚII INSTRUCȚIUNI ────────────────────────────────────────────────
  async function uploadInstr(file, echId, echDen, tipDoc, limba, obs) {
    if(!file||!echId){alert('Selectați echipamentul și fișierul!');return}
    setInstrUploadId(echId)
    const path=`instructiuni/${echId}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
    const{error}=await supabase.storage.from('documente').upload(path,file,{upsert:true})
    if(error){alert('Eroare upload: '+error.message);setInstrUploadId(null);return}
    const{data}=supabase.storage.from('documente').getPublicUrl(path)
    const rec={id:'INS-'+Date.now(),ech_id:echId,ech_den:echDen,tip_doc:tipDoc,limba,obs,fisier_url:data.publicUrl,fisier_name:file.name,ts:new Date().toISOString()}
    await supabase.from('instructiuni_data').insert(rec)
    setInstrData(p=>[rec,...p])
    setInstrUploadId(null)
    setShowInstr(false)
  }

  async function saveTemp() {
    const temp=parseFloat(tF.temp),umid=parseFloat(tF.umid)
    if(isNaN(temp)||isNaN(umid)){alert('Introduceți temperatura și umiditatea!');return}
    setSaving(true)
    const rec={id:'TEMP-'+Date.now(),data:todayStr(),ora:nowTime(),sala:tF.sala,temp,umid,responsabil:tF.responsabil,ts:new Date().toISOString()}
    const{error}=await supabase.from('temp_data').insert(rec)
    if(!error){setTempData(p=>[rec,...p]);setShowTemp(false);setTF(p=>({...p,temp:'',umid:''}))
      const ok=temp>=TEMP_MIN&&temp<=TEMP_MAX&&umid>=UMID_MIN&&umid<=UMID_MAX
      if(!ok)alert(`⚠ Valori în afara limitelor!\n${temp<TEMP_MIN||temp>TEMP_MAX?`Temp: ${temp}°C (20–25°C)\n`:''}${umid<UMID_MIN||umid>UMID_MAX?`Umid: ${umid}% (30–50%)`:''}`)
    }
    setSaving(false)
  }

  async function saveFrig() {
    const temp=parseFloat(fF.temp);if(isNaN(temp)){alert('Introduceți temperatura!');return}
    const frig=FRIGIDERE.find(f=>f.id===fF.frig_id);setSaving(true)
    const rec={id:'FRIG-'+Date.now(),data:todayStr(),ora:nowTime(),frig_id:fF.frig_id,frig_den:frig?.den,temp,responsabil:fF.responsabil,ts:new Date().toISOString()}
    const{error}=await supabase.from('frig_data').insert(rec)
    if(!error){setFrigData(p=>[rec,...p]);setShowFrig(false);setFF(p=>({...p,temp:''}))
      const ok=temp>=frig.temp_min&&temp<=frig.temp_max
      if(!ok)alert(`⚠ Temperatură depășită!\n${frig.den}: ${temp}°C (${frig.temp_min}…${frig.temp_max}°C)`)
    }
    setSaving(false)
  }

  async function saveUV() {
    const dw=new Date().getDay();if(dw===0||dw===6){alert('UV doar Luni–Vineri!');return}
    setSaving(true)
    const ore=uvLampi[uF.sala]||0,oreDupa=Math.max(0,ore-0.5)
    const rec={id:'UV-'+Date.now(),data:todayStr(),interval:uF.interval,sala:uF.sala,specialist:uF.specialist,ore_inainte:ore,ore_dupa:oreDupa,ts:new Date().toISOString()}
    const{error}=await supabase.from('uv_data').insert(rec)
    if(!error){
      await supabase.from('uv_lampi').upsert({sala:uF.sala,ore:oreDupa,updated:new Date().toISOString()},{onConflict:'sala'})
      setUvData(p=>[rec,...p]);setUvLampi(p=>({...p,[uF.sala]:oreDupa}));setShowUV(false)
      if(oreDupa<100)alert(`⚠ ${uF.sala}: ${oreDupa.toFixed(1)}h rămase — schimbați becul!`)
    }
    setSaving(false)
  }

  async function saveUVCfg() {
    const ore=parseFloat(uCfgOre);if(isNaN(ore)||ore<0){alert('Introduceți orele!');return}
    await supabase.from('uv_lampi').upsert({sala:uCfgSala,ore,updated:new Date().toISOString()},{onConflict:'sala'})
    setUvLampi(p=>({...p,[uCfgSala]:ore}));setUCfgOre('');setShowUVCfg(false)
  }

  async function saveCur() {
    if(!cF.solutie){alert('Selectați soluția!');return};setSaving(true)
    const rec={id:'CUR-'+Date.now(),sala:cF.sala,data_ef:todayStr(),ora:nowTime(),solutie:cF.solutie,operator:cF.operator,obs:cF.obs,ts:new Date().toISOString()}
    const{error}=await supabase.from('curatenie_data').insert(rec)
    if(!error){setCurData(p=>[rec,...p]);setShowCur(false);setCF(p=>({...p,obs:''}))}
    setSaving(false)
  }

  async function supervizCur(id) {
    await supabase.from('curatenie_data').update({supervizat_la:todayStr(),supervizat_de:PERSONAL[0]}).eq('id',id)
    setCurData(p=>p.map(c=>c.id===id?{...c,supervizat_la:todayStr(),supervizat_de:PERSONAL[0]}:c))
  }

  async function saveFrigCur() {
    setSaving(true)
    const frig=FRIGIDERE.find(f=>f.id===fcF.frig_id)
    const rec={id:'FCUR-'+Date.now(),frig_id:fcF.frig_id,frig_den:frig?.den,tip:fcF.tip,data_ef:todayStr(),operator:fcF.operator,dezgheat:fcF.dezgheat,obs:fcF.obs,ts:new Date().toISOString()}
    const{error}=await supabase.from('frig_curatenie').insert(rec)
    if(!error){setFrigCurData(p=>[rec,...p]);setShowFrigCur(false)}
    setSaving(false)
  }

  async function supervizFrigCur(id) {
    await supabase.from('frig_curatenie').update({supervizat_la:todayStr(),supervizat_de:PERSONAL[0]}).eq('id',id)
    setFrigCurData(p=>p.map(c=>c.id===id?{...c,supervizat_la:todayStr(),supervizat_de:PERSONAL[0]}:c))
  }

  async function saveMediu() {
    const temp=parseFloat(mF.temp),umid=parseFloat(mF.umid)
    if(isNaN(temp)||isNaN(umid)){alert('Temperatura și umiditatea sunt obligatorii!');return}
    setSaving(true)
    const rec={id:'MED-'+Date.now(),data:todayStr(),ora:nowTime(),sala:mF.sala,temp,umid,presiune:mF.presiune?parseFloat(mF.presiune):null,obs:mF.obs,responsabil:mF.responsabil,ts:new Date().toISOString()}
    const{error}=await supabase.from('mediu_data').insert(rec)
    if(!error){setMediuData(p=>[rec,...p]);setShowMediu(false);setMF(p=>({...p,temp:'',umid:'',presiune:'',obs:''}))}
    setSaving(false)
  }

  async function saveNeaut() {
    if(!nF.nume.trim()){alert('Introduceți numele!');return};setSaving(true)
    const rec={id:'NEAU-'+Date.now(),data:todayStr(),...nF,ts:new Date().toISOString()}
    const{error}=await supabase.from('neautorizati').insert(rec)
    if(!error){setNeautData(p=>[rec,...p]);setShowNeaut(false);setNF({nume:'',institutie:'',scop:'',ora_intrare:nowTime(),ora_iesire:'',insotit_de:PERSONAL[0]})}
    setSaving(false)
  }

  async function closeNeaut(id) {
    const ora=nowTime()
    await supabase.from('neautorizati').update({ora_iesire:ora}).eq('id',id)
    setNeautData(p=>p.map(n=>n.id===id?{...n,ora_iesire:ora}:n))
  }

  async function saveDeseu() {
    const cant=parseFloat(dF.cantitate);if(!cant||cant<=0){alert('Introduceți cantitatea!');return}
    setSaving(true)
    const rec={id:'DES-'+Date.now(),data:todayStr(),ora:nowTime(),sectia:'Biologie Moleculară',cod:'18.01.03',cantitate:cant,responsabil:dF.responsabil,ts:new Date().toISOString()}
    const{error}=await supabase.from('deseuri_data').insert(rec)
    if(!error){setDeseuriData(p=>[rec,...p]);setShowDeseu(false);setDF(p=>({...p,cantitate:''}))}
    setSaving(false)
  }

  function genRapDeseu(luna) {
    const list=luna?deseuriData.filter(d=>d.data?.startsWith(luna)):deseuriData
    if(!list.length){alert('Nicio înregistrare');return}
    const total=list.reduce((s,d)=>s+(d.cantitate||0),0)
    const win=window.open('','_blank')
    win.document.write(`<html><head><title>Deseuri ${luna}</title>
    <style>body{font-family:Arial;margin:20mm;font-size:11px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:5px 8px}th{background:#f8fafc;font-weight:600}
    h2{color:#1a56db;font-size:14px;text-align:center}</style></head><body>
    <div style="text-align:center;border-bottom:2px solid #1a56db;padding-bottom:12px;margin-bottom:16px">
      <div style="font-size:11px;color:#64748b">Invitro Diagnostics SRL · Biologie Moleculară</div>
      <h2>REGISTRU EVIDENȚĂ DEȘEURI BIOLOGICE · Cod 18.01.03</h2>
      <div style="font-size:11px">Perioada: ${luna} · Total: ${total.toFixed(2)} kg</div>
    </div>
    <table><thead><tr><th>#</th><th>Data</th><th>Ora</th><th>Secția</th><th>Cod</th><th>Cantitate (kg)</th><th>Responsabil</th><th>Semnătură</th></tr></thead><tbody>
    ${list.map((d,i)=>`<tr><td>${i+1}</td><td>${fmtDate(d.data)}</td><td>${d.ora||'—'}</td><td>${d.sectia}</td><td style="font-family:monospace;font-weight:700;color:#dc2626">${d.cod}</td><td style="font-weight:700">${d.cantitate} kg</td><td>${d.responsabil}</td><td style="min-width:60px"></td></tr>`).join('')}
    <tr style="background:#fef2f2;font-weight:700"><td colspan="5" style="text-align:right">TOTAL:</td><td>${total.toFixed(2)} kg</td><td colspan="2"></td></tr>
    </tbody></table>
    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:60px">
      <div style="text-align:center"><div style="border-top:1px solid #374151;padding-top:8px;margin-top:40px;font-size:10px"><strong>Rotari Ion</strong><br>Șef laborator</div></div>
      <div style="text-align:center"><div style="border-top:1px solid #374151;padding-top:8px;margin-top:40px;font-size:10px"><strong>Croitoru Tatiana</strong><br>Responsabil MC</div></div>
    </div></body></html>`)
    win.document.close();setTimeout(()=>win.print(),500)
  }

  if(loading) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Se încarcă...</div>

  const today=todayStr()
  const tempAzi=SALI.filter(s=>tempData.some(t=>t.sala===s&&t.data===today))
  const uvAzi=SALI.filter(s=>uvData.some(u=>u.sala===s&&u.data===today))
  const totalDesLuna=deseuriData.filter(d=>d.data?.startsWith(today.slice(0,7))).reduce((s,d)=>s+(d.cantitate||0),0)

  const BtnTab=({t})=>{
    const a=tab===t.id
    return <button onClick={()=>setTab(t.id)} style={{background:a?t.color:'white',border:`2px solid ${a?t.color:'#e2e8f0'}`,borderRadius:14,padding:'14px 10px',cursor:'pointer',textAlign:'center',transition:'all 0.2s',boxShadow:a?`0 6px 20px ${t.color}40`:'0 1px 3px rgba(0,0,0,0.06)',transform:a?'translateY(-2px)':'none'}}>
      <div style={{fontSize:22,marginBottom:6}}>{t.icon}</div>
      <div style={{fontSize:12,fontWeight:700,color:a?'white':'#1e293b',marginBottom:2}}>{t.label}</div>
      <div style={{fontSize:9,color:a?'rgba(255,255,255,0.7)':'#94a3b8',fontFamily:'monospace'}}>{t.cod}</div>
    </button>
  }

  const Btn=(props)=><button {...props} style={{...props.style,fontFamily:'var(--font,Inter,sans-serif)'}}/>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Registre electronice</div>
          <div className="page-subtitle">ISO 15189:2023 §6.3 · MS RM · 8 registre active</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {SALI_SHORT.map((s,i)=>{
            const tOk=tempAzi.includes(SALI[i]),uOk=uvAzi.includes(SALI[i])
            return <div key={s} style={{textAlign:'center',background:tOk&&uOk?'#f0fdf4':'#fef2f2',border:`1px solid ${tOk&&uOk?'#bbf7d0':'#fecaca'}`,borderRadius:10,padding:'5px 10px',minWidth:58}}>
              <div style={{fontSize:10,fontWeight:700,color:'#475569'}}>{s}</div>
              <div style={{display:'flex',gap:2,justifyContent:'center',marginTop:3}}>
                <span style={{fontSize:12}}>{tOk?'🌡️✓':'🌡️✗'}</span>
                <span style={{fontSize:12}}>{uOk?'💡✓':'💡✗'}</span>
              </div>
            </div>
          })}
        </div>
      </div>

      <div style={{padding:'24px 32px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:28}}>
          {TABS.map(t=><BtnTab key={t.id} t={t}/>)}
        </div>

        {/* TEMPERATURĂ ÎNCĂPERI */}
        {tab==='temperatura'&&(<div>
          <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#1e40af',fontWeight:500}}>
            📏 PG-6.3/F-01 · Limite: <strong>20–25°C</strong> · <strong>30–50% umiditate relativă</strong> · FDA/CDC/ISO 15189:2023
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {SALI.map((s,i)=>{
              const ul=tempData.filter(t=>t.sala===s)[0],aOk=tempAzi.includes(s),iA=tempSala===s
              return <button key={s} onClick={()=>setTempSala(s)} style={{background:iA?'#1a56db':'white',border:`2px solid ${iA?'#1a56db':aOk?'#bbf7d0':'#fecaca'}`,borderRadius:14,padding:14,cursor:'pointer',textAlign:'left',transition:'all 0.2s',boxShadow:iA?'0 6px 20px rgba(26,86,219,0.3)':'0 1px 3px rgba(0,0,0,0.06)',transform:iA?'translateY(-2px)':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:700,color:iA?'white':'#1e293b'}}>{SALI_SHORT[i]}</div>
                  <span style={{fontSize:11,fontWeight:700,color:iA?'rgba(255,255,255,0.8)':aOk?'#16a34a':'#dc2626'}}>{aOk?'✓ OK':'✗ Lipsă'}</span>
                </div>
                {ul?<div>
                  <div style={{fontSize:22,fontWeight:800,color:iA?'white':ul.temp>=TEMP_MIN&&ul.temp<=TEMP_MAX?'#16a34a':'#dc2626'}}>{ul.temp}°C</div>
                  <div style={{fontSize:12,color:iA?'rgba(255,255,255,0.75)':ul.umid>=UMID_MIN&&ul.umid<=UMID_MAX?'#16a34a':'#dc2626'}}>{ul.umid}%</div>
                  <div style={{fontSize:10,color:iA?'rgba(255,255,255,0.6)':'#94a3b8',marginTop:4}}>{ul.ora} · {fmtDate(ul.data)}</div>
                </div>:<div style={{fontSize:12,color:iA?'rgba(255,255,255,0.6)':'#94a3b8'}}>Nicio citire</div>}
              </button>
            })}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>{tempSala} — Ultimele citiri</div>
            <button className="btn btn-primary" onClick={()=>{setTF(p=>({...p,sala:tempSala}));setShowTemp(true)}}>+ Citire nouă</button>
          </div>
          <div className="table-wrapper">
            {tempData.filter(d=>d.sala===tempSala).length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>🌡️</div><div>Nicio citire</div></div>:(
            <table><thead><tr><th>Data</th><th>Ora</th><th>Temperatură</th><th>Umiditate</th><th>Status</th><th>Responsabil</th></tr></thead><tbody>
            {tempData.filter(d=>d.sala===tempSala).slice(0,60).map(d=>{
              const tOk=d.temp>=TEMP_MIN&&d.temp<=TEMP_MAX,uOk=d.umid>=UMID_MIN&&d.umid<=UMID_MAX
              return <tr key={d.id} style={{background:tOk&&uOk?'':'#fef2f2'}}>
                <td>{fmtDate(d.data)}</td>
                <td style={{fontFamily:'monospace',fontWeight:600}}>{d.ora}</td>
                <td><span style={{fontWeight:700,fontSize:15,color:tOk?'#16a34a':'#dc2626'}}>{d.temp}°C {!tOk&&'⚠'}</span></td>
                <td><span style={{fontWeight:700,fontSize:15,color:uOk?'#16a34a':'#dc2626'}}>{d.umid}% {!uOk&&'⚠'}</span></td>
                <td><span style={{background:tOk&&uOk?'#f0fdf4':'#fef2f2',color:tOk&&uOk?'#166534':'#991b1b',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{tOk&&uOk?'✓ OK':'✗ Depășit'}</span></td>
                <td style={{color:'#64748b',fontSize:12}}>{d.responsabil}</td>
              </tr>
            })}
            </tbody></table>)}
          </div>
        </div>)}

        {/* FRIGIDERE */}
        {tab==='frigidere'&&(<div>
          <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#0e7490',fontWeight:500}}>
            📏 PG-6.3/F-02 · Frigider: <strong>2–8°C</strong> · Congelator: <strong>-25 … -18°C</strong>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {FRIGIDERE.map(f=>{
              const ul=frigData.filter(d=>d.frig_id===f.id)[0],aOk=frigData.some(d=>d.frig_id===f.id&&d.data===today),iA=frigSel===f.id
              const tOk=ul?ul.temp>=f.temp_min&&ul.temp<=f.temp_max:true
              return <button key={f.id} onClick={()=>setFrigSel(f.id)} style={{background:iA?'#0891b2':'white',border:`2px solid ${iA?'#0891b2':aOk?'#bbf7d0':'#fecaca'}`,borderRadius:14,padding:14,cursor:'pointer',textAlign:'left',transition:'all 0.2s',boxShadow:iA?'0 6px 20px rgba(8,145,178,0.3)':'0 1px 3px rgba(0,0,0,0.06)',transform:iA?'translateY(-2px)':'none'}}>
                <div style={{fontSize:18,marginBottom:6}}>{f.tip==='frigider'?'🧊':'🧊'}</div>
                <div style={{fontSize:11,fontWeight:700,color:iA?'white':'#1e293b',lineHeight:1.3,marginBottom:4}}>{f.den.split('(')[0].trim()}</div>
                <div style={{fontSize:9,color:iA?'rgba(255,255,255,0.6)':'#94a3b8',fontFamily:'monospace',marginBottom:6}}>SN:{f.sn}</div>
                {ul?<div>
                  <div style={{fontSize:20,fontWeight:800,color:iA?'white':tOk?'#16a34a':'#dc2626'}}>{ul.temp}°C</div>
                  <div style={{fontSize:9,color:iA?'rgba(255,255,255,0.6)':'#94a3b8'}}>{ul.ora} · {fmtDate(ul.data)}</div>
                </div>:<div style={{fontSize:11,color:iA?'rgba(255,255,255,0.6)':'#94a3b8'}}>Nicio citire</div>}
                <div style={{marginTop:6,fontSize:10,fontWeight:700,color:iA?'rgba(255,255,255,0.8)':aOk?'#16a34a':'#dc2626'}}>{aOk?'✓ Citit azi':'✗ Lipsă azi'}</div>
              </button>
            })}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600}}>{FRIGIDERE.find(f=>f.id===frigSel)?.den}</div>
            <button className="btn" style={{background:'#0891b2',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={()=>{setFF(p=>({...p,frig_id:frigSel}));setShowFrig(true)}}>+ Citire nouă</button>
          </div>
          <div className="table-wrapper">
            {frigData.filter(d=>d.frig_id===frigSel).length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>❄️</div><div>Nicio citire</div></div>:(
            <table><thead><tr><th>Data</th><th>Ora</th><th>Temperatură</th><th>Limite</th><th>Status</th><th>Responsabil</th></tr></thead><tbody>
            {frigData.filter(d=>d.frig_id===frigSel).slice(0,60).map(d=>{
              const frig=FRIGIDERE.find(f=>f.id===d.frig_id),ok=d.temp>=frig?.temp_min&&d.temp<=frig?.temp_max
              return <tr key={d.id} style={{background:ok?'':'#fef2f2'}}>
                <td>{fmtDate(d.data)}</td><td style={{fontFamily:'monospace',fontWeight:600}}>{d.ora}</td>
                <td><span style={{fontWeight:800,fontSize:16,color:ok?'#16a34a':'#dc2626'}}>{d.temp}°C {!ok&&'⚠'}</span></td>
                <td style={{color:'#94a3b8',fontSize:12}}>{frig?.temp_min}…{frig?.temp_max}°C</td>
                <td><span style={{background:ok?'#f0fdf4':'#fef2f2',color:ok?'#166534':'#991b1b',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{ok?'✓ OK':'✗ Depășit'}</span></td>
                <td style={{color:'#64748b',fontSize:12}}>{d.responsabil}</td>
              </tr>
            })}
            </tbody></table>)}
          </div>
        </div>)}

        {/* LAMPĂ UV */}
        {tab==='uv'&&(<div>
          <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#6d28d9',fontWeight:500}}>
            📋 F-501/e MS RM nr.630/2016 · 2×/zi L–V · Schimb bec la 1000h · 30 min/sesiune
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {SALI.map((s,i)=>{
              const ore=uvLampi[s]||0,iA=uvSala===s
              const sc=ore<100?'#dc2626':ore<300?'#d97706':'#16a34a'
              const h8=uvData.some(u=>u.sala===s&&u.data===today&&u.interval?.startsWith('08'))
              const h14=uvData.some(u=>u.sala===s&&u.data===today&&u.interval?.startsWith('14'))
              return <button key={s} onClick={()=>setUvSala(s)} style={{background:iA?'#7c3aed':'white',border:`2px solid ${iA?'#7c3aed':ore<100?'#fecaca':'#e2e8f0'}`,borderRadius:14,padding:14,cursor:'pointer',textAlign:'left',transition:'all 0.2s',boxShadow:iA?'0 6px 20px rgba(124,58,237,0.3)':'0 1px 3px rgba(0,0,0,0.06)',transform:iA?'translateY(-2px)':'none'}}>
                <div style={{fontSize:18,marginBottom:6}}>💡</div>
                <div style={{fontSize:12,fontWeight:700,color:iA?'white':'#1e293b',marginBottom:4}}>{SALI_SHORT[i]}</div>
                <div style={{fontSize:20,fontWeight:800,color:iA?'white':sc}}>{ore.toFixed(0)}h</div>
                <div style={{fontSize:9,color:iA?'rgba(255,255,255,0.7)':sc,fontWeight:600,marginBottom:6}}>ore rămase</div>
                <div style={{background:iA?'rgba(255,255,255,0.2)':'#f1f5f9',borderRadius:99,height:4,marginBottom:6,overflow:'hidden'}}>
                  <div style={{width:Math.min(100,ore/10)+'%',height:'100%',background:iA?'white':sc,borderRadius:99}}/>
                </div>
                <div style={{display:'flex',gap:3,fontSize:9}}>
                  <span style={{background:iA?'rgba(255,255,255,0.2)':h8?'#f0fdf4':'#fef2f2',color:iA?'white':h8?'#16a34a':'#dc2626',padding:'2px 5px',borderRadius:20,fontWeight:700}}>08 {h8?'✓':'✗'}</span>
                  <span style={{background:iA?'rgba(255,255,255,0.2)':h14?'#f0fdf4':'#fef2f2',color:iA?'white':h14?'#16a34a':'#dc2626',padding:'2px 5px',borderRadius:20,fontWeight:700}}>14 {h14?'✓':'✗'}</span>
                </div>
              </button>
            })}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600}}>{uvSala}</div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-outline" onClick={()=>setShowUVCfg(true)}>⚙️ Setare ore bec</button>
              <button className="btn" style={{background:'#7c3aed',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={()=>{setUF(p=>({...p,sala:uvSala}));setShowUV(true)}}>+ Iradiere UV</button>
            </div>
          </div>
          <div className="table-wrapper">
            {uvData.filter(d=>d.sala===uvSala).length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>💡</div><div>Nicio iradiere</div></div>:(
            <table><thead><tr><th>Data</th><th>Interval</th><th>Ore înainte</th><th>Ore după</th><th>Specialist</th></tr></thead><tbody>
            {uvData.filter(d=>d.sala===uvSala).slice(0,60).map(d=>(
              <tr key={d.id}>
                <td>{fmtDate(d.data)}</td>
                <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#7c3aed'}}>{d.interval}</span></td>
                <td style={{color:'#64748b'}}>{parseFloat(d.ore_inainte||0).toFixed(1)}h</td>
                <td><span style={{fontWeight:700,color:parseFloat(d.ore_dupa||0)<100?'#dc2626':'#16a34a'}}>{parseFloat(d.ore_dupa||0).toFixed(1)}h</span></td>
                <td style={{color:'#64748b'}}>{d.specialist}</td>
              </tr>
            ))}
            </tbody></table>)}
          </div>
        </div>)}

        {/* CURĂȚENIE GENERALĂ — 3 sub-tab-uri */}
        {tab==='curatenie'&&(<CuratenieModule
          solutii={solutii} setSolutii={setSolutii}
          curData={curData} setCurData={setCurData}
          today={today} SALI={SALI} SALI_SHORT={SALI_SHORT} PERSONAL={PERSONAL}
        />)}

        {/* CURĂȚENIE FRIGIDER */}
        {tab==='frig_cur'&&(<div>
          <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#0e7490',fontWeight:500}}>
            📋 PG-6.3/F-05 · La fiecare 2 săptămâni · Cu supervizare · Dezghețare dacă e necesar
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {FRIGIDERE.map(f=>{
              const ul=frigCurData.filter(d=>d.frig_id===f.id)[0],iA=frigCurSel===f.id
              const days=ul?Math.floor((new Date()-new Date(ul.data_ef))/86400000):999
              const sc=days>14?'#dc2626':days>10?'#d97706':'#16a34a'
              return <button key={f.id} onClick={()=>setFrigCurSel(f.id)} style={{background:iA?'#0891b2':'white',border:`2px solid ${iA?'#0891b2':days>14?'#fecaca':'#e2e8f0'}`,borderRadius:14,padding:14,cursor:'pointer',textAlign:'left',transition:'all 0.2s',boxShadow:iA?'0 6px 20px rgba(8,145,178,0.3)':'0 1px 3px rgba(0,0,0,0.06)',transform:iA?'translateY(-2px)':'none'}}>
                <div style={{fontSize:18,marginBottom:6}}>🧊</div>
                <div style={{fontSize:11,fontWeight:700,color:iA?'white':'#1e293b',lineHeight:1.3,marginBottom:6}}>{f.den.split('(')[0].trim()}</div>
                {ul?<div>
                  <div style={{fontSize:16,fontWeight:800,color:iA?'white':sc}}>{days===0?'Azi':`${days}z`}</div>
                  <div style={{fontSize:9,color:iA?'rgba(255,255,255,0.7)':sc,fontWeight:600}}>de la ultima curățenie</div>
                  {ul.dezgheat&&<div style={{fontSize:9,color:iA?'rgba(255,255,255,0.6)':'#7c3aed',marginTop:2}}>❄️ Dezghețat</div>}
                </div>:<div style={{fontSize:11,color:iA?'rgba(255,255,255,0.6)':'#94a3b8'}}>Nicio înreg.</div>}
                <div style={{marginTop:4,fontSize:9,fontWeight:700,color:iA?'rgba(255,255,255,0.8)':days>14?'#dc2626':'#64748b'}}>{days>14?'⚠ Necesită curățenie':days>10?'⏰ Curând':'✓ OK'}</div>
              </button>
            })}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600}}>{FRIGIDERE.find(f=>f.id===frigCurSel)?.den}</div>
            <button className="btn" style={{background:'#0891b2',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={()=>{setFcF(p=>({...p,frig_id:frigCurSel}));setShowFrigCur(true)}}>+ Înregistrare curățenie</button>
          </div>
          <div className="table-wrapper">
            {frigCurData.filter(d=>d.frig_id===frigCurSel).length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>🧊</div><div>Nicio înregistrare</div></div>:(
            <table><thead><tr><th>Data</th><th>Tip</th><th>Operator</th><th>Dezghețat</th><th>Observații</th><th>Supervizat</th></tr></thead><tbody>
            {frigCurData.filter(d=>d.frig_id===frigCurSel).map(d=>(
              <tr key={d.id}>
                <td style={{fontWeight:500}}>{fmtDate(d.data_ef)}</td>
                <td><span style={{background:'#f0fdf4',color:'#166534',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{d.tip==='curatenie'?'Curățenie':'Dezinfecție'}</span></td>
                <td style={{color:'#64748b'}}>{d.operator}</td>
                <td><span style={{color:d.dezgheat?'#7c3aed':'#94a3b8',fontWeight:600}}>{d.dezgheat?'✓ Da':'—'}</span></td>
                <td style={{color:'#94a3b8',fontSize:12}}>{d.obs||'—'}</td>
                <td>{d.supervizat_la?<span style={{background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>✓ {fmtDate(d.supervizat_la)}</span>:<button onClick={()=>supervizFrigCur(d.id)} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:12,fontWeight:600,color:'#475569'}}>Supervizează</button>}</td>
              </tr>
            ))}
            </tbody></table>)}
          </div>
        </div>)}

        {/* CONDIȚII MEDIU */}
        {tab==='mediu'&&(<div>
          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#92400e',fontWeight:500}}>
            📋 PG-6.3/F-04 · Condiții mediu per sală · Temperatură, umiditate, presiune diferențială
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Condiții mediu — toate sălile</div>
            <button className="btn btn-primary" onClick={()=>setShowMediu(true)}>+ Înregistrare</button>
          </div>
          <div className="table-wrapper">
            {mediuData.length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>📊</div><div>Nicio înregistrare</div></div>:(
            <table><thead><tr><th>Data</th><th>Ora</th><th>Sală</th><th>Temperatură</th><th>Umiditate</th><th>Presiune</th><th>Status</th><th>Responsabil</th></tr></thead><tbody>
            {mediuData.slice(0,60).map(d=>{
              const tOk=d.temp>=TEMP_MIN&&d.temp<=TEMP_MAX,uOk=d.umid>=UMID_MIN&&d.umid<=UMID_MAX
              return <tr key={d.id} style={{background:tOk&&uOk?'':'#fef2f2'}}>
                <td>{fmtDate(d.data)}</td><td style={{fontFamily:'monospace'}}>{d.ora}</td>
                <td style={{fontWeight:500}}>{d.sala}</td>
                <td><span style={{fontWeight:700,color:tOk?'#16a34a':'#dc2626'}}>{d.temp}°C {!tOk&&'⚠'}</span></td>
                <td><span style={{fontWeight:700,color:uOk?'#16a34a':'#dc2626'}}>{d.umid}% {!uOk&&'⚠'}</span></td>
                <td style={{color:'#64748b'}}>{d.presiune?`${d.presiune} Pa`:'—'}</td>
                <td><span style={{background:tOk&&uOk?'#f0fdf4':'#fef2f2',color:tOk&&uOk?'#166534':'#991b1b',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{tOk&&uOk?'✓ OK':'✗ Depășit'}</span></td>
                <td style={{color:'#64748b',fontSize:12}}>{d.responsabil}</td>
              </tr>
            })}
            </tbody></table>)}
          </div>
        </div>)}

        {/* PERSOANE NEAUTORIZATE */}
        {tab==='neautorizati'&&(<div>
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#991b1b',fontWeight:500}}>
            📋 PG-6.3/R-01 · Registru evidență persoane externe neautorizate în laborator · ISO 15189:2023 §6.3
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>Registru persoane neautorizate</div>
              <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>Total: {neautData.length} · Luna curentă: {neautData.filter(n=>n.data?.startsWith(today.slice(0,7))).length}</div>
            </div>
            <button className="btn" style={{background:'#dc2626',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={()=>setShowNeaut(true)}>+ Înregistrare intrare</button>
          </div>
          <div className="table-wrapper">
            {neautData.length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>🚫</div><div>Nicio persoană neautorizată înregistrată</div></div>:(
            <table><thead><tr><th>Data</th><th>Nume</th><th>Instituție</th><th>Scop</th><th>Intrare</th><th>Ieșire</th><th>Însoțit de</th></tr></thead><tbody>
            {neautData.map(n=>(
              <tr key={n.id} style={{background:!n.ora_iesire?'#fffbeb':''}}>
                <td>{fmtDate(n.data)}</td>
                <td style={{fontWeight:600}}>{n.nume}</td>
                <td style={{color:'#64748b'}}>{n.institutie||'—'}</td>
                <td style={{color:'#64748b'}}>{n.scop||'—'}</td>
                <td style={{fontFamily:'monospace',fontWeight:600,color:'#16a34a'}}>{n.ora_intrare}</td>
                <td>{n.ora_iesire?<span style={{fontFamily:'monospace',fontWeight:600,color:'#dc2626'}}>{n.ora_iesire}</span>:<button onClick={()=>closeNeaut(n.id)} style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:11,fontWeight:600,color:'#92400e'}}>⏱ Marchează ieșire</button>}</td>
                <td style={{color:'#64748b',fontSize:12}}>{n.insotit_de}</td>
              </tr>
            ))}
            </tbody></table>)}
          </div>
        </div>)}

        {/* DEȘEURI */}
        {tab==='deseuri'&&(<div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
            {[{icon:'🗑️',val:totalDesLuna.toFixed(2)+' kg',label:'Luna curentă · 18.01.03',bg:'#fef2f2',border:'#fecaca',color:'#dc2626'},
              {icon:'📊',val:deseuriData.filter(d=>d.data?.startsWith(today.slice(0,7))).length,label:'Înregistrări luna curentă',bg:'#f8fafc',border:'#e2e8f0',color:'#1e293b'},
              {icon:'📦',val:deseuriData.length,label:'Total înregistrări',bg:'#f8fafc',border:'#e2e8f0',color:'#1e293b'}
            ].map((s,i)=><div key={i} style={{background:'white',border:`1px solid ${s.border}`,borderRadius:14,padding:20,display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:44,height:44,borderRadius:12,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{s.icon}</div>
              <div><div style={{fontSize:26,fontWeight:800,color:s.color}}>{s.val}</div><div style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>{s.label}</div></div>
            </div>)}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600}}>Registru predare deșeuri biologice · Cod 18.01.03</div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-outline" onClick={()=>setShowRapDes(true)}>📊 Raport lunar</button>
              <button className="btn" style={{background:'#dc2626',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={()=>setShowDeseu(true)}>+ Înregistrare</button>
            </div>
          </div>
          <div className="table-wrapper">
            {deseuriData.length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>🗑️</div><div>Nicio înregistrare</div></div>:(
            <table><thead><tr><th>Data</th><th>Ora</th><th>Secția</th><th>Cod</th><th>Cantitate</th><th>Responsabil</th></tr></thead><tbody>
            {deseuriData.map(d=><tr key={d.id}>
              <td style={{fontWeight:500}}>{fmtDate(d.data)}</td>
              <td style={{fontFamily:'monospace',fontWeight:600}}>{d.ora}</td>
              <td style={{color:'#64748b'}}>{d.sectia}</td>
              <td><span style={{fontFamily:'monospace',fontWeight:700,color:'#dc2626'}}>{d.cod}</span></td>
              <td><span style={{fontWeight:800,fontSize:16}}>{d.cantitate}</span><span style={{fontSize:12,color:'#94a3b8',marginLeft:4}}>kg</span></td>
              <td style={{color:'#64748b'}}>{d.responsabil}</td>
            </tr>)}
            </tbody></table>)}
          </div>
        </div>)}
      </div>

      {/* ═══ MODALE ═══════════════════════════════════════════ */}

      {showTemp&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowTemp(false)}>
        <div className="modal" style={{maxWidth:420}}>
          <div className="modal-header" style={{background:'#1a56db',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>🌡️ Citire temperatură · PG-6.3/F-01</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label className="form-label">Sala</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {SALI.map((s,i)=><button key={s} type="button" onClick={()=>setTF(p=>({...p,sala:s}))}
                  style={{padding:'10px',borderRadius:10,border:`2px solid ${tF.sala===s?'#1a56db':'#e2e8f0'}`,background:tF.sala===s?'#eff6ff':'white',color:tF.sala===s?'#1e40af':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  {SALI_SHORT[i]}</button>)}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">Temperatura (°C)</label>
                <input type="number" step="0.1" className="form-control" value={tF.temp} onChange={e=>setTF(p=>({...p,temp:e.target.value}))} placeholder="ex. 22.5" style={{fontSize:18,textAlign:'center',fontWeight:700}}/>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:4,textAlign:'center'}}>Limite: 20–25°C</div>
              </div>
              <div><label className="form-label">Umiditate (%)</label>
                <input type="number" step="0.1" className="form-control" value={tF.umid} onChange={e=>setTF(p=>({...p,umid:e.target.value}))} placeholder="ex. 42.0" style={{fontSize:18,textAlign:'center',fontWeight:700}}/>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:4,textAlign:'center'}}>Limite: 30–50%</div>
              </div>
            </div>
            {tF.temp&&tF.umid&&(()=>{const t=parseFloat(tF.temp),u=parseFloat(tF.umid),ok=t>=TEMP_MIN&&t<=TEMP_MAX&&u>=UMID_MIN&&u<=UMID_MAX;return<div style={{background:ok?'#f0fdf4':'#fef2f2',border:`1px solid ${ok?'#bbf7d0':'#fecaca'}`,borderRadius:10,padding:'10px',textAlign:'center',fontWeight:700,color:ok?'#166534':'#991b1b'}}>{t>=TEMP_MIN&&t<=TEMP_MAX?'✓':'✗'} {tF.temp}°C · {u>=UMID_MIN&&u<=UMID_MAX?'✓':'✗'} {tF.umid}%</div>})()}
            <div><label className="form-label">Responsabil</label>
              <select className="form-control" value={tF.responsabil} onChange={e=>setTF(p=>({...p,responsabil:e.target.value}))}>{PERSONAL.map(p=><option key={p}>{p}</option>)}</select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowTemp(false)}>Anulare</button>
            <button className="btn btn-primary" onClick={saveTemp} disabled={saving}>{saving?'...':'Salvează'}</button>
          </div>
        </div>
      </div>}

      {showFrig&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowFrig(false)}>
        <div className="modal" style={{maxWidth:400}}>
          <div className="modal-header" style={{background:'#0891b2',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>❄️ Citire temperatură frigider · PG-6.3/F-02</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label className="form-label">Aparat</label>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {FRIGIDERE.map(f=><button key={f.id} type="button" onClick={()=>setFF(p=>({...p,frig_id:f.id}))}
                  style={{padding:'10px 14px',borderRadius:10,border:`2px solid ${fF.frig_id===f.id?'#0891b2':'#e2e8f0'}`,background:fF.frig_id===f.id?'#ecfeff':'white',color:fF.frig_id===f.id?'#0e7490':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',textAlign:'left'}}>
                  <div style={{fontWeight:700}}>{f.tip==='frigider'?'🧊 Frigider:':'🧊 Congelator:'} {f.den.split('(')[0].trim()}</div>
                  <div style={{fontSize:9,fontFamily:'monospace',color:'#94a3b8',marginTop:2}}>SN:{f.sn} · {f.temp_min}…{f.temp_max}°C</div>
                </button>)}
              </div>
            </div>
            <div><label className="form-label">Temperatura (°C)</label>
              <input type="number" step="0.1" className="form-control" value={fF.temp} onChange={e=>setFF(p=>({...p,temp:e.target.value}))} placeholder={FRIGIDERE.find(f=>f.id===fF.frig_id)?.tip==='frigider'?'ex. 4.5':'ex. -20.0'} style={{fontSize:24,textAlign:'center',fontWeight:800}}/>
              {fF.temp&&(()=>{const f=FRIGIDERE.find(x=>x.id===fF.frig_id),t=parseFloat(fF.temp),ok=t>=f.temp_min&&t<=f.temp_max;return<div style={{background:ok?'#f0fdf4':'#fef2f2',borderRadius:10,padding:'8px',textAlign:'center',fontWeight:700,color:ok?'#166534':'#991b1b',marginTop:8}}>{ok?'✓ OK':'✗ Depășit'} ({f.temp_min}…{f.temp_max}°C)</div>})()}
            </div>
            <div><label className="form-label">Responsabil</label>
              <select className="form-control" value={fF.responsabil} onChange={e=>setFF(p=>({...p,responsabil:e.target.value}))}>{PERSONAL.map(p=><option key={p}>{p}</option>)}</select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowFrig(false)}>Anulare</button>
            <button className="btn" style={{background:'#0891b2',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveFrig} disabled={saving}>{saving?'...':'Salvează'}</button>
          </div>
        </div>
      </div>}

      {showUV&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowUV(false)}>
        <div className="modal" style={{maxWidth:400}}>
          <div className="modal-header" style={{background:'#7c3aed',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>💡 Iradiere UV · F-501/e MS RM</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label className="form-label">Sala</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {SALI.map((s,i)=><button key={s} type="button" onClick={()=>setUF(p=>({...p,sala:s}))}
                  style={{padding:'10px',borderRadius:10,border:`2px solid ${uF.sala===s?'#7c3aed':'#e2e8f0'}`,background:uF.sala===s?'#f5f3ff':'white',color:uF.sala===s?'#6d28d9':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  {SALI_SHORT[i]}</button>)}
              </div>
            </div>
            <div><label className="form-label">Interval</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {['08:00-08:30','14:00-14:30'].map(iv=><button key={iv} type="button" onClick={()=>setUF(p=>({...p,interval:iv}))}
                  style={{padding:'12px',borderRadius:10,border:`2px solid ${uF.interval===iv?'#7c3aed':'#e2e8f0'}`,background:uF.interval===iv?'#f5f3ff':'white',color:uF.interval===iv?'#6d28d9':'#64748b',fontSize:13,fontWeight:700,cursor:'pointer'}}>{iv}</button>)}
              </div>
            </div>
            <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:11,color:'#94a3b8',fontWeight:600,marginBottom:4}}>ORE RĂMASE — {SALI_SHORT[SALI.indexOf(uF.sala)]}</div>
              <div style={{fontSize:28,fontWeight:800,color:'#7c3aed'}}>{(uvLampi[uF.sala]||0).toFixed(1)}h</div>
              <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>→ după: {Math.max(0,(uvLampi[uF.sala]||0)-0.5).toFixed(1)}h</div>
            </div>
            <div><label className="form-label">Specialist</label>
              <select className="form-control" value={uF.specialist} onChange={e=>setUF(p=>({...p,specialist:e.target.value}))}>{PERSONAL.map(p=><option key={p}>{p}</option>)}</select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowUV(false)}>Anulare</button>
            <button className="btn" style={{background:'#7c3aed',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveUV} disabled={saving}>{saving?'...':'✓ Confirmă'}</button>
          </div>
        </div>
      </div>}

      {showUVCfg&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowUVCfg(false)}>
        <div className="modal" style={{maxWidth:360}}>
          <div className="modal-header" style={{background:'#475569',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>⚙️ Setare ore bec UV</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#f8fafc',borderRadius:10,padding:12}}>
              {SALI.map((s,i)=><div key={s} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f1f5f9'}}>
                <span style={{fontWeight:600,fontSize:13}}>{SALI_SHORT[i]}</span>
                <span style={{fontWeight:700,color:(uvLampi[s]||0)<100?'#dc2626':'#16a34a'}}>{(uvLampi[s]||0).toFixed(1)}h</span>
              </div>)}
            </div>
            <div><label className="form-label">Sala</label>
              <select className="form-control" value={uCfgSala} onChange={e=>setUCfgSala(e.target.value)}>
                {SALI.map((s,i)=><option key={s} value={s}>{SALI_SHORT[i]}</option>)}
              </select>
            </div>
            <div><label className="form-label">Ore valabilitate rămase (bec nou = 1000h)</label>
              <input type="number" step="0.5" min="0" className="form-control" value={uCfgOre} onChange={e=>setUCfgOre(e.target.value)} placeholder="ex. 1000" style={{fontSize:20,textAlign:'center',fontWeight:700}}/>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowUVCfg(false)}>Închide</button>
            <button className="btn btn-primary" onClick={saveUVCfg}>Salvează</button>
          </div>
        </div>
      </div>}

      {showCur&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCur(false)}>
        <div className="modal" style={{maxWidth:400}}>
          <div className="modal-header" style={{background:'#16a34a',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>🧹 Curățenie generală · F-502/e MS RM</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label className="form-label">Sala</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {SALI.map((s,i)=><button key={s} type="button" onClick={()=>setCF(p=>({...p,sala:s}))}
                  style={{padding:'10px',borderRadius:10,border:`2px solid ${cF.sala===s?'#16a34a':'#e2e8f0'}`,background:cF.sala===s?'#f0fdf4':'white',color:cF.sala===s?'#166534':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  {SALI_SHORT[i]}</button>)}
              </div>
            </div>
            <div><label className="form-label">Soluție dezinfectantă</label>
              {solutii.length===0?<div className="alert alert-warning">⚠ Adăugați soluții din butonul "🧴 Soluții".</div>:(
                <select className="form-control" value={cF.solutie} onChange={e=>setCF(p=>({...p,solutie:e.target.value}))}>
                  <option value="">— selectați —</option>
                  {solutii.map(s=>{const days=Math.floor((new Date()-new Date(s.data))/86400000);return<option key={s.id} value={s.den}>{s.den} {days>180?'⚠ >6 luni':`(${days}z)`}</option>})}
                </select>
              )}
            </div>
            <div><label className="form-label">Efectuat de</label>
              <select className="form-control" value={cF.operator} onChange={e=>setCF(p=>({...p,operator:e.target.value}))}>{PERSONAL.map(p=><option key={p}>{p}</option>)}</select>
            </div>
            <div><label className="form-label">Observații</label>
              <input type="text" className="form-control" value={cF.obs} onChange={e=>setCF(p=>({...p,obs:e.target.value}))}/>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowCur(false)}>Anulare</button>
            <button className="btn" style={{background:'#16a34a',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveCur} disabled={saving}>{saving?'...':'✓ Confirmă'}</button>
          </div>
        </div>
      </div>}

      {showFrigCur&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowFrigCur(false)}>
        <div className="modal" style={{maxWidth:440}}>
          <div className="modal-header" style={{background:'#0891b2',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>🧊 Curățenie frigider · PG-6.3/F-05</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label className="form-label">Aparat</label>
              <select className="form-control" value={fcF.frig_id} onChange={e=>setFcF(p=>({...p,frig_id:e.target.value}))}>
                {FRIGIDERE.map(f=><option key={f.id} value={f.id}>{f.den}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {['curatenie','dezinfectie'].map(t=><button key={t} type="button" onClick={()=>setFcF(p=>({...p,tip:t}))}
                style={{padding:'10px',borderRadius:10,border:`2px solid ${fcF.tip===t?'#0891b2':'#e2e8f0'}`,background:fcF.tip===t?'#ecfeff':'white',color:fcF.tip===t?'#0e7490':'#64748b',fontSize:13,fontWeight:600,cursor:'pointer',textAlign:'center'}}>
                {t==='curatenie'?'🧹 Curățenie':'🧴 Dezinfecție'}</button>)}
            </div>
            <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 14px',borderRadius:10,border:`2px solid ${fcF.dezgheat?'#7c3aed':'#e2e8f0'}`,background:fcF.dezgheat?'#f5f3ff':'white'}}>
              <input type="checkbox" checked={fcF.dezgheat} onChange={e=>setFcF(p=>({...p,dezgheat:e.target.checked}))} style={{width:18,height:18}}/>
              <span style={{fontSize:13,fontWeight:600,color:fcF.dezgheat?'#6d28d9':'#64748b'}}>❄️ S-a efectuat dezghețarea</span>
            </label>
            <div><label className="form-label">Efectuat de</label>
              <select className="form-control" value={fcF.operator} onChange={e=>setFcF(p=>({...p,operator:e.target.value}))}>{PERSONAL.map(p=><option key={p}>{p}</option>)}</select>
            </div>
            <div><label className="form-label">Observații</label>
              <input type="text" className="form-control" value={fcF.obs} onChange={e=>setFcF(p=>({...p,obs:e.target.value}))}/>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowFrigCur(false)}>Anulare</button>
            <button className="btn" style={{background:'#0891b2',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveFrigCur} disabled={saving}>{saving?'...':'✓ Confirmă'}</button>
          </div>
        </div>
      </div>}

      {showMediu&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowMediu(false)}>
        <div className="modal" style={{maxWidth:440}}>
          <div className="modal-header" style={{background:'#d97706',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>📊 Condiții mediu · PG-6.3/F-04</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label className="form-label">Sala</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {SALI.map((s,i)=><button key={s} type="button" onClick={()=>setMF(p=>({...p,sala:s}))}
                  style={{padding:'10px',borderRadius:10,border:`2px solid ${mF.sala===s?'#d97706':'#e2e8f0'}`,background:mF.sala===s?'#fffbeb':'white',color:mF.sala===s?'#92400e':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  {SALI_SHORT[i]}</button>)}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div><label className="form-label">Temperatura (°C) *</label>
                <input type="number" step="0.1" className="form-control" value={mF.temp} onChange={e=>setMF(p=>({...p,temp:e.target.value}))} placeholder="ex. 22.5" style={{fontSize:18,textAlign:'center',fontWeight:700}}/></div>
              <div><label className="form-label">Umiditate (%) *</label>
                <input type="number" step="0.1" className="form-control" value={mF.umid} onChange={e=>setMF(p=>({...p,umid:e.target.value}))} placeholder="ex. 42.0" style={{fontSize:18,textAlign:'center',fontWeight:700}}/></div>
            </div>
            <div><label className="form-label">Presiune diferențială (Pa) <span style={{color:'#94a3b8',fontWeight:400,fontSize:11}}>(opțional)</span></label>
              <input type="number" step="0.1" className="form-control" value={mF.presiune} onChange={e=>setMF(p=>({...p,presiune:e.target.value}))} placeholder="ex. +5 sau -5"/>
            </div>
            <div><label className="form-label">Observații</label>
              <input type="text" className="form-control" value={mF.obs} onChange={e=>setMF(p=>({...p,obs:e.target.value}))}/>
            </div>
            <div><label className="form-label">Responsabil</label>
              <select className="form-control" value={mF.responsabil} onChange={e=>setMF(p=>({...p,responsabil:e.target.value}))}>{PERSONAL.map(p=><option key={p}>{p}</option>)}</select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowMediu(false)}>Anulare</button>
            <button className="btn btn-primary" onClick={saveMediu} disabled={saving}>{saving?'...':'Salvează'}</button>
          </div>
        </div>
      </div>}

      {showNeaut&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowNeaut(false)}>
        <div className="modal" style={{maxWidth:440}}>
          <div className="modal-header" style={{background:'#dc2626',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>🚫 Persoană neautorizată · PG-6.3/R-01</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#64748b'}}>📅 {fmtDate(todayStr())} · ⏰ {nowTime()}</div>
            <div><label className="form-label">Nume și prenume *</label>
              <input type="text" className="form-control" value={nF.nume} onChange={e=>setNF(p=>({...p,nume:e.target.value}))} placeholder="Nume Prenume"/></div>
            <div><label className="form-label">Instituția / Compania</label>
              <input type="text" className="form-control" value={nF.institutie} onChange={e=>setNF(p=>({...p,institutie:e.target.value}))} placeholder="ex. MOLDAC, Furnizor"/></div>
            <div><label className="form-label">Scopul vizitei</label>
              <input type="text" className="form-control" value={nF.scop} onChange={e=>setNF(p=>({...p,scop:e.target.value}))} placeholder="ex. Audit, Livrare, Service"/></div>
            <div><label className="form-label">Ora intrării</label>
              <input type="time" className="form-control" value={nF.ora_intrare} onChange={e=>setNF(p=>({...p,ora_intrare:e.target.value}))}/></div>
            <div><label className="form-label">Însoțit de</label>
              <select className="form-control" value={nF.insotit_de} onChange={e=>setNF(p=>({...p,insotit_de:e.target.value}))}>{PERSONAL.map(p=><option key={p}>{p}</option>)}</select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowNeaut(false)}>Anulare</button>
            <button className="btn" style={{background:'#dc2626',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveNeaut} disabled={saving}>{saving?'...':'Înregistrează intrarea'}</button>
          </div>
        </div>
      </div>}

      {showDeseu&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowDeseu(false)}>
        <div className="modal" style={{maxWidth:380}}>
          <div className="modal-header" style={{background:'#dc2626',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>🗑️ Predare deșeuri biologice</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'#f8fafc',borderRadius:12,padding:'14px 16px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13}}>
                <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600}}>SECȚIA</span><div style={{fontWeight:600,marginTop:2}}>Biologie Moleculară</div></div>
                <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600}}>COD</span><div style={{fontWeight:700,color:'#dc2626',fontFamily:'monospace',marginTop:2}}>18.01.03</div></div>
                <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600}}>DATA</span><div style={{fontWeight:600,marginTop:2}}>{fmtDate(todayStr())}</div></div>
                <div><span style={{color:'#94a3b8',fontSize:11,fontWeight:600}}>ORA</span><div style={{fontWeight:600,marginTop:2}}>{nowTime()}</div></div>
              </div>
            </div>
            <div><label className="form-label">Cantitate (kg)</label>
              <input type="number" step="0.1" min="0.1" className="form-control" value={dF.cantitate} onChange={e=>setDF(p=>({...p,cantitate:e.target.value}))} placeholder="ex. 2.5" style={{fontSize:24,textAlign:'center',fontWeight:800}}/></div>
            <div><label className="form-label">Responsabil</label>
              <select className="form-control" value={dF.responsabil} onChange={e=>setDF(p=>({...p,responsabil:e.target.value}))}>{PERSONAL.map(p=><option key={p}>{p}</option>)}</select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowDeseu(false)}>Anulare</button>
            <button className="btn" style={{background:'#dc2626',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveDeseu} disabled={saving}>{saving?'...':'✓ Înregistrează'}</button>
          </div>
        </div>
      </div>}

      {showRapDes&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowRapDes(false)}>
        <div className="modal" style={{maxWidth:440}}>
          <div className="modal-header" style={{background:'#dc2626',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>📊 Raport lunar deșeuri 18.01.03</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label className="form-label">Luna</label>
              <select className="form-control" value={rapLuna} onChange={e=>setRapLuna(e.target.value)}>
                {[...new Set(deseuriData.map(d=>d.data?.slice(0,7)))].filter(Boolean).sort().reverse().map(l=><option key={l} value={l}>{l} · {deseuriData.filter(d=>d.data?.startsWith(l)).reduce((s,d)=>s+(d.cantitate||0),0).toFixed(2)} kg</option>)}
                {deseuriData.length===0&&<option value={todayStr().slice(0,7)}>{todayStr().slice(0,7)}</option>}
              </select>
            </div>
            <div style={{background:'#fef2f2',borderRadius:12,padding:16,textAlign:'center',border:'1px solid #fecaca'}}>
              <div style={{fontSize:32,fontWeight:800,color:'#dc2626'}}>{deseuriData.filter(d=>d.data?.startsWith(rapLuna)).reduce((s,d)=>s+(d.cantitate||0),0).toFixed(2)} kg</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>Total · Cod 18.01.03 · {rapLuna}</div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowRapDes(false)}>Închide</button>
            <button className="btn btn-primary" onClick={()=>genRapDeseu(rapLuna)}>🖨️ Printează raport</button>
          </div>
        </div>
      </div>}


      {/* ══ MENTENANȚĂ PREVENTIVĂ ══════════════════════════════════════════ */}
      {tab==='mentenanta'&&(<div>
        <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#6d28d9',fontWeight:500}}>
          🔧 Mentenanță preventivă echipamente · Zilnică (L–V) · Săptămânală · Anuală · Upload PV
        </div>

        {/* Filtre tip echipament */}
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
          {[{id:'all',label:'Toate'},{id:'amp',label:'Amplificatoare'},{id:'hota',label:'Hote'},{id:'cen',label:'Centrifuge'},{id:'vor',label:'Vortex'}].map(f=>(
            <button key={f.id} onClick={()=>setMentEchSel(f.id)} style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${mentEchSel===f.id?'#7c3aed':'#e2e8f0'}`,background:mentEchSel===f.id?'#7c3aed':'white',color:mentEchSel===f.id?'white':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {f.label}
            </button>
          ))}
          <button className="btn" style={{marginLeft:'auto',background:'#7c3aed',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={()=>setShowMent(true)}>+ Înregistrare mentenanță</button>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {label:'Total înregistrări',val:mentData.length,color:'#7c3aed',bg:'#f5f3ff'},
            {label:'Zilnice (azi)',val:mentData.filter(m=>m.data===today&&m.tip==='zilnic').length,color:'#16a34a',bg:'#f0fdf4'},
            {label:'Săptămânale (săpt.)',val:mentData.filter(m=>{const sw=new Date();sw.setDate(sw.getDate()-sw.getDay()+1);sw.setHours(0,0,0,0);return new Date(m.data)>=sw&&m.tip==='saptamanal'}).length,color:'#d97706',bg:'#fffbeb'},
            {label:'Cu PV atașat',val:mentData.filter(m=>m.pv_url).length,color:'#1a56db',bg:'#eff6ff'},
          ].map((s,i)=>(
            <div key={i} style={{background:'white',border:`1px solid ${s.bg==='#f5f3ff'?'#ddd6fe':s.bg==='#f0fdf4'?'#bbf7d0':s.bg==='#fffbeb'?'#fde68a':'#bfdbfe'}`,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div><div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.val}</div><div style={{fontSize:11,color:'#94a3b8',fontWeight:600,marginTop:2}}>{s.label}</div></div>
            </div>
          ))}
        </div>

        <div className="table-wrapper">
          {mentData.filter(m=>{
            if(mentEchSel==='amp') return AMPLIFICATOARE.some(a=>a.id===m.ech_id)
            if(mentEchSel==='hota') return HOTE.some(h=>h.id===m.ech_id)
            if(mentEchSel==='cen') return CENTRIFUGE.some(c=>c.id===m.ech_id)
            if(mentEchSel==='vor') return VORTEXURI.some(v=>v.id===m.ech_id)
            return true
          }).length===0?(
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>🔧</div><div>Nicio înregistrare</div></div>
          ):(
          <table><thead><tr><th>Data</th><th>Ora</th><th>Echipament</th><th>Tip</th><th>Acțiunea</th><th>Operator</th><th>PV</th><th>Obs.</th></tr></thead><tbody>
          {mentData.filter(m=>{
            if(mentEchSel==='amp') return AMPLIFICATOARE.some(a=>a.id===m.ech_id)
            if(mentEchSel==='hota') return HOTE.some(h=>h.id===m.ech_id)
            if(mentEchSel==='cen') return CENTRIFUGE.some(c=>c.id===m.ech_id)
            if(mentEchSel==='vor') return VORTEXURI.some(v=>v.id===m.ech_id)
            return true
          }).slice(0,60).map(m=>(
            <tr key={m.id}>
              <td style={{fontWeight:500}}>{fmtDate(m.data)}</td>
              <td style={{fontFamily:'monospace',color:'#64748b'}}>{m.ora}</td>
              <td style={{fontSize:12,fontWeight:500}}>{m.ech_den?.split('(')[0]?.trim()}</td>
              <td><span style={{background:m.tip==='zilnic'?'#f0fdf4':m.tip==='saptamanal'?'#fffbeb':m.tip==='anual'?'#eff6ff':'#f5f3ff',color:m.tip==='zilnic'?'#166534':m.tip==='saptamanal'?'#92400e':m.tip==='anual'?'#1e40af':'#6d28d9',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{m.tip}</span></td>
              <td style={{fontSize:12}}>{m.actiune}</td>
              <td style={{color:'#64748b',fontSize:12}}>{m.operator}</td>
              <td>{m.pv_url?<a href={m.pv_url} target="_blank" rel="noreferrer" style={{background:'#eff6ff',color:'#1a56db',border:'1px solid #bfdbfe',padding:'3px 10px',borderRadius:8,fontSize:11,fontWeight:600,textDecoration:'none'}}>📄 PV</a>:(
                <label style={{background:'#f8fafc',border:'1px dashed #e2e8f0',color:'#94a3b8',padding:'3px 10px',borderRadius:8,fontSize:11,cursor:'pointer',display:'inline-block'}}>
                  {mentUploadId===m.id?'⏳...':'📎 Upload'}
                  <input type="file" accept=".pdf" style={{display:'none'}} onChange={e=>uploadMentPV(m.id,e.target.files[0])}/>
                </label>
              )}</td>
              <td style={{color:'#94a3b8',fontSize:11}}>{m.obs||'—'}</td>
            </tr>
          ))}
          </tbody></table>)}
        </div>
      </div>)}

      {/* ══ EVIDENȚĂ LUCRU ECHIPAMENTE ════════════════════════════════════ */}
      {tab==='lucru_ech'&&(<div>
        <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#0e7490',fontWeight:500}}>
          📋 Registru lucru echipamente · Hote flux laminar + Amplificatoare · PG-6.3/R-02
        </div>

        {/* Filtre */}
        <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          {[{id:'all',label:'Toate'},{id:'hota',label:'🌬️ Hote'},{id:'amp',label:'🔬 Amplificatoare'}].map(f=>(
            <button key={f.id} onClick={()=>setLucruEchSel(f.id)} style={{padding:'6px 14px',borderRadius:8,border:`2px solid ${lucruEchSel===f.id?'#0891b2':'#e2e8f0'}`,background:lucruEchSel===f.id?'#0891b2':'white',color:lucruEchSel===f.id?'white':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {f.label}
            </button>
          ))}
          <button className="btn" style={{marginLeft:'auto',background:'#0891b2',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={()=>{setLucruForm(p=>({...p,ech_id:'',ech_den:'',ora_start:nowTime(),ora_stop:'',obs:''}));setShowLucru(true)}}>+ Deschide sesiune lucru</button>
        </div>

        {/* Sesiuni deschise */}
        {lucruData.filter(l=>!l.ora_stop).length>0&&(
          <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'#92400e',marginBottom:10}}>⚠ Sesiuni deschise (echipamente în lucru):</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {lucruData.filter(l=>!l.ora_stop).map(l=>(
                <div key={l.id} style={{background:'white',border:'1px solid #fde68a',borderRadius:10,padding:'8px 14px',display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:12,fontWeight:600}}>{l.ech_den?.split('(')[0]?.trim()}</span>
                  <span style={{fontSize:11,color:'#92400e',fontFamily:'monospace'}}>start {l.ora_start}</span>
                  <button onClick={()=>inchideLucru(l.id)} style={{background:'#16a34a',color:'white',border:'none',borderRadius:8,padding:'3px 10px',cursor:'pointer',fontSize:11,fontWeight:700}}>✓ Stop</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="table-wrapper">
          {lucruData.filter(l=>{
            if(lucruEchSel==='hota') return HOTE.some(h=>h.id===l.ech_id)
            if(lucruEchSel==='amp') return [...AMPLIFICATOARE].some(a=>a.id===l.ech_id)
            return true
          }).length===0?(
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>📋</div><div>Nicio sesiune înregistrată</div></div>
          ):(
          <table><thead><tr><th>Data</th><th>Echipament</th><th>SN</th><th>Ora start</th><th>Ora stop</th><th>Durata</th><th>Operator</th><th>Status</th></tr></thead><tbody>
          {lucruData.filter(l=>{
            if(lucruEchSel==='hota') return HOTE.some(h=>h.id===l.ech_id)
            if(lucruEchSel==='amp') return [...AMPLIFICATOARE].some(a=>a.id===l.ech_id)
            return true
          }).slice(0,80).map(l=>{
            const ech=ECH_MENTENTA.find(e=>e.id===l.ech_id)
            const durata=l.ora_stop&&l.ora_start?`${((new Date('2000-01-01T'+l.ora_stop)-new Date('2000-01-01T'+l.ora_start))/3600000).toFixed(1)}h`:'—'
            return(
            <tr key={l.id} style={{background:!l.ora_stop?'#fffbeb':''}}>
              <td style={{fontWeight:500}}>{fmtDate(l.data)}</td>
              <td style={{fontSize:12,fontWeight:500}}>{l.ech_den?.split('(')[0]?.trim()}</td>
              <td style={{fontFamily:'monospace',fontSize:11,color:'#64748b'}}>{ech?.sn||'—'}</td>
              <td style={{fontFamily:'monospace',fontWeight:600,color:'#16a34a'}}>{l.ora_start}</td>
              <td>{l.ora_stop?<span style={{fontFamily:'monospace',fontWeight:600,color:'#dc2626'}}>{l.ora_stop}</span>:<button onClick={()=>inchideLucru(l.id)} style={{background:'#fde68a',border:'1px solid #d97706',borderRadius:8,padding:'3px 10px',cursor:'pointer',fontSize:11,fontWeight:700,color:'#92400e'}}>⏱ Stop</button>}</td>
              <td style={{fontWeight:600,color:l.ora_stop?'#1e293b':'#d97706'}}>{durata}</td>
              <td style={{color:'#64748b',fontSize:12}}>{l.operator}</td>
              <td><span style={{background:!l.ora_stop?'#fffbeb':'#f0fdf4',color:!l.ora_stop?'#92400e':'#166534',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>{!l.ora_stop?'⏳ Activ':'✓ Încheiat'}</span></td>
            </tr>
          )})}
          </tbody></table>)}
        </div>
      </div>)}

      {/* ══ CHEMĂRI BIOINGINERI ═══════════════════════════════════════════ */}
      {tab==='bioingineri'&&(<div>
        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#166534',fontWeight:500}}>
          👨‍🔧 Registru chemări bioinginer intern · PG-6.3/R-03 · Alertă automată +1 zi · Upload PV
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:24,fontWeight:800,color:'#1a56db'}}>{bioData.length}</div>
            <div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>Total chemări</div>
          </div>
          <div style={{background:bioData.filter(b=>b.status==='deschis').length>0?'#fef2f2':'#f0fdf4',border:`1px solid ${bioData.filter(b=>b.status==='deschis').length>0?'#fecaca':'#bbf7d0'}`,borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:24,fontWeight:800,color:bioData.filter(b=>b.status==='deschis').length>0?'#dc2626':'#16a34a'}}>{bioData.filter(b=>b.status==='deschis').length}</div>
            <div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>Deschise (nerezolvate)</div>
          </div>
          <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:24,fontWeight:800,color:'#16a34a'}}>{bioData.filter(b=>b.status==='inchis').length}</div>
            <div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>Rezolvate</div>
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
          <button className="btn" style={{background:'#16a34a',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={()=>setShowBio(true)}>+ Chemare bioinginer</button>
        </div>

        <div className="table-wrapper">
          {bioData.length===0?(
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:36,marginBottom:12}}>👨‍🔧</div><div>Nicio chemare înregistrată</div></div>
          ):(
          <table><thead><tr><th>Data chemare</th><th>Echipament</th><th>Problema</th><th>Bioinginer</th><th>Acțiunea</th><th>Data rezolvare</th><th>PV</th><th>Status</th></tr></thead><tbody>
          {bioData.slice(0,60).map(b=>(
            <tr key={b.id} style={{background:b.status==='deschis'?'#fef2f2':''}}>
              <td style={{fontWeight:500}}>{fmtDate(b.data)}</td>
              <td style={{fontSize:12,fontWeight:500}}>{b.ech_den?.split('(')[0]?.trim()||'—'}</td>
              <td style={{fontSize:12}}>{b.problema}</td>
              <td style={{color:'#64748b',fontSize:12}}>{b.bioingineer||'—'}</td>
              <td style={{fontSize:12,color:'#16a34a'}}>{b.actiune||'—'}</td>
              <td style={{color:'#64748b'}}>{b.data_inchidere?fmtDate(b.data_inchidere):'—'}</td>
              <td>{b.pv_url?<a href={b.pv_url} target="_blank" rel="noreferrer" style={{background:'#eff6ff',color:'#1a56db',border:'1px solid #bfdbfe',padding:'3px 10px',borderRadius:8,fontSize:11,fontWeight:600,textDecoration:'none'}}>📄 PV</a>:(
                b.status==='deschis'?<label style={{background:'#f8fafc',border:'1px dashed #e2e8f0',color:'#94a3b8',padding:'3px 10px',borderRadius:8,fontSize:11,cursor:'pointer',display:'inline-block'}}>
                  {bioUploadId===b.id?'⏳...':'📎 Upload'}
                  <input type="file" accept=".pdf" style={{display:'none'}} onChange={e=>uploadBioPV(b.id,e.target.files[0])}/>
                </label>:'—'
              )}</td>
              <td>{b.status==='deschis'?(<div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{background:'#fef2f2',color:'#991b1b',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>✗ Deschisă</span>
                <button onClick={()=>{const act=prompt('Acțiunea efectuată de bioinginer:');if(act)inchideBio(b.id,act,b.pv_url)}} style={{background:'#16a34a',color:'white',border:'none',borderRadius:8,padding:'3px 8px',cursor:'pointer',fontSize:10,fontWeight:700}}>✓ Închide</button>
              </div>):<span style={{background:'#f0fdf4',color:'#166534',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700}}>✓ Rezolvată</span>}</td>
            </tr>
          ))}
          </tbody></table>)}
        </div>
      </div>)}

      {/* ══ INSTRUCȚIUNI ECHIPAMENT ════════════════════════════════════════ */}
      {tab==='instructiuni'&&(<div>
        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'10px 16px',marginBottom:20,fontSize:13,color:'#475569',fontWeight:500}}>
          📁 Instrucțiuni echipamente · IFU · Manuale · Certificate · PG-6.5
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
          <button className="btn" style={{background:'#475569',color:'white',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={()=>{setInstrForm({ech_id:'',ech_den:'',tip_doc:'IFU',limba:'RO',obs:''});setShowInstr(true)}}>+ Adaugă instrucțiune</button>
        </div>

        {/* Grid echipamente cu documente */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
          {ECH_MENTENTA.map(ech=>{
            const docs=instrData.filter(d=>d.ech_id===ech.id)
            return(
            <div key={ech.id} style={{background:'white',borderRadius:14,border:`1px solid ${docs.length>0?'#bbf7d0':'#e2e8f0'}`,padding:16,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#1e293b',lineHeight:1.3}}>{ech.den?.split('(')[0]?.trim()}</div>
                  <div style={{fontSize:10,fontFamily:'monospace',color:'#94a3b8',marginTop:2}}>SN:{ech.sn} · {ech.inv}</div>
                </div>
                <span style={{background:docs.length>0?'#f0fdf4':'#fef2f2',color:docs.length>0?'#166534':'#991b1b',border:`1px solid ${docs.length>0?'#bbf7d0':'#fecaca'}`,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,flexShrink:0,marginLeft:8}}>{docs.length} doc.</span>
              </div>
              {docs.length===0?(
                <div style={{fontSize:12,color:'#94a3b8',fontStyle:'italic',marginBottom:10}}>Nicio instrucțiune atașată</div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:10}}>
                  {docs.map(d=>(
                    <div key={d.id} style={{display:'flex',alignItems:'center',gap:8,background:'#f8fafc',borderRadius:8,padding:'6px 10px'}}>
                      <span style={{background:'#eff6ff',color:'#1a56db',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:700}}>{d.tip_doc}</span>
                      <span style={{fontSize:11,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.fisier_name||d.ech_den}</span>
                      <a href={d.fisier_url} target="_blank" rel="noreferrer" style={{background:'#1a56db',color:'white',padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:700,textDecoration:'none'}}>↗</a>
                    </div>
                  ))}
                </div>
              )}
              <label style={{display:'flex',alignItems:'center',gap:6,background:docs.length>0?'#f0fdf4':'#f8fafc',border:`1px dashed ${docs.length>0?'#bbf7d0':'#e2e8f0'}`,borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:12,color:docs.length>0?'#16a34a':'#94a3b8'}}>
                {instrUploadId===ech.id?'⏳ Se încarcă...':'📎 Adaugă document'}
                <input type="file" accept=".pdf,.doc,.docx" style={{display:'none'}} onChange={e=>{if(e.target.files[0])uploadInstr(e.target.files[0],ech.id,ech.den,'IFU','RO','')}}/>
              </label>
            </div>
          )})}
        </div>
      </div>)}

      {/* MODAL MENTENANȚĂ */}
      {showMent&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowMent(false)}>
        <div className="modal" style={{maxWidth:520}}>
          <div className="modal-header" style={{background:'#7c3aed',borderRadius:'20px 20px 0 0'}}>
            <div className="modal-title" style={{color:'white'}}>🔧 Înregistrare mentenanță preventivă</div>
          </div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label className="form-label">Tip mentenanță</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {[{id:'zilnic',label:'Zilnică',color:'#16a34a'},{id:'saptamanal',label:'Săptămânală',color:'#d97706'},{id:'anual',label:'Anuală',color:'#1a56db'},{id:'interventie',label:'Intervenție',color:'#dc2626'}].map(t=>(
                  <button key={t.id} type="button" onClick={()=>setMentForm(p=>({...p,tip:t.id}))} style={{padding:'8px',borderRadius:10,border:`2px solid ${mentForm.tip===t.id?t.color:'#e2e8f0'}`,background:mentForm.tip===t.id?t.color:'white',color:mentForm.tip===t.id?'white':'#64748b',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Echipament</label>
              <select className="form-control" value={mentForm.ech_id} onChange={e=>{const ech=ECH_MENTENTA.find(x=>x.id===e.target.value);setMentForm(p=>({...p,ech_id:e.target.value,ech_den:ech?.den||''}));}}>
                <option value="">— selectați —</option>
                <optgroup label="🌬️ Hote flux laminar">
                  {HOTE.map(h=><option key={h.id} value={h.id}>{h.den.split('(')[0].trim()} SN:{h.sn} ({h.sala})</option>)}
                </optgroup>
                <optgroup label="🔬 Amplificatoare">
                  {AMPLIFICATOARE.map(a=><option key={a.id} value={a.id}>{a.den.split('(')[0].trim()} SN:{a.sn}</option>)}
                </optgroup>
                <optgroup label="⚗️ Centrifuge">
                  {CENTRIFUGE.map(c=><option key={c.id} value={c.id}>{c.den.split('(')[0].trim()} SN:{c.sn}</option>)}
                </optgroup>
                <optgroup label="🔄 Vortex">
                  {VORTEXURI.map(v=><option key={v.id} value={v.id}>{v.den.split('(')[0].trim()} SN:{v.sn}</option>)}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="form-label">Acțiunea efectuată *</label>
              {mentForm.tip==='zilnic'?(
                <select className="form-control" value={mentForm.actiune} onChange={e=>setMentForm(p=>({...p,actiune:e.target.value}))}>
                  <option value="">— selectați —</option>
                  <optgroup label="Inspecție vizuală">
                    <option>Inspecție vizuală — fără defecte observate</option>
                    <option>Inspecție vizuală — defecte observate (descrieți în obs.)</option>
                  </optgroup>
                  <optgroup label="Curățenie (hote)">
                    <option>Prelucrare cu soluție dezinfectantă după lucru</option>
                    <option>Conectare lampă UV interior (30 min după lucru)</option>
                  </optgroup>
                </select>
              ):(
                mentForm.tip==='saptamanal'?(
                  <select className="form-control" value={mentForm.actiune} onChange={e=>setMentForm(p=>({...p,actiune:e.target.value}))}>
                    <option value="">— selectați —</option>
                    <option>Dezinfectare cu apă oxigenată 6%</option>
                    <option>Clătirea suprafețelor cu apă distilată</option>
                    <option>Dezinfectare cu soluție dezinfectantă</option>
                    <option>Verificare funcționalitate completă</option>
                  </select>
                ):(
                  <input type="text" className="form-control" value={mentForm.actiune} onChange={e=>setMentForm(p=>({...p,actiune:e.target.value}))} placeholder="Descrieți acțiunea efectuată"/>
                )
              )}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label className="form-label">Operator</label>
                <select className="form-control" value={mentForm.operator} onChange={e=>setMentForm(p=>({...p,operator:e.target.value}))}>
                  {PERSONAL.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Observații</label>
                <input type="text" className="form-control" value={mentForm.obs} onChange={e=>setMentForm(p=>({...p,obs:e.target.value}))}/>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowMent(false)}>Anulare</button>
            <button className="btn" style={{background:'#7c3aed',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveMent} disabled={saving}>{saving?'...':'✓ Salvează'}</button>
          </div>
        </div>
      </div>}

      {/* MODAL LUCRU ECHIPAMENTE */}
      {showLucru&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowLucru(false)}>
        <div className="modal" style={{maxWidth:460}}>
          <div className="modal-header" style={{background:'#0891b2',borderRadius:'20px 20px 0 0'}}>
            <div className="modal-title" style={{color:'white'}}>📋 Deschidere sesiune lucru echipament</div>
          </div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label className="form-label">Echipament</label>
              <select className="form-control" value={lucruForm.ech_id} onChange={e=>{const ech=[...HOTE,...AMPLIFICATOARE].find(x=>x.id===e.target.value);setLucruForm(p=>({...p,ech_id:e.target.value,ech_den:ech?.den||''}));}}>
                <option value="">— selectați —</option>
                <optgroup label="🌬️ Hote flux laminar">
                  {HOTE.map(h=><option key={h.id} value={h.id}>{h.den.split('(')[0].trim()} SN:{h.sn} ({h.sala})</option>)}
                </optgroup>
                <optgroup label="🔬 Amplificatoare">
                  {AMPLIFICATOARE.map(a=><option key={a.id} value={a.id}>{a.den.split('(')[0].trim()} SN:{a.sn}</option>)}
                </optgroup>
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label className="form-label">Ora start</label>
                <input type="time" className="form-control" value={lucruForm.ora_start} onChange={e=>setLucruForm(p=>({...p,ora_start:e.target.value}))} style={{fontFamily:'monospace',fontWeight:700,fontSize:18,textAlign:'center'}}/>
              </div>
              <div>
                <label className="form-label">Operator</label>
                <select className="form-control" value={lucruForm.operator} onChange={e=>setLucruForm(p=>({...p,operator:e.target.value}))}>
                  {PERSONAL.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Observații (opțional)</label>
              <input type="text" className="form-control" value={lucruForm.obs} onChange={e=>setLucruForm(p=>({...p,obs:e.target.value}))} placeholder="ex. Procesare serii IST"/>
            </div>
            <div style={{background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:10,padding:12,fontSize:12,color:'#0e7490'}}>
              ℹ️ La finalizare, apăsați butonul <strong>⏱ Stop</strong> din lista de sesiuni active pentru a înregistra ora de oprire.
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowLucru(false)}>Anulare</button>
            <button className="btn" style={{background:'#0891b2',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveLucru} disabled={saving}>{saving?'...':'▶ Start'}</button>
          </div>
        </div>
      </div>}

      {/* MODAL BIOINGINER */}
      {showBio&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowBio(false)}>
        <div className="modal" style={{maxWidth:500}}>
          <div className="modal-header" style={{background:'#16a34a',borderRadius:'20px 20px 0 0'}}>
            <div className="modal-title" style={{color:'white'}}>👨‍🔧 Chemare bioinginer</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>Alertă automată +1 zi după înregistrare</div>
          </div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label className="form-label">Echipament *</label>
              <select className="form-control" value={bioForm.ech_id} onChange={e=>{const ech=ECH_MENTENTA.find(x=>x.id===e.target.value);setBioForm(p=>({...p,ech_id:e.target.value,ech_den:ech?.den||''}));}}>
                <option value="">— selectați —</option>
                <optgroup label="🌬️ Hote">
                  {HOTE.map(h=><option key={h.id} value={h.id}>{h.den.split('(')[0].trim()} SN:{h.sn}</option>)}
                </optgroup>
                <optgroup label="🔬 Amplificatoare">
                  {AMPLIFICATOARE.map(a=><option key={a.id} value={a.id}>{a.den.split('(')[0].trim()} SN:{a.sn}</option>)}
                </optgroup>
                <optgroup label="⚗️ Centrifuge">
                  {CENTRIFUGE.map(c=><option key={c.id} value={c.id}>{c.den.split('(')[0].trim()} SN:{c.sn}</option>)}
                </optgroup>
                <optgroup label="🔄 Vortex">
                  {VORTEXURI.map(v=><option key={v.id} value={v.id}>{v.den.split('(')[0].trim()} SN:{v.sn}</option>)}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="form-label">Problema semnalată *</label>
              <textarea className="form-control" rows={3} value={bioForm.problema} onChange={e=>setBioForm(p=>({...p,problema:e.target.value}))} placeholder="Descrieți defecțiunea sau problema observată..." style={{resize:'none'}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label className="form-label">Data chemării</label>
                <input type="date" className="form-control" value={bioForm.data} onChange={e=>setBioForm(p=>({...p,data:e.target.value}))}/>
              </div>
              <div>
                <label className="form-label">Bioinginer (opțional)</label>
                <input type="text" className="form-control" value={bioForm.bioingineer} onChange={e=>setBioForm(p=>({...p,bioingineer:e.target.value}))} placeholder="Numele bioinginierului"/>
              </div>
            </div>
            <div>
              <label className="form-label">Observații</label>
              <input type="text" className="form-control" value={bioForm.obs} onChange={e=>setBioForm(p=>({...p,obs:e.target.value}))}/>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowBio(false)}>Anulare</button>
            <button className="btn" style={{background:'#16a34a',color:'white',padding:'8px 20px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}} onClick={saveBio} disabled={saving}>{saving?'...':'✓ Înregistrează chemarea'}</button>
          </div>
        </div>
      </div>}

      {/* MODAL INSTRUCȚIUNI */}
      {showInstr&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowInstr(false)}>
        <div className="modal" style={{maxWidth:460}}>
          <div className="modal-header" style={{background:'#475569',borderRadius:'20px 20px 0 0'}}>
            <div className="modal-title" style={{color:'white'}}>📁 Adaugă instrucțiune echipament</div>
          </div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label className="form-label">Echipament</label>
              <select className="form-control" value={instrForm.ech_id} onChange={e=>{const ech=ECH_MENTENTA.find(x=>x.id===e.target.value);setInstrForm(p=>({...p,ech_id:e.target.value,ech_den:ech?.den||''}));}}>
                <option value="">— selectați —</option>
                {ECH_MENTENTA.map(e=><option key={e.id} value={e.id}>{e.den.split('(')[0].trim()} SN:{e.sn}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div>
                <label className="form-label">Tip document</label>
                <select className="form-control" value={instrForm.tip_doc} onChange={e=>setInstrForm(p=>({...p,tip_doc:e.target.value}))}>
                  <option value="IFU">IFU (Instructions For Use)</option>
                  <option value="Manual">Manual utilizare</option>
                  <option value="Fisa tehnica">Fișă tehnică</option>
                  <option value="Certificat">Certificat</option>
                  <option value="Alt document">Alt document</option>
                </select>
              </div>
              <div>
                <label className="form-label">Limbă</label>
                <select className="form-control" value={instrForm.limba} onChange={e=>setInstrForm(p=>({...p,limba:e.target.value}))}>
                  <option value="RO">Română</option>
                  <option value="EN">Engleză</option>
                  <option value="RU">Rusă</option>
                  <option value="DE">Germană</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Observații</label>
              <input type="text" className="form-control" value={instrForm.obs} onChange={e=>setInstrForm(p=>({...p,obs:e.target.value}))} placeholder="ex. Versiunea 2024, pagini relevante..."/>
            </div>
            <div>
              <label className="form-label">Fișier (PDF, DOC)</label>
              <label style={{display:'flex',alignItems:'center',gap:10,background:'#f8fafc',border:'2px dashed #e2e8f0',borderRadius:10,padding:'16px',cursor:'pointer',justifyContent:'center'}}>
                <span style={{fontSize:24}}>📎</span>
                <span style={{fontSize:13,color:'#64748b'}}>{instrUploadId?'⏳ Se încarcă...':'Selectați fișierul pentru upload'}</span>
                <input type="file" accept=".pdf,.doc,.docx" style={{display:'none'}} onChange={e=>{if(e.target.files[0])uploadInstr(e.target.files[0],instrForm.ech_id,instrForm.ech_den,instrForm.tip_doc,instrForm.limba,instrForm.obs)}}/>
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowInstr(false)}>Anulare</button>
          </div>
        </div>
      </div>}

      {showSol&&<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowSol(false)}>
        <div className="modal" style={{maxWidth:380}}>
          <div className="modal-header" style={{background:'#16a34a',borderRadius:'20px 20px 0 0'}}><div className="modal-title" style={{color:'white'}}>🧴 Soluții dezinfectante</div></div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:10}}>
            {solutii.map(s=>{const days=Math.floor((new Date()-new Date(s.data))/86400000);return(
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,background:'#f8fafc',borderRadius:10,padding:'10px 14px',border:`1px solid ${days>180?'#fecaca':'#e2e8f0'}`}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{s.den}</div>
                  <div style={{fontSize:11,color:days>180?'#dc2626':'#94a3b8'}}>{fmtDate(s.data)} · {days}z {days>180?'⚠ Schimbați!':''}</div>
                </div>
                <button onClick={async()=>{await supabase.from('solutii').delete().eq('id',s.id);setSolutii(p=>p.filter(x=>x.id!==s.id))}} style={{background:'none',border:'none',color:'#e2e8f0',cursor:'pointer',fontSize:16}}>🗑️</button>
              </div>
            )})}
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <input type="text" className="form-control" value={nouaSol} onChange={e=>setNouaSol(e.target.value)} placeholder="ex. Chloramine 1%"/>
              <button className="btn btn-primary" onClick={async()=>{if(!nouaSol.trim())return;const rec={id:'SOL-'+Date.now(),den:nouaSol.trim(),data:todayStr(),ts:new Date().toISOString()};await supabase.from('solutii').insert(rec);setSolutii(p=>[rec,...p]);setNouaSol('')}}>+</button>
            </div>
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowSol(false)}>Închide</button></div>
        </div>
      </div>}
    </div>
  )
}
