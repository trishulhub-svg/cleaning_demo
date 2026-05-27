import { db } from '@/lib/db'

/**
 * Server-only settings helpers.
 * NEVER import this in "use client" components.
 */

const SETTINGS_CACHE = new Map<string, { value: string; fetchedAt: number }>()
const CACHE_TTL_MS = 30_000 // 30 seconds

/**
 * Get a setting value by key. Checks DB first, falls back to env var,
 * then falls back to the provided default.
 */
export async function getSetting(key: string, defaultValue?: string): Promise<string> {
  // Check in-memory cache first
  const cached = SETTINGS_CACHE.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value
  }

  // Look up in DB
  const setting = await db.siteSettings.findUnique({
    where: { key },
  })

  let value: string | undefined

  if (setting) {
    value = setting.value
  }

  // Fall back to env var for sensitive settings
  if (!value) {
    const envKey = settingsKeyToEnvKey(key)
    if (envKey) {
      value = process.env[envKey]
    }
  }

  // Fall back to default
  if (!value && defaultValue !== undefined) {
    value = defaultValue
  }

  const result = value ?? ''
  SETTINGS_CACHE.set(key, { value: result, fetchedAt: Date.now() })
  return result
}

/**
 * Get multiple setting values by keys. Returns a map of key → value.
 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {}

  // Batch fetch from DB
  const settings = await db.siteSettings.findMany({
    where: { key: { in: keys } },
  })

  const dbMap = new Map(settings.map((s) => [s.key, s.value]))

  for (const key of keys) {
    const cached = SETTINGS_CACHE.get(key)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      results[key] = cached.value
      continue
    }

    let value = dbMap.get(key)

    if (!value) {
      const envKey = settingsKeyToEnvKey(key)
      if (envKey) {
        value = process.env[envKey]
      }
    }

    const result = value ?? ''
    results[key] = result
    SETTINGS_CACHE.set(key, { value: result, fetchedAt: Date.now() })
  }

  return results
}

/**
 * Set a setting value. Creates or updates the record.
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.siteSettings.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })

  // Invalidate cache
  SETTINGS_CACHE.delete(key)
}

/**
 * Map internal settings key to corresponding env var name.
 */
function settingsKeyToEnvKey(key: string): string | null {
  const map: Record<string, string> = {
    stripe_publishable_key: 'STRIPE_PUBLISHABLE_KEY',
    stripe_secret_key: 'STRIPE_SECRET_KEY',
    stripe_webhook_secret: 'STRIPE_WEBHOOK_SECRET',
    smtp_host: 'SMTP_HOST',
    smtp_port: 'SMTP_PORT',
    smtp_user: 'SMTP_USER',
    smtp_pass: 'SMTP_PASS',
    smtp_from_name: 'SMTP_FROM_NAME',
    smtp_from_email: 'SMTP_FROM_EMAIL',
    discount_percentage: 'DISCOUNT_PERCENTAGE',
  }
  return map[key] ?? null
}

/**
 * Invalidate the cache for a specific key or all keys.
 */
export function invalidateSettingCache(key?: string): void {
  if (key) {
    SETTINGS_CACHE.delete(key)
  } else {
    SETTINGS_CACHE.clear()
  }
}
