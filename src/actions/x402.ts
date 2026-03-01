import type { Address, Hash } from 'viem'
import { encodeFunctionData } from 'viem'
import type { X402Config, X402PaymentRequest, TransactionRequest } from '../core/types'
import { X402Error, PermissionError } from '../utils/errors'
import { ERC20_ABI } from '../utils/constants'

// ─── Header Constants ───────────────────────────────────────

const HEADER_AMOUNT = 'x-payment-amount'
const HEADER_ADDRESS = 'x-payment-address'
const HEADER_TOKEN = 'x-payment-token'
const HEADER_NETWORK = 'x-payment-network'
const HEADER_PROOF = 'X-Payment-Proof'

// ─── Parse 402 Response ─────────────────────────────────────

export function parsePaymentRequired(response: Response): X402PaymentRequest {
  const amount = response.headers.get(HEADER_AMOUNT)
  const address = response.headers.get(HEADER_ADDRESS)
  const token = response.headers.get(HEADER_TOKEN)
  const network = response.headers.get(HEADER_NETWORK)

  if (!amount || !address || !token || !network) {
    const missing = [
      !amount && 'X-Payment-Amount',
      !address && 'X-Payment-Address',
      !token && 'X-Payment-Token',
      !network && 'X-Payment-Network',
    ].filter(Boolean)
    throw new X402Error(`402 response missing required headers: ${missing.join(', ')}`)
  }

  const parsed = BigInt(amount)
  if (parsed <= 0n) {
    throw new X402Error(`Invalid payment amount: ${amount}`)
  }

  return {
    amount: parsed,
    address: address as Address,
    token: token as Address,
    network,
  }
}

// ─── Validation ─────────────────────────────────────────────

export function validateDomain(url: string, allowedDomains?: string[]): void {
  if (!allowedDomains || allowedDomains.length === 0) return

  const hostname = new URL(url).hostname
  if (!allowedDomains.includes(hostname)) {
    throw new X402Error(
      `Domain "${hostname}" is not in the allowed list. ` +
      `Allowed: ${allowedDomains.join(', ')}`,
    )
  }
}

// ─── Daily Spend Tracker ────────────────────────────────────

export class X402Manager {
  private _config: X402Config | null = null
  private _dailySpent = 0n
  private _windowStart = 0

  get enabled(): boolean {
    return this._config !== null
  }

  get config(): X402Config | null {
    return this._config
  }

  get dailySpent(): bigint {
    this.resetIfExpired()
    return this._dailySpent
  }

  enable(config: X402Config): void {
    this._config = config
    this._dailySpent = 0n
    this._windowStart = Date.now()
  }

  validatePayment(amount: bigint): void {
    if (!this._config) throw new X402Error('x402 not enabled')

    this.resetIfExpired()

    const maxPerRequest = parseHumanAmountToAtomic(this._config.maxPaymentPerRequest)
    if (amount > maxPerRequest) {
      throw new PermissionError(
        `Payment amount ${amount} exceeds per-request limit of ${maxPerRequest} ` +
        `(${this._config.maxPaymentPerRequest})`,
      )
    }

    const maxDaily = parseHumanAmountToAtomic(this._config.maxDailyPayments)
    if (this._dailySpent + amount > maxDaily) {
      throw new PermissionError(
        `Payment would exceed daily limit of ${maxDaily} ` +
        `(${this._config.maxDailyPayments}). Already spent: ${this._dailySpent}`,
      )
    }
  }

  recordPayment(amount: bigint): void {
    this.resetIfExpired()
    this._dailySpent += amount
  }

  private resetIfExpired(): void {
    const now = Date.now()
    const elapsed = now - this._windowStart
    const DAY_MS = 24 * 60 * 60 * 1000
    if (elapsed >= DAY_MS) {
      this._dailySpent = 0n
      this._windowStart = now
    }
  }
}

// ─── Build ERC-20 Transfer ──────────────────────────────────

export function buildPaymentTransaction(
  payment: X402PaymentRequest,
): TransactionRequest {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [payment.address, payment.amount],
  })

  return {
    to: payment.token,
    data,
  }
}

// ─── Fetch With Payment ─────────────────────────────────────

export function createFetchWithPayment(
  manager: X402Manager,
  sendTransaction: (tx: TransactionRequest) => Promise<Hash>,
) {
  return async function fetchWithPayment(
    url: string,
    options?: RequestInit,
  ): Promise<Response> {
    if (!manager.enabled) {
      throw new X402Error('x402 not enabled. Call agent.enableX402() first.')
    }

    const config = manager.config!
    validateDomain(url, config.allowedDomains)

    const response = await fetch(url, options)

    if (response.status !== 402) {
      return response
    }

    const payment = parsePaymentRequired(response)
    manager.validatePayment(payment.amount)

    const txHash = await sendTransaction(buildPaymentTransaction(payment))
    manager.recordPayment(payment.amount)

    return fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        [HEADER_PROOF]: txHash,
      },
    })
  }
}

// ─── Helpers ────────────────────────────────────────────────

function parseHumanAmountToAtomic(input: string): bigint {
  const parts = input.trim().split(/\s+/)
  if (parts.length !== 2) {
    throw new X402Error(`Invalid amount format: "${input}". Expected "0.01 USDC".`)
  }

  const [numStr, unit] = parts
  const upper = unit.toUpperCase()

  let decimals: number
  switch (upper) {
    case 'USDC':
    case 'USDT':
      decimals = 6
      break
    case 'DAI':
    case 'ETH':
    case 'WETH':
      decimals = 18
      break
    default:
      throw new X402Error(`Unknown token unit in amount: "${unit}"`)
  }

  const [whole, frac = ''] = numStr.split('.')
  const padded = frac.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole + padded)
}
