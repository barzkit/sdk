/** Event emitted when a transaction involving this account is confirmed on-chain. */
export interface TransactionEvent {
  hash: `0x${string}`
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  status: 'confirmed' | 'failed'
  blockNumber: bigint
  explorerUrl: string
}

/** Event emitted when the account's ETH or token balance changes. */
export interface BalanceChangeEvent {
  token: `0x${string}` | 'ETH'
  /** Balance before the change */
  previous: bigint
  /** Balance after the change */
  current: bigint
  /** Positive = received, negative = spent */
  difference: bigint
}

/** Event emitted when an incoming ETH or ERC-20 transfer is detected. */
export interface IncomingTransferEvent {
  hash: `0x${string}`
  from: `0x${string}`
  value: bigint
  token: `0x${string}` | 'ETH'
}

/** Map of event names to their handler argument tuples. */
export type EventMap = {
  transaction: [TransactionEvent]
  balanceChange: [BalanceChangeEvent]
  incoming: [IncomingTransferEvent]
  frozen: []
  unfrozen: []
  error: [Error]
}
