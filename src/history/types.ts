/** A single transaction from the account's on-chain history. */
export interface TransactionRecord {
  hash: `0x${string}`
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  /** Unix timestamp in seconds */
  timestamp: number
  blockNumber: bigint
  status: 'success' | 'failed'
  direction: 'incoming' | 'outgoing'
  explorerUrl: string
}

/** Options for querying transaction history. */
export interface TransactionHistoryOptions {
  /** Number of transactions to return. Default: 20, max: 100 */
  limit?: number
  /** Number of transactions to skip. Default: 0 */
  offset?: number
  /** Filter: only transactions from this block onwards */
  startBlock?: bigint
  /** Filter: only transactions up to this block */
  endBlock?: bigint
}
