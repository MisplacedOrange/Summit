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
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, name: string) => Promise<void>
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

  const fetchProfile = useCallback(async (t: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`${API_BASE}/v1/users/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (!res.ok) return null
      return (await res.json()) as AuthUser
    } catch {
      return null
    }
  }, [])

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem("im_token")
    if (stored) {
      setToken(stored)
      fetchProfile(stored).then((u) => {
        if (u) setUser(u)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [fetchProfile])

  const login = useCallback(
    async (email: string, name: string) => {
      // Use the backend auth exchange endpoint to create/get the user,
      // then use "test-token" for subsequent requests (dev flow).
      // In production, replace with real Auth0 token exchange.
      const t = "test-token"

      // Exchange creates user if not exists
      const exchangeRes = await fetch(`${API_BASE}/v1/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth0_id: "auth0|local", email, full_name: name, role: "student" }),
      })
      if (!exchangeRes.ok) throw new Error("Login failed")

      localStorage.setItem("im_token", t)
      setToken(t)
      const profile = await fetchProfile(t)
      if (profile) setUser(profile)
    },
    [fetchProfile],
  )

  const logout = useCallback(() => {
    localStorage.removeItem("im_token")
    setToken(null)
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!token) return
    const profile = await fetchProfile(token)
    if (profile) setUser(profile)
  }, [token, fetchProfile])

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
      const updated = (await res.json()) as AuthUser
      setUser(updated)
    },
    [token],
  )

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshProfile, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  )
}
