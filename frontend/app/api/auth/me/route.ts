import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
const ROLE_CLAIM = "https://impactmatch.app/role"

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

export async function GET(request: NextRequest) {
  if (!isAuth0Configured()) {
    return NextResponse.json({ user: null })
  }

  try {
    const { Auth0Client } = await import("@auth0/nextjs-auth0/server")
    const auth0 = buildAuth0Client(Auth0Client)
    const session = await auth0.getSession(request)
    if (!session || !session.user) {
      return NextResponse.json({ user: null })
    }

    const role =
      typeof session.user[ROLE_CLAIM] === "string" && ["student", "organization"].includes(session.user[ROLE_CLAIM])
        ? session.user[ROLE_CLAIM]
        : "student"

    return NextResponse.json({
      user: {
        sub: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
        role,
      },
      accessToken: session.tokenSet?.accessToken ?? null,
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
