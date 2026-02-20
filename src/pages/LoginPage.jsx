import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { sanitizeField } from '../lib/security'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleLogin = async () => {
    setError('')
    const u = sanitizeField(username, 40)
    if (!u || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    const result = await login(u, password)
    setLoading(false)
    if (!result.success) { setError(result.message || 'Invalid username or password.'); return }
    navigate(result.role === 'admin' ? '/admin' : '/employee', { replace: true })
  }

  return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={{...styles.orb, width:500, height:500, top:-150, right:-100, background:'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)'}} />
      <div style={{...styles.orb, width:400, height:400, bottom:-100, left:-80, background:'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)'}} />

      <div style={styles.card} className="fade-up">
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoName}>AttendTrack</div>
            <div style={styles.logoSub}>Workforce Management</div>
          </div>
        </div>

        <h1 style={styles.heading}>Welcome back</h1>
        <p style={styles.subheading}>Sign in to your account</p>

        <div style={styles.field}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Enter username"
            autoComplete="username"
            autoFocus
            maxLength={40}
            spellCheck={false}
            autoCapitalize="none"
            onFocus={e => e.target.style.borderColor='#2563eb'}
            onBlur={e  => e.target.style.borderColor='#1a2744'}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <div style={{position:'relative'}}>
            <input
              style={{...styles.input, paddingRight:44}}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              autoComplete="current-password"
              maxLength={128}
              onFocus={e => e.target.style.borderColor='#2563eb'}
              onBlur={e  => e.target.style.borderColor='#1a2744'}
            />
            <button
              style={styles.eyeBtn}
              onClick={() => setShowPw(s => !s)}
              tabIndex={-1}
              type="button"
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={{marginRight:8}}>⚠️</span>{error}
          </div>
        )}

        <button
          style={{...styles.btn, opacity: loading ? 0.7 : 1}}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? <span className="spinner" style={{width:16,height:16}} /> : 'Sign In'}
        </button>

        <div style={styles.hint}>
          <span style={{color:'#5a6a8a'}}>Default admin: </span>
          <span style={{color:'#8899bb', fontFamily:'monospace'}}>admin / Admin@123</span>
        </div>

        <div style={styles.securityNote}>
          🔒 Accounts lock for 15 min after 5 failed attempts
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', position:'relative', overflow:'hidden', padding:'20px' },
  grid: { position:'absolute', inset:0, zIndex:0, backgroundImage:'linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)', backgroundSize:'40px 40px' },
  orb:  { position:'absolute', borderRadius:'50%', zIndex:0, pointerEvents:'none' },
  card: { position:'relative', zIndex:1, background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'44px 40px', width:'100%', maxWidth:420, boxShadow:'0 0 80px rgba(37,99,235,0.08), 0 32px 64px rgba(0,0,0,0.4)' },
  logoRow:  { display:'flex', alignItems:'center', gap:12, marginBottom:36 },
  logoIcon: { width:42, height:42, background:'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(37,99,235,0.4)' },
  logoName: { fontFamily:'Syne, sans-serif', fontSize:19, fontWeight:700, color:'var(--text)' },
  logoSub:  { fontSize:11, color:'var(--text-muted)', marginTop:1 },
  heading:    { fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:700, letterSpacing:'-0.5px', marginBottom:6 },
  subheading: { color:'var(--text-muted)', fontSize:14, marginBottom:32 },
  field: { marginBottom:20 },
  label: { display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:8 },
  input: { width:'100%', background:'#090e1a', border:'1px solid #1a2744', color:'var(--text)', padding:'12px 16px', borderRadius:10, fontSize:15, fontFamily:'Instrument Sans, sans-serif', outline:'none', transition:'border-color 0.2s' },
  eyeBtn: { position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, padding:4, lineHeight:1 },
  errorBox: { color:'var(--error)', fontSize:13, marginBottom:16, padding:'11px 14px', background:'var(--error-bg)', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center' },
  btn: { width:'100%', padding:'13px', background:'linear-gradient(135deg, #2563eb, #1d4ed8)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:600, fontFamily:'Syne, sans-serif', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, letterSpacing:'0.3px', marginBottom:20, transition:'opacity 0.2s', boxShadow:'0 4px 20px rgba(37,99,235,0.35)' },
  hint: { textAlign:'center', fontSize:13, marginBottom:12 },
  securityNote: { textAlign:'center', fontSize:11, color:'var(--text-muted)', padding:'8px', background:'rgba(37,99,235,0.05)', borderRadius:8, border:'1px solid rgba(37,99,235,0.1)' },
}
