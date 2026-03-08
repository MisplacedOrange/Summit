"use client"

import { useState, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"
import { useAuth } from "../auth-context"

export default function SignUpPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"student" | "organization">("student")
  const [error, setError] = useState<string | null>(null)

  const startAuth0Signup = () => {
    setRedirecting(true)
    window.location.assign("/api/auth/login?screen_hint=signup&returnTo=/dashboard")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setSubmitting(true)
    try {
      await register({
        email,
        password,
        full_name: fullName,
        role,
      })
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(47,111,209,0.22),transparent_32%),linear-gradient(180deg,#eaf4ff_0%,#dcecff_45%,#eef6ff_100%)] text-[#143d73]">
      <Header />

      <section className="mx-auto flex max-w-[1060px] px-4 pb-16 pt-24">
        <div className="mx-auto w-full max-w-md rounded-[28px] border border-[#c2daf8] bg-[linear-gradient(180deg,#f7fbff_0%,#eef6ff_100%)] p-6 shadow-[0_20px_60px_rgba(47,111,209,0.16)]">
          <div className="mb-4 inline-flex rounded-full bg-[#d8ebff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2f6fd1]">
            Join Summit
          </div>

          <div className="mb-5 overflow-hidden rounded-2xl border border-[#b6d4f7] bg-[#f5faff] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Image
              src="/assets/images/hero-vibrant-orb.svg"
              alt="Vibrant Summit signup"
              width={960}
              height={640}
              className="h-28 w-full rounded-lg object-cover"
            />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Sign up</h1>
          <p className="mt-2 text-sm text-[#4876aa]">Create an account and save it directly in the app database backed by Supabase Postgres.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5 text-left">
              <label htmlFor="full-name" className="text-sm font-medium text-[#245180]">Full name</label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-md border border-[#b6d4f7] bg-white px-3 py-2 text-sm text-[#143d73] outline-none focus:border-[#2f6fd1] focus:ring-2 focus:ring-[#2f6fd1]/15"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label htmlFor="role" className="text-sm font-medium text-[#245180]">Account type</label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as "student" | "organization")}
                className="w-full rounded-md border border-[#b6d4f7] bg-white px-3 py-2 text-sm text-[#143d73] outline-none focus:border-[#2f6fd1] focus:ring-2 focus:ring-[#2f6fd1]/15"
              >
                <option value="student">Student</option>
                <option value="organization">Organization</option>
              </select>
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-[#b6d4f7] bg-white px-3 py-2 text-sm text-[#143d73] outline-none focus:border-[#2f6fd1] focus:ring-2 focus:ring-[#2f6fd1]/15"
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label htmlFor="confirm-password" className="text-sm font-medium text-[#245180]">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-md border border-[#b6d4f7] bg-white px-3 py-2 text-sm text-[#143d73] outline-none focus:border-[#2f6fd1] focus:ring-2 focus:ring-[#2f6fd1]/15"
                placeholder="Re-enter your password"
                required
              />
            </div>

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[linear-gradient(135deg,#2f8cff,#2f6fd1)] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_28px_rgba(47,111,209,0.26)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>

            <div className="flex items-center gap-3 py-1 text-xs text-[#6f8fb4]">
              <span className="h-px flex-1 bg-[#d3e4fb]" />
              <span>or</span>
              <span className="h-px flex-1 bg-[#d3e4fb]" />
            </div>

            <button
              type="button"
              onClick={startAuth0Signup}
              disabled={redirecting}
              className="w-full rounded-md border border-[#b6d4f7] bg-[#f5faff] px-4 py-2 text-sm font-medium text-[#245cb0] transition hover:bg-[#e8f2ff] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {redirecting ? "Redirecting..." : "Create account with Auth0"}
            </button>
          </form>

          <p className="mt-4 text-sm text-[#4876aa]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[#245cb0] underline underline-offset-2">
              Log in
            </Link>
          </p>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
