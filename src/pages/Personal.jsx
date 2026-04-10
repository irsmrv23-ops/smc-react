import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PERSONAL_LIST = [
  { id: 'rotari-ion', nume: 'Rotari Ion', functie: 'Șef laborator', rol: 'sef', initiale: 'RI', color: 'bg-blue-100 text-blue-700' },
  { id: 'croitoru-tatiana', nume: 'Croitoru Tatiana', functie: 'Responsabil Managementul Calității', rol: 'rmc', initiale: 'CT', color: 'bg-purple-100 text-purple-700' },
  { id: 'jentimir-valeria', nume: 'Jentimir Valeria', functie: 'Biolog medical', rol: 'biolog', initiale: 'JV', color: 'bg-teal-100 text-teal-700' },
  { id: 'andrian-maria', nume: 'Andrian Maria', functie: 'Biolog medical', rol: 'biolog', initiale: 'AM', color: 'bg-green-100 text-green-700' },
  { id: 'antropov-marina', nume: 'Antropov Marina', functie: 'Biolog medical', rol: 'biolog', initiale: 'AM2', color: 'bg-amber-100 text-amber-700' },
]
const DOCS_OBL = ['CV','CONTRACT','FISA_POST','BULETIN','DIPLOMA','CERTIFICAT_SPEC','AUTORIZATIE','FISA_MEDICALA','VACCIN','FORMARE_INIT','EVAL_COMPETENTA','FORMARE_CONTINUA','BIOSIGURANTA','SECURITATE','ACORD_CONF','ACORD_PRELUCRARE']
const DOCS_OBLIGATORII = [
  { cod: 'CV', den: 'Curriculum Vitae', tip: 'angajare', expira: false },
  { cod: 'CONTRACT', den: 'Contract individual de muncă', tip: 'angajare', expira: false },
  { cod: 'FISA_POST', den: 'Fișa postului semnată', tip: 'angajare', expira: false },
  { cod: 'BULETIN', den: 'Copie buletin de identitate', tip: 'angajare', expira: true },
  { cod: 'DIPLOMA', den: 'Diplomă de studii (copie legalizată)', tip: 'calificare', expira: false },
  { cod: 'CERTIFICAT_SPEC', den: 'Certificat de specialitate / Atestat', tip: 'calificare', expira: true },
  { cod: 'AUTORIZATIE', den: 'Autorizație de exercitare a profesiei', tip: 'calificare', expira: true },
  { cod: 'FISA_MEDICALA', den: 'Fișă medicală periodică (anuală)', tip: 'medical', expira: true },
  { cod: 'VACCIN', den: 'Carnet vaccinări (HepB obligatoriu)', tip: 'medical', expira: false },
  { cod: 'FORMARE_INIT', den: 'Dovadă formare inițială în laborator', tip: 'formare', expira: false },
  { cod: 'EVAL_COMPETENTA', den: 'Evaluare competență (anuală)', tip: 'formare', expira: true },
  { cod: 'FORMARE_CONTINUA', den: 'Certificate formare continuă (ECM/CME)', tip: 'formare', expira: true },
  { cod: 'BIOSIGURANTA', den: 'Instruire biosiguranță (anuală)', tip: 'formare', expira: true },
  { cod: 'SECURITATE', den: 'Instruire SSM (anuală)', tip: 'formare', expira: true },
  { cod: 'ACORD_CONF', den: 'Acord de confidențialitate', tip: 'confidentialitate', expira: false },
  { cod: 'ACORD_PRELUCRARE', den: 'Acord prelucrare date personale', tip: 'confidentialitate', expira: false },
]
const TIP_COLORS = { angajare: 'bg-blue-50 text-blue-700', calificare: 'bg-purple-50 text-purple-700', medical: 'bg-red-50 text-red-700', formare: 'bg-green-50 text-green-700', confidentialitate: 'bg-gray-50 text-gray-700' }
const TIP_LABELS = { angajare: 'Angajare', calificare: 'Calificări', medical: 'Medical', formare: 'Formare', confidentialitate: 'Confidențialitate' }
const CONCEDIU_TIPURI = [
  { value: 'odihna', label: 'Concediu de odihnă', color: 'bg-green-100 text-green-700' },
  { value: 'medical', label: 'Concediu medical', color: 'bg-red-100 text-red-700' },
  { value: 'maternitate', label: 'Concediu maternitate/paternitate', color: 'bg-purple-100 text-purple-700' },
  { value: 'nemotivat', label: 'Absență nemotivată', color: 'bg-gray-100 text-gray-700' },
  { value: 'studii', label: 'Concediu studii', color: 'bg-blue-100 text-blue-700' },
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
    if (!window.confirm('Ștergeți documentul?')) return
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

  async function deleteConcediu(id) {
    if (!window.confirm('Ștergeți?')) return
    await supabase.from('concedii').delete().eq('id', id)
    setConcedii(prev => prev.filter(c => c.id !== id))
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

  if (loading) return <div className="p-8 text-center text-gray-400">Se încarcă...</div>

  const today = todayStr()

  // ── DOSAR PERSONAL VIEW ────────────────────────────────────
  if (selected) {
    const dosar = dosare[selected.id] || []
    const completare = calcCompletare(dosar)
    const coduriFata = dosar.map(d => d.cod)
    const lipsesc = DOCS_OBLIGATORII.filter(d => !coduriFata.includes(d.cod))
    const inConcediu = isPersonInConcediu(selected.id, concedii)
    const concAct = concedii.find(c => c.personal_id === selected.id && c.data_start <= today && c.data_end >= today)

    return (
      <div className="p-6 max-w-5xl">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">← Înapoi</button>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${selected.color}`}>{selected.initiale}</div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800">{selected.nume}</h1>
              {inConcediu && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">🏖️ Concediu până {fmtDate(concAct?.data_end)}</span>}
            </div>
            <p className="text-sm text-gray-500">{selected.functie}</p>
          </div>
          <div className="ml-auto text-center">
            <div className={`text-3xl font-bold ${completare >= 80 ? 'text-green-600' : completare >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{completare}%</div>
            <div className="text-xs text-gray-400">dosar complet</div>
          </div>
        </div>

        <div className="bg-gray-100 rounded-full h-2 mb-4">
          <div className={`h-2 rounded-full transition-all ${completare >= 80 ? 'bg-green-500' : completare >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: completare + '%' }} />
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {[{id:'dosar',l:'Dosar',i:'📁'},{id:'concedii',l:'Concedii',i:'🏖️'},{id:'instruiri',l:'Instruiri',i:'📚'}].map(t => (
            <button key={t.id} onClick={() => setPersonalTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors ${personalTab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.i} {t.l}
            </button>
          ))}
        </div>

        {/* DOSAR */}
        {personalTab === 'dosar' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="font-medium text-gray-700">Documente ({dosar.length})</div>
              <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Adaugă</button>
            </div>
            {lipsesc.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <div className="font-medium text-gray-700 mb-2 text-sm">Lipsesc {lipsesc.length} documente obligatorii:</div>
                <div className="flex flex-wrap gap-2">
                  {lipsesc.map(d => (
                    <button key={d.cod} onClick={() => { setForm(p => ({ ...p, cod: d.cod, den: d.den, tip: d.tip })); setShowAdd(true) }}
                      className="px-2 py-1 rounded border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 text-xs">
                      + {d.den.slice(0, 25)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-200">
              {dosar.length === 0 ? <div className="p-8 text-center text-gray-400">Niciun document adăugat</div> : (
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Cod</th><th className="px-4 py-3 text-left">Denumire</th>
                      <th className="px-4 py-3 text-left">Tip</th><th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Expiră</th><th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dosar.map(d => (
                      <tr key={d.id} className={isExpirat(d) ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{d.cod}</td>
                        <td className="px-4 py-3 text-sm">{d.den}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${TIP_COLORS[d.tip] || ''}`}>{TIP_LABELS[d.tip] || d.tip}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(d.data)}</td>
                        <td className="px-4 py-3 text-sm">
                          {d.expirare ? <span className={isExpirat(d) ? 'text-red-600 font-medium' : isExpiraCurand(d) ? 'text-amber-600' : 'text-gray-500'}>{fmtDate(d.expirare)} {isExpirat(d) ? '⚠' : isExpiraCurand(d) ? '⏰' : ''}</span> : '—'}
                        </td>
                        <td className="px-4 py-3"><button onClick={() => deleteDoc(d.id)} className="text-gray-300 hover:text-red-500">🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* CONCEDII */}
        {personalTab === 'concedii' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="font-medium text-gray-700">Concedii — {selected.nume}</div>
              <button onClick={() => { setConcForm(p => ({ ...p, personal_id: selected.id })); setShowConcediu(true) }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Înregistrare</button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200">
              {concedii.filter(c => c.personal_id === selected.id).length === 0 ? (
                <div className="p-8 text-center text-gray-400">Niciun concediu înregistrat</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr><th className="px-4 py-3 text-left">Tip</th><th className="px-4 py-3 text-left">Data start</th><th className="px-4 py-3 text-left">Data end</th><th className="px-4 py-3 text-left">Zile</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {concedii.filter(c => c.personal_id === selected.id).map(c => {
                      const days = Math.ceil((new Date(c.data_end) - new Date(c.data_start)) / 86400000) + 1
                      const activ = c.data_start <= today && c.data_end >= today
                      const tipInfo = CONCEDIU_TIPURI.find(t => t.value === c.tip)
                      return (
                        <tr key={c.id} className={activ ? 'bg-orange-50' : ''}>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${tipInfo?.color || ''}`}>{tipInfo?.label || c.tip}</span></td>
                          <td className="px-4 py-3 text-sm">{fmtDate(c.data_start)}</td>
                          <td className="px-4 py-3 text-sm">{fmtDate(c.data_end)}</td>
                          <td className="px-4 py-3 text-sm font-bold">{days}</td>
                          <td className="px-4 py-3">
                            {activ ? <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">🏖️ Activ</span>
                              : c.data_end < today ? <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">Finalizat</span>
                              : <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Planificat</span>}
                          </td>
                          <td className="px-4 py-3"><button onClick={() => deleteConcediu(c.id)} className="text-gray-300 hover:text-red-500">🗑️</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* INSTRUIRI PER PERSOANĂ */}
        {personalTab === 'instruiri' && (
          <div>
            <div className="text-sm text-gray-500 mb-4">Instruiri la care a participat <strong>{selected.nume}</strong>:</div>
            <div className="bg-white rounded-xl border border-gray-200">
              {instruiri.filter(i => Array.isArray(i.participanti) && i.participanti.includes(selected.id)).length === 0 ? (
                <div className="p-8 text-center text-gray-400">Nicio instruire. Adăugați din secțiunea "Instruiri".</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-left">Tip</th><th className="px-4 py-3 text-left">Tema</th><th className="px-4 py-3 text-left">Trainer</th><th className="px-4 py-3 text-left">PV</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {instruiri.filter(i => Array.isArray(i.participanti) && i.participanti.includes(selected.id)).map(i => (
                      <tr key={i.id}>
                        <td className="px-4 py-3 text-sm">{fmtDate(i.data)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${i.tip === 'interna' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{i.tip === 'interna' ? 'Internă' : 'Externă'}</span></td>
                        <td className="px-4 py-3 text-sm">{i.tema}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{i.trainer || '—'}</td>
                        <td className="px-4 py-3">{i.pv_url ? <a href={i.pv_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline">📄 PV</a> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* MODAL ADD DOC */}
        {showAdd && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b"><h2 className="text-lg font-bold">Adaugă document</h2></div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
                  <select value={form.cod} onChange={e => { const tmpl = DOCS_OBLIGATORII.find(d => d.cod === e.target.value); if (tmpl) setForm(p => ({ ...p, cod: tmpl.cod, den: tmpl.den, tip: tmpl.tip })); else setForm(p => ({ ...p, cod: e.target.value })) }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">— selectați —</option>
                    {DOCS_OBLIGATORII.map(d => <option key={d.cod} value={d.cod}>{d.cod} — {d.den.slice(0, 35)}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Denumire</label><input type="text" value={form.den} onChange={e => setForm(p => ({ ...p, den: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Data eliberării</label><input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Data expirării</label><input type="date" value={form.expirare} onChange={e => setForm(p => ({ ...p, expirare: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Instituție emitentă</label><input type="text" value={form.institutie} onChange={e => setForm(p => ({ ...p, institutie: e.target.value }))} placeholder="ex. USMF" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
                <button onClick={saveDoc} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? '...' : 'Salvează'}</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CONCEDIU */}
        {showConcediu && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6 border-b"><h2 className="text-lg font-bold">🏖️ Concediu</h2></div>
              <div className="p-6 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                  <select value={concForm.tip} onChange={e => setConcForm(p => ({ ...p, tip: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {CONCEDIU_TIPURI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Data start *</label><input type="date" value={concForm.data_start} onChange={e => setConcForm(p => ({ ...p, data_start: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Data end *</label><input type="date" value={concForm.data_end} onChange={e => setConcForm(p => ({ ...p, data_end: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                </div>
                {concForm.data_start && concForm.data_end && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700 font-medium">
                    Durata: {Math.ceil((new Date(concForm.data_end) - new Date(concForm.data_start)) / 86400000) + 1} zile
                  </div>
                )}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Observații</label><input type="text" value={concForm.obs} onChange={e => setConcForm(p => ({ ...p, obs: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowConcediu(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
                <button onClick={saveConcediu} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? '...' : 'Salvează'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── LISTA PRINCIPALĂ ───────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Personal</h1>
        <p className="text-sm text-gray-500">Dosare · Concedii · Instruiri · Substituție · ISO 15189:2023 §6.2</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[{id:'personal',l:'Personal',i:'👤'},{id:'instruiri',l:'Instruiri',i:'📚'},{id:'substitutie',l:'Substituție',i:'🔄'}].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors ${mainTab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.i} {t.l}
          </button>
        ))}
      </div>

      {/* LISTA PERSONAL */}
      {mainTab === 'personal' && (
        <div className="grid grid-cols-1 gap-4">
          {PERSONAL_LIST.map(p => {
            const dosar = dosare[p.id] || []
            const completare = calcCompletare(dosar)
            const lipsesc = DOCS_OBL.filter(cod => !dosar.find(d => d.cod === cod)).length
            const expirate = dosar.filter(d => isExpirat(d)).length
            const inConcediu = isPersonInConcediu(p.id, concedii)
            const concAct = concedii.find(c => c.personal_id === p.id && c.data_start <= today && c.data_end >= today)
            return (
              <div key={p.id} onClick={() => { setSelected(p); setPersonalTab('dosar') }}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${p.color}`}>{p.initiale}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{p.nume}</span>
                    {inConcediu && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">🏖️ Concediu până {fmtDate(concAct?.data_end)}</span>}
                  </div>
                  <div className="text-sm text-gray-500">{p.functie}</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${completare >= 80 ? 'bg-green-500' : completare >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: completare + '%' }} />
                    </div>
                    <span className={`text-sm font-bold ${completare >= 80 ? 'text-green-600' : completare >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{completare}%</span>
                  </div>
                </div>
                <div className="flex gap-3 text-center">
                  <div><div className="text-lg font-bold text-gray-700">{dosar.length}</div><div className="text-xs text-gray-400">doc.</div></div>
                  {lipsesc > 0 && <div><div className="text-lg font-bold text-red-500">{lipsesc}</div><div className="text-xs text-red-400">lipsesc</div></div>}
                  {expirate > 0 && <div><div className="text-lg font-bold text-red-600">{expirate}</div><div className="text-xs text-red-400">expirate</div></div>}
                </div>
                <div className="text-gray-300 text-xl">›</div>
              </div>
            )
          })}
        </div>
      )}

      {/* INSTRUIRI */}
      {mainTab === 'instruiri' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="font-medium text-gray-700">Toate instruirile ({instruiri.length})</div>
            <button onClick={() => setShowInstruire(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Instruire nouă</button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200">
            {instruiri.length === 0 ? <div className="p-8 text-center text-gray-400">Nicio instruire înregistrată</div> : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-left">Tip</th><th className="px-4 py-3 text-left">Tema</th><th className="px-4 py-3 text-left">Participanți</th><th className="px-4 py-3 text-left">Trainer</th><th className="px-4 py-3 text-left">Durata</th><th className="px-4 py-3 text-left">PV</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {instruiri.map(i => (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{fmtDate(i.data)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${i.tip === 'interna' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{i.tip === 'interna' ? 'Internă' : 'Externă'}</span></td>
                      <td className="px-4 py-3 text-sm font-medium">{i.tema}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{Array.isArray(i.participanti) ? i.participanti.map(id => PERSONAL_LIST.find(p => p.id === id)?.initiale).filter(Boolean).join(', ') : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{i.trainer || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{i.durata ? i.durata + 'h' : '—'}</td>
                      <td className="px-4 py-3">
                        {i.pv_url ? <a href={i.pv_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline">📄 PV</a> : (
                          <label className="cursor-pointer text-gray-400 hover:text-blue-600 text-sm">📎 Upload<input type="file" accept=".pdf" className="hidden" onChange={e => uploadPV(i.id, e.target.files[0])} /></label>
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

      {/* SUBSTITUȚIE */}
      {mainTab === 'substitutie' && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="font-medium text-gray-700">Plan de substituție personal</div>
              <div className="text-xs text-gray-400 mt-1">ISO 15189:2023 §6.2.1 — Continuitatea serviciilor</div>
            </div>
            <button onClick={() => setShowSubst(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Adaugă</button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 mt-4">
            {substitutii.length === 0 ? <div className="p-8 text-center text-gray-400">Niciun plan definit. Definiți cine înlocuiește pe cine în absență.</div> : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr><th className="px-4 py-3 text-left">Titular</th><th className="px-4 py-3 text-left">Înlocuitor</th><th className="px-4 py-3 text-left">Activități</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3"></th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {substitutii.map(s => {
                    const titular = PERSONAL_LIST.find(p => p.id === s.titular_id)
                    const inlocuitor = PERSONAL_LIST.find(p => p.id === s.inlocuitor_id)
                    const titularInConcediu = isPersonInConcediu(s.titular_id, concedii)
                    return (
                      <tr key={s.id} className={titularInConcediu ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${titular?.color || ''}`}>{titular?.initiale}</div>
                            <div>
                              <div className="text-sm font-medium">{titular?.nume}</div>
                              {titularInConcediu && <div className="text-xs text-orange-600">🏖️ În concediu acum</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${inlocuitor?.color || ''}`}>{inlocuitor?.initiale}</div>
                            <div className="text-sm font-medium">{inlocuitor?.nume}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.activitati || '—'}</td>
                        <td className="px-4 py-3">
                          {titularInConcediu ? <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">🔄 Activ acum</span> : <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">Stand-by</span>}
                        </td>
                        <td className="px-4 py-3"><button onClick={async () => { if (!window.confirm('Ștergeți?')) return; await supabase.from('substitutii').delete().eq('id', s.id); setSubstitutii(prev => prev.filter(x => x.id !== s.id)) }} className="text-gray-300 hover:text-red-500">🗑️</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL INSTRUIRE */}
      {showInstruire && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">📚 Instruire nouă</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {['interna','externa'].map(t => (
                  <button key={t} onClick={() => setInstrForm(p => ({ ...p, _tip: t }))}
                    className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${instrForm._tip === t ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600'}`}>
                    {t === 'interna' ? '🏥 Internă' : '🌍 Externă'}
                  </button>
                ))}
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tema *</label><input type="text" value={instrForm.tema} onChange={e => setInstrForm(p => ({ ...p, tema: e.target.value }))} placeholder="ex. Biosiguranță în laboratorul de biologie moleculară" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Data *</label><input type="date" value={instrForm.data} onChange={e => setInstrForm(p => ({ ...p, data: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Durata (ore)</label><input type="number" step="0.5" min="0.5" value={instrForm.durata} onChange={e => setInstrForm(p => ({ ...p, durata: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Trainer / Instituție</label><input type="text" value={instrForm.trainer} onChange={e => setInstrForm(p => ({ ...p, trainer: e.target.value }))} placeholder="ex. Rotari Ion sau CNSP" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Participanți</label>
                <div className="space-y-2">
                  {PERSONAL_LIST.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={instrForm.participanti.includes(p.id)}
                        onChange={e => setInstrForm(prev => ({ ...prev, participanti: e.target.checked ? [...prev.participanti, p.id] : prev.participanti.filter(x => x !== p.id) }))}
                        className="w-4 h-4" />
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${p.color}`}>{p.initiale}</div>
                      <span className="text-sm">{p.nume}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Observații</label><textarea value={instrForm.obs} rows={2} onChange={e => setInstrForm(p => ({ ...p, obs: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" /></div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowInstruire(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveInstruire} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? '...' : 'Salvează'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUBSTITUȚIE */}
      {showSubst && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b"><h2 className="text-lg font-bold">🔄 Plan de substituție</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Titular (persoana care lipsește) *</label>
                <select value={substForm.titular_id} onChange={e => setSubstForm(p => ({ ...p, titular_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— selectați —</option>
                  {PERSONAL_LIST.map(p => <option key={p.id} value={p.id}>{p.nume}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Înlocuitor *</label>
                <select value={substForm.inlocuitor_id} onChange={e => setSubstForm(p => ({ ...p, inlocuitor_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— selectați —</option>
                  {PERSONAL_LIST.filter(p => p.id !== substForm.titular_id).map(p => <option key={p.id} value={p.id}>{p.nume}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Activități acoperite</label><textarea value={substForm.activitati} rows={3} onChange={e => setSubstForm(p => ({ ...p, activitati: e.target.value }))} placeholder="ex. Procesare probe IST, IQC, serii zilnice" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" /></div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowSubst(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
              <button onClick={saveSubstitutie} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? '...' : 'Salvează'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
