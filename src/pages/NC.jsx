import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function NC() {
  const [ncData, setNcData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    loadNC()
  }, [])

  async function loadNC() {
    setLoading(true)
    const { data, error } = await supabase
      .from('nc_data')
      .select('*')
      .order('data', { ascending: false })
    if (!error) setNcData(data || [])
    setLoading(false)
  }

  const filtered = ncData.filter(n =>
    !filter || n.status === filter
  )

  const deschise = ncData.filter(n => n.status === 'deschis').length
  const inchise = ncData.filter(n => n.status === 'inchis').length

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Neconformități</h1>
          <p className="text-sm text-gray-500">ISO 15189:2023 §8.7</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + NC nouă
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{deschise}</div>
          <div className="text-sm text-red-500">Deschise</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{inchise}</div>
          <div className="text-sm text-green-500">Închise</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{ncData.length}</div>
          <div className="text-sm text-blue-500">Total</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b flex gap-2">
          {['', 'deschis', 'investigare', 'inchis'].map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === '' ? 'Toate' : s === 'deschis' ? 'Deschise' : s === 'investigare' ? 'Investigare' : 'Închise'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Se încarcă...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nicio neconformitate găsită</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Cod</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Tip</th>
                <th className="px-4 py-3 text-left">Descriere</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(n => (
                <tr key={n.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-sm font-bold text-blue-700">{n.cod}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{n.data}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{n.tip}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{n.descriere}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${n.status === 'inchis' ? 'bg-green-100 text-green-700' :
                        n.status === 'investigare' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'}`}>
                      {n.status === 'inchis' ? 'Închisă' : n.status === 'investigare' ? 'Investigare' : 'Deschisă'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}