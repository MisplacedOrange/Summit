import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function getAuth0Domain() {
  const rawDomain = process.env.AUTH0_DOMAIN?.trim()
  if (rawDomain) {
    return rawDomain.replace(/^https?:\/\//, "")
  }

  const issuer = process.env.AUTH0_ISSUER_BASE_URL?.trim()
  if (!issuer) return ""

  return issuer.replace(/^https?:\/\//, "").replace(/\/$/, "")
}

function isAuth0Configured() {
  return !!(process.env.AUTH0_SECRET && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET && getAuth0Domain())
}

function getAppBaseUrl() {
  return process.env.APP_BASE_URL?.trim() || process.env.AUTH0_BASE_URL?.trim()
}

type Auth0ClientCtor = typeof import("@auth0/nextjs-auth0/server")["Auth0Client"]

function buildAuth0Client(Auth0Client: Auth0ClientCtor) {
  const domain = getAuth0Domain()
  const appBaseUrl = getAppBaseUrl()
  return new Auth0Client({
    domain,
    secret: process.env.AUTH0_SECRET,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    appBaseUrl,
    routes: {
      login: "/api/auth/login",
      callback: "/api/auth/callback",
      logout: "/api/auth/logout",
    },
    authorizationParameters: {
      audience: process.env.AUTH0_AUDIENCE,
      scope: process.env.AUTH0_SCOPE ?? "openid profile email",
    },
  })
}

export async function GET(req: NextRequest) {
  if (!isAuth0Configured()) {
    return NextResponse.json({ error: "Auth0 is not configured" }, { status: 503 })
  }

  // Lazy-import to avoid build-time errors when env vars are missing
  const { Auth0Client } = await import("@auth0/nextjs-auth0/server")
  const auth0 = buildAuth0Client(Auth0Client)

  // useUser() expects a profile route that returns user JSON or 204 when anonymous.
  if (req.nextUrl.pathname.endsWith("/profile")) {
    const session = await auth0.getSession(req)
    if (!session?.user) {
      return new NextResponse(null, { status: 204 })
    }
    return NextResponse.json(session.user)
  }

  return auth0.middleware(req)
}
