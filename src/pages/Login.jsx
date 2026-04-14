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
    if (error) { setEroare('Email sau parolă incorectă.'); setLoading(false); return }
    const { data: roleData } = await supabase.from('user_roles').select('*').eq('email', email.trim().toLowerCase()).single()
    if (!roleData || !roleData.activ) {
      await supabase.auth.signOut()
      setEroare('Contul dvs. nu este activ. Contactați administratorul.')
      setLoading(false); return
    }
    onLogin({ user: data.user, rol: roleData })
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">🔬</div>
          <div className="login-title">SMC Digital</div>
          <div className="login-sub">Invitro Diagnostics SRL · Biologie Moleculară</div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Adresa de email</label>
            <input type="email" className="form-control" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ex. irotari@invitro.md"
              autoComplete="email" />
          </div>

          <div className="form-group">
            <label className="form-label">Parola</label>
            <div style={{ position: 'relative' }}>
              <input type={showParola ? 'text' : 'password'} className="form-control"
                value={parola} onChange={e => setParola(e.target.value)}
                placeholder="Parola dvs."
                style={{ paddingRight: 40 }}
                autoComplete="current-password" />
              <button type="button" onClick={() => setShowParola(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, padding: 0 }}>
                {showParola ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {eroare && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              ⚠ {eroare}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, borderRadius: 10 }}>
            {loading ? '⏳ Se conectează...' : '🔐 Autentificare'}
          </button>
        </form>

        <div style={{ marginTop: 24, background: '#f8fafc', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 1.6 }}>
          Prima autentificare? Contactați administratorul<br />pentru a seta parola contului dvs.
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 4 }}>SR EN ISO 15189:2023 · MOLDAC LM-003</div>
          <div style={{ fontSize: 10, color: '#e2e8f0', opacity: 0.5 }}>© 2026 Invitro Diagnostics SRL</div>
        </div>
      </div>
    </div>
  )
}
