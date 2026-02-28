import type { AgentPermissions, TransactionRequest } from '../core/types'
import { PermissionError } from '../utils/errors'

export class PermissionManager {
  private _permissions: AgentPermissions
  private _dailySpent: bigint = 0n
  private _dailyResetTime: number = Date.now()

  constructor(permissions: AgentPermissions = {}) {
    this._permissions = { ...permissions }
  }

  get permissions(): AgentPermissions {
    return { ...this._permissions }
  }

  update(permissions: Partial<AgentPermissions>): void {
    this._permissions = { ...this._permissions, ...permissions }
  }

  validate(tx: TransactionRequest): void {
    const p = this._permissions

    // Check allowed contracts
    if (p.allowedContracts && p.allowedContracts.length > 0) {
      const target = tx.to.toLowerCase()
      const allowed = p.allowedContracts.map((a) => a.toLowerCase())
      if (!allowed.includes(target)) {
        throw new PermissionError(
          `Target contract ${tx.to} is not in the allowed list. ` +
          `Allowed: ${p.allowedContracts.join(', ')}`,
        )
      }
    }

    // Check time window
    if (p.timeWindow) {
      const now = new Date()
      const hours = now.getUTCHours()
      const minutes = now.getUTCMinutes()
      const currentTime = hours * 60 + minutes

      const [startH, startM] = p.timeWindow.start.split(':').map(Number)
      const [endH, endM] = p.timeWindow.end.split(':').map(Number)
      const startTime = startH * 60 + startM
      const endTime = endH * 60 + endM

      if (currentTime < startTime || currentTime > endTime) {
        throw new PermissionError(
          `Transaction outside allowed time window. ` +
          `Allowed: ${p.timeWindow.start} - ${p.timeWindow.end} UTC. ` +
          `Current: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} UTC.`,
        )
      }
    }

    // Check per-transaction amount limit
    if (p.maxAmountPerTx && tx.value) {
      const limit = parseHumanAmount(p.maxAmountPerTx)
      if (limit !== null && tx.value > limit) {
        throw new PermissionError(
          `Transaction value ${tx.value} exceeds per-transaction limit of ${p.maxAmountPerTx}.`,
        )
      }
    }

    // Check daily spend
    if (p.maxDailySpend && tx.value) {
      this._resetDailyIfNeeded()
      const limit = parseHumanAmount(p.maxDailySpend)
      if (limit !== null && this._dailySpent + tx.value > limit) {
        throw new PermissionError(
          `Transaction would exceed daily spend limit of ${p.maxDailySpend}. ` +
          `Already spent today: ${this._dailySpent}. Requested: ${tx.value}.`,
        )
      }
    }
  }

  recordSpend(value: bigint): void {
    this._resetDailyIfNeeded()
    this._dailySpent += value
  }

  private _resetDailyIfNeeded(): void {
    const now = Date.now()
    const ONE_DAY = 24 * 60 * 60 * 1000
    if (now - this._dailyResetTime > ONE_DAY) {
      this._dailySpent = 0n
      this._dailyResetTime = now
    }
  }
}

function parseHumanAmount(amount: string): bigint | null {
  const parts = amount.trim().split(/\s+/)
  const num = parseFloat(parts[0])
  if (isNaN(num)) return null

  const unit = parts[1]?.toUpperCase() || 'WEI'

  switch (unit) {
    case 'ETH':
      return BigInt(Math.floor(num * 1e18))
    case 'GWEI':
      return BigInt(Math.floor(num * 1e9))
    case 'WEI':
      return BigInt(Math.floor(num))
    case 'USDC':
    case 'USDT':
      return BigInt(Math.floor(num * 1e6))
    case 'DAI':
      return BigInt(Math.floor(num * 1e18))
    default:
      return null
  }
}
