"use client"

import { FormEvent, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000"

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setNotice(null)

    const formData = new FormData(event.currentTarget)
    const fullName = String(formData.get("fullName") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    if (!fullName || !email || !password) {
      setErrorMessage("Please fill out all fields.")
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE}/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role: "student",
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to create account.")
      }

      if (data.requires_email_verification) {
        setNotice("Account created. Please verify your email, then log in.")
        return
      }

      if (!data.access_token) {
        throw new Error("Registration succeeded but no access token was returned.")
      }

      localStorage.setItem("im_token", data.access_token)
      router.push("/dashboard")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create account."
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
              src="/assets/images/hero-vibrant-orb.svg"
              alt="Vibrant Summit signup"
              width={960}
              height={640}
              className="h-28 w-full rounded-lg object-cover"
            />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Sign up</h1>
          <p className="mt-2 text-sm text-[#4876aa]">Create a Summit account to track hours and discover opportunities.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-medium">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Your full name"
                className="w-full rounded-md border border-[#c2daf8] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2f6fd1]"
              />
            </div>

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
                placeholder="Create a password"
                className="w-full rounded-md border border-[#c2daf8] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2f6fd1]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#2f6fd1] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#245cb0]"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {errorMessage ? <p className="mt-3 text-sm text-red-700">{errorMessage}</p> : null}
          {notice ? <p className="mt-3 text-sm text-[#4876aa]">{notice}</p> : null}

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
