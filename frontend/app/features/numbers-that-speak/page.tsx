import Link from "next/link"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"
import NumbersThatSpeak from "@/components/numbers-that-speak"

export default function NumbersThatSpeakPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <Link href="/features" className="text-sm text-[#605a57] hover:text-[#37322f]">
          ← Back to Features
        </Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Numbers That Speak</h1>
        <p className="mt-3 max-w-2xl text-[#605a57]">
          Financial reporting and performance cards designed for fast decision making.
        </p>

        <div className="mt-10 rounded-xl border border-[#e0dedb] bg-white p-8">
          <div className="flex justify-center">
            <NumbersThatSpeak />
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
