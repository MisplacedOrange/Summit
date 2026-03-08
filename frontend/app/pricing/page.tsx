"use client"

import Link from "next/link"
import { Header } from "@/components/header"

const PLANS = [
  {
    name: "Starter Spotlight",
    price: "$149",
    cadence: "/month",
    description: "Best for local nonprofits and small businesses testing community outreach.",
    perks: [
      "Up to 2 promoted opportunities",
      "Local map boost in one city",
      "Basic analytics dashboard",
      "Email support",
    ],
  },
  {
    name: "Growth Reach",
    price: "$399",
    cadence: "/month",
    description: "Ideal for organizations running recurring campaigns across multiple causes.",
    featured: true,
    perks: [
      "Up to 8 promoted opportunities",
      "Priority map placement",
      "Advanced targeting by cause and radius",
      "Performance insights + weekly report",
    ],
  },
  {
    name: "Enterprise Impact",
    price: "Custom",
    cadence: "pricing",
    description: "For city-wide or national campaigns that need custom placement and strategy.",
    perks: [
      "Unlimited sponsored opportunities",
      "Multi-region campaign management",
      "Dedicated success partner",
      "Custom integrations and SLA",
    ],
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#eef6ff] text-[#143d73]">
      <Header />

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-28 md:px-6">
        <div className="rounded-2xl border border-[#b9d5f7] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b8db4]">Pricing</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#143d73] md:text-4xl">
                Plans for businesses that want to advertise impact
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-[#4676aa] md:text-base">
                Get your opportunities in front of volunteers actively searching by cause, skill, and location.
              </p>
            </div>
            <Link
              href="/contact?topic=partnerships"
              className="inline-flex rounded-full border border-[#9ec4ef] bg-[#f7fbff] px-4 py-2 text-sm font-medium text-[#2f6fd1] transition-colors hover:bg-[#edf7ff]"
            >
              Talk to partnerships
            </Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-2xl border border-[#b9d5f7] bg-white p-5 ${plan.featured ? "ring-2 ring-[#2f6fd1]/30" : ""}`}
              >
                {plan.featured && (
                  <span className="inline-flex rounded-full bg-[#deecff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2f6fd1]">
                    Most popular
                  </span>
                )}

                <h2 className="mt-2 text-xl font-semibold text-[#143d73]">{plan.name}</h2>
                <p className="mt-1 text-sm text-[#4676aa]">{plan.description}</p>
                <p className="mt-4 text-3xl font-semibold text-[#143d73]">
                  {plan.price}
                  <span className="ml-1 text-sm font-medium text-[#4676aa]">{plan.cadence}</span>
                </p>

                <ul className="mt-4 space-y-2">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-[#355c88]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2f6fd1]" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/contact?topic=pricing&plan=${encodeURIComponent(plan.name)}`}
                  className="mt-5 inline-flex rounded-full bg-[#2f6fd1] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#245cb0]"
                >
                  Contact us
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
