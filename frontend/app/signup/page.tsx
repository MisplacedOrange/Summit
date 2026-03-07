"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

export default function SignUpPage() {
  const [redirecting, setRedirecting] = useState(false)

  const startAuth0Signup = () => {
    setRedirecting(true)
    window.location.assign("/api/auth/login?screen_hint=signup&returnTo=/dashboard")
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
          <p className="mt-2 text-sm text-[#4876aa]">Create your account securely with Auth0.</p>

          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={startAuth0Signup}
              disabled={redirecting}
              className="w-full rounded-md bg-[#2f6fd1] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#245cb0]"
            >
              {redirecting ? "Redirecting..." : "Create account with Auth0"}
            </button>
          </div>

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
