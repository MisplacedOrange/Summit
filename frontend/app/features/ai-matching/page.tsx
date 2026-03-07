import Link from "next/link"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

export default function AiMatchingPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <Link href="/features" className="text-sm text-[#605a57] hover:text-[#37322f]">
          ← Back to Features
        </Link>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight">AI-Powered Opportunity Matching</h1>
        <p className="mt-3 max-w-3xl text-[#605a57]">
          Students receive personalized volunteer recommendations using interests, skills, availability, and location.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">How It Works</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Student onboarding captures causes, skills, schedule, and distance.</li>
              <li>Profiles and opportunities are converted to vector embeddings.</li>
              <li>Similarity + ranking algorithm prioritizes best-fit opportunities.</li>
              <li>Gemini API can be used to improve semantic understanding of opportunity text.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Key Benefits</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Students avoid irrelevant listings.</li>
              <li>Higher volunteer retention and engagement.</li>
              <li>Faster path to meaningful 40-hour completion.</li>
              <li>Better match quality for organizations with real local needs.</li>
            </ul>
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
