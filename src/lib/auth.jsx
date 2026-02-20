import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import {
  verifyPassword, hashPassword,
  checkRateLimit, recordFailedAttempt, clearAttempts,
  storeSession, loadSession, clearSession,
  setSessionExpiry, isSessionExpired, clearSessionExpiry,
  sanitizeField,
} from './security'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore session and check expiry
  useEffect(() => {
    ;(async () => {
      if (isSessionExpired()) {
        clearSession()
        clearSessionExpiry()
      } else {
        const u = await loadSession()
        if (u) setUser(u)
      }
      setLoading(false)
    })()
  }, [])

  // Auto-logout when session expires (check every minute)
  useEffect(() => {
    const timer = setInterval(() => {
      if (user && isSessionExpired()) logout()
    }, 60_000)
    return () => clearInterval(timer)
  }, [user])

  const login = async (rawUsername, rawPassword) => {
    // Sanitise inputs before doing anything
    const username = sanitizeField(rawUsername, 40).toLowerCase()
    const password = String(rawPassword ?? '').slice(0, 128) // don't sanitise password chars, just limit length

    if (!username || !password) return { success: false, message: 'Please fill in all fields.' }

    // Rate limit check
    const rateCheck = checkRateLimit(username)
    if (!rateCheck.allowed) return { success: false, message: rateCheck.message }

    // ── Admin check ───────────────────────────────────────────────────────────
    const { data: admin, error: aErr } = await supabase
      .from('admin')
      .select('id, username, password')
      .eq('username', username)
      .single()

    if (!aErr && admin) {
      const match = await verifyPassword(password, admin.password)
      if (match) {
        clearAttempts(username)
        const u = await storeSession({ id: admin.id, name: 'Administrator', department: '', role: 'admin' })
        setSessionExpiry()
        setUser(u)
        return { success: true, role: 'admin' }
      }
    }

    // ── Employee check ────────────────────────────────────────────────────────
    const { data: emp, error: eErr } = await supabase
      .from('employees')
      .select('id, name, department, username, password')
      .eq('username', username)
      .single()

    if (!eErr && emp) {
      const match = await verifyPassword(password, emp.password)
      if (match) {
        clearAttempts(username)
        const u = await storeSession({ id: emp.id, name: emp.name, department: emp.department, role: 'employee' })
        setSessionExpiry()
        setUser(u)
        return { success: true, role: 'employee' }
      }
    }

    // Failed — record attempt
    recordFailedAttempt(username)
    // Generic message — don't reveal whether username exists
    return { success: false, message: 'Invalid username or password.' }
  }

  const logout = useCallback(() => {
    setUser(null)
    clearSession()
    clearSessionExpiry()
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hashPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
