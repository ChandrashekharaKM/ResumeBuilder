import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'

type Bindings = {
  LIMITER_KV: KVNamespace
  DB: D1Database
  AI: any
  JWT_SECRET: string
  FRONTEND_URL?: string
  RESEND_API_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ============================================================
// SECURITY UTILITIES
// ============================================================

/**
 * Hash a plain-text password using PBKDF2-SHA256.
 * Web Crypto API is natively available in Cloudflare Workers.
 * Output format: "iterations:salt_hex:hash_hex"
 */
async function hashPassword(password: string): Promise<string> {
  const iterations = 100_000
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('')

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${iterations}:${saltHex}:${hashHex}`
}

/**
 * Timing-safe comparison of a plain-text password against a stored PBKDF2 hash.
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':')
  if (parts.length !== 3) return false

  const [iterStr, saltHex, expectedHex] = parts
  const iterations = parseInt(iterStr, 10)
  if (!iterations || iterations < 1) return false

  // Reconstruct salt from hex
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const actualHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('')

  // Timing-safe comparison using equal-length string compare
  if (actualHex.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < actualHex.length; i++) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Create a signed HS256 JWT using Hono's jwt utility pattern.
 * Manually builds the token to avoid needing a full JWT lib import.
 */
async function createJWT(userId: string, email: string, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: userId,
    email,
    iat: now,
    exp: now + 60 * 60 * 24, // 24 hours
  }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const headerB64 = encode(header)
  const payloadB64 = encode(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', keyMaterial, new TextEncoder().encode(signingInput))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${signingInput}.${sigB64}`
}

/**
 * Rate limit auth attempts by IP address.
 * Allows max 5 attempts per 15-minute window, stored in KV.
 * Returns true if the request should be blocked.
 */
async function isAuthRateLimited(kv: KVNamespace | undefined, ip: string): Promise<boolean> {
  if (!kv) return false // Skip if KV unavailable (dev mode)

  const windowMinutes = 15
  const maxAttempts = 5
  const windowKey = Math.floor(Date.now() / (windowMinutes * 60 * 1000))
  const kvKey = `auth_limit:${ip}:${windowKey}`

  try {
    const count = parseInt((await kv.get(kvKey)) || '0', 10)
    return count >= maxAttempts
  } catch {
    return false
  }
}

async function incrementAuthAttempt(kv: KVNamespace | undefined, ip: string): Promise<void> {
  if (!kv) return

  const windowMinutes = 15
  const windowKey = Math.floor(Date.now() / (windowMinutes * 60 * 1000))
  const kvKey = `auth_limit:${ip}:${windowKey}`

  try {
    const count = parseInt((await kv.get(kvKey)) || '0', 10)
    await kv.put(kvKey, (count + 1).toString(), { expirationTtl: windowMinutes * 60 })
  } catch {
    // Non-fatal — don't block request if KV write fails
  }
}

/** Validate email format (basic RFC check) */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ============================================================
// CORS MIDDLEWARE
// ============================================================

app.use('*', async (c, next) => {
  const originHeader = c.req.header('Origin')
  const jwtSecret = c.env.JWT_SECRET || 'super-secret-local-development-key-1234567890'
  const isLocal = jwtSecret === 'super-secret-local-development-key-1234567890'

  let allowedOrigin = '*'
  if (originHeader) {
    if (isLocal) {
      allowedOrigin = originHeader
    } else {
      const prodUrl = c.env.FRONTEND_URL
      if (prodUrl && originHeader === prodUrl) {
        allowedOrigin = originHeader
      } else if (!prodUrl) {
        allowedOrigin = originHeader
      } else {
        allowedOrigin = prodUrl
      }
    }
  }

  const corsMiddleware = cors({
    origin: allowedOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
  return corsMiddleware(c, next)
})

// ============================================================
// AUTH ROUTES (public — NO JWT guard)
// ============================================================

/**
 * POST /auth/register
 * Body: { email: string, password: string }
 * Returns: { success: true, token: string, email: string }
 *
 * Security:
 *  - Rate limited: 5 req / 15 min per IP
 *  - Password: min 8 chars, max 128 chars
 *  - Hashed with PBKDF2-SHA256 (100k iterations)
 *  - Generic error messages (no email enumeration)
 */
app.post('/auth/register', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  const jwtSecret = c.env.JWT_SECRET || 'super-secret-local-development-key-1234567890'

  // Rate limiting
  if (await isAuthRateLimited(c.env.LIMITER_KV, `reg:${ip}`)) {
    return c.json(
      { success: false, message: 'Too many attempts. Please wait 15 minutes before trying again.' },
      429,
      { 'Retry-After': '900' }
    )
  }
  await incrementAuthAttempt(c.env.LIMITER_KV, `reg:${ip}`)

  // Parse body
  let email = '', password = ''
  try {
    const body = await c.req.json()
    email = (body.email || '').trim().toLowerCase()
    password = (body.password || '')
  } catch {
    return c.json({ success: false, message: 'Invalid request format.' }, 400)
  }

  // Input validation
  if (!email || !password) {
    return c.json({ success: false, message: 'Email and password are required.' }, 400)
  }
  if (!isValidEmail(email)) {
    return c.json({ success: false, message: 'Please enter a valid email address.' }, 400)
  }
  if (password.length < 8) {
    return c.json({ success: false, message: 'Password must be at least 8 characters.' }, 400)
  }
  if (password.length > 128) {
    return c.json({ success: false, message: 'Password is too long.' }, 400)
  }

  try {
    // Check if email already exists (but use generic message to prevent enumeration)
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first()

    if (existing) {
      // Generic message — don't reveal that the account exists
      return c.json({ success: false, message: 'Registration failed. Please try a different email or log in.' }, 409)
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const userId = crypto.randomUUID()

    await c.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)'
    ).bind(userId, email, passwordHash).run()

    // Issue JWT
    const token = await createJWT(userId, email, jwtSecret)
    return c.json({ success: true, token, email })

  } catch (err) {
    console.error('Register error:', err)
    return c.json({ success: false, message: 'Registration failed. Please try again.' }, 500)
  }
})

/**
 * POST /auth/login
 * Body: { email: string, password: string }
 * Returns: { success: true, token: string, email: string }
 *
 * Security:
 *  - Rate limited: 5 req / 15 min per IP
 *  - Timing-safe PBKDF2 comparison
 *  - Generic "invalid credentials" — no email enumeration
 */
app.post('/auth/login', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  const jwtSecret = c.env.JWT_SECRET || 'super-secret-local-development-key-1234567890'

  // Rate limiting
  if (await isAuthRateLimited(c.env.LIMITER_KV, `login:${ip}`)) {
    return c.json(
      { success: false, message: 'Too many attempts. Please wait 15 minutes before trying again.' },
      429,
      { 'Retry-After': '900' }
    )
  }
  await incrementAuthAttempt(c.env.LIMITER_KV, `login:${ip}`)

  // Parse body
  let email = '', password = ''
  try {
    const body = await c.req.json()
    email = (body.email || '').trim().toLowerCase()
    password = (body.password || '')
  } catch {
    return c.json({ success: false, message: 'Invalid request format.' }, 400)
  }

  // Input validation
  if (!email || !password) {
    return c.json({ success: false, message: 'Email and password are required.' }, 400)
  }
  if (email.length > 320 || password.length > 128) {
    return c.json({ success: false, message: 'Invalid credentials.' }, 401)
  }

  try {
    // Fetch user — always run hash even if not found (timing-safe)
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash FROM users WHERE email = ?'
    ).bind(email).first<{ id: string; email: string; password_hash: string | null }>()

    // If no user or no password_hash (OAuth-only user), use a dummy hash to prevent timing attacks
    const storedHash = user?.password_hash || '100000:0000000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000'
    const passwordMatches = await verifyPassword(password, storedHash)

    if (!user || !user.password_hash || !passwordMatches) {
      return c.json({ success: false, message: 'Invalid email or password.' }, 401)
    }

    // Issue JWT
    const token = await createJWT(user.id, user.email, jwtSecret)
    return c.json({ success: true, token, email: user.email })

  } catch (err) {
    console.error('Login error:', err)
    return c.json({ success: false, message: 'Login failed. Please try again.' }, 500)
  }
})

// ============================================================
// PASSWORD RESET HELPERS
// ============================================================

/**
 * Hash a token with SHA-256 for safe storage.
 * The raw token is sent to the user; only the hash is stored in DB.
 */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Send a password reset email via Resend (https://resend.com).
 * Requires RESEND_API_KEY secret set on the Worker.
 * Falls back gracefully in dev mode if key is missing.
 */
async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  apiKey: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:'Inter',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#121826;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden">
    <tr><td style="background:linear-gradient(135deg,#6366f1,#06b6d4);padding:32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.02em">HoldMy<span style="color:#a5f3fc">Resume</span></h1>
    </td></tr>
    <tr><td style="padding:40px 32px">
      <h2 style="margin:0 0 12px;color:#e2e8f0;font-size:20px;font-weight:700">Reset your password</h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6">We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong style="color:#e2e8f0">1 hour</strong>.</p>
      <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Reset Password</a>
      <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6">If you didn't request this, you can safely ignore this email. Your password won't change.<br><br>Or copy this link: <span style="color:#94a3b8;word-break:break-all">${resetLink}</span></p>
    </td></tr>
    <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <p style="margin:0;color:#475569;font-size:12px">© 2026 HoldMyResume · <a href="https://holdmyresume.pages.dev" style="color:#6366f1;text-decoration:none">holdmyresume.pages.dev</a></p>
    </td></tr>
  </table>
</body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'HoldMyResume <onboarding@resend.dev>',
      to: [to],
      subject: 'Reset your HoldMyResume password',
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend email error:', err)
    throw new Error('Email delivery failed')
  }
}

// ============================================================
// AUTH ROUTES — Forgot / Reset Password
// ============================================================

/**
 * POST /auth/forgot-password
 * Body: { email: string }
 * Always returns 200 (no email enumeration).
 * Sends a reset link via Resend if the account exists.
 *
 * Security:
 *  - Rate limited: 3 req / 1 hour per IP
 *  - Token: 32-byte random hex, SHA-256 hashed before storage
 *  - Expires: 1 hour
 */
app.post('/auth/forgot-password', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173'

  // Rate limit: 3 per hour per IP
  if (c.env.LIMITER_KV) {
    try {
      const windowKey = Math.floor(Date.now() / (60 * 60 * 1000))
      const kvKey = `forgot_limit:${ip}:${windowKey}`
      const count = parseInt((await c.env.LIMITER_KV.get(kvKey)) || '0', 10)
      if (count >= 3) {
        // Still return 200 — don't reveal rate limiting to enumeration bots
        return c.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
      }
      await c.env.LIMITER_KV.put(kvKey, (count + 1).toString(), { expirationTtl: 3600 })
    } catch { /* non-fatal */ }
  }

  let email = ''
  try {
    const body = await c.req.json()
    email = (body.email || '').trim().toLowerCase()
  } catch {
    return c.json({ success: false, message: 'Invalid request format.' }, 400)
  }

  if (!email || email.length > 320) {
    // Generic success response regardless of validation failure
    return c.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
  }

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ? AND password_hash IS NOT NULL'
    ).bind(email).first<{ id: string; email: string }>()

    // Always respond the same way — don't reveal whether user exists
    if (user) {
      const resendKey = c.env.RESEND_API_KEY
      if (!resendKey) {
        console.warn('RESEND_API_KEY not set — skipping email send')
      } else {
        // Generate a cryptographically random token
        const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0')).join('')
        const tokenHash = await sha256Hex(rawToken)

        // Expire 1 hour from now
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
          .replace('T', ' ').replace(/\.\d+Z$/, '')

        // Clean up any previous unused tokens for this user
        await c.env.DB.prepare(
          'DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL'
        ).bind(user.id).run()

        // Store hashed token
        await c.env.DB.prepare(
          'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
        ).bind(crypto.randomUUID(), user.id, tokenHash, expiresAt).run()

        const resetLink = `${frontendUrl}?reset_token=${rawToken}`
        await sendPasswordResetEmail(user.email, resetLink, resendKey)
      }
    }
  } catch (err) {
    console.error('Forgot password error:', err)
    // Still return 200 — don't reveal errors
  }

  return c.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
})

/**
 * POST /auth/reset-password
 * Body: { token: string, password: string }
 * Validates the token, updates password, marks token used.
 *
 * Security:
 *  - Rate limited: 5 req / 15 min per IP
 *  - Token is SHA-256 hashed and compared — never stored raw
 *  - Token expires after 1 hour
 *  - Token is single-use (used_at set on redemption)
 */
app.post('/auth/reset-password', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'

  // Rate limiting
  if (await isAuthRateLimited(c.env.LIMITER_KV, `reset:${ip}`)) {
    return c.json(
      { success: false, message: 'Too many attempts. Please wait 15 minutes.' },
      429,
      { 'Retry-After': '900' }
    )
  }
  await incrementAuthAttempt(c.env.LIMITER_KV, `reset:${ip}`)

  let rawToken = '', newPassword = ''
  try {
    const body = await c.req.json()
    rawToken = (body.token || '').trim()
    newPassword = (body.password || '')
  } catch {
    return c.json({ success: false, message: 'Invalid request format.' }, 400)
  }

  if (!rawToken || !newPassword) {
    return c.json({ success: false, message: 'Token and new password are required.' }, 400)
  }
  if (newPassword.length < 8) {
    return c.json({ success: false, message: 'Password must be at least 8 characters.' }, 400)
  }
  if (newPassword.length > 128) {
    return c.json({ success: false, message: 'Password is too long.' }, 400)
  }

  try {
    const tokenHash = await sha256Hex(rawToken)

    const record = await c.env.DB.prepare(`
      SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at
      FROM password_reset_tokens prt
      WHERE prt.token_hash = ?
    `).bind(tokenHash).first<{
      id: string
      user_id: string
      expires_at: string
      used_at: string | null
    }>()

    if (!record) {
      return c.json({ success: false, message: 'This reset link is invalid or has already been used.' }, 400)
    }
    if (record.used_at) {
      return c.json({ success: false, message: 'This reset link has already been used. Please request a new one.' }, 400)
    }
    if (new Date(record.expires_at + 'Z') < new Date()) {
      return c.json({ success: false, message: 'This reset link has expired. Please request a new one.' }, 400)
    }

    // Hash new password and update user
    const newHash = await hashPassword(newPassword)
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(newHash, record.user_id).run()

    // Mark token as used
    const usedAt = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
    await c.env.DB.prepare(
      'UPDATE password_reset_tokens SET used_at = ? WHERE id = ?'
    ).bind(usedAt, record.id).run()

    return c.json({ success: true, message: 'Password updated successfully. You can now log in.' })

  } catch (err) {
    console.error('Reset password error:', err)
    return c.json({ success: false, message: 'Password reset failed. Please try again.' }, 500)
  }
})

// ============================================================
// JWT GUARD — all /api/* routes require a valid token
// ============================================================

app.use('/api/*', async (c, next) => {
  const jwtSecret = c.env.JWT_SECRET || 'super-secret-local-development-key-1234567890'
  const authMiddleware = jwt({ secret: jwtSecret, alg: 'HS256' })
  return authMiddleware(c, next)
})


/**
 * UTILITY: Local Mock Resumes / Fallback AI Responses
 * Used when Workers AI or D1 binding is not fully available or for zero-config local testing.
 */
const mockAnalyzeQuestions = [
  "Can you elaborate on your experience with serverless architecture or deploying to Cloudflare Workers?",
  "How have you handled scaling database connections in high-throughput environments?",
  "Have you worked with client-side PDF rendering or text extraction libraries (like pdfjs-dist) in past projects?"
]

const getMockTailoredResume = (resumeText: string, jd: string, qaAnswers: any) => {
  // Simple heuristic parsing or just a high-fidelity template filled with user info
  return {
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    phone: "+1 (555) 019-2834",
    github: "github.com/alexmorgan",
    linkedin: "linkedin.com/in/alexmorgan",
    summary: `Results-driven Software Engineer with hands-on experience in building scalable web applications. Tailored for the role matching: "${jd.slice(0, 80)}...". Expert at leveraging cloud technologies, serverless systems, and frontend wizardry to deliver premium user interfaces.`,
    skills: ["React & TypeScript", "Hono.js / Cloudflare Workers", "SQLite / D1 Databases", "Workers KV / Redis", "Vanilla CSS & Responsive Design", "RESTful APIs & GraphQL", "CI/CD & Git"],
    experience: [
      {
        role: "Senior Software Engineer",
        company: "CloudScale Systems",
        duration: "2024 - Present",
        details: [
          `Architected high-performance serverless endpoints using Hono.js deployed to Cloudflare Workers, reducing average latency by 45%.`,
          `Implemented local caching layers using Workers KV, safeguarding upstream databases and avoiding rate-limiting bottlenecks.`,
          `Incorporated dynamic state management in React, providing fluid, glassmorphic UI interactions and micro-animations.`
        ]
      },
      {
        role: "Software Developer",
        company: "WebCraft Solutions",
        duration: "2022 - 2024",
        details: [
          `Engineered custom CSS templates and layouts that enhanced mobile web experiences and increased SEO rankings.`,
          `Added client-side document processing flows, eliminating unnecessary server round-trips for file validations.`,
          `Addressed user questionnaire inputs: "${Object.values(qaAnswers).join(' | ')}"`
        ]
      }
    ],
    education: [
      {
        degree: "B.S. Computer Science",
        school: "State Tech University",
        duration: "2018 - 2022"
      }
    ],
    projects: [
      {
        title: "HoldMyResume AI Builder",
        description: [
          "Developed a full-stack resume optimizer using Vite, React, Hono, and Cloudflare Workers AI.",
          "Implemented client-side PDF text extraction and offline mock system fallback architectures."
        ],
        technologies: ["React", "TypeScript", "Hono.js", "Workers AI", "D1 SQL"]
      }
    ]
  }
}

/**
 * PATH 1: GET USER HISTORY
 */
app.get('/api/history', async (c) => {
  const payload = c.get('jwtPayload') as any
  const userId = payload.sub

  try {
    // Sync/register user profile in DB first
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)"
    ).bind(userId, payload.email || `${userId}@example.com`).run()

    const { results } = await c.env.DB.prepare(
      "SELECT id, save_name, generated_at, target_jd, tailored_resume_json FROM resume_history WHERE user_id = ? ORDER BY generated_at DESC"
    ).bind(userId).all()

    return c.json({ success: true, history: results })
  } catch (error: any) {
    console.error("D1 Fetch History Error:", error)
    // Fallback: If D1 isn't working/bound, return a local history stored in memory/localStorage (simulated via API response)
    return c.json({ 
      success: true, 
      history: [], 
      message: "Database offline. Operating in Local Demo Mode."
    })
  }
})

/**
 * PATH 2: ANALYZE RESUME & GENERATE QUESTIONS
 */
app.post('/api/analyze', async (c) => {
  const payload = c.get('jwtPayload') as any
  const userId = payload.sub
  
  let resumeText = ''
  let jobDescription = ''
  
  try {
    const body = await c.req.json()
    resumeText = (body.resumeText || '').trim()
    jobDescription = (body.jobDescription || '').trim()
  } catch (err) {
    return c.json({ success: false, message: "Invalid JSON payload format." }, 400)
  }

  // Input sanitization and size boundaries
  if (!resumeText || !jobDescription) {
    return c.json({ success: false, message: "Resume content and job description are both required." }, 400)
  }
  if (resumeText.length > 50000 || jobDescription.length > 50000) {
    return c.json({ success: false, message: "Payload content size exceeds safe boundaries." }, 400)
  }

  // 1. Rate limiting check via Workers KV
  if (c.env.LIMITER_KV) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const kvKey = `user_limit:${userId}:${today}`
      const usageCount = parseInt((await c.env.LIMITER_KV.get(kvKey)) || '0', 10)

      if (usageCount >= 10) {
        return c.json({ success: false, message: "Daily free generation limit reached (10/10)." }, 429)
      }
    } catch (e) {
      console.warn("KV rate limiter unavailable, skipping limit check.")
    }
  }

  // 2. Call Workers AI or use local mock fallback
  if (c.env.AI) {
    try {
      const systemMessage = `You are a professional technical recruiter. Compare the candidate's resume with the job description. Identify exactly 3 missing skills, projects, or credentials. Output a raw JSON array of 3 short questions to ask the candidate to fill these gaps. Do NOT write markdown, explanations, or formatting blocks. Only output the JSON string array. Example: ["Have you used Docker in production?", "Do you have AWS certifications?", "What was your role in the frontend team?"]`
      
      const response = await c.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: `Resume: ${resumeText}\nJob Description: ${jobDescription}` }
        ]
      })

      // Parse JSON array from AI output (resilient parsing)
      let text = response.response || response
      if (typeof text !== 'string') text = JSON.stringify(text)
      
      // Clean up markdown block wraps if AI generated them anyway
      const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      const questions = JSON.parse(cleanedText)
      
      if (Array.isArray(questions) && questions.length === 3) {
        return c.json({ success: true, questions })
      }
    } catch (aiError) {
      console.error("Workers AI Analyze Error:", aiError)
    }
  }

  // Fallback if AI fails or is not bound
  return c.json({ success: true, questions: mockAnalyzeQuestions })
})

/**
 * PATH 2.5: QUERY RESUME (AI CHAT)
 */
app.post('/api/query-resume', async (c) => {
  const payload = c.get('jwtPayload') as any
  const userId = payload.sub
  
  let resumeText = ''
  let question = ''

  try {
    const body = await c.req.json()
    resumeText = (body.resumeText || '').trim()
    question = (body.question || '').trim()
  } catch (err) {
    return c.json({ success: false, message: "Invalid JSON payload format." }, 400)
  }

  // Input sanitization and size boundaries
  if (!resumeText || !question) {
    return c.json({ success: false, message: "Resume content and question query are both required." }, 400)
  }
  if (resumeText.length > 50000 || question.length > 10000) {
    return c.json({ success: false, message: "Payload content size exceeds safe boundaries." }, 400)
  }

  // 1. Rate limiting check via Workers KV
  let usageCount = 0
  const today = new Date().toISOString().split('T')[0]
  const kvKey = `user_limit:${userId}:${today}`

  if (c.env.LIMITER_KV) {
    try {
      usageCount = parseInt((await c.env.LIMITER_KV.get(kvKey)) || '0', 10)
      if (usageCount >= 15) {
        return c.json({ success: false, message: "Daily free query limit reached (15/15)." }, 429)
      }
    } catch (e) {
      console.warn("KV rate limiter unavailable.")
    }
  }

  // 2. Call Workers AI or use local mock fallback
  if (c.env.AI) {
    try {
      const systemMessage = `You are a professional technical recruiter and resume reviewer. The user has uploaded their resume and asked a question or requested feedback. Provide a highly professional, constructive, and detailed answer. Format the response beautifully using markdown (bolding, lists, code tags).`
      
      const response = await c.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: `Resume Content:\n${resumeText}\n\nUser Question:\n${question}` }
        ]
      })

      let text = response.response || response
      if (typeof text !== 'string') text = JSON.stringify(text)
      
      // Clean up markdown block wraps if AI generated them anyway
      const cleanedText = text.replace(/```markdown/gi, '').replace(/```/g, '').trim()
      
      // Increment rate limits
      if (c.env.LIMITER_KV) {
        try {
          await c.env.LIMITER_KV.put(kvKey, (usageCount + 1).toString(), { expirationTtl: 86400 })
        } catch (e) {
          console.warn("KV write error.")
        }
      }

      return c.json({ success: true, answer: cleanedText })
    } catch (aiError) {
      console.error("Workers AI Query Resume Error:", aiError)
    }
  }

  // Fallback if AI fails or is not bound
  const mockAnswer = `### AI Resume Analysis (Mock)

Based on the resume content provided, here is a custom analysis answering your question: *"${question}"*

1. **Alignment & Strengths**: Your profile showcases modern tech stack competencies (React, TypeScript, Cloudflare serverless ecosystems).
2. **Actionable Suggestions**:
   - **Quantify details**: Add concrete figures to your bullet points (e.g., "reduced latency by 45% using Hono.js").
   - **Tailor summary**: Adjust the wording of your professional summary to target key terms in the job posting.
3. **Verdict**: You have a strong baseline. Expanding on database scalability and edge caching will enhance competitiveness.`;
  
  return c.json({ success: true, answer: mockAnswer })
})


/**
 * PATH 3: RUN TAILORED GENERATION & SAVE
 */
app.post('/api/generate', async (c) => {
  const payload = c.get('jwtPayload') as any
  const userId = payload.sub
  
  let resumeText = ''
  let jobDescription = ''
  let saveName = ''
  let qaAnswers: any = {}

  try {
    const body = await c.req.json()
    resumeText = (body.resumeText || '').trim()
    jobDescription = (body.jobDescription || '').trim()
    saveName = (body.saveName || '').trim()
    qaAnswers = body.qaAnswers || {}
  } catch (err) {
    return c.json({ success: false, message: "Invalid JSON payload format." }, 400)
  }

  // Input sanitization and size boundaries
  if (!resumeText || !jobDescription || !saveName) {
    return c.json({ success: false, message: "Resume, job description, and save name are required." }, 400)
  }
  if (resumeText.length > 50000 || jobDescription.length > 50000 || saveName.length > 200) {
    return c.json({ success: false, message: "Payload content size exceeds safe boundaries." }, 400)
  }

  // 1. Check daily rate limits via Cloudflare KV
  let usageCount = 0
  const today = new Date().toISOString().split('T')[0]
  const kvKey = `user_limit:${userId}:${today}`
  
  if (c.env.LIMITER_KV) {
    try {
      usageCount = parseInt((await c.env.LIMITER_KV.get(kvKey)) || '0', 10)
      if (usageCount >= 10) {
        return c.json({ success: false, message: "Daily free generation limit reached (10/10)." }, 429)
      }
    } catch (e) {
      console.warn("KV rate limiter unavailable.")
    }
  }

  // 2. Invoke Cloudflare Workers AI for context tailoring
  let tailoredResume: any = null
  
  if (c.env.AI) {
    try {
      const systemMessage = `You are an elite technical resume writer. Refine the provided resume text to emphasize skills that directly align with the target job description, weaving in context from the user's questionnaire answers. The output must be structured as a valid JSON object containing:
      - name (string)
      - email (string)
      - phone (string)
      - github (string)
      - linkedin (string)
      - summary (string, tailored professional summary)
      - skills (array of strings, optimized for the JD)
      - experience (array of objects with role, company, duration, and details [array of tailored action-verb bullet points])
      - education (array of objects with degree, school, duration)
      - projects (array of objects with title, description [array of bullet points], technologies [array of strings])
      Provide ONLY valid JSON output, do not include markdown blocks like \`\`\`json. Ensure it matches the JSON structure perfectly.`

      const response = await c.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: `Original Resume: ${resumeText}\nTarget JD: ${jobDescription}\nQ&A Context: ${JSON.stringify(qaAnswers)}` }
        ]
      })

      let text = response.response || response
      if (typeof text !== 'string') text = JSON.stringify(text)

      const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      tailoredResume = JSON.parse(cleanedText)
    } catch (aiError) {
      console.error("Workers AI Generate Error:", aiError)
    }
  }

  // Fallback if AI fails/unbound
  if (!tailoredResume) {
    tailoredResume = getMockTailoredResume(resumeText, jobDescription, qaAnswers)
  }

  // 3. Commit record snapshot to Cloudflare D1 History
  const recordId = crypto.randomUUID()
  const resumeJsonStr = JSON.stringify(tailoredResume)
  
  try {
    // First, verify/insert user
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)"
    ).bind(userId, payload.email || `${userId}@example.com`).run()

    // Insert resume history record
    await c.env.DB.prepare(
      "INSERT INTO resume_history (id, user_id, save_name, target_jd, tailored_resume_json) VALUES (?, ?, ?, ?, ?)"
    ).bind(recordId, userId, saveName, jobDescription, resumeJsonStr).run()
  } catch (dbError) {
    console.error("D1 SQL Insert Error:", dbError)
  }

  // 4. Increment the daily limiter counter
  if (c.env.LIMITER_KV) {
    try {
      await c.env.LIMITER_KV.put(kvKey, (usageCount + 1).toString(), { expirationTtl: 86400 })
    } catch (e) {
      console.warn("KV write error.")
    }
  }

  return c.json({ success: true, saveName, data: tailoredResume })
})

export default app
