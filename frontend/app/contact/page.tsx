"use client"

import { FormEvent, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"

export default function ContactPage() {
  const searchParams = useSearchParams()
  const planParam = searchParams.get("plan") ?? ""
  const topicParam = searchParams.get("topic") ?? "general"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [organization, setOrganization] = useState("")
  const [topic, setTopic] = useState(topicParam)
  const [message, setMessage] = useState("")

  const initialMessage = useMemo(() => {
    if (!planParam) return ""
    return `Hi Summit team,\n\nI am interested in the ${planParam} plan and would like to learn more.\n\nThanks!`
  }, [planParam])

  const effectiveMessage = message || initialMessage

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const subjectBase = topic === "pricing" ? "Pricing Inquiry" : topic === "partnerships" ? "Partnership Inquiry" : "Contact Inquiry"
    const subject = planParam ? `${subjectBase} - ${planParam}` : subjectBase

    const bodyLines = [
      `Name: ${name || "-"}`,
      `Email: ${email || "-"}`,
      `Organization: ${organization || "-"}`,
      `Topic: ${topic || "general"}`,
      "",
      effectiveMessage || "(No additional message provided)",
    ]

    const mailto = `mailto:partners@summitimpactmatch.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`
    window.location.href = mailto
  }

  return (
    <main className="min-h-screen bg-[#eef6ff] text-[#143d73]">
      <Header />

      <section className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-28 md:px-6">
        <div className="rounded-2xl border border-[#b9d5f7] bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b8db4]">Contact us</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#143d73] md:text-4xl">Let’s build your campaign together</h1>
          <p className="mt-3 max-w-2xl text-sm text-[#4676aa] md:text-base">
            Tell us what you want to promote and we will help you choose the right plan, targeting, and rollout.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-[#355c88]">
                Name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg border border-[#b9d5f7] bg-white px-3 py-2 text-[#143d73] outline-none focus:border-[#2f6fd1]"
                  placeholder="Your name"
                />
              </label>

              <label className="grid gap-2 text-sm text-[#355c88]">
                Work email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-[#b9d5f7] bg-white px-3 py-2 text-[#143d73] outline-none focus:border-[#2f6fd1]"
                  placeholder="you@company.com"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-[#355c88]">
                Organization
                <input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="rounded-lg border border-[#b9d5f7] bg-white px-3 py-2 text-[#143d73] outline-none focus:border-[#2f6fd1]"
                  placeholder="Company or nonprofit"
                />
              </label>

              <label className="grid gap-2 text-sm text-[#355c88]">
                Topic
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="rounded-lg border border-[#b9d5f7] bg-white px-3 py-2 text-[#143d73] outline-none focus:border-[#2f6fd1]"
                >
                  <option value="general">General</option>
                  <option value="pricing">Pricing</option>
                  <option value="partnerships">Partnerships</option>
                  <option value="support">Support</option>
                </select>
              </label>
            </div>

            {planParam && (
              <div className="rounded-lg border border-[#b9d5f7] bg-[#f7fbff] px-4 py-3 text-sm text-[#4676aa]">
                Selected plan: <span className="font-semibold text-[#143d73]">{planParam}</span>
              </div>
            )}

            <label className="grid gap-2 text-sm text-[#355c88]">
              Message
              <textarea
                rows={7}
                value={effectiveMessage}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-lg border border-[#b9d5f7] bg-white px-3 py-2 text-[#143d73] outline-none focus:border-[#2f6fd1]"
                placeholder="Tell us your goals, timeline, and ideal audience"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                className="inline-flex rounded-full bg-[#2f6fd1] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#245cb0]"
              >
                Send inquiry
              </button>
              <a
                href="mailto:partners@summitimpactmatch.com"
                className="inline-flex rounded-full border border-[#9ec4ef] bg-[#f7fbff] px-4 py-2 text-sm font-medium text-[#2f6fd1] transition-colors hover:bg-[#edf7ff]"
              >
                partners@summitimpactmatch.com
              </a>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
