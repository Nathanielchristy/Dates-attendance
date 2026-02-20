import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useNavigate } from 'react-router-dom'

export default function Layout({ children, navItems, activePage, setActivePage }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <aside style={{...styles.sidebar, width: collapsed ? 64 : 230}}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div style={styles.logoText}>AttendTrack</div>
              <div style={styles.logoBadge}>{user?.role === 'admin' ? 'Admin' : 'Employee'}</div>
            </div>
          )}
          <button style={{...styles.collapseBtn, marginLeft: collapsed ? 0 : 'auto'}} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                ...(activePage === item.id ? styles.navItemActive : {}),
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              onClick={() => setActivePage(item.id)}
              title={collapsed ? item.label : ''}
            >
              <span style={{fontSize: 17}}>{item.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          {!collapsed && (
            <div style={styles.userCard}>
              <div style={styles.userAvatar}>{user?.name?.[0]?.toUpperCase() || '?'}</div>
              <div>
                <div style={styles.userName}>{user?.name}</div>
                <div style={styles.userDept}>{user?.department || user?.role}</div>
              </div>
            </div>
          )}
          <button style={{...styles.logoutBtn, justifyContent: collapsed ? 'center' : 'flex-start'}} onClick={handleLogout}>
            <span>↩</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>{children}</main>
    </div>
  )
}

const styles = {
  root: { display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' },
  sidebar: {
    background: 'var(--surface)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
    transition: 'width 0.25s ease', overflow: 'hidden',
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px', borderBottom: '1px solid var(--border)', minHeight: 65 },
  logoIcon: {
    width: 34, height: 34, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    boxShadow: '0 0 16px rgba(37,99,235,0.35)',
  },
  logoText: { fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' },
  logoBadge: { fontSize: 10, color: '#3b82f6', fontWeight: 700, background: 'rgba(37,99,235,0.12)', padding: '1px 7px', borderRadius: 8, display: 'inline-block', marginTop: 2 },
  collapseBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 6, flexShrink: 0 },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 3 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 10, border: 'none', background: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', width: '100%', fontFamily: 'Instrument Sans, sans-serif', fontSize: 14, fontWeight: 500,
    transition: 'all 0.15s',
  },
  navItemActive: { background: 'rgba(37,99,235,0.12)', color: '#60a5fa' },
  navLabel: { whiteSpace: 'nowrap' },
  sidebarFooter: { padding: '12px 8px', borderTop: '1px solid var(--border)' },
  userCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 10 },
  userAvatar: {
    width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 },
  userDept: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px',
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
    color: '#f87171', borderRadius: 10, cursor: 'pointer', fontSize: 13,
    fontFamily: 'Instrument Sans, sans-serif', transition: 'all 0.15s',
  },
  main: { flex: 1, overflow: 'auto', padding: '32px 36px' },
}
