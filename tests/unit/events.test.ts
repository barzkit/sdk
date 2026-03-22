import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TypedEventEmitter } from '../../src/events/emitter'
import { ChainPoller } from '../../src/events/poller'
import type { TransactionEvent, BalanceChangeEvent, IncomingTransferEvent } from '../../src/events/types'

// ── TypedEventEmitter ────────────────────────────────────────

describe('TypedEventEmitter', () => {
  let emitter: TypedEventEmitter

  beforeEach(() => {
    emitter = new TypedEventEmitter()
  })

  it('should emit and receive events', () => {
    const handler = vi.fn()
    emitter.on('frozen', handler)
    emitter.emit('frozen')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should pass event data to handler', () => {
    const handler = vi.fn()
    emitter.on('balanceChange', handler)

    const event: BalanceChangeEvent = {
      token: 'ETH',
      previous: 100n,
      current: 200n,
      difference: 100n,
    }
    emitter.emit('balanceChange', event)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('should unsubscribe via returned function', () => {
    const handler = vi.fn()
    const unsubscribe = emitter.on('frozen', handler)

    emitter.emit('frozen')
    expect(handler).toHaveBeenCalledTimes(1)

    unsubscribe()
    emitter.emit('frozen')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should support multiple listeners on one event', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    emitter.on('frozen', handler1)
    emitter.on('frozen', handler2)

    emitter.emit('frozen')
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  it('should removeAllListeners', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    emitter.on('frozen', handler1)
    emitter.on('unfrozen', handler2)

    emitter.removeAllListeners()
    emitter.emit('frozen')
    emitter.emit('unfrozen')
    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).not.toHaveBeenCalled()
  })

  it('should report listenerCount', () => {
    expect(emitter.listenerCount('frozen')).toBe(0)
    const unsub = emitter.on('frozen', () => {})
    expect(emitter.listenerCount('frozen')).toBe(1)
    unsub()
    expect(emitter.listenerCount('frozen')).toBe(0)
  })

  it('should emit error events', () => {
    const handler = vi.fn()
    emitter.on('error', handler)
    const err = new Error('test error')
    emitter.emit('error', err)
    expect(handler).toHaveBeenCalledWith(err)
  })

  it('should emit incoming event with correct types', () => {
    const handler = vi.fn()
    emitter.on('incoming', handler)

    const event: IncomingTransferEvent = {
      hash: '0xabc' as `0x${string}`,
      from: '0xsender' as `0x${string}`,
      value: 1000n,
      token: 'ETH',
    }
    emitter.emit('incoming', event)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('should emit transaction event', () => {
    const handler = vi.fn()
    emitter.on('transaction', handler)

    const event: TransactionEvent = {
      hash: '0xtx' as `0x${string}`,
      from: '0xfrom' as `0x${string}`,
      to: '0xto' as `0x${string}`,
      value: 500n,
      status: 'confirmed',
      blockNumber: 42n,
      explorerUrl: 'https://etherscan.io/tx/0xtx',
    }
    emitter.emit('transaction', event)
    expect(handler).toHaveBeenCalledWith(event)
  })
})

// ── ChainPoller ──────────────────────────────────────────────

function createMockPublicClient(overrides: {
  balance?: bigint
  blockNumber?: bigint
  balanceSequence?: bigint[]
  blockNumberSequence?: bigint[]
  logs?: Array<{
    transactionHash: string
    address: string
    args: { from: string; to: string; value: bigint }
  }>
} = {}) {
  let balanceCallCount = 0
  let blockCallCount = 0
  const balanceSeq = overrides.balanceSequence ?? [overrides.balance ?? 1000n]
  const blockSeq = overrides.blockNumberSequence ?? [overrides.blockNumber ?? 100n]

  return {
    getBalance: vi.fn(async () => {
      const val = balanceSeq[Math.min(balanceCallCount, balanceSeq.length - 1)]
      balanceCallCount++
      return val
    }),
    getBlockNumber: vi.fn(async () => {
      const val = blockSeq[Math.min(blockCallCount, blockSeq.length - 1)]
      blockCallCount++
      return val
    }),
    getLogs: vi.fn(async () => overrides.logs ?? []),
  } as unknown as import('viem').PublicClient
}

describe('ChainPoller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start and stop', async () => {
    const client = createMockPublicClient()
    const emitter = new TypedEventEmitter()
    const poller = new ChainPoller(client, '0xaddr' as `0x${string}`, emitter, 1000)

    expect(poller.isRunning()).toBe(false)
    await poller.start()
    expect(poller.isRunning()).toBe(true)
    poller.stop()
    expect(poller.isRunning()).toBe(false)
  })

  it('should not start twice', async () => {
    const client = createMockPublicClient()
    const emitter = new TypedEventEmitter()
    const poller = new ChainPoller(client, '0xaddr' as `0x${string}`, emitter, 1000)

    await poller.start()
    await poller.start()
    expect(client.getBlockNumber).toHaveBeenCalledTimes(1) // only once from init
    poller.stop()
  })

  it('should emit balanceChange when balance changes', async () => {
    const client = createMockPublicClient({
      blockNumberSequence: [100n, 101n],
      balanceSequence: [1000n, 2000n],
    })
    const emitter = new TypedEventEmitter()
    const handler = vi.fn()
    emitter.on('balanceChange', handler)

    const poller = new ChainPoller(client, '0xaddr' as `0x${string}`, emitter, 1000)
    await poller.start()

    await vi.advanceTimersByTimeAsync(1000)

    expect(handler).toHaveBeenCalledWith({
      token: 'ETH',
      previous: 1000n,
      current: 2000n,
      difference: 1000n,
    })
    poller.stop()
  })

  it('should emit incoming on ERC-20 Transfer logs', async () => {
    const client = createMockPublicClient({
      blockNumberSequence: [100n, 101n],
      logs: [{
        transactionHash: '0xlog1',
        address: '0xtoken',
        args: {
          from: '0xsender',
          to: '0xaddr',
          value: 500n,
        },
      }],
    })
    const emitter = new TypedEventEmitter()
    const handler = vi.fn()
    emitter.on('incoming', handler)

    const poller = new ChainPoller(client, '0xaddr' as `0x${string}`, emitter, 1000)
    await poller.start()

    await vi.advanceTimersByTimeAsync(1000)

    expect(handler).toHaveBeenCalledWith({
      hash: '0xlog1',
      from: '0xsender',
      value: 500n,
      token: '0xtoken',
    })
    poller.stop()
  })

  it('should not emit if block number has not changed', async () => {
    const client = createMockPublicClient({
      blockNumberSequence: [100n, 100n],
    })
    const emitter = new TypedEventEmitter()
    const handler = vi.fn()
    emitter.on('balanceChange', handler)

    const poller = new ChainPoller(client, '0xaddr' as `0x${string}`, emitter, 1000)
    await poller.start()

    await vi.advanceTimersByTimeAsync(1000)

    expect(handler).not.toHaveBeenCalled()
    poller.stop()
  })

  it('should emit error when polling fails', async () => {
    const client = createMockPublicClient({
      blockNumberSequence: [100n],
    })
    // Make getBlockNumber throw on the second call (the poll)
    let callCount = 0
    ;(client.getBlockNumber as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++
      if (callCount > 1) throw new Error('RPC error')
      return 100n
    })

    const emitter = new TypedEventEmitter()
    const errorHandler = vi.fn()
    emitter.on('error', errorHandler)

    const poller = new ChainPoller(client, '0xaddr' as `0x${string}`, emitter, 1000)
    await poller.start()

    await vi.advanceTimersByTimeAsync(1000)

    expect(errorHandler).toHaveBeenCalledTimes(1)
    expect(errorHandler.mock.calls[0][0].message).toBe('RPC error')
    poller.stop()
  })
})

// ── Webhook ──────────────────────────────────────────────────

describe('sendWebhook (via onWebhook pattern)', () => {
  it('should call fetch with correct body when emitting', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 }),
    )

    const emitter = new TypedEventEmitter()
    const event = 'frozen' as const

    // Simulate the onWebhook pattern from account.ts
    emitter.on(event, () => {
      fetch('https://example.com/hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data: undefined, timestamp: Date.now() }),
      }).catch(() => {})
    })

    emitter.emit('frozen')

    // Wait for async fetch
    await new Promise((r) => setTimeout(r, 0))

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0][0]).toBe('https://example.com/hook')
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })

    const body = JSON.parse(init.body as string)
    expect(body.event).toBe('frozen')
    expect(body.timestamp).toBeTypeOf('number')

    fetchSpy.mockRestore()
  })
})
