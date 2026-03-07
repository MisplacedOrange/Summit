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

type LoginInput = {
  email: string
  password: string
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  updatePreferences: (prefs: UserPreferences) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
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

  useEffect(() => {
    let cancelled = false

    async function init() {
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
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async ({ email, password }: LoginInput) => {
    if (!email?.trim() || !password) {
      throw new Error("Email and password are required")
    }

    const response = await fetch(`${API_BASE}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.detail ?? "Unable to sign in")
    }

    const accessToken = data.access_token
    if (!accessToken) {
      throw new Error("Login succeeded but no token was returned")
    }

    localStorage.setItem("im_token", accessToken)
    setToken(accessToken)

    const profileRes = await fetch(`${API_BASE}/v1/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!profileRes.ok) {
      throw new Error("Login succeeded but profile fetch failed")
    }

    const profile = (await profileRes.json()) as AuthUser
    setUser(profile)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("im_token")
    setToken(null)
    setUser(null)
    window.location.assign("/")
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
