import type { AgentPermissions } from '../core/types'

/** Options for creating a new session key. */
export interface CreateSessionOptions {
  /** Duration string (e.g., '24h', '1h', '30m'). Mutually exclusive with expiresAt. */
  expiresIn?: string
  /** Exact expiration date. Mutually exclusive with expiresIn. */
  expiresAt?: Date
  /** Permissions scoped to this session */
  permissions?: AgentPermissions
  /** Optional human-readable label (e.g., "trading-bot-session") */
  label?: string
}

/** A session key with scoped permissions and expiration. */
export interface Session {
  /** Unique session identifier */
  id: string
  /** Generated private key for this session */
  privateKey: `0x${string}`
  /** Derived address from the private key */
  address: `0x${string}`
  /** Unix timestamp (seconds) when this session expires */
  expiresAt: number
  /** Permissions scoped to this session */
  permissions: AgentPermissions
  /** Optional human-readable label */
  label?: string
  /** Check whether this session has expired */
  isExpired(): boolean
  /** Seconds remaining until expiration (0 if expired) */
  remainingTime(): number
}
