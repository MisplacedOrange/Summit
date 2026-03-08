"use client"

import { useState, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"
import { useAuth } from "../auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const startAuth0Login = () => {
    setRedirecting(true)
    window.location.assign("/api/auth/login?returnTo=/dashboard")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login({ email, password })
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#eef6ff] text-[#143d73]">
      <Header />

      <section className="mx-auto flex max-w-[1060px] px-4 pb-16 pt-24">
        <div className="mx-auto w-full max-w-md rounded-lg border border-[#c2daf8] bg-white p-6 shadow-sm">
          <div className="mb-5 overflow-hidden rounded-xl border border-[#b6d4f7] bg-[#f5faff] p-1.5">
            <Image
              src="/assets/images/discover-gradient-grid.svg"
              alt="Vibrant volunteer discovery"
              width={960}
              height={560}
              className="h-28 w-full rounded-lg object-cover"
            />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
          <p className="mt-2 text-sm text-[#4876aa]">Sign in with your email and password. Accounts are stored in the app database backed by Supabase Postgres.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5 text-left">
              <label htmlFor="email" className="text-sm font-medium text-[#245180]">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-[#b6d4f7] bg-white px-3 py-2 text-sm text-[#143d73] outline-none focus:border-[#2f6fd1] focus:ring-2 focus:ring-[#2f6fd1]/15"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label htmlFor="password" className="text-sm font-medium text-[#245180]">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-[#b6d4f7] bg-white px-3 py-2 text-sm text-[#143d73] outline-none focus:border-[#2f6fd1] focus:ring-2 focus:ring-[#2f6fd1]/15"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[#2f6fd1] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#245cb0] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex items-center gap-3 py-1 text-xs text-[#6f8fb4]">
              <span className="h-px flex-1 bg-[#d3e4fb]" />
              <span>or</span>
              <span className="h-px flex-1 bg-[#d3e4fb]" />
            </div>

            <button
              type="button"
              onClick={startAuth0Login}
              disabled={redirecting}
              className="w-full rounded-md border border-[#b6d4f7] bg-[#f5faff] px-4 py-2 text-sm font-medium text-[#245cb0] transition hover:bg-[#e8f2ff] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {redirecting ? "Redirecting..." : "Continue with Auth0"}
            </button>
          </form>

          <p className="mt-4 text-sm text-[#4876aa]">
            New here?{" "}
            <Link href="/signup" className="font-medium text-[#245cb0] underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
