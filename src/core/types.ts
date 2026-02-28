import type { Address, Chain, Hex, Hash } from 'viem'

// ─── Configuration ───────────────────────────────────────────

export type SupportedChain = 'sepolia' | 'base-sepolia' | 'base'

export interface AgentConfig {
  /** Target blockchain network */
  chain: SupportedChain

  /** Owner's private key (hex). Agent key is derived separately. */
  owner: Hex

  /** Pimlico configuration for bundler and paymaster */
  pimlico: {
    apiKey: string
  }

  /** Optional permissions to restrict agent capabilities */
  permissions?: AgentPermissions

  /** Enable gasless transactions via paymaster. Default: true */
  gasless?: boolean

  /**
   * Account index for deterministic address derivation.
   * Use different indices to create multiple wallets from the same owner.
   * Default: 0
   */
  index?: bigint

  /** Custom RPC URL. If not provided, uses default public RPC for the chain. */
  rpcUrl?: string
}

// ─── Permissions ─────────────────────────────────────────────

export interface AgentPermissions {
  /** Maximum amount per single transaction (e.g., '100 USDC') */
  maxAmountPerTx?: string

  /** Maximum total spend per 24h rolling window (e.g., '500 USDC') */
  maxDailySpend?: string

  /** Whitelist of token addresses the agent can interact with */
  allowedTokens?: Address[]

  /** Whitelist of contract addresses the agent can call */
  allowedContracts?: Address[]

  /** Time window when agent is allowed to operate (UTC) */
  timeWindow?: {
    start: string // 'HH:MM'
    end: string   // 'HH:MM'
  }
}

// ─── Transactions ────────────────────────────────────────────

export interface TransactionRequest {
  /** Target address */
  to: Address

  /** ETH value to send (in wei). Default: 0n */
  value?: bigint

  /** Calldata for contract interaction */
  data?: Hex
}

// ─── Agent Interface ─────────────────────────────────────────

export interface BarzAgent {
  /** The smart account address on-chain */
  readonly address: Address

  /** The chain this agent operates on */
  readonly chain: SupportedChain

  /** The owner address (human controller) */
  readonly owner: Address

  // ── Transactions ──

  sendTransaction(tx: TransactionRequest): Promise<Hash>
  batchTransactions(txs: TransactionRequest[]): Promise<Hash>
  getBalance(token?: Address): Promise<bigint>
  waitForTransaction(hash: Hash): Promise<TransactionReceipt>

  // ── Permissions ──

  getPermissions(): AgentPermissions
  updatePermissions(permissions: Partial<AgentPermissions>): void

  // ── Safety ──

  freeze(): Promise<Hash>
  unfreeze(): Promise<Hash>
  isActive(): Promise<boolean>
}

// ─── Internal Types ──────────────────────────────────────────

export interface ChainConfig {
  chain: Chain
  rpcUrl: string
  bundlerUrl: string
  paymasterUrl: string
  entryPointAddress: Address
  entryPointVersion: '0.6'
}

export interface TransactionReceipt {
  transactionHash: Hash
  blockNumber: bigint
  status: 'success' | 'reverted'
  gasUsed: bigint
}

export type AgentEvent =
  | 'transaction:sent'
  | 'transaction:confirmed'
  | 'transaction:failed'
  | 'permissions:updated'
  | 'agent:frozen'
  | 'agent:unfrozen'
