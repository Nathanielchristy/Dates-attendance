import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

export default function Layout({ children, navItems, activePage, setActivePage }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  if (isMobile) {
    return (
      <div style={M.root}>
        {/* Mobile top header */}
        <header style={M.header}>
          <div style={M.headerLeft}>
            <div style={M.logoIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <div style={M.logoText}>AttendTrack</div>
            </div>
          </div>
          <div style={M.headerRight}>
            <div style={M.userAvatar}>{user?.name?.[0]?.toUpperCase() || '?'}</div>
            <button style={M.logoutBtnSmall} onClick={handleLogout}>↩</button>
          </div>
        </header>

        {/* Scrollable content — padded above bottom bar */}
        <main style={M.main}>{children}</main>

        {/* Bottom navigation bar */}
        <nav style={M.bottomBar}>
          {navItems.map(item => (
            <button
              key={item.id}
              style={{
                ...M.bottomItem,
                ...(activePage === item.id ? M.bottomItemActive : {}),
              }}
              onClick={() => setActivePage(item.id)}
            >
              <span style={M.bottomIcon}>{item.icon}</span>
              <span style={{
                ...M.bottomLabel,
                color: activePage === item.id ? '#60a5fa' : '#5a6a8a',
              }}>{item.label}</span>
            </button>
          ))}
          {/* Logout tab at end */}
          <button style={M.bottomItem} onClick={handleLogout}>
            <span style={M.bottomIcon}>↩</span>
            <span style={{...M.bottomLabel, color:'#5a6a8a'}}>Logout</span>
          </button>
        </nav>
      </div>
    )
  }

  // ── Desktop sidebar layout ────────────────────────────────────────────────
  return (
    <div style={D.root}>
      <aside style={{...D.sidebar, width: collapsed ? 64 : 230}}>
        <div style={D.logoArea}>
          <div style={D.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div style={D.logoText}>AttendTrack</div>
              <div style={D.logoBadge}>{user?.role === 'admin' ? 'Admin' : 'Employee'}</div>
            </div>
          )}
          <button style={{...D.collapseBtn, marginLeft: collapsed ? 0 : 'auto'}} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav style={D.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              style={{
                ...D.navItem,
                ...(activePage === item.id ? D.navItemActive : {}),
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              onClick={() => setActivePage(item.id)}
              title={collapsed ? item.label : ''}
            >
              <span style={{fontSize: 17}}>{item.icon}</span>
              {!collapsed && <span style={D.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={D.sidebarFooter}>
          {!collapsed && (
            <div style={D.userCard}>
              <div style={D.userAvatar}>{user?.name?.[0]?.toUpperCase() || '?'}</div>
              <div>
                <div style={D.userName}>{user?.name}</div>
                <div style={D.userDept}>{user?.department || user?.role}</div>
              </div>
            </div>
          )}
          <button style={{...D.logoutBtn, justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={handleLogout}>
            <span>↩</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main style={D.main}>{children}</main>
    </div>
  )
}

// ── Mobile styles ─────────────────────────────────────────────────────────────
const M = {
  root: { display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg)', overflow:'hidden' },

  header: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'0 16px', height:56, flexShrink:0,
    background:'var(--surface)', borderBottom:'1px solid var(--border)',
  },
  headerLeft:  { display:'flex', alignItems:'center', gap:10 },
  headerRight: { display:'flex', alignItems:'center', gap:8 },
  logoIcon: {
    width:32, height:32, background:'linear-gradient(135deg, #2563eb, #1d4ed8)',
    borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    boxShadow:'0 0 14px rgba(37,99,235,0.35)',
  },
  logoText: { fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700 },
  userAvatar: {
    width:30, height:30, borderRadius:8, background:'linear-gradient(135deg, #2563eb, #1d4ed8)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:12,
  },
  logoutBtnSmall: {
    background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)',
    color:'#f87171', borderRadius:8, cursor:'pointer', fontSize:14,
    width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
  },

  main: { flex:1, overflowY:'auto', padding:'20px 16px', paddingBottom:90 },

  bottomBar: {
    position:'fixed', bottom:0, left:0, right:0, height:64,
    background:'var(--surface)', borderTop:'1px solid var(--border)',
    display:'flex', alignItems:'stretch',
    paddingBottom:'env(safe-area-inset-bottom)',
    zIndex:100,
  },
  bottomItem: {
    flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    gap:3, border:'none', background:'none', cursor:'pointer', padding:'6px 4px',
    transition:'all 0.15s',
  },
  bottomItemActive: {
    background:'rgba(37,99,235,0.08)',
    borderTop:'2px solid #3b82f6',
  },
  bottomIcon:  { fontSize:18, lineHeight:1 },
  bottomLabel: { fontSize:10, fontWeight:600, fontFamily:'Instrument Sans, sans-serif', whiteSpace:'nowrap' },
}

// ── Desktop styles ────────────────────────────────────────────────────────────
const D = {
  root: { display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' },
  sidebar: {
    background:'var(--surface)', borderRight:'1px solid var(--border)',
    display:'flex', flexDirection:'column', flexShrink:0,
    transition:'width 0.25s ease', overflow:'hidden',
  },
  logoArea: { display:'flex', alignItems:'center', gap:10, padding:'20px 16px', borderBottom:'1px solid var(--border)', minHeight:65 },
  logoIcon: {
    width:34, height:34, background:'linear-gradient(135deg, #2563eb, #1d4ed8)',
    borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    boxShadow:'0 0 16px rgba(37,99,235,0.35)',
  },
  logoText:    { fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, whiteSpace:'nowrap' },
  logoBadge:   { fontSize:10, color:'#3b82f6', fontWeight:700, background:'rgba(37,99,235,0.12)', padding:'1px 7px', borderRadius:8, display:'inline-block', marginTop:2 },
  collapseBtn: { background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, padding:'4px 6px', borderRadius:6, flexShrink:0 },
  nav:         { flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:3 },
  navItem: {
    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
    borderRadius:10, border:'none', background:'none', color:'var(--text-muted)',
    cursor:'pointer', width:'100%', fontFamily:'Instrument Sans, sans-serif', fontSize:14, fontWeight:500,
    transition:'all 0.15s',
  },
  navItemActive:  { background:'rgba(37,99,235,0.12)', color:'#60a5fa' },
  navLabel:       { whiteSpace:'nowrap' },
  sidebarFooter:  { padding:'12px 8px', borderTop:'1px solid var(--border)' },
  userCard:       { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', marginBottom:8, background:'rgba(255,255,255,0.03)', borderRadius:10 },
  userAvatar: {
    width:32, height:32, borderRadius:8, background:'linear-gradient(135deg, #2563eb, #1d4ed8)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:13, flexShrink:0,
  },
  userName:  { fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:120 },
  userDept:  { fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' },
  logoutBtn: {
    display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 12px',
    background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)',
    color:'#f87171', borderRadius:10, cursor:'pointer', fontSize:13,
    fontFamily:'Instrument Sans, sans-serif', transition:'all 0.15s',
  },
  main: { flex:1, overflow:'auto', padding:'32px 36px' },
}
