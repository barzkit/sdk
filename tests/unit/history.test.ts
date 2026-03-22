import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchTransactions } from '../../src/history/history'
import { BarzKitError } from '../../src/utils/errors'

const EXPLORER_API = 'https://api-sepolia.etherscan.io/api'
const EXPLORER_URL = 'https://sepolia.etherscan.io'
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`

function makeEtherscanResponse(txs: Record<string, string>[]) {
  return {
    status: '1',
    message: 'OK',
    result: txs,
  }
}

function makeTx(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    hash: '0xabc123',
    from: ADDRESS,
    to: '0xrecipient',
    value: '1000000000000000000',
    timeStamp: '1700000000',
    blockNumber: '12345',
    isError: '0',
    ...overrides,
  }
}

describe('fetchTransactions', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('should parse Etherscan response into TransactionRecord[]', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeEtherscanResponse([makeTx()])), { status: 200 }),
    )

    const result = await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)

    expect(result).toHaveLength(1)
    expect(result[0].hash).toBe('0xabc123')
    expect(result[0].from).toBe(ADDRESS)
    expect(result[0].to).toBe('0xrecipient')
    expect(result[0].value).toBe(1000000000000000000n)
    expect(result[0].timestamp).toBe(1700000000)
    expect(result[0].blockNumber).toBe(12345n)
    expect(result[0].explorerUrl).toBe('https://sepolia.etherscan.io/tx/0xabc123')
  })

  it('should set direction to outgoing when from matches address', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeEtherscanResponse([makeTx({ from: ADDRESS })])), { status: 200 }),
    )

    const result = await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)
    expect(result[0].direction).toBe('outgoing')
  })

  it('should set direction to incoming when from does not match address', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeEtherscanResponse([makeTx({ from: '0xsomeone' })])), { status: 200 }),
    )

    const result = await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)
    expect(result[0].direction).toBe('incoming')
  })

  it('should set status to success when isError is 0', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeEtherscanResponse([makeTx({ isError: '0' })])), { status: 200 }),
    )

    const result = await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)
    expect(result[0].status).toBe('success')
  })

  it('should set status to failed when isError is 1', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeEtherscanResponse([makeTx({ isError: '1' })])), { status: 200 }),
    )

    const result = await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)
    expect(result[0].status).toBe('failed')
  })

  it('should pass limit and offset to URL', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeEtherscanResponse([])), { status: 200 }),
    )

    await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS, { limit: 50, offset: 50 })

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('offset=50')
    expect(calledUrl).toContain('page=2')
  })

  it('should cap limit at 100', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeEtherscanResponse([])), { status: 200 }),
    )

    await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS, { limit: 200 })

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('offset=100')
  })

  it('should pass startBlock and endBlock to URL', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeEtherscanResponse([])), { status: 200 }),
    )

    await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS, {
      startBlock: 1000n,
      endBlock: 2000n,
    })

    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('startblock=1000')
    expect(calledUrl).toContain('endblock=2000')
  })

  it('should return empty array for "No transactions found"', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: '0', message: 'No transactions found', result: [] }), { status: 200 }),
    )

    const result = await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)
    expect(result).toEqual([])
  })

  it('should throw BarzKitError on API error response', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: '0', message: 'NOTOK', result: 'Invalid address' }), { status: 200 }),
    )

    await expect(fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)).rejects.toThrow(BarzKitError)
  })

  it('should throw BarzKitError on HTTP error', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 500 }))

    await expect(fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)).rejects.toThrow(BarzKitError)
  })

  it('should throw BarzKitError on network failure', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'))

    await expect(fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)).rejects.toThrow(BarzKitError)
  })

  it('should handle direction case-insensitively', async () => {
    const upperAddress = ADDRESS.toUpperCase() as `0x${string}`
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeEtherscanResponse([makeTx({ from: upperAddress })])), { status: 200 }),
    )

    const result = await fetchTransactions(EXPLORER_API, EXPLORER_URL, ADDRESS)
    expect(result[0].direction).toBe('outgoing')
  })
})
