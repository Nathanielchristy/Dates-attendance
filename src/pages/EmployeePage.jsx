import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const NAV = [
  { id: 'clock',   icon: '🕐', label: 'Clock In/Out' },
  { id: 'history', icon: '📋', label: 'History' },
]

export default function EmployeePage() {
  const { user } = useAuth()
  const [page, setPage] = useState('clock')
  return (
    <Layout navItems={NAV} activePage={page} setActivePage={setPage}>
      {page === 'clock'   && <ClockPage user={user} />}
      {page === 'history' && <HistoryPage user={user} />}
    </Layout>
  )
}

// ─── CLOCK PAGE ───────────────────────────────────────────────────────────────
function ClockPage({ user }) {
  const [now, setNow]               = useState(new Date())
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg]               = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { fetchToday() }, [user])

  const fetchToday = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance').select('*')
      .eq('employee_id', user.id).eq('date', today).single()
    setTodayRecord(data || null)
    setLoading(false)
  }

  const clockIn = async () => {
    setActionLoading(true)
    const today  = new Date().toISOString().split('T')[0]
    const timeIn = now.toTimeString().split(' ')[0]
    const { error } = await supabase.from('attendance').insert({
      employee_id: user.id, date: today, time_in: timeIn, status: 'present',
    })
    if (!error) { setMsg({ type:'success', text:`Clocked in at ${fmtTime(timeIn)}` }); await fetchToday() }
    else setMsg({ type:'error', text:'Failed to clock in. Try again.' })
    setActionLoading(false)
  }

  const clockOut = async () => {
    setActionLoading(true)
    const timeOut = now.toTimeString().split(' ')[0]
    const [ih,im,is_] = todayRecord.time_in.split(':').map(Number)
    const [oh,om,os]  = timeOut.split(':').map(Number)
    const totalHours  = ((oh*3600+om*60+os)-(ih*3600+im*60+is_))/3600
    const { error } = await supabase.from('attendance')
      .update({ time_out: timeOut, total_hours: Math.max(0, totalHours).toFixed(2) })
      .eq('id', todayRecord.id)
    if (!error) {
      setMsg({ type:'success', text:`Clocked out at ${fmtTime(timeOut)} · ${Math.max(0,totalHours).toFixed(1)}h worked` })
      await fetchToday()
    } else setMsg({ type:'error', text:'Failed to clock out. Try again.' })
    setActionLoading(false)
  }

  const canClockIn  = !todayRecord
  const canClockOut = todayRecord && !todayRecord.time_out
  const isDone      = todayRecord?.time_out

  const timeStr = now.toLocaleTimeString('en-US', { hour12:false })
  const dateStr = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  return (
    <div>
      <h1 style={S.h1} className="fade-up">Clock In / Out</h1>
      <p style={S.sub} className="fade-up fade-up-delay-1">
        Good {getTimeOfDay()}, {user.name.split(' ')[0]}
      </p>

      <div style={S.clockCard} className="fade-up fade-up-delay-2">
        <div style={S.clockTime}>{timeStr}</div>
        <div style={S.clockDate}>{dateStr}</div>

        {!loading && (
          <div style={{
            ...S.statusPill,
            ...(isDone ? S.pillDone : canClockIn ? S.pillOut : S.pillIn)
          }}>
            <span style={S.statusDot} />
            {isDone ? 'Day Complete' : canClockIn ? 'Not Clocked In' : 'Clocked In'}
          </div>
        )}

        <div style={S.clockBtns}>
          <button
            style={{...S.clockBtn, ...S.btnIn, opacity:(!canClockIn||actionLoading)?0.35:1}}
            disabled={!canClockIn || actionLoading}
            onClick={clockIn}
          >
            {actionLoading ? <span className="spinner" style={{width:18,height:18}} /> : '▶  Clock In'}
          </button>
          <button
            style={{...S.clockBtn, ...S.btnOut, opacity:(!canClockOut||actionLoading)?0.35:1}}
            disabled={!canClockOut || actionLoading}
            onClick={clockOut}
          >
            {actionLoading ? <span className="spinner" style={{width:18,height:18}} /> : '■  Clock Out'}
          </button>
        </div>

        {msg && (
          <div style={{...S.msg, color: msg.type==='success' ? 'var(--success)' : 'var(--error)'}}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Responsive 3-col stats */}
      <div style={S.statsRow} className="fade-up fade-up-delay-3">
        {[
          { label:'Time In',      value: todayRecord?.time_in  ? fmtTime(todayRecord.time_in)  : '—' },
          { label:'Time Out',     value: todayRecord?.time_out ? fmtTime(todayRecord.time_out) : '—' },
          { label:'Hours Today',  value: todayRecord?.total_hours ? `${(+todayRecord.total_hours).toFixed(1)}h` : '—' },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={S.statVal}>{s.value}</div>
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
    ;(async () => {
      const { data } = await supabase.from('attendance').select('*')
        .eq('employee_id', user.id).order('date', { ascending:false }).limit(60)
      setRecords(data || [])
      setLoading(false)
    })()
  }, [user])

  return (
    <div>
      <h1 style={S.h1} className="fade-up">My Attendance</h1>
      <p style={S.sub} className="fade-up fade-up-delay-1">Your complete attendance history</p>

      {loading ? (
        <div style={S.center}><span className="spinner" /></div>
      ) : records.length === 0 ? (
        <div style={S.empty}>No attendance records yet.</div>
      ) : (
        <div style={S.tableCard} className="fade-up fade-up-delay-2">
          {/* Mobile: cards. Desktop: table */}
          <div className="mobile-cards">
            {records.map(r => {
              const status = r.time_out ? 'complete' : r.time_in ? 'incomplete' : 'absent'
              return (
                <div key={r.id} style={S.mobileRow}>
                  <div style={S.mobileRowTop}>
                    <span style={S.mobileDate}>{fmtDate(r.date)}</span>
                    <StatusBadge status={status} />
                  </div>
                  <div style={S.mobileRowBottom}>
                    <span>In: <strong>{r.time_in ? fmtTime(r.time_in) : '—'}</strong></span>
                    <span>Out: <strong>{r.time_out ? fmtTime(r.time_out) : '—'}</strong></span>
                    <span>Hours: <strong>{r.total_hours ? `${(+r.total_hours).toFixed(1)}h` : '—'}</strong></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    complete:   { bg:'var(--success-bg)', color:'var(--success)', label:'Complete' },
    incomplete: { bg:'var(--warning-bg)', color:'var(--warning)', label:'No Checkout' },
    absent:     { bg:'var(--error-bg)',   color:'var(--error)',   label:'Absent' },
  }
  const s = map[status]
  return <span style={{ background:s.bg, color:s.color, padding:'3px 11px', borderRadius:20, fontSize:12, fontWeight:600 }}>{s.label}</span>
}

function fmtTime(t) {
  if (!t) return '—'
  const [h,m] = t.split(':'); const hr=+h
  return `${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`
}
function fmtDate(d) {
  return new Date(d+'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
}
function getTimeOfDay() {
  const h = new Date().getHours()
  if (h<12) return 'morning'; if (h<17) return 'afternoon'; return 'evening'
}

const S = {
  h1:        { fontFamily:'Syne, sans-serif', fontSize:'clamp(20px, 5vw, 28px)', fontWeight:700, letterSpacing:'-0.5px', marginBottom:6 },
  sub:       { color:'var(--text-muted)', fontSize:14, marginBottom:20 },
  clockCard: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'clamp(24px, 5vw, 44px)', textAlign:'center', marginBottom:16, boxShadow:'0 0 40px rgba(37,99,235,0.06)' },
  clockTime: { fontFamily:'Syne, sans-serif', fontSize:'clamp(36px, 10vw, 64px)', fontWeight:700, letterSpacing:'-3px', fontVariantNumeric:'tabular-nums' },
  clockDate: { color:'var(--text-muted)', fontSize:'clamp(11px, 3vw, 14px)', marginTop:6, marginBottom:24 },
  statusPill:{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 18px', borderRadius:20, fontSize:13, fontWeight:600, marginBottom:24 },
  statusDot: { width:7, height:7, borderRadius:'50%', background:'currentColor', animation:'pulse-dot 2s ease infinite' },
  pillOut:   { background:'var(--error-bg)',   color:'var(--error)',   border:'1px solid rgba(239,68,68,0.2)' },
  pillIn:    { background:'var(--success-bg)', color:'var(--success)', border:'1px solid rgba(16,185,129,0.2)' },
  pillDone:  { background:'var(--warning-bg)', color:'var(--warning)', border:'1px solid rgba(245,158,11,0.2)' },
  clockBtns: { display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' },
  clockBtn:  { padding:'13px clamp(20px, 5vw, 40px)', borderRadius:12, fontSize:'clamp(13px, 3vw, 15px)', fontWeight:700, fontFamily:'Syne, sans-serif', cursor:'pointer', border:'none', display:'flex', alignItems:'center', gap:8, transition:'opacity 0.2s', minWidth:130 },
  btnIn:     { background:'linear-gradient(135deg, #10b981, #059669)', color:'#fff', boxShadow:'0 4px 20px rgba(16,185,129,0.3)' },
  btnOut:    { background:'linear-gradient(135deg, #ef4444, #dc2626)', color:'#fff', boxShadow:'0 4px 20px rgba(239,68,68,0.3)' },
  msg:       { marginTop:16, fontSize:13 },
  statsRow:  { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:8 },
  statCard:  { background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px clamp(12px,3vw,24px)' },
  statLabel: { fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6, fontWeight:600 },
  statVal:   { fontFamily:'Syne, sans-serif', fontSize:'clamp(16px, 4vw, 26px)', fontWeight:700, letterSpacing:'-1px' },
  tableCard: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' },
  // Mobile card rows
  mobileRow:       { padding:'14px 16px', borderBottom:'1px solid rgba(26,39,68,0.5)' },
  mobileRowTop:    { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  mobileDate:      { fontSize:14, fontWeight:600 },
  mobileRowBottom: { display:'flex', gap:16, fontSize:13, color:'var(--text-dim)', flexWrap:'wrap' },
  center: { display:'flex', alignItems:'center', justifyContent:'center', padding:48 },
  empty:  { textAlign:'center', padding:'48px', color:'var(--text-muted)', fontSize:14 },
}
