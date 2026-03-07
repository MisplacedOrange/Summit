"use client"

import { FormEvent, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.")
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to sign in.")
      }

      if (!data.access_token) {
        throw new Error("Login succeeded but no access token was returned.")
      }

      localStorage.setItem("im_token", data.access_token)
      router.push("/dashboard")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in."
      setErrorMessage(message)
    } finally {
      setLoading(false)
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
          <p className="mt-2 text-sm text-[#4876aa]">Access your Summit dashboard and volunteer opportunities.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-md border border-[#c2daf8] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2f6fd1]"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-md border border-[#c2daf8] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2f6fd1]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#2f6fd1] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#245cb0]"
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>

          {errorMessage ? <p className="mt-3 text-sm text-red-700">{errorMessage}</p> : null}

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
