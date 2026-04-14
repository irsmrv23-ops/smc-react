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
import './design.css'

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

const ROL_LABELS = { admin: 'Administrator', rmc: 'RMC', biolog: 'Biolog medical' }

export default function App() {
  const [session, setSession] = useState(null)
  const [userRol, setUserRol] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [moldacData, setMoldacData] = useState(localStorage.getItem('moldac_data') || '2025-05-01')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: roleData } = await supabase.from('user_roles').select('*').eq('email', session.user.email).single()
        if (roleData?.activ) { setSession(session); setUserRol(roleData) }
        else await supabase.auth.signOut()
      }
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { setSession(null); setUserRol(null); setPage('dashboard') }
    })
    return () => subscription.unsubscribe()
  }, [])

  function handleLogin({ user, rol }) { setSession({ user }); setUserRol(rol); setPage('dashboard') }
  async function handleLogout() { await supabase.auth.signOut(); setSession(null); setUserRol(null) }
  function handleMoldacChange(val) { setMoldacData(val); localStorage.setItem('moldac_data', val) }

  function navigate(p) { setPage(p); setSidebarOpen(false) }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, background: '#1a56db', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px', boxShadow: '0 8px 20px rgba(26,86,219,0.4)' }}>🔬</div>
        <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>SMC Digital</div>
        <div style={{ color: '#64748b', fontSize: 13 }}>Invitro Diagnostics SRL</div>
        <div style={{ marginTop: 24, display: 'flex', gap: 6, justifyContent: 'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a56db', animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    </div>
  )

  if (!session || !userRol) return <Login onLogin={handleLogin} />

  const menu = userRol.rol === 'admin' ? MENU_ADMIN : userRol.rol === 'rmc' ? MENU_RMC : MENU_BIOLOG
  const initiale = userRol.nume?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const currentPage = menu.find(m => m.id === page)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Mobile overlay */}
      <div className={`mobile-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">🔬</div>
          <div className="sidebar-logo-title">SMC Digital</div>
          <div className="sidebar-logo-sub">Invitro Diagnostics SRL</div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="sidebar-section">Navigare</div>
          {menu.map(m => (
            <button key={m.id} onClick={() => navigate(m.id)}
              className={`sidebar-btn ${page === m.id ? 'active' : ''}`}>
              <span className="sidebar-icon">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="sidebar-user">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{initiale}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{userRol.nume}</div>
              <div className="sidebar-user-rol">{ROL_LABELS[userRol.rol]}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            🚪 Deconectare
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Mobile header */}
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <span /><span /><span />
          </button>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
            {currentPage?.icon} {currentPage?.label}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1 }} className="fade-in">
          {page === 'dashboard' && <Dashboard onNavigate={navigate} moldacData={moldacData} onMoldacChange={handleMoldacChange} userRol={userRol} />}
          {page === 'nc' && <NC userRol={userRol} />}
          {page === 'documente' && <Documente userRol={userRol} />}
          {page === 'personal' && <Personal userRol={userRol} />}
          {page === 'calitate' && <Calitate userRol={userRol} />}
          {page === 'stocuri' && <Stocuri userRol={userRol} />}
          {page === 'registre' && <Registre userRol={userRol} />}
          {page === 'catalog' && <Catalog userRol={userRol} />}
        </div>
      </div>
    </div>
  )
}
