import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function isAuth0Configured() {
  return !!(process.env.AUTH0_SECRET && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_ISSUER_BASE_URL)
}

export async function GET(req: NextRequest) {
  if (!isAuth0Configured()) {
    return NextResponse.json({ error: "Auth0 is not configured" }, { status: 503 })
  }

  // Lazy-import to avoid build-time errors when env vars are missing
  const { Auth0Client } = await import("@auth0/nextjs-auth0/server")
  const auth0 = new Auth0Client()

  // The v4 SDK route handler
  const handler = auth0.handleAuth()
  return handler(req)
}
