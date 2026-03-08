"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type React from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"
const TOKEN_STORAGE_KEY = "im_token"
const USER_STORAGE_KEY = "im_user"

export type UserPreferences = {
  interests: string[]
  skills: string[]
  location_lat: number | null
  location_lng: number | null
  radius_km: number
}

export type AuthUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  preferences: UserPreferences | null
  picture?: string | null
}

type LoginInput = {
  email: string
  password: string
}

type RegisterInput = {
  email: string
  password: string
  full_name?: string
  role?: "student" | "organization"
}

type Auth0SessionUser = {
  sub: string
  email: string
  name?: string | null
  picture?: string | null
  role?: "student" | "organization"
}

type Auth0SessionResponse = {
  user: Auth0SessionUser | null
  accessToken?: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  updatePreferences: (prefs: UserPreferences) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshProfile: async () => {},
  updatePreferences: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const persistAuth = useCallback((accessToken: string, profile: AuthUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile))
    setToken(accessToken)
    setUser(profile)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadProfileFromToken(accessToken: string, picture?: string | null) {
      const profileRes = await fetch(`${API_BASE}/v1/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!profileRes.ok) {
        const error = new Error("Failed to fetch profile") as Error & { status?: number }
        error.status = profileRes.status
        throw error
      }
      const profile = (await profileRes.json()) as AuthUser
      if (picture) {
        profile.picture = picture
      }
      return profile
    }

    async function syncAuth0Session() {
      const sessionRes = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      if (!sessionRes.ok) {
        return false
      }

      const session = (await sessionRes.json()) as Auth0SessionResponse
      if (!session.user?.sub || !session.user?.email) {
        return false
      }

      const exchangeRes = await fetch(`${API_BASE}/v1/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth0_id: session.user.sub,
          email: session.user.email,
          full_name: session.user.name ?? null,
          role: session.user.role ?? "student",
        }),
      })

      if (!exchangeRes.ok) {
        return false
      }

      const exchangeData = await exchangeRes.json().catch(() => ({})) as { access_token?: string }
      if (!exchangeData.access_token) {
        return false
      }

      const profile = await loadProfileFromToken(exchangeData.access_token, session.user.picture ?? null)
      if (!cancelled) {
        persistAuth(exchangeData.access_token, profile)
      }
      return true
    }

    async function init() {
      try {
        const storedUserRaw = localStorage.getItem(USER_STORAGE_KEY)
        if (storedUserRaw) {
          try {
            setUser(JSON.parse(storedUserRaw) as AuthUser)
          } catch {
            localStorage.removeItem(USER_STORAGE_KEY)
          }
        }

        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (storedToken) {
          setToken(storedToken)
        }

        try {
          const synced = await syncAuth0Session()
          if (synced) {
            return
          }
        } catch {
          // fall through to stored token fallback
        }

        const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (stored) {
          try {
            const profile = await loadProfileFromToken(stored)
            if (!cancelled) {
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile))
              setUser(profile)
              setToken(stored)
            }
          } catch (error) {
            const status = (error as { status?: number }).status
            // Only clear persisted auth when backend confirms token is invalid.
            if (status === 401 || status === 403) {
              localStorage.removeItem(TOKEN_STORAGE_KEY)
              localStorage.removeItem(USER_STORAGE_KEY)
              if (!cancelled) {
                setToken(null)
                setUser(null)
              }
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const email = input.email.trim().toLowerCase()
    const password = input.password

    if (!email || !password) {
      window.location.assign("/api/auth/login?returnTo=/dashboard")
      return
    }

    const res = await fetch(`${API_BASE}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const payload = (await res.json().catch(() => ({}))) as {
      detail?: string
      access_token?: string
      user?: AuthUser
    }

    if (!res.ok || !payload.access_token || !payload.user) {
      throw new Error(payload.detail || "Sign in failed")
    }

    persistAuth(payload.access_token, payload.user)
  }, [persistAuth])

  const register = useCallback(async (input: RegisterInput) => {
    const email = input.email.trim().toLowerCase()
    const password = input.password
    const full_name = input.full_name?.trim() || undefined
    const role = input.role ?? "student"

    const res = await fetch(`${API_BASE}/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name, role }),
    })

    const payload = (await res.json().catch(() => ({}))) as {
      detail?: string
      access_token?: string
      user?: AuthUser
    }

    if (!res.ok || !payload.access_token || !payload.user) {
      throw new Error(payload.detail || "Sign up failed")
    }

    persistAuth(payload.access_token, payload.user)
  }, [persistAuth])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    setToken(null)
    setUser(null)
    window.location.assign("/api/auth/logout?returnTo=/")
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const profile = await res.json()
        setUser((prev) => {
          const next = prev ? { ...profile, picture: prev.picture } : profile
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next))
          return next
        })
      }
    } catch {
      // ignore
    }
  }, [token])

  const updatePreferences = useCallback(
    async (prefs: UserPreferences) => {
      if (!token) return
      const res = await fetch(`${API_BASE}/v1/users/me/preferences`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error("Failed to save preferences")
      const updated = await res.json() as AuthUser
      setUser((prev) => {
        const next = prev ? { ...updated, picture: prev.picture } : updated
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    [token],
  )

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  )
}
