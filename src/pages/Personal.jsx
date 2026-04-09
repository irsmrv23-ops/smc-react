import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PERSONAL_LIST = [
  { id: 'rotari-ion', nume: 'Rotari Ion', functie: 'Șef laborator', rol: 'sef', initiale: 'RI', color: 'bg-blue-100 text-blue-700' },
  { id: 'croitoru-tatiana', nume: 'Croitoru Tatiana', functie: 'Responsabil Managementul Calității', rol: 'rmc', initiale: 'CT', color: 'bg-purple-100 text-purple-700' },
  { id: 'jentimir-valeria', nume: 'Jentimir Valeria', functie: 'Biolog/Chimist', rol: 'biolog', initiale: 'JV', color: 'bg-teal-100 text-teal-700' },
  { id: 'andrian-maria', nume: 'Andrian Maria', functie: 'Biolog/Chimist', rol: 'biolog', initiale: 'AM', color: 'bg-green-100 text-green-700' },
  { id: 'antropov-marina', nume: 'Antropov Marina', functie: 'Biolog/Chimist', rol: 'biolog', initiale: 'AM2', color: 'bg-amber-100 text-amber-700' },
]

const DOCS_OBLIGATORII = [
  // Angajare
  { cod: 'CV', den: 'Curriculum Vitae', tip: 'angajare', obligatoriu: true, expira: false },
  { cod: 'CONTRACT', den: 'Contract individual de muncă', tip: 'angajare', obligatoriu: true, expira: false, ref: 'Codul Muncii RM art.56' },
  { cod: 'FISA_POST', den: 'Fișa postului semnată', tip: 'angajare', obligatoriu: true, expira: false, ref: 'ISO 15189 §6.2.2' },
  { cod: 'BULETIN', den: 'Copie buletin de identitate', tip: 'angajare', obligatoriu: true, expira: true },
  // Calificări
  { cod: 'DIPLOMA', den: 'Diplomă de studii (copie legalizată)', tip: 'calificare', obligatoriu: true, expira: false, ref: 'ISO 15189 §6.2.3' },
  { cod: 'CERTIFICAT_SPEC', den: 'Certificat de specialitate / Atestat', tip: 'calificare', obligatoriu: true, expira: true, ref: 'MS RM' },
  { cod: 'AUTORIZATIE', den: 'Autorizație de exercitare a profesiei', tip: 'calificare', obligatoriu: true, expira: true, ref: 'MS RM / CNSP' },
  // Medical
  { cod: 'FISA_MEDICALA', den: 'Fișă medicală periodică (anuală)', tip: 'medical', obligatoriu: true, expira: true, ref: 'HG RM 1025/2016' },
  { cod: 'VACCIN', den: 'Carnet vaccinări (HepB obligatoriu)', tip: 'medical', obligatoriu: true, expira: false, ref: 'MS RM' },
  // Formare
  { cod: 'FORMARE_INIT', den: 'Dovadă formare inițială în laborator', tip: 'formare', obligatoriu: true, expira: false, ref: 'ISO 15189 §6.2.4' },
  { cod: 'EVAL_COMPETENTA', den: 'Evaluare competență (anuală)', tip: 'formare', obligatoriu: true, expira: true, ref: 'ISO 15189 §6.2.6' },
  { cod: 'FORMARE_CONTINUA', den: 'Certificate formare continuă (ECM/CME)', tip: 'formare', obligatoriu: true, expira: true, ref: 'ISO 15189 §6.2.5' },
  { cod: 'BIOSIGURANTA', den: 'Instruire biosiguranță (anuală)', tip: 'formare', obligatoriu: true, expira: true, ref: 'ISO 15189 §5.3' },
  { cod: 'SECURITATE', den: 'Instruire SSM (anuală)', tip: 'formare', obligatoriu: true, expira: true, ref: 'Legea 186/2008 RM' },
  // Confidențialitate
  { cod: 'ACORD_CONF', den: 'Acord de confidențialitate', tip: 'confidentialitate', obligatoriu: true, expira: false, ref: 'ISO 15189 §4.1.4' },
  { cod: 'ACORD_PRELUCRARE', den: 'Acord prelucrare date personale', tip: 'confidentialitate', obligatoriu: true, expira: false, ref: 'GDPR / Legea 133/2011' },
]

const TIP_COLORS = {
  angajare: 'bg-blue-50 text-blue-700 border-blue-200',
  calificare: 'bg-purple-50 text-purple-700 border-purple-200',
  medical: 'bg-red-50 text-red-700 border-red-200',
  formare: 'bg-green-50 text-green-700 border-green-200',
  confidentialitate: 'bg-gray-50 text-gray-700 border-gray-200',
}

const TIP_LABELS = {
  angajare: 'Angajare',
  calificare: 'Calificări',
  medical: 'Medical',
  formare: 'Formare',
  confidentialitate: 'Confidențialitate',
}

function calcCompletare(dosar) {
  if (!dosar || !dosar.length) return 0
  const coduri = dosar.map(d => d.cod)
  const found = DOCS_OBLIGATORII.filter(d => coduri.includes(d.cod)).length
  return Math.round(found / DOCS_OBLIGATORII.length * 100)
}

function isExpirat(doc) {
  if (!doc.expirare) return false
  return doc.expirare < new Date().toISOString().slice(0, 10)
}

function isExpiraCurand(doc) {
  if (!doc.expirare) return false
  const days = Math.ceil((new Date(doc.expirare) - new Date()) / 86400000)
  return days >= 0 && days <= 30
}

export default function Personal() {
  const [dosare, setDosare] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState(null)

  const emptyForm = { cod: '', den: '', tip: 'angajare', data: '', expirare: '', institutie: '', nr: '', obs: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { loadDosare() }, [])

  async function loadDosare() {
    setLoading(true)
    const { data, error } = await supabase
      .from('dosar_data')
      .select('*')
      .order('ts', { ascending: false })
    if (!error) {
      const grouped = {}
      PERSONAL_LIST.forEach(p => grouped[p.id] = [])
      ;(data || []).forEach(d => {
        if (grouped[d.personal_id]) grouped[d.personal_id].push(d)
      })
      setDosare(grouped)
    }
    setLoading(false)
  }

  async function saveDoc() {
    if (!form.cod || !form.den) { alert('Cod și denumire sunt obligatorii!'); return }
    setSaving(true)
    const rec = {
      id: 'DOS-' + Date.now(),
      personal_id: selected.id,
      cod: form.cod,
      den: form.den,
      tip: form.tip,
      data: form.data || null,
      expirare: form.expirare || null,
      institutie: form.institutie,
      nr: form.nr,
      obs: form.obs,
      ts: new Date().toISOString(),
    }
    const { error } = await supabase.from('dosar_data').insert(rec)
    if (error) { alert('Eroare: ' + error.message) }
    else {
      setDosare(prev => ({ ...prev, [selected.id]: [rec, ...(prev[selected.id] || [])] }))
      setShowAdd(false)
      setForm(emptyForm)
    }
    setSaving(false)
  }

  async function deleteDoc(docId, personalId) {
    if (!window.confirm('Ștergeți documentul?')) return
    await supabase.from('dosar_data').delete().eq('id', docId)
    setDosare(prev => ({ ...prev, [personalId]: prev[personalId].filter(d => d.id !== docId) }))
  }

  async function uploadFile(docId, personalId, file) {
    if (!file) return
    setUploadingId(docId)
    try {
      const path = `dosar/${personalId}/${docId}/${file.name}`
      const { error: upErr } = await supabase.storage.from('documente').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('documente').getPublicUrl(path)
      await supabase.from('dosar_data').update({ fisier: urlData.publicUrl }).eq('id', docId)
      setDosare(prev => ({
        ...prev,
        [personalId]: prev[personalId].map(d => d.id === docId ? { ...d, fisier: urlData.publicUrl } : d)
      }))
    } catch (e) {
      alert('Eroare upload: ' + e.message)
    }
    setUploadingId(null)
  }

  function quickAdd(template) {
    setForm({ ...emptyForm, cod: template.cod, den: template.den, tip: template.tip })
    setShowAdd(true)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Se încarcă...</div>

  // DOSAR VIEW
  if (selected) {
    const dosar = dosare[selected.id] || []
    const completare = calcCompletare(dosar)
    const coduriFata = dosar.map(d => d.cod)
    const lipsesc = DOCS_OBLIGATORII.filter(d => !coduriFata.includes(d.cod))
    const expirateList = dosar.filter(d => isExpirat(d))
    const expiraCurandList = dosar.filter(d => isExpiraCurand(d))

    return (
      <div className="p-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setSelected(null)}
            className="text-gray-400 hover:text-gray-600 text-sm">← Înapoi</button>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${selected.color}`}>
            {selected.initiale}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{selected.nume}</h1>
            <p className="text-sm text-gray-500">{selected.functie}</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${completare >= 80 ? 'text-green-600' : completare >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {completare}%
              </div>
              <div className="text-xs text-gray-400">dosar complet</div>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Adaugă document
            </button>
          </div>
        </div>

        {/* Bară progres */}
        <div className="bg-gray-100 rounded-full h-3 mb-6">
          <div className={`h-3 rounded-full transition-all ${completare >= 80 ? 'bg-green-500' : completare >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: completare + '%' }} />
        </div>

        {/* Alerte */}
        {expirateList.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="font-medium text-red-700 mb-2">⚠ Documente expirate ({expirateList.length})</div>
            {expirateList.map(d => (
              <div key={d.id} className="text-sm text-red-600">• {d.den} — expirat la {d.expirare}</div>
            ))}
          </div>
        )}
        {expiraCurandList.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="font-medium text-amber-700 mb-2">⏰ Expiră în 30 zile ({expiraCurandList.length})</div>
            {expiraCurandList.map(d => (
              <div key={d.id} className="text-sm text-amber-600">• {d.den} — scadent la {d.expirare}</div>
            ))}
          </div>
        )}

        {/* Documente lipsă */}
        {lipsesc.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <div className="font-medium text-gray-700 mb-3">Documente obligatorii lipsă ({lipsesc.length})</div>
            <div className="flex flex-wrap gap-2">
              {lipsesc.map(d => (
                <button key={d.cod}
                  onClick={() => quickAdd(d)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  + {d.den}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documente existente */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b font-medium text-gray-700">
            Documente în dosar ({dosar.length})
          </div>
          {dosar.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Niciun document adăugat.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Cod</th>
                  <th className="px-4 py-3 text-left">Denumire</th>
                  <th className="px-4 py-3 text-left">Tip</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Expiră</th>
                  <th className="px-4 py-3 text-left">Fișier</th>
                  <th className="px-4 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dosar.map(d => (
                  <tr key={d.id} className={`hover:bg-gray-50 ${isExpirat(d) ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{d.cod}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{d.den}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs border ${TIP_COLORS[d.tip] || ''}`}>
                        {TIP_LABELS[d.tip] || d.tip}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{d.data || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {d.expirare ? (
                        <span className={isExpirat(d) ? 'text-red-600 font-medium' : isExpiraCurand(d) ? 'text-amber-600' : 'text-gray-500'}>
                          {d.expirare} {isExpirat(d) ? '⚠' : isExpiraCurand(d) ? '⏰' : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {d.fisier ? (
                        <a href={d.fisier} target="_blank" rel="noreferrer"
                          className="text-blue-600 text-sm underline">📄 Vezi</a>
                      ) : (
                        <label className="cursor-pointer text-gray-400 hover:text-blue-600 text-sm">
                          {uploadingId === d.id ? '⏳...' : '📎 Upload'}
                          <input type="file" accept=".pdf,.jpg,.png" className="hidden"
                            onChange={e => uploadFile(d.id, selected.id, e.target.files[0])} />
                        </label>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteDoc(d.id, selected.id)}
                        className="text-gray-300 hover:text-red-500 text-sm">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL ADD DOC */}
        {showAdd && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold">Adaugă document — {selected.nume}</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cod *</label>
                    <select value={form.cod}
                      onChange={e => {
                        const tmpl = DOCS_OBLIGATORII.find(d => d.cod === e.target.value)
                        if (tmpl) setForm(p => ({ ...p, cod: tmpl.cod, den: tmpl.den, tip: tmpl.tip }))
                        else setForm(p => ({ ...p, cod: e.target.value }))
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <option value="">— selectați —</option>
                      {DOCS_OBLIGATORII.map(d => (
                        <option key={d.cod} value={d.cod}>{d.cod} — {d.den.slice(0, 30)}</option>
                      ))}
                      <option value="ALTUL">Altul (manual)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                    <select value={form.tip}
                      onChange={e => setForm(p => ({ ...p, tip: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      {Object.entries(TIP_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Denumire *</label>
                  <input type="text" value={form.den}
                    onChange={e => setForm(p => ({ ...p, den: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data eliberării</label>
                    <input type="date" value={form.data}
                      onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data expirării</label>
                    <input type="date" value={form.expirare}
                      onChange={e => setForm(p => ({ ...p, expirare: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instituție emitentă</label>
                    <input type="text" value={form.institutie}
                      onChange={e => setForm(p => ({ ...p, institutie: e.target.value }))}
                      placeholder="ex. USMF Nicolae Testemițanu"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nr. document</label>
                    <input type="text" value={form.nr}
                      onChange={e => setForm(p => ({ ...p, nr: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observații</label>
                  <textarea value={form.obs} rows={2}
                    onChange={e => setForm(p => ({ ...p, obs: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => { setShowAdd(false); setForm(emptyForm) }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg">Anulare</button>
                <button onClick={saveDoc} disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // LISTA PERSONAL
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Personal</h1>
        <p className="text-sm text-gray-500">Dosare personal · ISO 15189:2023 §6.2 · {DOCS_OBLIGATORII.length} documente obligatorii per angajat</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {PERSONAL_LIST.map(p => {
          const dosar = dosare[p.id] || []
          const completare = calcCompletare(dosar)
          const expirate = dosar.filter(d => isExpirat(d)).length
          const lipsesc = DOCS_OBLIGATORII.filter(d => !dosar.find(x => x.cod === d.cod)).length

          return (
            <div key={p.id}
              onClick={() => setSelected(p)}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${p.color}`}>
                {p.initiale}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">{p.nume}</div>
                <div className="text-sm text-gray-500">{p.functie}</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${completare >= 80 ? 'bg-green-500' : completare >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: completare + '%' }} />
                  </div>
                  <span className={`text-sm font-bold ${completare >= 80 ? 'text-green-600' : completare >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {completare}%
                  </span>
                </div>
              </div>
              <div className="flex gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-700">{dosar.length}</div>
                  <div className="text-xs text-gray-400">documente</div>
                </div>
                {lipsesc > 0 && (
                  <div>
                    <div className="text-lg font-bold text-red-500">{lipsesc}</div>
                    <div className="text-xs text-red-400">lipsesc</div>
                  </div>
                )}
                {expirate > 0 && (
                  <div>
                    <div className="text-lg font-bold text-red-600">{expirate}</div>
                    <div className="text-xs text-red-400">expirate</div>
                  </div>
                )}
              </div>
              <div className="text-gray-300 text-xl">›</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
