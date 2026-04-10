import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NC from './pages/NC'
import Documente from './pages/Documente'
import Personal from './pages/Personal'
import Calitate from './pages/Calitate'
import Stocuri from './pages/Stocuri'
import Registre from './pages/Registre'
import Catalog from './pages/Catalog'

const MENU_ADMIN = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'nc', label: 'Neconformități', icon: '⚠️' },
  { id: 'documente', label: 'Documente SMC', icon: '📄' },
  { id: 'personal', label: 'Personal', icon: '👤' },
  { id: 'calitate', label: 'Calitate', icon: '🔬' },
  { id: 'stocuri', label: 'Stocuri & Metrologie', icon: '📦' },
  { id: 'registre', label: 'Registre electronice', icon: '📋' },
  { id: 'catalog', label: 'Catalog servicii', icon: '📑' },
]
const MENU_RMC = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'nc', label: 'Neconformități', icon: '⚠️' },
  { id: 'documente', label: 'Documente SMC', icon: '📄' },
  { id: 'personal', label: 'Personal', icon: '👤' },
  { id: 'calitate', label: 'Calitate', icon: '🔬' },
  { id: 'registre', label: 'Registre electronice', icon: '📋' },
  { id: 'catalog', label: 'Catalog servicii', icon: '📑' },
]
const MENU_BIOLOG = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'calitate', label: 'Calitate', icon: '🔬' },
  { id: 'registre', label: 'Registre electronice', icon: '📋' },
  { id: 'stocuri', label: 'Stocuri & Metrologie', icon: '📦' },
]

const ROL_COLORS = {
  admin: 'bg-blue-100 text-blue-700',
  rmc: 'bg-purple-100 text-purple-700',
  biolog: 'bg-teal-100 text-teal-700',
}
const ROL_LABELS = { admin: 'Administrator', rmc: 'RMC', biolog: 'Biolog medical' }

export default function App() {
  const [session, setSession] = useState(null)
  const [userRol, setUserRol] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [moldacData, setMoldacData] = useState(localStorage.getItem('moldac_data') || '2025-05-01')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: roleData } = await supabase.from('user_roles').select('*').eq('email', session.user.email).single()
        if (roleData?.activ) {
          setSession(session)
          setUserRol(roleData)
        } else {
          await supabase.auth.signOut()
        }
      }
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUserRol(null)
        setPage('dashboard')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  function handleLogin({ user, rol }) {
    setSession({ user })
    setUserRol(rol)
    setPage('dashboard')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
    setUserRol(null)
  }

  function handleMoldacChange(val) {
    setMoldacData(val)
    localStorage.setItem('moldac_data', val)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>Se încarcă SMC Digital...</div>
      </div>
    </div>
  )

  if (!session || !userRol) return <Login onLogin={handleLogin} />

  const menu = userRol.rol === 'admin' ? MENU_ADMIN : userRol.rol === 'rmc' ? MENU_RMC : MENU_BIOLOG
  const initiale = userRol.nume?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 min-h-screen flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <div className="font-bold text-blue-700 text-sm">SMC Digital</div>
          <div className="text-xs text-gray-400">Invitro Diagnostics SRL</div>
        </div>
        <nav className="p-2 flex-1">
          {menu.map(m => (
            <button key={m.id} onClick={() => setPage(m.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 mb-1 transition-colors
                ${page === m.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span>{m.icon}</span><span>{m.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1d4ed8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {initiale}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userRol.nume}</div>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500 }} className={ROL_COLORS[userRol.rol]}>
                {ROL_LABELS[userRol.rol]}
              </span>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px', fontSize: 12, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            🚪 Deconectare
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {page === 'dashboard' && <Dashboard onNavigate={setPage} moldacData={moldacData} onMoldacChange={handleMoldacChange} userRol={userRol} />}
        {page === 'nc' && <NC userRol={userRol} />}
        {page === 'documente' && <Documente userRol={userRol} />}
        {page === 'personal' && <Personal userRol={userRol} />}
        {page === 'calitate' && <Calitate userRol={userRol} />}
        {page === 'stocuri' && <Stocuri userRol={userRol} />}
        {page === 'registre' && <Registre userRol={userRol} />}
        {page === 'catalog' && <Catalog userRol={userRol} />}
      </main>
    </div>
  )
}
