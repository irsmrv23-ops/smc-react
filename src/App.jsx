import { useState } from 'react'
import NC from './pages/NC'
import Documente from './pages/Documente'
import Personal from './pages/Personal'
import Calitate from './pages/Calitate'
import Stocuri from './pages/Stocuri'
import Registre from './pages/Registre'

const menu = [
  { id: 'nc', label: 'Neconformități', icon: '⚠️' },
  { id: 'documente', label: 'Documente SMC', icon: '📄' },
  { id: 'personal', label: 'Personal', icon: '👤' },
  { id: 'calitate', label: 'Calitate', icon: '🔬' },
  { id: 'stocuri', label: 'Stocuri & Metrologie', icon: '📦' },
  { id: 'registre', label: 'Registre electronice', icon: '📋' },
]

function App() {
  const [page, setPage] = useState('nc')
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 min-h-screen">
        <div className="p-4 border-b">
          <div className="font-bold text-blue-700 text-sm">SMC Digital</div>
          <div className="text-xs text-gray-400">Invitro Diagnostics</div>
        </div>
        <nav className="p-2">
          {menu.map(m => (
            <button key={m.id} onClick={() => setPage(m.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 mb-1 transition-colors
                ${page === m.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span>{m.icon}</span><span>{m.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1">
        {page === 'nc' && <NC />}
        {page === 'documente' && <Documente />}
        {page === 'personal' && <Personal />}
        {page === 'calitate' && <Calitate />}
        {page === 'stocuri' && <Stocuri />}
        {page === 'registre' && <Registre />}
      </main>
    </div>
  )
}

export default App