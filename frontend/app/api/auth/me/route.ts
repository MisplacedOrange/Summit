import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function isAuth0Configured() {
  return !!(process.env.AUTH0_SECRET && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_ISSUER_BASE_URL)
}

export async function GET() {
  if (!isAuth0Configured()) {
    return NextResponse.json({ user: null })
  }

  try {
    const { Auth0Client } = await import("@auth0/nextjs-auth0/server")
    const auth0 = new Auth0Client()
    const session = await auth0.getSession()
    if (!session || !session.user) {
      return NextResponse.json({ user: null })
    }
    return NextResponse.json({
      user: {
        sub: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
      },
      accessToken: session.tokenSet?.accessToken ?? null,
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
