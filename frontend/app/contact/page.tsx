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

    const subjectBase = topic === "partnerships" ? "Partnership Inquiry" : "Contact Inquiry"
    const subject = planParam ? `${subjectBase} - ${planParam}` : subjectBase

    const bodyLines = [
      `Name: ${name || "-"}`,
      `Email: ${email || "-"}`,
      `Organization: ${organization || "-"}`,
      `Topic: ${topic || "general"}`,
      "",
      effectiveMessage || "(No additional message provided)",
    ]

    const mailto = `mailto:richardliu200127@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`
    window.location.href = mailto
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,rgba(26,124,235,0.2),transparent_34%),radial-gradient(circle_at_88%_78%,rgba(0,205,178,0.14),transparent_32%),linear-gradient(180deg,#07162a_0%,#081b33_45%,#061120_100%)] text-[#d9ebff]">
      <Header />

      <section className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-28 md:px-6">
        <div className="rounded-2xl border border-[#315781] bg-[linear-gradient(145deg,rgba(13,42,72,0.98),rgba(9,29,53,0.95))] p-6 shadow-[0_16px_38px_rgba(0,0,0,0.3)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8eb8df]">Contact us</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#e7f2ff] md:text-4xl">Let’s build your campaign together</h1>
          <p className="mt-3 max-w-2xl text-sm text-[#9ec4eb] md:text-base">
            Tell us what you want to promote and we will help you choose the right plan, targeting, and rollout.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-[#c0dbf5]">
                Name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg border border-[#3e648d] bg-[#12365a] px-3 py-2 text-[#e8f3ff] outline-none focus:border-[#56b0ff]"
                  placeholder="Your name"
                />
              </label>

              <label className="grid gap-2 text-sm text-[#c0dbf5]">
                Work email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-[#3e648d] bg-[#12365a] px-3 py-2 text-[#e8f3ff] outline-none focus:border-[#56b0ff]"
                  placeholder="you@company.com"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-[#c0dbf5]">
                Organization
                <input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="rounded-lg border border-[#3e648d] bg-[#12365a] px-3 py-2 text-[#e8f3ff] outline-none focus:border-[#56b0ff]"
                  placeholder="Company or nonprofit"
                />
              </label>

              <label className="grid gap-2 text-sm text-[#c0dbf5]">
                Topic
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="rounded-lg border border-[#3e648d] bg-[#12365a] px-3 py-2 text-[#e8f3ff] outline-none focus:border-[#56b0ff]"
                >
                  <option value="general">General</option>
                  <option value="partnerships">Partnerships</option>
                  <option value="support">Support</option>
                </select>
              </label>
            </div>

            {planParam && (
              <div className="rounded-lg border border-[#3f648c] bg-[#103153] px-4 py-3 text-sm text-[#9ec4eb]">
                Selected plan: <span className="font-semibold text-[#e7f2ff]">{planParam}</span>
              </div>
            )}

            <label className="grid gap-2 text-sm text-[#c0dbf5]">
              Message
              <textarea
                rows={7}
                value={effectiveMessage}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-lg border border-[#3e648d] bg-[#12365a] px-3 py-2 text-[#e8f3ff] outline-none focus:border-[#56b0ff]"
                placeholder="Tell us your goals, timeline, and ideal audience"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                className="inline-flex rounded-full bg-[linear-gradient(135deg,#2ed3ff,#2f6fd1)] px-5 py-2.5 text-sm font-medium text-white transition-all hover:scale-[1.02]"
              >
                Send inquiry
              </button>
              <a
                href="mailto:richardliu200127@gmail.com"
                className="inline-flex rounded-full border border-[#4f78a3] bg-[#153d64] px-4 py-2 text-sm font-medium text-[#d9ecff] transition-colors hover:bg-[#1d4e7c]"
              >
                richardliu200127@gmail.com
              </a>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
