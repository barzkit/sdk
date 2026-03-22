import { randomBytes } from 'crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { AgentPermissions } from '../core/types'
import { BarzKitError } from '../utils/errors'
import type { CreateSessionOptions, Session } from './types'

/**
 * Parse a duration string like '24h', '1h', '30m', '7d' into milliseconds.
 * @internal
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)\s*(s|m|h|d)$/)
  if (!match) {
    throw new BarzKitError(
      `Invalid duration: "${duration}". Use format like "24h", "30m", "7d".`,
      'INVALID_SESSION_CONFIG',
    )
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return value * multipliers[unit]
}

/**
 * Create a new session key with scoped permissions and expiration.
 * @internal
 */
export function createSession(options: CreateSessionOptions): Session {
  if (!options.expiresIn && !options.expiresAt) {
    throw new BarzKitError(
      'Session requires either "expiresIn" or "expiresAt".',
      'INVALID_SESSION_CONFIG',
    )
  }

  if (options.expiresIn && options.expiresAt) {
    throw new BarzKitError(
      'Provide either "expiresIn" or "expiresAt", not both.',
      'INVALID_SESSION_CONFIG',
    )
  }

  let expiresAt: number
  if (options.expiresAt) {
    expiresAt = Math.floor(options.expiresAt.getTime() / 1000)
  } else {
    const durationMs = parseDuration(options.expiresIn!)
    expiresAt = Math.floor((Date.now() + durationMs) / 1000)
  }

  const now = Math.floor(Date.now() / 1000)
  if (expiresAt <= now) {
    throw new BarzKitError(
      'Session expiration must be in the future.',
      'INVALID_SESSION_CONFIG',
    )
  }

  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`

  const permissions: AgentPermissions = options.permissions ? { ...options.permissions } : {}

  return {
    id,
    privateKey,
    address: account.address,
    expiresAt,
    permissions,
    label: options.label,
    isExpired() {
      return Math.floor(Date.now() / 1000) >= this.expiresAt
    },
    remainingTime() {
      const remaining = this.expiresAt - Math.floor(Date.now() / 1000)
      return remaining > 0 ? remaining : 0
    },
  }
}

/**
 * Manages session keys for a BarzAgent.
 * @internal
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map()

  create(options: CreateSessionOptions): Session {
    const session = createSession(options)
    this.sessions.set(session.id, session)
    return session
  }

  getAll(): Session[] {
    return Array.from(this.sessions.values())
  }

  revoke(id: string): boolean {
    return this.sessions.delete(id)
  }

  revokeAll(): void {
    this.sessions.clear()
  }
}
