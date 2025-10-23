// Global type declarations for Astro
/// <reference types="astro/client" />

// Environment variables type declarations
interface ImportMetaEnv {
  readonly PUBLIC_TYMB_URL: string
  readonly PUBLIC_TYMG_URL: string
  readonly PUBLIC_API_BASE_URL: string
  readonly PUBLIC_DECKOFCARDS_URL: string
  readonly PUBLIC_PEOPLE_IMAGE_URL: string
  readonly PUBLIC_SSO_URL: string
  readonly PUBLIC_FRONTEND_URL: string
  readonly PUBLIC_CLIENT_ID: string
  readonly PUBLIC_REALM: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
