import Link from "next/link"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"
import YourWorkInSync from "@/components/your-work-in-sync"

export default function YourWorkInSyncPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <Link href="/features" className="text-sm text-[#605a57] hover:text-[#37322f]">
          ← Back to Features
        </Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Your Work, In Sync</h1>
        <p className="mt-3 max-w-2xl text-[#605a57]">
          Team updates, collaboration cues, and messaging context in one shared flow.
        </p>

        <div className="mt-10 rounded-xl border border-[#e0dedb] bg-white p-8">
          <div className="flex justify-center">
            <YourWorkInSync />
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
