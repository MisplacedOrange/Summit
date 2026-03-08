"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { Header } from "@/components/header"
import { useAuth } from "../auth-context"

function formatList(values: string[] | undefined): string {
	if (!values || values.length === 0) {
		return "Not set yet"
	}
	return values.join(", ")
}

export default function DashboardPage() {
	const router = useRouter()
	const { user, loading } = useAuth()

	useEffect(() => {
		if (!loading && !user) {
			router.push("/login")
		}
	}, [loading, router, user])

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#eef6ff] text-[#143d73]">
				<p className="text-sm">Loading your dashboard...</p>
			</main>
		)
	}

	if (!user) {
		return null
	}

	const preferences = user.preferences
	const locationText =
		preferences?.location_lat != null && preferences.location_lng != null
			? `${preferences.location_lat.toFixed(4)}, ${preferences.location_lng.toFixed(4)}`
			: "Not set yet"

	return (
		<main className="min-h-screen bg-[#eef6ff] text-[#143d73]">
			<Header />

			<section className="mx-auto max-w-[1060px] px-4 pb-16 pt-24 md:px-6">
				<div className="rounded-[28px] border border-[#c2daf8] bg-white p-6 shadow-sm md:p-8">
					<div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
						<div className="flex items-center gap-4">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2f6fd1] text-2xl font-semibold text-white">
								{user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
							</div>
							<div>
								<p className="text-sm font-medium uppercase tracking-[0.16em] text-[#5e88bb]">Your profile</p>
								<h1 className="text-3xl font-semibold tracking-tight">{user.full_name ?? "Welcome back"}</h1>
								<p className="mt-1 text-sm text-[#4876aa]">{user.email}</p>
								<p className="mt-1 text-sm text-[#4876aa]">Role: {user.role}</p>
							</div>
						</div>

						<div className="flex flex-wrap gap-3">
							<Link
								href="/discover"
								className="rounded-full border border-[#c2daf8] bg-[#f5faff] px-5 py-2 text-sm font-medium text-[#245cb0] transition hover:bg-[#e8f2ff]"
							>
								Browse opportunities
							</Link>
						</div>
					</div>

					<div className="mt-8 grid gap-4 md:grid-cols-2">
						<div className="rounded-2xl border border-[#d7e6fa] bg-[#f7fbff] p-5">
							<h2 className="text-base font-semibold">Saved interests</h2>
							<p className="mt-2 text-sm text-[#4876aa]">{formatList(preferences?.interests)}</p>
						</div>

						<div className="rounded-2xl border border-[#d7e6fa] bg-[#f7fbff] p-5">
							<h2 className="text-base font-semibold">Saved skills</h2>
							<p className="mt-2 text-sm text-[#4876aa]">{formatList(preferences?.skills)}</p>
						</div>

						<div className="rounded-2xl border border-[#d7e6fa] bg-[#f7fbff] p-5">
							<h2 className="text-base font-semibold">Search radius</h2>
							<p className="mt-2 text-sm text-[#4876aa]">{preferences?.radius_km ?? 25} km</p>
						</div>

						<div className="rounded-2xl border border-[#d7e6fa] bg-[#f7fbff] p-5">
							<h2 className="text-base font-semibold">Saved location</h2>
							<p className="mt-2 text-sm text-[#4876aa]">{locationText}</p>
						</div>
					</div>

					<div className="mt-8 rounded-2xl border border-[#d7e6fa] bg-[linear-gradient(135deg,#143d73,#2f6fd1)] p-5 text-white">
						<h2 className="text-lg font-semibold">Your information is saved</h2>
						<p className="mt-2 text-sm text-[#dcebff]">
							Account details, preferences, skills, radius, and location are stored through the backend and loaded back into your session when you sign in.
						</p>
					</div>
				</div>
			</section>
		</main>
	)
}
