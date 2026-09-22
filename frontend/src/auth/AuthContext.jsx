import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const ACCOUNT_KEY = 'student-performance-prototype-account'
const ACCOUNTS_KEY = 'student-performance-prototype-accounts'
const SESSION_KEY = 'student-performance-prototype-session'

async function hashCredential(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function readAccounts() {
  try {
    const storedAccounts = localStorage.getItem(ACCOUNTS_KEY)
    if (storedAccounts !== null) {
      const parsed = JSON.parse(storedAccounts)
      return Array.isArray(parsed) ? parsed : []
    }

    const legacyAccount = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null')
    if (legacyAccount && typeof legacyAccount === 'object' && legacyAccount.email) {
      const migratedAccounts = [legacyAccount]
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(migratedAccounts))
      return migratedAccounts
    }
  } catch {
    return []
  }
  return []
}

function writeAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function withoutPassword(account) {
  const profile = { ...account }
  delete profile.passwordHash
  return profile
}

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(() => {
    const session = (() => {
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
    })()
    return session ? readAccounts().find(record => record.email === session.email) || null : null
  })
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
  })

  const signup = async ({ password, ...profile }) => {
    const accounts = readAccounts()
    const email = profile.email.toLowerCase()
    if (accounts.some(existing => existing.email.toLowerCase() === email)) throw new Error('An account with this email already exists.')
    const record = { ...profile, email, passwordHash: await hashCredential(password) }
    writeAccounts([...accounts, record])
    const sessionProfile = withoutPassword(record)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionProfile))
    setAccount(record)
    setUser(sessionProfile)
  }

  const login = async ({ email, password }) => {
    const record = readAccounts().find(existing => existing.email === email.toLowerCase())
    if (!record || record.passwordHash !== await hashCredential(password)) throw new Error('Email or password is incorrect.')
    const profile = withoutPassword(record)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(profile))
    setAccount(record)
    setUser(profile)
  }

  const logout = () => { sessionStorage.removeItem(SESSION_KEY); setUser(null) }
  const updateProfile = profile => {
    const accounts = readAccounts()
    const accountIndex = accounts.findIndex(existing => existing.email === user?.email?.toLowerCase())
    if (accountIndex < 0) return
    const next = { ...accounts[accountIndex], ...profile, email: accounts[accountIndex].email }
    accounts[accountIndex] = next
    writeAccounts(accounts)
    const sessionProfile = withoutPassword(next)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionProfile))
    setAccount(next)
    setUser(sessionProfile)
  }
  const deleteAccount = () => {
    const accounts = readAccounts().filter(existing => existing.email !== user?.email?.toLowerCase())
    writeAccounts(accounts)
    sessionStorage.removeItem(SESSION_KEY)
    setAccount(null)
    setUser(null)
  }

  const value = useMemo(() => ({ user, account, isAuthenticated: Boolean(user), signup, login, logout, updateProfile, deleteAccount }), [user, account])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
