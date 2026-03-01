import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parsePaymentRequired,
  validateDomain,
  X402Manager,
  buildPaymentTransaction,
  createFetchWithPayment,
} from '../../src/actions/x402'
import { X402Error, PermissionError } from '../../src/utils/errors'

function make402Response(headers: Record<string, string> = {}): Response {
  const defaultHeaders: Record<string, string> = {
    'x-payment-amount': '10000',
    'x-payment-address': '0x1234567890abcdef1234567890abcdef12345678',
    'x-payment-token': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'x-payment-network': 'base',
    ...headers,
  }
  return new Response(null, { status: 402, headers: defaultHeaders })
}

describe('parsePaymentRequired', () => {
  it('should parse valid 402 response headers', () => {
    const response = make402Response()
    const payment = parsePaymentRequired(response)

    expect(payment.amount).toBe(10000n)
    expect(payment.address).toBe('0x1234567890abcdef1234567890abcdef12345678')
    expect(payment.token).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
    expect(payment.network).toBe('base')
  })

  it('should throw X402Error when amount header is missing', () => {
    const response = new Response(null, {
      status: 402,
      headers: {
        'x-payment-address': '0x1234567890abcdef1234567890abcdef12345678',
        'x-payment-token': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        'x-payment-network': 'base',
      },
    })

    expect(() => parsePaymentRequired(response)).toThrow(X402Error)
    expect(() => parsePaymentRequired(response)).toThrow('X-Payment-Amount')
  })

  it('should throw X402Error when multiple headers are missing', () => {
    const response = new Response(null, { status: 402 })

    expect(() => parsePaymentRequired(response)).toThrow(X402Error)
    expect(() => parsePaymentRequired(response)).toThrow('X-Payment-Amount')
    expect(() => parsePaymentRequired(response)).toThrow('X-Payment-Address')
  })

  it('should throw X402Error for zero amount', () => {
    const response = make402Response({ 'x-payment-amount': '0' })
    expect(() => parsePaymentRequired(response)).toThrow(X402Error)
    expect(() => parsePaymentRequired(response)).toThrow('Invalid payment amount')
  })
})

describe('validateDomain', () => {
  it('should allow domain in whitelist', () => {
    expect(() => validateDomain('https://api.example.com/data', ['api.example.com'])).not.toThrow()
  })

  it('should reject domain not in whitelist', () => {
    expect(() =>
      validateDomain('https://evil.com/data', ['api.example.com']),
    ).toThrow(X402Error)
    expect(() =>
      validateDomain('https://evil.com/data', ['api.example.com']),
    ).toThrow('not in the allowed list')
  })

  it('should skip check when no allowedDomains', () => {
    expect(() => validateDomain('https://anything.com/data')).not.toThrow()
    expect(() => validateDomain('https://anything.com/data', [])).not.toThrow()
  })
})

describe('X402Manager', () => {
  let manager: X402Manager

  beforeEach(() => {
    manager = new X402Manager()
  })

  it('should start disabled', () => {
    expect(manager.enabled).toBe(false)
  })

  it('should throw when validating payment while disabled', () => {
    expect(() => manager.validatePayment(100n)).toThrow(X402Error)
    expect(() => manager.validatePayment(100n)).toThrow('x402 not enabled')
  })

  it('should enable with config', () => {
    manager.enable({ maxPaymentPerRequest: '0.01 USDC', maxDailyPayments: '1 USDC' })
    expect(manager.enabled).toBe(true)
  })

  it('should allow payment within per-request limit', () => {
    manager.enable({ maxPaymentPerRequest: '0.01 USDC', maxDailyPayments: '1 USDC' })
    // 0.01 USDC = 10000 atomic units (6 decimals)
    expect(() => manager.validatePayment(10000n)).not.toThrow()
  })

  it('should reject payment exceeding per-request limit', () => {
    manager.enable({ maxPaymentPerRequest: '0.01 USDC', maxDailyPayments: '1 USDC' })
    // 0.02 USDC = 20000 atomic units
    expect(() => manager.validatePayment(20000n)).toThrow(PermissionError)
    expect(() => manager.validatePayment(20000n)).toThrow('per-request limit')
  })

  it('should reject payment exceeding daily limit', () => {
    manager.enable({ maxPaymentPerRequest: '1 USDC', maxDailyPayments: '0.02 USDC' })
    // First payment: 15000 (0.015 USDC) — ok
    manager.validatePayment(15000n)
    manager.recordPayment(15000n)

    // Second payment: 10000 (0.01 USDC) — would exceed 20000 daily limit
    expect(() => manager.validatePayment(10000n)).toThrow(PermissionError)
    expect(() => manager.validatePayment(10000n)).toThrow('daily limit')
  })

  it('should track daily spend', () => {
    manager.enable({ maxPaymentPerRequest: '1 USDC', maxDailyPayments: '1 USDC' })
    manager.recordPayment(5000n)
    expect(manager.dailySpent).toBe(5000n)
    manager.recordPayment(3000n)
    expect(manager.dailySpent).toBe(8000n)
  })

  it('should reset daily spend after 24h', () => {
    manager.enable({ maxPaymentPerRequest: '1 USDC', maxDailyPayments: '0.01 USDC' })
    manager.recordPayment(5000n)

    // Fast-forward 25 hours
    vi.useFakeTimers()
    vi.advanceTimersByTime(25 * 60 * 60 * 1000)

    expect(manager.dailySpent).toBe(0n)
    vi.useRealTimers()
  })
})

describe('buildPaymentTransaction', () => {
  it('should build ERC-20 transfer transaction', () => {
    const tx = buildPaymentTransaction({
      amount: 10000n,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      network: 'base',
    })

    expect(tx.to).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
    expect(tx.data).toBeDefined()
    expect(tx.value).toBeUndefined()
  })
})

describe('createFetchWithPayment', () => {
  let manager: X402Manager
  let mockSendTx: ReturnType<typeof vi.fn>

  beforeEach(() => {
    manager = new X402Manager()
    mockSendTx = vi.fn().mockResolvedValue('0xdeadbeef' as `0x${string}`)
  })

  it('should throw if x402 not enabled', async () => {
    const fetchWithPayment = createFetchWithPayment(manager, mockSendTx)
    await expect(fetchWithPayment('https://api.example.com/data')).rejects.toThrow(X402Error)
    await expect(fetchWithPayment('https://api.example.com/data')).rejects.toThrow('not enabled')
  })

  it('should return non-402 responses as-is', async () => {
    manager.enable({ maxPaymentPerRequest: '1 USDC', maxDailyPayments: '10 USDC' })
    const fetchWithPayment = createFetchWithPayment(manager, mockSendTx)

    const mockResponse = new Response('ok', { status: 200 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    const result = await fetchWithPayment('https://api.example.com/data')
    expect(result.status).toBe(200)
    expect(mockSendTx).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('should handle 402, pay, and retry with proof', async () => {
    manager.enable({
      maxPaymentPerRequest: '1 USDC',
      maxDailyPayments: '10 USDC',
      allowedDomains: ['api.example.com'],
    })
    const fetchWithPayment = createFetchWithPayment(manager, mockSendTx)

    const response402 = make402Response()
    const response200 = new Response('data', { status: 200 })
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(response402)
      .mockResolvedValueOnce(response200)
    vi.stubGlobal('fetch', mockFetch)

    const result = await fetchWithPayment('https://api.example.com/data')
    expect(result.status).toBe(200)
    expect(mockSendTx).toHaveBeenCalledOnce()

    // Verify retry includes proof header
    const retryCall = mockFetch.mock.calls[1]
    expect(retryCall[1].headers['X-Payment-Proof']).toBe('0xdeadbeef')

    vi.unstubAllGlobals()
  })

  it('should reject domain not in whitelist', async () => {
    manager.enable({
      maxPaymentPerRequest: '1 USDC',
      maxDailyPayments: '10 USDC',
      allowedDomains: ['api.example.com'],
    })
    const fetchWithPayment = createFetchWithPayment(manager, mockSendTx)

    await expect(fetchWithPayment('https://evil.com/data')).rejects.toThrow(X402Error)

    vi.unstubAllGlobals()
  })

  it('should reject 402 with missing payment headers', async () => {
    manager.enable({ maxPaymentPerRequest: '1 USDC', maxDailyPayments: '10 USDC' })
    const fetchWithPayment = createFetchWithPayment(manager, mockSendTx)

    const badResponse = new Response(null, { status: 402 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(badResponse))

    await expect(fetchWithPayment('https://api.example.com/data')).rejects.toThrow(X402Error)
    await expect(fetchWithPayment('https://api.example.com/data')).rejects.toThrow('missing required headers')

    vi.unstubAllGlobals()
  })
})
