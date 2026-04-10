import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [parola, setParola] = useState('')
  const [loading, setLoading] = useState(false)
  const [eroare, setEroare] = useState('')
  const [showParola, setShowParola] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !parola) { setEroare('Introduceți emailul și parola!'); return }
    setLoading(true)
    setEroare('')
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: parola })
    if (error) {
      setEroare('Email sau parolă incorectă.')
      setLoading(false)
      return
    }
    // Verifică rol
    const { data: roleData } = await supabase.from('user_roles').select('*').eq('email', email.trim().toLowerCase()).single()
    if (!roleData || !roleData.activ) {
      await supabase.auth.signOut()
      setEroare('Contul dvs. nu este activ. Contactați administratorul.')
      setLoading(false)
      return
    }
    onLogin({ user: data.user, rol: roleData })
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: '#1d4ed8', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28 }}>🔬</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>SMC Digital</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Invitro Diagnostics SRL</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Laborator Biologie Moleculară</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ex. irotari@invitro.md"
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#1d4ed8'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Parolă</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showParola ? 'text' : 'password'}
                value={parola}
                onChange={e => setParola(e.target.value)}
                placeholder="Parola dvs."
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 40px 10px 14px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button type="button" onClick={() => setShowParola(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>
                {showParola ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {eroare && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
              ⚠ {eroare}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', background: loading ? '#93c5fd' : '#1d4ed8', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
            {loading ? 'Se conectează...' : 'Autentificare'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '14px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Prima autentificare? Contactați administratorul<br/>pentru a seta parola contului dvs.
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#cbd5e1' }}>
          SR EN ISO 15189:2023 · MOLDAC LM-003
        </div>
      </div>
    </div>
  )
}
