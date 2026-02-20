// ─────────────────────────────────────────────────────────────────────────────
// security.js — Input sanitisation, validation, hashing, rate limiting
// ─────────────────────────────────────────────────────────────────────────────

// ── INPUT SANITISATION ────────────────────────────────────────────────────────

/**
 * Strip all HTML tags and dangerous characters from a string.
 * Used on every user-supplied string before storing or displaying.
 */
export function sanitizeText(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[<>'"&]/g, c => ({ '<':'&lt;', '>':'&gt;', "'": '&#39;', '"':'&quot;', '&':'&amp;' }[c]))
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .trim()
}

/**
 * Sanitise and enforce max length in one call.
 */
export function sanitizeField(value, maxLength = 100) {
  return sanitizeText(String(value ?? '')).slice(0, maxLength)
}

// ── VALIDATORS ────────────────────────────────────────────────────────────────

/** Only letters, numbers, dots, underscores, hyphens. No spaces. */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') return 'Username is required.'
  if (username.length < 3)  return 'Username must be at least 3 characters.'
  if (username.length > 40) return 'Username must be 40 characters or fewer.'
  if (!/^[a-zA-Z0-9._-]+$/.test(username))
    return 'Username may only contain letters, numbers, dots, underscores, and hyphens.'
  return null
}

/** Strong password: min 8 chars, at least one uppercase, one lowercase, one digit. */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required.'
  if (password.length < 8)  return 'Password must be at least 8 characters.'
  if (password.length > 128) return 'Password is too long.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  return null
}

/** Human name: letters, spaces, hyphens, apostrophes only. */
export function validateName(name) {
  if (!name || typeof name !== 'string') return 'Name is required.'
  if (name.length < 2)   return 'Name must be at least 2 characters.'
  if (name.length > 80)  return 'Name must be 80 characters or fewer.'
  if (!/^[a-zA-Z\s'\-]+$/.test(name)) return 'Name may only contain letters, spaces, hyphens, and apostrophes.'
  return null
}

/** Department: letters, spaces, hyphens, ampersands. */
export function validateDepartment(dept) {
  if (!dept || typeof dept !== 'string') return 'Department is required.'
  if (dept.length < 2)  return 'Department must be at least 2 characters.'
  if (dept.length > 60) return 'Department must be 60 characters or fewer.'
  if (!/^[a-zA-Z0-9\s\-&]+$/.test(dept)) return 'Department contains invalid characters.'
  return null
}

// ── PASSWORD HASHING ──────────────────────────────────────────────────────────
// We use PBKDF2 via the Web Crypto API — no dependencies needed, runs in browser.

const PBKDF2_ITERATIONS = 200_000
const HASH_PREFIX = 'pbkdf2$'

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

function hexToBuf(hex) {
  const pairs = hex.match(/.{1,2}/g) || []
  return new Uint8Array(pairs.map(p => parseInt(p, 16))).buffer
}

/**
 * Hash a password with PBKDF2-SHA256 + random salt.
 * Returns a string like: pbkdf2$<saltHex>$<hashHex>
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  )
  return `${HASH_PREFIX}${bufToHex(salt.buffer)}$${bufToHex(bits)}`
}

/**
 * Verify a plaintext password against a stored hash string.
 * Supports both new pbkdf2$ hashes and legacy plaintext (for migration).
 */
export async function verifyPassword(password, stored) {
  if (!stored) return false

  // Legacy plaintext (existing accounts before migration)
  if (!stored.startsWith(HASH_PREFIX)) {
    return password === stored
  }

  const [, saltHex, hashHex] = stored.split('$')
  const salt = hexToBuf(saltHex)
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  )
  // Constant-time comparison
  const candidate = bufToHex(bits)
  if (candidate.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ hashHex.charCodeAt(i)
  return diff === 0
}

// ── RATE LIMITER ──────────────────────────────────────────────────────────────
// In-memory rate limiter for login attempts.
// Keyed by username. Resets after lockout window.

const attempts = new Map() // username -> { count, lockedUntil }

const MAX_ATTEMPTS   = 5      // attempts before lockout
const LOCKOUT_MS     = 15 * 60 * 1000  // 15 minutes
const ATTEMPT_WINDOW = 10 * 60 * 1000  // reset counter after 10 min of no attempts

export function checkRateLimit(username) {
  const key = username.toLowerCase()
  const now  = Date.now()
  const entry = attempts.get(key)

  if (entry) {
    // Still locked out?
    if (entry.lockedUntil && now < entry.lockedUntil) {
      const remaining = Math.ceil((entry.lockedUntil - now) / 60000)
      return { allowed: false, message: `Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.` }
    }
    // Window expired — reset
    if (now - entry.lastAttempt > ATTEMPT_WINDOW) {
      attempts.delete(key)
    }
  }
  return { allowed: true }
}

export function recordFailedAttempt(username) {
  const key  = username.toLowerCase()
  const now  = Date.now()
  const entry = attempts.get(key) || { count: 0, lockedUntil: null, lastAttempt: now }
  entry.count++
  entry.lastAttempt = now
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
  }
  attempts.set(key, entry)
}

export function clearAttempts(username) {
  attempts.delete(username.toLowerCase())
}

// ── SESSION INTEGRITY ─────────────────────────────────────────────────────────
// Sign the session payload with a per-session secret so it can't be tampered
// with in devtools. Uses HMAC-SHA256.

const SESSION_KEY = 'attendtrack_session'
const SIG_KEY     = 'attendtrack_sig'

async function getHmacKey() {
  // Derive a stable key from a session-bound secret stored in sessionStorage
  let secret = sessionStorage.getItem('_sk')
  if (!secret) {
    secret = bufToHex(crypto.getRandomValues(new Uint8Array(32)).buffer)
    sessionStorage.setItem('_sk', secret)
  }
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']
  )
}

async function signPayload(payload) {
  const key  = await getHmacKey()
  const data = new TextEncoder().encode(payload)
  const sig  = await crypto.subtle.sign('HMAC', key, data)
  return bufToHex(sig)
}

async function verifyPayload(payload, sig) {
  try {
    const key      = await getHmacKey()
    const data     = new TextEncoder().encode(payload)
    const sigBytes = hexToBuf(sig)
    return crypto.subtle.verify('HMAC', key, sigBytes, data)
  } catch {
    return false
  }
}

/** Store user in sessionStorage with HMAC signature. */
export async function storeSession(user) {
  // Only store safe, non-sensitive fields
  const safe = { id: user.id, name: sanitizeField(user.name, 80), department: sanitizeField(user.department || '', 60), role: user.role === 'admin' ? 'admin' : 'employee' }
  const payload = JSON.stringify(safe)
  const sig = await signPayload(payload)
  sessionStorage.setItem(SESSION_KEY, payload)
  sessionStorage.setItem(SIG_KEY, sig)
  return safe
}

/** Retrieve and verify user from sessionStorage. Returns null if tampered. */
export async function loadSession() {
  try {
    const payload = sessionStorage.getItem(SESSION_KEY)
    const sig     = sessionStorage.getItem(SIG_KEY)
    if (!payload || !sig) return null
    const valid = await verifyPayload(payload, sig)
    if (!valid) { clearSession(); return null }
    const user = JSON.parse(payload)
    // Validate role is exactly one of the allowed values
    if (!['admin', 'employee'].includes(user.role)) { clearSession(); return null }
    if (typeof user.id !== 'number') { clearSession(); return null }
    return user
  } catch {
    clearSession()
    return null
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SIG_KEY)
  sessionStorage.removeItem('_sk')
}

// ── SESSION EXPIRY ────────────────────────────────────────────────────────────
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours
const EXPIRY_KEY = 'attendtrack_expiry'

export function setSessionExpiry() {
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS))
}

export function isSessionExpired() {
  const expiry = sessionStorage.getItem(EXPIRY_KEY)
  if (!expiry) return true
  return Date.now() > parseInt(expiry, 10)
}

export function clearSessionExpiry() {
  sessionStorage.removeItem(EXPIRY_KEY)
}
