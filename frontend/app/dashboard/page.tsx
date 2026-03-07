import Image from "next/image"

import FooterSection from "@/components/footer-section"
import { Header } from "@/components/header"

const stats = [
  { label: "Recommended Opportunities", value: "24" },
  { label: "Saved Opportunities", value: "8" },
  { label: "Volunteer Hours Logged", value: "16" },
  { label: "Upcoming Events", value: "3" },
]

const upcoming = [
  {
    title: "Community Food Drive",
    organization: "Toronto Community Pantry",
    time: "Sat, 10:00 AM",
  },
  {
    title: "Park Cleanup",
    organization: "Green Neighbourhood Initiative",
    time: "Sun, 9:30 AM",
  },
  {
    title: "Youth Tutoring Session",
    organization: "Future Minds Program",
    time: "Tue, 5:00 PM",
  },
]

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#eef6ff] text-[#143d73]">
      <Header />

      <section className="mx-auto max-w-[1060px] px-4 pb-16 pt-24">
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-3 text-sm text-[#4676aa]">
          Track volunteer activity, review opportunities, and monitor upcoming events.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#9fc4ef] bg-white p-2 shadow-[0_14px_36px_rgba(49,118,206,0.22)]">
          <Image
            src="/assets/images/dashboard-spark-cards.svg"
            alt="Vibrant dashboard illustration"
            width={960}
            height={540}
            className="h-auto w-full rounded-xl"
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-lg border border-[#b6d4f7] bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-[#4676aa]">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-[#b6d4f7] bg-white p-6">
          <h2 className="text-xl font-semibold">Upcoming Volunteer Events</h2>
          <div className="mt-4 space-y-3">
            {upcoming.map((event) => (
              <div key={event.title} className="rounded-md border border-[#b6d4f7] p-4">
                <p className="font-semibold">{event.title}</p>
                <p className="text-sm text-[#4676aa]">{event.organization}</p>
                <p className="mt-1 text-sm text-[#4676aa]">{event.time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FooterSection />
    </main>
  )
}
