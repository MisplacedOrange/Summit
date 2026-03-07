import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

const improvements = [
  "Improve real-time interest discovery with stronger personalization models",
  "Expand search ranking with behavior feedback loops",
  "Increase no-signup discovery coverage through broader web ingestion",
  "Enable business-to-business opportunity exchange scenarios",
  "Introduce community need heatmaps for urgent volunteer gaps",
  "Add volunteer teams and group signups for school clubs",
  "Generate resume-ready impact summaries from completed volunteer work",
]

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Roadmap & Improvements</h1>
        <p className="mt-3 max-w-3xl text-[#605a57]">
          Planned upgrades focused on better match quality, stronger discovery coverage, and richer volunteer impact outcomes.
        </p>

        <div className="mt-10 rounded-lg border border-[#e0dedb] bg-white p-6">
          <ul className="list-disc space-y-2 pl-5 text-sm text-[#605a57]">
            {improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Hackathon Tracks</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Vultr deployment track</li>
              <li>Auth0 identity track</li>
              <li>Gemini API intelligence track</li>
              <li>Google Antigravity experimentation track</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Near-Term Build Priorities</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Reliable ingestion scheduler and deduping</li>
              <li>Opportunity quality scoring and moderation</li>
              <li>Student dashboard metrics polish</li>
              <li>Map performance and filter responsiveness</li>
            </ul>
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
