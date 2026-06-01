import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const NAME_REGEX = '^[A-Za-z ]{2,}$'
const CONTACT_REGEX = '^\\d{7,15}$'
const PASSWORD_REGEX = '^.{6,}$'
const NAME_REGEX_LABEL = 'Use at least 2 letters (A-Z) and spaces'
const CONTACT_REGEX_LABEL = 'Use 7 to 15 digits only'
const PASSWORD_REGEX_LABEL = 'Use at least 6 characters'

const emptyUserForm = {
  name: '',
  email: '',
  contact: '',
  password: '',
  role: 'user',
  profilePicture: null,
}

const loadStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('um_user'))
  } catch {
    return null
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState(loadStoredUser)

  const handleSignOut = () => {
    localStorage.removeItem('um_user')
    setCurrentUser(null)
  }

  const handleLoginSuccess = (user) => {
    localStorage.setItem('um_user', JSON.stringify(user))
    setCurrentUser(user)
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">User Management</p>
          <h1>Simple access for admins and users</h1>
        </div>
        <div className="top-actions">
          {currentUser ? (
            <button className="ghost" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <LoginPage
              currentUser={currentUser}
              onLoginSuccess={handleLoginSuccess}
            />
          }
        />
        <Route
          path="/welcome"
          element={<WelcomePage currentUser={currentUser} />}
        />
        <Route
          path="/admin"
          element={<AdminPage currentUser={currentUser} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function LoginPage({ currentUser, onLoginSuccess }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      navigate('/admin', { replace: true })
    } else if (currentUser?.role === 'user') {
      navigate('/welcome', { replace: true })
    }
  }, [currentUser, navigate])

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setError(payload.message || 'Unable to sign in')
        setIsLoading(false)
        return
      }

      const payload = await response.json()
      onLoginSuccess(payload.user)
      setMessage('Signed in successfully')
    } catch (err) {
      setError('Network error. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="card login">
      <div>
        <h2>Sign in</h2>
        <p>Use your credentials to access the dashboard.</p>
        <p className="hint">Default admin: admin@example.com / admin123</p>
      </div>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          <span className="label-text">
            Email <span className="required">*</span>
          </span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@company.com"
            required
          />
        </label>
        <label>
          <span className="label-text">
            Password <span className="required">*</span>
          </span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            pattern={PASSWORD_REGEX}
            title={PASSWORD_REGEX_LABEL}
          />
          <span className="helper">{PASSWORD_REGEX_LABEL}</span>
        </label>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="success">{message}</p> : null}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}

function WelcomePage({ currentUser }) {
  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  return (
    <section className="card welcome">
      <h2>Welcome, {currentUser.name}</h2>
      <p>You are signed in as a {currentUser.role}.</p>
      <div className="profile-chip">
        {currentUser.profilePicture ? (
          <img
            src={`${API_BASE}${currentUser.profilePicture}`}
            alt={currentUser.name}
          />
        ) : (
          <span>{currentUser.name.slice(0, 1).toUpperCase()}</span>
        )}
        <div>
          <p className="name">{currentUser.name}</p>
          <p className="meta">{currentUser.email}</p>
        </div>
      </div>
    </section>
  )
}

function AdminPage({ currentUser }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyUserForm)
  const [errors, setErrors] = useState({})
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      navigate('/', { replace: true })
    } else if (currentUser.role !== 'admin') {
      navigate('/welcome', { replace: true })
    }
  }, [currentUser, navigate])

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users`)
      const payload = await response.json()
      setUsers(Array.isArray(payload) ? payload : [])
    } catch {
      setUsers([])
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleChange = (event) => {
    const { name, value, files } = event.target
    if (name === 'profilePicture') {
      setForm((prev) => ({ ...prev, profilePicture: files?.[0] || null }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    setStatus('')
    setIsSaving(true)

    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value) {
        body.append(key, value)
      }
    })

    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        body,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setErrors(payload.errors || {})
        setStatus(payload.message || 'Fix the validation errors.')
        setIsSaving(false)
        return
      }

      setForm(emptyUserForm)
      setStatus('User created successfully.')
      await loadUsers()
    } catch {
      setStatus('Network error. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const userCountLabel = useMemo(() => {
    const adminCount = users.filter((entry) => entry.role === 'admin').length
    const userCount = users.filter((entry) => entry.role === 'user').length
    return `${adminCount} admin(s), ${userCount} user(s)`
  }, [users])

  if (!currentUser || currentUser.role !== 'admin') {
    return null
  } 

  return (
    <section className="admin-grid">
      <div className="card">
        <div className="card-head">
          <div>
            <h2>Add admins or users</h2>
            <p>Create new accounts and upload profile photos.</p>
          </div>
          <span className="pill">{userCountLabel}</span>
        </div>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            <span className="label-text">
              Name <span className="required">*</span>
            </span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              required
              pattern={NAME_REGEX}
              title={NAME_REGEX_LABEL}
            />
            <span className="helper">{NAME_REGEX_LABEL}</span>
            {errors.name ? <span className="field-error">{errors.name}</span> : null}
          </label>
          <label>
            <span className="label-text">
              Email <span className="required">*</span>
            </span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@company.com"
              required
            />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </label>
          <label>
            <span className="label-text">
              Contact <span className="required">*</span>
            </span>
            <input
              type="tel"
              name="contact"
              value={form.contact}
              onChange={handleChange}
              placeholder="10-digit number"
              required
              pattern={CONTACT_REGEX}
              title={CONTACT_REGEX_LABEL}
            />
            <span className="helper">{CONTACT_REGEX_LABEL}</span>
            {errors.contact ? (
              <span className="field-error">{errors.contact}</span>
            ) : null}
          </label>
          <label>
            <span className="label-text">
              Password <span className="required">*</span>
            </span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              required
              pattern={PASSWORD_REGEX}
              title={PASSWORD_REGEX_LABEL}
            />
            <span className="helper">{PASSWORD_REGEX_LABEL}</span>
            {errors.password ? (
              <span className="field-error">{errors.password}</span>
            ) : null}
          </label>
          <label>
            <span className="label-text">
              Role <span className="required">*</span>
            </span>
            <select name="role" value={form.role} onChange={handleChange} required>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            {errors.role ? <span className="field-error">{errors.role}</span> : null}
          </label>
          <label>
            <span className="label-text">
              Profile picture <span className="required">*</span>
            </span>
            <input
              type="file"
              name="profilePicture"
              accept="image/*"
              onChange={handleChange}
              required
            />
            {errors.profilePicture ? (
              <span className="field-error">{errors.profilePicture}</span>
            ) : null}
          </label>
          {status ? <p className="status">{status}</p> : null}
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add user'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>All users</h2>
            <p>Every profile with the latest role.</p>
          </div>
        </div>
        <div className="user-list">
          {users.length === 0 ? (
            <p className="muted">No users yet.</p>
          ) : (
            users.map((entry) => (
              <article className="user-card" key={entry.id}>
                {entry.profilePicture ? (
                  <img
                    src={`${API_BASE}${entry.profilePicture}`}
                    alt={entry.name}
                  />
                ) : (
                  <div className="avatar-fallback">
                    {entry.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="name">{entry.name}</p>
                  <p className="meta">{entry.email}</p>
                  <p className="meta">{entry.contact}</p>
                </div>
                <span className="role-tag">{entry.role}</span>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default App
