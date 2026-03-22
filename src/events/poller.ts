import type { PublicClient } from 'viem'
import { parseAbiItem } from 'viem'
import type { TypedEventEmitter } from './emitter'

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
)

/**
 * Polls the chain for new blocks, balance changes, and incoming transfers.
 * @internal
 */
export class ChainPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastBlockNumber: bigint = 0n
  private lastBalance: bigint = 0n
  private started = false

  constructor(
    private publicClient: PublicClient,
    private address: `0x${string}`,
    private emitter: TypedEventEmitter,
    private explorerUrl: string,
    private pollInterval: number = 15_000,
  ) {}

  /** Start polling. Safe to call multiple times — only starts once. */
  async start(): Promise<void> {
    if (this.started) return
    this.started = true

    try {
      this.lastBlockNumber = await this.publicClient.getBlockNumber()
      this.lastBalance = await this.publicClient.getBalance({ address: this.address })
    } catch (error) {
      this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
    }

    this.intervalId = setInterval(() => {
      this.poll().catch((error) => {
        this.emitter.emit('error', error instanceof Error ? error : new Error(String(error)))
      })
    }, this.pollInterval)
  }

  /** Stop polling and clean up. */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.started = false
  }

  /** Whether the poller is currently running. */
  isRunning(): boolean {
    return this.started
  }

  private async poll(): Promise<void> {
    const currentBlock = await this.publicClient.getBlockNumber()
    if (currentBlock <= this.lastBlockNumber) return

    const fromBlock = this.lastBlockNumber + 1n
    this.lastBlockNumber = currentBlock

    // Check balance change
    const currentBalance = await this.publicClient.getBalance({ address: this.address })
    if (currentBalance !== this.lastBalance) {
      this.emitter.emit('balanceChange', {
        token: 'ETH',
        previous: this.lastBalance,
        current: currentBalance,
        difference: currentBalance - this.lastBalance,
      })
      this.lastBalance = currentBalance
    }

    // Check incoming ERC-20 transfers
    try {
      const logs = await this.publicClient.getLogs({
        event: TRANSFER_EVENT,
        args: { to: this.address },
        fromBlock,
        toBlock: currentBlock,
      })

      for (const log of logs) {
        this.emitter.emit('incoming', {
          hash: log.transactionHash!,
          from: log.args.from! as `0x${string}`,
          value: log.args.value!,
          token: log.address as `0x${string}`,
        })
      }
    } catch {
      // getLogs may fail on some RPCs — non-critical, skip silently
    }

    // Check incoming ETH transactions by balance increase
    if (currentBalance > this.lastBalance) {
      // Already emitted via balanceChange above — ETH incoming is detected by balance diff
    }
  }
}
