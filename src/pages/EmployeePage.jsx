import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const NAV = [
  { id: 'clock', icon: '🕐', label: 'Clock In / Out' },
  { id: 'history', icon: '📋', label: 'My Attendance' },
]

export default function EmployeePage() {
  const { user } = useAuth()
  const [page, setPage] = useState('clock')

  return (
    <Layout navItems={NAV} activePage={page} setActivePage={setPage}>
      {page === 'clock' && <ClockPage user={user} />}
      {page === 'history' && <HistoryPage user={user} />}
    </Layout>
  )
}

// ─── CLOCK PAGE ────────────────────────────────────────────────────────────────
function ClockPage({ user }) {
  const [now, setNow] = useState(new Date())
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { fetchToday() }, [user])

  const fetchToday = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', user.id)
      .eq('date', today)
      .single()
    setTodayRecord(data || null)
    setLoading(false)
  }

  const clockIn = async () => {
    setActionLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const timeIn = now.toTimeString().split(' ')[0]
    const { error } = await supabase.from('attendance').insert({
      employee_id: user.id,
      date: today,
      time_in: timeIn,
      status: 'present',
    })
    if (!error) { setMsg({ type: 'success', text: `Clocked in at ${fmtTime(timeIn)}` }); await fetchToday() }
    else setMsg({ type: 'error', text: 'Failed to clock in. Try again.' })
    setActionLoading(false)
  }

  const clockOut = async () => {
    setActionLoading(true)
    const timeOut = now.toTimeString().split(' ')[0]
    const [ih, im, is_] = todayRecord.time_in.split(':').map(Number)
    const [oh, om, os] = timeOut.split(':').map(Number)
    const totalHours = ((oh * 3600 + om * 60 + os) - (ih * 3600 + im * 60 + is_)) / 3600
    const { error } = await supabase
      .from('attendance')
      .update({ time_out: timeOut, total_hours: Math.max(0, totalHours).toFixed(2) })
      .eq('id', todayRecord.id)
    if (!error) {
      setMsg({ type: 'success', text: `Clocked out at ${fmtTime(timeOut)} · ${Math.max(0,totalHours).toFixed(1)}h worked` })
      await fetchToday()
    } else setMsg({ type: 'error', text: 'Failed to clock out. Try again.' })
    setActionLoading(false)
  }

  const canClockIn = !todayRecord
  const canClockOut = todayRecord && !todayRecord.time_out
  const isDone = todayRecord?.time_out

  const timeStr = now.toLocaleTimeString('en-US', { hour12: false })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div>
      <h1 style={styles.h1} className="fade-up">Clock In / Out</h1>
      <p style={styles.sub} className="fade-up fade-up-delay-1">
        Good {getTimeOfDay()}, {user.name.split(' ')[0]}
      </p>

      {/* Big clock */}
      <div style={styles.clockCard} className="fade-up fade-up-delay-2">
        <div style={styles.clockTime}>{timeStr}</div>
        <div style={styles.clockDate}>{dateStr}</div>

        {!loading && (
          <div style={{...styles.statusPill, ...(isDone ? styles.pillDone : canClockIn ? styles.pillOut : styles.pillIn)}}>
            <span style={styles.statusDot} />
            {isDone ? 'Day Complete' : canClockIn ? 'Not Clocked In' : 'Clocked In'}
          </div>
        )}

        <div style={styles.clockBtns}>
          <button
            style={{...styles.clockBtn, ...styles.btnIn, opacity: (!canClockIn || actionLoading) ? 0.35 : 1}}
            disabled={!canClockIn || actionLoading}
            onClick={clockIn}
          >
            {actionLoading ? <span className="spinner" style={{width:18,height:18}} /> : '▶  Clock In'}
          </button>
          <button
            style={{...styles.clockBtn, ...styles.btnOut, opacity: (!canClockOut || actionLoading) ? 0.35 : 1}}
            disabled={!canClockOut || actionLoading}
            onClick={clockOut}
          >
            {actionLoading ? <span className="spinner" style={{width:18,height:18}} /> : '■  Clock Out'}
          </button>
        </div>
        {msg && (
          <div style={{...styles.msg, color: msg.type === 'success' ? 'var(--success)' : 'var(--error)'}}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Today stats */}
      <div style={styles.statsRow} className="fade-up fade-up-delay-3">
        {[
          { label: 'Time In', value: todayRecord?.time_in ? fmtTime(todayRecord.time_in) : '—' },
          { label: 'Time Out', value: todayRecord?.time_out ? fmtTime(todayRecord.time_out) : '—' },
          { label: 'Hours Today', value: todayRecord?.total_hours ? `${(+todayRecord.total_hours).toFixed(1)}h` : '—' },
        ].map(s => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statLabel}>{s.label}</div>
            <div style={styles.statVal}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
function HistoryPage({ user }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .order('date', { ascending: false })
        .limit(60)
      setRecords(data || [])
      setLoading(false)
    }
    fetch()
  }, [user])

  return (
    <div>
      <h1 style={styles.h1} className="fade-up">My Attendance</h1>
      <p style={styles.sub} className="fade-up fade-up-delay-1">Your complete attendance history</p>
      <div style={styles.tableCard} className="fade-up fade-up-delay-2">
        {loading ? (
          <div style={styles.center}><span className="spinner" /></div>
        ) : records.length === 0 ? (
          <div style={styles.empty}>No attendance records yet.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>{['Date','Time In','Time Out','Hours','Status'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {records.map(r => {
                const status = r.time_out ? 'complete' : r.time_in ? 'incomplete' : 'absent'
                return (
                  <tr key={r.id} style={styles.tr}>
                    <td style={styles.td}>{fmtDate(r.date)}</td>
                    <td style={styles.td}>{r.time_in ? fmtTime(r.time_in) : '—'}</td>
                    <td style={styles.td}>{r.time_out ? fmtTime(r.time_out) : '—'}</td>
                    <td style={styles.td}>{r.total_hours ? `${(+r.total_hours).toFixed(1)}h` : '—'}</td>
                    <td style={styles.td}><StatusBadge status={status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    complete:   { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Complete' },
    incomplete: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'No Checkout' },
    absent:     { bg: 'var(--error-bg)',   color: 'var(--error)',   label: 'Absent' },
  }
  const s = map[status]
  return <span style={{ background: s.bg, color: s.color, padding: '3px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hr = +h
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const styles = {
  h1: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6 },
  sub: { color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 },
  clockCard: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
    padding: '44px', textAlign: 'center', marginBottom: 24,
    boxShadow: '0 0 40px rgba(37,99,235,0.06)',
  },
  clockTime: { fontFamily: 'Syne, sans-serif', fontSize: 64, fontWeight: 700, letterSpacing: '-3px', fontVariantNumeric: 'tabular-nums' },
  clockDate: { color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 28 },
  statusPill: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 32 },
  statusDot: { width: 7, height: 7, borderRadius: '50%', background: 'currentColor', animation: 'pulse-dot 2s ease infinite' },
  pillOut: { background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' },
  pillIn:  { background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' },
  pillDone:{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.2)' },
  clockBtns: { display: 'flex', gap: 16, justifyContent: 'center' },
  clockBtn: { padding: '14px 40px', borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: 'Syne, sans-serif', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 0.2s' },
  btnIn:  { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' },
  btnOut: { background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', boxShadow: '0 4px 20px rgba(239,68,68,0.3)' },
  msg: { marginTop: 20, fontSize: 14 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 },
  statCard: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' },
  statLabel: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8, fontWeight: 600 },
  statVal: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: '-1px' },
  tableCard: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '13px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid rgba(26,39,68,0.5)' },
  td: { padding: '14px 20px', fontSize: 14 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  empty: { textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 },
}
