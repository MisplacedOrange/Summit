import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f3] text-[#37322f]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Technical Details</h1>
        <p className="mt-3 max-w-3xl text-[#605a57]">
          Summit is a volunteer opportunity platform that combines AI recommendations, automated discovery, and local mapping
          to connect students with meaningful service opportunities.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Core System Modules</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Student profile and onboarding intake</li>
              <li>Opportunity ingestion and classification pipeline</li>
              <li>Vector similarity recommendation engine</li>
              <li>Map and geo-distance filtering layer</li>
              <li>Organization posting workflow</li>
              <li>Volunteer dashboard and progress tracking</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#e0dedb] bg-white p-6">
            <h2 className="text-xl font-semibold">Opportunity Extraction Fields</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
              <li>Title and organization</li>
              <li>Description and cause category</li>
              <li>Location and distance context</li>
              <li>Date/time and schedule requirements</li>
              <li>Volunteer demand and urgency</li>
              <li>Required skills</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[#e0dedb] bg-white p-6">
          <h2 className="text-xl font-semibold">Recommendation Flow</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#605a57]">
            <li>Student profile is transformed into a semantic representation.</li>
            <li>Opportunity descriptions are embedded and categorized.</li>
            <li>Similarity scores are combined with location and urgency signals.</li>
            <li>Ranked opportunities are surfaced in search, dashboard, and map views.</li>
          </ol>
        </div>

        <div className="mt-4 rounded-lg border border-[#e0dedb] bg-white p-6">
          <h2 className="text-xl font-semibold">Current Stack Direction</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#605a57]">
            <li>Frontend: React + TypeScript (template-based Next.js web app)</li>
            <li>Backend: Python API layer</li>
            <li>Database: MongoDB</li>
            <li>Scraping: BeautifulSoup + AI extraction</li>
            <li>Deployment: Vultr</li>
            <li>Auth: Auth0 candidate integration</li>
          </ul>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
