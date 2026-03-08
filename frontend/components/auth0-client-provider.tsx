"use client"

import type React from "react"
import { Auth0Provider } from "@auth0/nextjs-auth0/client"

export default function Auth0ClientProvider({ children }: { children: React.ReactNode }) {
  return <Auth0Provider>{children}</Auth0Provider>
}
