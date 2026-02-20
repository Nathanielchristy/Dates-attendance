import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  sanitizeField,
  validateName, validateDepartment, validateUsername, validatePassword,
  hashPassword,
} from '../lib/security'

const NAV = [
  { id: 'today',     icon: '📊', label: "Today's Overview" },
  { id: 'weekly',    icon: '📅', label: 'Weekly Report' },
  { id: 'monthly',   icon: '📆', label: 'Monthly Report' },
  { id: 'employees', icon: '👥', label: 'Employees' },
  { id: 'add',       icon: '➕', label: 'Add Employee' },
]

export default function AdminPage() {
  const [page, setPage] = useState('today')
  return (
    <Layout navItems={NAV} activePage={page} setActivePage={setPage}>
      {page === 'today'     && <TodayPage />}
      {page === 'weekly'    && <WeeklyPage />}
      {page === 'monthly'   && <MonthlyPage />}
      {page === 'employees' && <EmployeesPage />}
      {page === 'add'       && <AddEmployeePage />}
    </Layout>
  )
}

// ─── TODAY ────────────────────────────────────────────────────────────────────
function TodayPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data: emps } = await supabase.from('employees').select('id, name, department').order('name')
    const { data: att }  = await supabase.from('attendance').select('*').eq('date', today)
    const attMap = {}
    att?.forEach(a => { attMap[a.employee_id] = a })
    setData((emps || []).map(e => ({ ...e, att: attMap[e.id] || null })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const present  = data.filter(e => e.att?.time_in).length
  const complete = data.filter(e => e.att?.time_out).length
  const absent   = data.filter(e => !e.att?.time_in).length
  const pending  = present - complete

  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  return (
    <div>
      <h1 style={S.h1} className="fade-up">Today's Overview</h1>
      <p style={S.sub} className="fade-up fade-up-delay-1">{today}</p>

      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28}} className="fade-up fade-up-delay-2">
        {[
          { icon:'👥', label:'Total',    val: data.length,  color:'var(--text)' },
          { icon:'✅', label:'Present',  val: present,       color:'var(--success)' },
          { icon:'❌', label:'Absent',   val: absent,        color:'var(--error)' },
          { icon:'⏳', label:'Still In', val: pending,       color:'var(--warning)' },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{fontSize:22, marginBottom:8}}>{s.icon}</div>
            <div style={S.statLabel}>{s.label}</div>
            <div style={{...S.statVal, color: s.color}}>{loading ? '—' : s.val}</div>
          </div>
        ))}
      </div>

      <div style={S.card} className="fade-up fade-up-delay-3">
        <div style={S.cardHead}>
          <h3 style={S.cardTitle}>Employee Status</h3>
          <button style={S.refreshBtn} onClick={load}>↻ Refresh</button>
        </div>
        {loading ? (
          <div style={S.center}><span className="spinner" /></div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:12, padding:20}}>
            {data.map(e => {
              const a = e.att
              let status = 'absent', color = 'var(--error)', bg = 'var(--error-bg)', label = 'Absent', timeInfo = 'Not clocked in'
              if (a?.time_out)  { status='complete';   color='var(--success)'; bg='var(--success-bg)'; label='Complete';   timeInfo=`${fmtTime(a.time_in)} → ${fmtTime(a.time_out)} · ${(+a.total_hours).toFixed(1)}h` }
              else if (a?.time_in){ status='in';        color='var(--warning)'; bg='var(--warning-bg)'; label='Clocked In'; timeInfo=`In: ${fmtTime(a.time_in)}` }
              return (
                <div key={e.id} style={{background:'#0a1020', border:'1px solid var(--border)', borderRadius:12, padding:16}}>
                  <div style={{fontWeight:600, fontSize:14, marginBottom:3}}>{e.name}</div>
                  <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:10}}>{e.department}</div>
                  <span style={{background:bg, color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700}}>{label}</span>
                  <div style={{fontSize:12, color:'var(--text-muted)', marginTop:8}}>{timeInfo}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── WEEKLY ───────────────────────────────────────────────────────────────────
function WeeklyPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [rows, setRows] = useState([])
  const [range, setRange] = useState({ start:'', end:'' })
  const [loading, setLoading] = useState(true)

  const load = async (offset) => {
    setLoading(true)
    const today = new Date()
    const dow = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7)
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
    const start = monday.toISOString().split('T')[0]
    const end   = sunday.toISOString().split('T')[0]
    setRange({ start, end })

    const { data: att } = await supabase
      .from('attendance')
      .select('*, employees(name, department)')
      .gte('date', start)
      .lte('date', end)
      .order('date')
    setRows(att || [])
    setLoading(false)
  }

  useEffect(() => { load(weekOffset) }, [weekOffset])

  const fmtRange = (s, e) => {
    const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })
    const year = new Date(e + 'T12:00:00').getFullYear()
    return `${fmt(s)} – ${fmt(e)}, ${year}`
  }

  return (
    <div>
      <h1 style={S.h1} className="fade-up">Weekly Report</h1>
      <p style={S.sub} className="fade-up fade-up-delay-1">Attendance breakdown by week</p>

      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap'}} className="fade-up fade-up-delay-2">
        <button style={S.weekBtn} onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
        <span style={{color:'var(--text-dim)', fontSize:14, minWidth:200, textAlign:'center'}}>
          {range.start ? fmtRange(range.start, range.end) : '...'}
        </span>
        <button style={S.weekBtn} onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
        {weekOffset !== 0 && <button style={{...S.weekBtn, color:'var(--accent-bright)'}} onClick={() => setWeekOffset(0)}>This Week</button>}
      </div>

      <div style={S.card} className="fade-up fade-up-delay-3">
        {loading ? <div style={S.center}><span className="spinner" /></div> :
          rows.length === 0 ? <div style={S.empty}>No attendance records for this week.</div> : (
          <div style={{overflowX:'auto'}}>
            <table style={S.table}>
              <thead><tr>{['Employee','Department','Date','Time In','Time Out','Hours','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map(r => {
                  const complete = !!r.time_out
                  const inProg   = r.time_in && !r.time_out
                  const badge    = complete ? {bg:'var(--success-bg)',c:'var(--success)',l:'Complete'} :
                                   inProg   ? {bg:'var(--warning-bg)',c:'var(--warning)',l:'In Progress'} :
                                              {bg:'var(--error-bg)',  c:'var(--error)',  l:'Absent'}
                  return (
                    <tr key={r.id} style={S.tr}>
                      <td style={{...S.td, fontWeight:600}}>{r.employees?.name}</td>
                      <td style={S.td}>{r.employees?.department || '—'}</td>
                      <td style={S.td}>{fmtDate(r.date)}</td>
                      <td style={S.td}>{r.time_in ? fmtTime(r.time_in) : '—'}</td>
                      <td style={S.td}>{r.time_out ? fmtTime(r.time_out) : '—'}</td>
                      <td style={S.td}>{r.total_hours ? `${(+r.total_hours).toFixed(1)}h` : '—'}</td>
                      <td style={S.td}><span style={{background:badge.bg, color:badge.c, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700}}>{badge.l}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MONTHLY ──────────────────────────────────────────────────────────────────
function MonthlyPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [rows, setRows]   = useState([])
  const [loading, setLoading] = useState(false)

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const YEARS  = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i)

  const load = async () => {
    setLoading(true)
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2,'0')}-${lastDay}`

    const { data: emps } = await supabase.from('employees').select('id, name, department').order('name')
    const { data: att }  = await supabase.from('attendance').select('employee_id, total_hours, time_in, time_out').gte('date', start).lte('date', end)

    const summary = (emps || []).map(e => {
      const records = (att || []).filter(a => a.employee_id === e.id)
      const present = records.filter(a => a.time_in).length
      const totalH  = records.reduce((s, a) => s + (+a.total_hours || 0), 0)
      const incomplete = records.filter(a => a.time_in && !a.time_out).length
      return { ...e, days_present: present, total_hours: totalH, avg_hours: present ? totalH / present : 0, incomplete }
    })
    setRows(summary)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const maxH = Math.max(...rows.map(r => r.total_hours), 1)

  return (
    <div>
      <h1 style={S.h1} className="fade-up">Monthly Report</h1>
      <p style={S.sub} className="fade-up fade-up-delay-1">Monthly attendance summary per employee</p>

      <div style={{display:'flex', gap:12, alignItems:'flex-end', marginBottom:24, flexWrap:'wrap'}} className="fade-up fade-up-delay-2">
        <div>
          <div style={S.selectLabel}>Month</div>
          <select style={S.select} value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={S.selectLabel}>Year</div>
          <select style={S.select} value={year} onChange={e => setYear(+e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button style={S.primaryBtn} onClick={load}>Load Report</button>
      </div>

      <div style={S.card} className="fade-up fade-up-delay-3">
        <div style={S.cardHead}>
          <h3 style={S.cardTitle}>{MONTHS[month-1]} {year} — Attendance Summary</h3>
        </div>
        {loading ? <div style={S.center}><span className="spinner" /></div> :
          rows.length === 0 ? <div style={S.empty}>No data.</div> : (
          <div style={{overflowX:'auto'}}>
            <table style={S.table}>
              <thead><tr>{['Employee','Department','Days Present','Total Hours','Avg Hours/Day','Incomplete'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={S.tr}>
                    <td style={{...S.td, fontWeight:600}}>{r.name}</td>
                    <td style={S.td}>{r.department || '—'}</td>
                    <td style={S.td}>{r.days_present}</td>
                    <td style={{...S.td, minWidth:160}}>
                      {r.total_hours.toFixed(1)}h
                      <div style={{height:5, background:'rgba(37,99,235,0.12)', borderRadius:3, marginTop:6, overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${(r.total_hours/maxH)*100}%`, background:'var(--accent-bright)', borderRadius:3, transition:'width 0.5s'}} />
                      </div>
                    </td>
                    <td style={S.td}>{r.avg_hours.toFixed(1)}h</td>
                    <td style={S.td}>
                      {r.incomplete > 0
                        ? <span style={{color:'var(--warning)', fontWeight:600}}>{r.incomplete}</span>
                        : <span style={{color:'var(--text-muted)'}}>0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── EMPLOYEES LIST ───────────────────────────────────────────────────────────
function EmployeesPage() {
  const [emps, setEmps] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)  // { id, name }

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('employees').select('*').order('name')
    setEmps(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const deleteEmp = async () => {
    await supabase.from('employees').delete().eq('id', modal.id)
    setModal(null)
    load()
  }

  return (
    <div>
      {/* Custom confirm modal */}
      {modal && (
        <div style={S.modalOverlay} onClick={() => setModal(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>Delete Employee</div>
            <div style={S.modalBody}>Are you sure you want to delete <strong>{modal.name}</strong>? Their attendance records will remain but they won't be able to log in.</div>
            <div style={S.modalActions}>
              <button style={S.modalCancel} onClick={() => setModal(null)}>Cancel</button>
              <button style={S.modalConfirm} onClick={deleteEmp}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <h1 style={S.h1} className="fade-up">Employees</h1>
      <p style={S.sub} className="fade-up fade-up-delay-1">Manage your workforce</p>

      <div style={S.card} className="fade-up fade-up-delay-2">
        {loading ? <div style={S.center}><span className="spinner" /></div> :
          emps.length === 0 ? <div style={S.empty}>No employees yet. Add one!</div> : (
          <table style={S.table}>
            <thead><tr>{['Name','Department','Username','Joined','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {emps.map(e => (
                <tr key={e.id} style={S.tr}>
                  <td style={{...S.td, fontWeight:600}}>{e.name}</td>
                  <td style={S.td}>{e.department || '—'}</td>
                  <td style={{...S.td, fontFamily:'monospace', fontSize:13}}>{e.username}</td>
                  <td style={S.td}>{e.created_at ? new Date(e.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td>
                  <td style={S.td}>
                    <button style={S.dangerBtn} onClick={() => setModal({ id: e.id, name: e.name })}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── ADD EMPLOYEE ─────────────────────────────────────────────────────────────
function pwStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label:'', color:'transparent' },
    { label:'Very Weak', color:'#ef4444' },
    { label:'Weak',      color:'#f97316' },
    { label:'Fair',      color:'#eab308' },
    { label:'Strong',    color:'#22c55e' },
    { label:'Very Strong', color:'#10b981' },
  ]
  return { score, ...map[score] }
}

function AddEmployeePage() {
  const [form, setForm]     = useState({ name:'', department:'', username:'', password:'' })
  const [errors, setErrors] = useState({})
  const [msg, setMsg]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const strength = pwStrength(form.password)

  const handleChange = k => e => {
    setForm(f => ({...f, [k]: e.target.value}))
    setErrors(er => ({...er, [k]: null}))
  }

  const submit = async () => {
    setMsg(null)

    // Sanitise
    const name       = sanitizeField(form.name, 80)
    const department = sanitizeField(form.department, 60)
    const username   = sanitizeField(form.username, 40).toLowerCase()
    const password   = form.password.slice(0, 128)

    // Validate each field individually for inline errors
    const errs = {
      name:       validateName(name),
      department: validateDepartment(department),
      username:   validateUsername(username),
      password:   validatePassword(password),
    }
    if (Object.values(errs).some(Boolean)) { setErrors(errs); return }

    setLoading(true)

    // Check username uniqueness
    const { data: existing } = await supabase.from('employees').select('id').eq('username', username).single()
    if (existing) { setErrors(e => ({...e, username:'Username already exists.'})); setLoading(false); return }

    // Hash password before storing
    const hashedPassword = await hashPassword(password)

    const { error } = await supabase.from('employees').insert({
      name, department, username,
      password: hashedPassword,
      created_at: new Date().toISOString(),
    })

    if (error) { setMsg({ type:'error', text:'Database error. Please try again.' }) }
    else {
      setMsg({ type:'success', text:`✓ ${name} added successfully!` })
      setForm({ name:'', department:'', username:'', password:'' })
      setErrors({})
    }
    setLoading(false)
  }

  const fields = [
    { key:'name',       label:'Full Name',  type:'text',     ph:'John Smith',         max:80 },
    { key:'department', label:'Department', type:'text',     ph:'Engineering, HR...', max:60 },
    { key:'username',   label:'Username',   type:'text',     ph:'johnsmith',          max:40 },
  ]

  return (
    <div>
      <h1 style={S.h1} className="fade-up">Add Employee</h1>
      <p style={S.sub} className="fade-up fade-up-delay-1">Create a new employee account</p>
      <div style={{...S.card, maxWidth:600}} className="fade-up fade-up-delay-2">
        <div style={S.cardHead}><h3 style={S.cardTitle}>Employee Details</h3></div>
        <div style={{padding:24}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>
            {fields.map(f => (
              <div key={f.key}>
                <div style={S.selectLabel}>{f.label}</div>
                <input
                  style={{...S.input, borderColor: errors[f.key] ? '#ef4444' : '#1a2744'}}
                  type={f.type}
                  value={form[f.key]}
                  onChange={handleChange(f.key)}
                  placeholder={f.ph}
                  maxLength={f.max}
                  spellCheck={false}
                  autoCapitalize="none"
                  onFocus={e => e.target.style.borderColor = errors[f.key] ? '#ef4444' : '#2563eb'}
                  onBlur={e  => e.target.style.borderColor = errors[f.key] ? '#ef4444' : '#1a2744'}
                />
                {errors[f.key] && <div style={{fontSize:11, color:'var(--error)', marginTop:4}}>{errors[f.key]}</div>}
              </div>
            ))}

            {/* Password with strength meter */}
            <div>
              <div style={S.selectLabel}>Password</div>
              <div style={{position:'relative'}}>
                <input
                  style={{...S.input, borderColor: errors.password ? '#ef4444' : '#1a2744', paddingRight:40}}
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="Min 8 chars, upper + number"
                  maxLength={128}
                  onFocus={e => e.target.style.borderColor = errors.password ? '#ef4444' : '#2563eb'}
                  onBlur={e  => e.target.style.borderColor = errors.password ? '#ef4444' : '#1a2744'}
                />
                <button style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:14}} onClick={() => setShowPw(s=>!s)} tabIndex={-1}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div style={{marginTop:6}}>
                  <div style={{display:'flex', gap:3, marginBottom:3}}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{flex:1, height:3, borderRadius:2, background: i <= strength.score ? strength.color : 'var(--border)', transition:'background 0.3s'}} />
                    ))}
                  </div>
                  <div style={{fontSize:10, color: strength.color}}>{strength.label}</div>
                </div>
              )}
              {errors.password && <div style={{fontSize:11, color:'var(--error)', marginTop:4}}>{errors.password}</div>}
            </div>
          </div>

          {msg && (
            <div style={{padding:'11px 16px', borderRadius:9, marginBottom:16, fontSize:14,
              background: msg.type==='success' ? 'var(--success-bg)' : 'var(--error-bg)',
              color: msg.type==='success' ? 'var(--success)' : 'var(--error)',
              border: `1px solid ${msg.type==='success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`}}>
              {msg.text}
            </div>
          )}
          <button style={{...S.primaryBtn, opacity: loading ? 0.7 : 1}} onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{width:16,height:16}} /> : 'Create Employee Account'}
          </button>

          <div style={{marginTop:16, fontSize:11, color:'var(--text-muted)', lineHeight:1.7}}>
            🔒 Passwords are hashed with PBKDF2-SHA256 before storage.<br/>
            🛡 Usernames must be lowercase letters, numbers, dots, or hyphens.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hr = +h
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}
function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  h1: { fontFamily:'Syne, sans-serif', fontSize:28, fontWeight:700, letterSpacing:'-0.5px', marginBottom:6 },
  sub: { color:'var(--text-muted)', fontSize:14, marginBottom:28 },
  statCard: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'20px 24px' },
  statLabel: { fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6, fontWeight:600 },
  statVal: { fontFamily:'Syne, sans-serif', fontSize:30, fontWeight:700, letterSpacing:'-1px' },
  card: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', marginBottom:24 },
  cardHead: { padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' },
  cardTitle: { fontSize:15, fontWeight:600, fontFamily:'Syne, sans-serif' },
  refreshBtn: { padding:'7px 16px', background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:'Instrument Sans, sans-serif' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid var(--border)' },
  tr: { borderBottom:'1px solid rgba(26,39,68,0.5)' },
  td: { padding:'13px 20px', fontSize:14 },
  center: { display:'flex', alignItems:'center', justifyContent:'center', padding:56 },
  empty: { textAlign:'center', padding:56, color:'var(--text-muted)', fontSize:14 },
  weekBtn: { padding:'8px 18px', background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', borderRadius:9, cursor:'pointer', fontSize:14, fontFamily:'Instrument Sans, sans-serif' },
  selectLabel: { fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:7 },
  select: { background:'#090e1a', border:'1px solid var(--border)', color:'var(--text)', padding:'10px 14px', borderRadius:10, fontSize:14, fontFamily:'Instrument Sans, sans-serif', outline:'none', cursor:'pointer' },
  input: { width:'100%', background:'#090e1a', border:'1px solid var(--border)', color:'var(--text)', padding:'11px 14px', borderRadius:10, fontSize:14, fontFamily:'Instrument Sans, sans-serif', outline:'none', transition:'border-color 0.2s' },
  primaryBtn: { padding:'11px 24px', background:'linear-gradient(135deg, #2563eb, #1d4ed8)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, fontFamily:'Syne, sans-serif', cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 20px rgba(37,99,235,0.3)' },
  dangerBtn: { padding:'6px 14px', background:'var(--error-bg)', color:'var(--error)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'Instrument Sans, sans-serif' },
  // Modal
  modalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
  modalBox: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:32, width:380, boxShadow:'0 32px 80px rgba(0,0,0,0.6)' },
  modalTitle: { fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700, marginBottom:12 },
  modalBody: { fontSize:14, color:'var(--text-dim)', marginBottom:28, lineHeight:1.6 },
  modalActions: { display:'flex', gap:12, justifyContent:'flex-end' },
  modalCancel: { padding:'9px 20px', background:'transparent', border:'1px solid var(--border)', color:'var(--text)', borderRadius:9, cursor:'pointer', fontSize:14, fontFamily:'Instrument Sans, sans-serif' },
  modalConfirm: { padding:'9px 20px', background:'linear-gradient(135deg, #ef4444, #dc2626)', color:'#fff', border:'none', borderRadius:9, cursor:'pointer', fontSize:14, fontWeight:700, fontFamily:'Syne, sans-serif' },
}
