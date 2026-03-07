"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type React from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"

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

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: () => void
  logout: () => void
  refreshProfile: () => Promise<void>
  updatePreferences: (prefs: UserPreferences) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
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

  // Try Auth0 session first, fall back to dev test-token
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        // 1. Check for Auth0 session
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            const accessToken = data.accessToken ?? "auth0-session"

            // Sync the Auth0 user with the backend
            const exchangeRes = await fetch(`${API_BASE}/v1/auth/exchange`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                auth0_id: data.user.sub,
                email: data.user.email,
                full_name: data.user.name ?? data.user.email.split("@")[0],
                role: "student",
              }),
            })

            if (exchangeRes.ok) {
              // Get full profile from backend
              const profileRes = await fetch(`${API_BASE}/v1/users/me`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              })
              if (profileRes.ok && !cancelled) {
                const profile = await profileRes.json()
                setUser({ ...profile, picture: data.user.picture })
                setToken(accessToken)
                setLoading(false)
                return
              }
            }

            // Even if backend sync fails, show Auth0 user
            if (!cancelled) {
              setUser({
                id: data.user.sub,
                email: data.user.email,
                full_name: data.user.name,
                role: "student",
                preferences: null,
                picture: data.user.picture,
              })
              setToken(accessToken)
              setLoading(false)
              return
            }
          }
        }
      } catch {
        // Auth0 route not available — fall through to dev check
      }

      // 2. Fall back to dev token (for local dev without Auth0)
      const stored = localStorage.getItem("im_token")
      if (stored) {
        try {
          const profileRes = await fetch(`${API_BASE}/v1/users/me`, {
            headers: { Authorization: `Bearer ${stored}` },
          })
          if (profileRes.ok && !cancelled) {
            const profile = await profileRes.json()
            setUser(profile)
            setToken(stored)
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) setLoading(false)
    }

    void init()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(() => {
    // Redirect to Auth0 login
    window.location.assign("/api/auth/login")
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("im_token")
    setToken(null)
    setUser(null)
    // Redirect to Auth0 logout (returns to home)
    window.location.assign("/api/auth/logout")
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const profile = await res.json()
        setUser((prev) => prev ? { ...profile, picture: prev.picture } : profile)
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
      setUser((prev) => prev ? { ...updated, picture: prev.picture } : updated)
    },
    [token],
  )

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  )
}
