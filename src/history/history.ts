import type { TransactionRecord, TransactionHistoryOptions } from './types'
import { BarzKitError } from '../utils/errors'

interface EtherscanTx {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  blockNumber: string
  isError: string
  [key: string]: unknown
}

interface EtherscanResponse {
  status: string
  message: string
  result: EtherscanTx[] | string
}

/**
 * Fetch transaction history from an Etherscan-compatible API.
 * @internal
 */
export async function fetchTransactions(
  explorerApiUrl: string,
  explorerUrl: string,
  address: `0x${string}`,
  options: TransactionHistoryOptions = {},
): Promise<TransactionRecord[]> {
  const limit = Math.min(options.limit ?? 20, 100)
  const page = Math.floor((options.offset ?? 0) / limit) + 1
  const startBlock = options.startBlock ?? 0n
  const endBlock = options.endBlock ?? 99999999n

  const url =
    `${explorerApiUrl}?module=account&action=txlist` +
    `&address=${address}` +
    `&startblock=${startBlock}` +
    `&endblock=${endBlock}` +
    `&page=${page}` +
    `&offset=${limit}` +
    `&sort=desc`

  let data: EtherscanResponse
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new BarzKitError(
        `Transaction history API returned HTTP ${response.status}`,
        'HISTORY_API_ERROR',
      )
    }
    data = (await response.json()) as EtherscanResponse
  } catch (error) {
    if (error instanceof BarzKitError) throw error
    throw new BarzKitError(
      `Failed to fetch transaction history: ${error instanceof Error ? error.message : String(error)}`,
      'HISTORY_API_ERROR',
    )
  }

  if (data.status !== '1') {
    // "No transactions found" is not an error
    if (data.message === 'No transactions found') return []
    throw new BarzKitError(
      `Transaction history API error: ${data.message}`,
      'HISTORY_API_ERROR',
    )
  }

  if (!Array.isArray(data.result)) return []

  const addressLower = address.toLowerCase()

  return data.result.map((tx): TransactionRecord => ({
    hash: tx.hash as `0x${string}`,
    from: tx.from as `0x${string}`,
    to: tx.to as `0x${string}`,
    value: BigInt(tx.value),
    timestamp: Number(tx.timeStamp),
    blockNumber: BigInt(tx.blockNumber),
    status: tx.isError === '0' ? 'success' : 'failed',
    direction: tx.from.toLowerCase() === addressLower ? 'outgoing' : 'incoming',
    explorerUrl: `${explorerUrl}/tx/${tx.hash}`,
  }))
}
