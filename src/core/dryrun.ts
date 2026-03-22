import type { Hex } from 'viem'
import { formatEther } from 'viem'
import type { TransactionRequest } from './types'
import { PermissionManager } from '../permissions/permissions'
import { humanizeError } from '../utils/errors'

/** Result of a dry run simulation. */
export interface DryRunResult {
  /** Whether the transaction would succeed on-chain */
  success: boolean
  /** Estimated gas units */
  gasEstimate: bigint
  /** Human-readable gas cost (e.g., "0.000123 ETH") */
  gasCostETH: string
  /** Revert reason if the simulation failed */
  error?: string
  /** Client-side permission check result */
  permissionCheck: {
    passed: boolean
    violations: string[]
  }
}

/**
 * Simulate a transaction or batch without sending it on-chain.
 * @internal
 */
export async function executeDryRun(
  smartAccountClient: {
    prepareUserOperation: (args: { calls: Array<{ to: `0x${string}`; value: bigint; data: Hex }> }) => Promise<{ callGasLimit: bigint; preVerificationGas: bigint; verificationGasLimit: bigint }>
  },
  pimlicoClient: {
    getUserOperationGasPrice: () => Promise<{ fast: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } }>
  },
  txOrTxs: TransactionRequest | TransactionRequest[],
  permissionManager: PermissionManager,
  frozen: boolean,
): Promise<DryRunResult> {
  const txs = Array.isArray(txOrTxs) ? txOrTxs : [txOrTxs]

  // 1. Frozen check
  if (frozen) {
    return {
      success: false,
      gasEstimate: 0n,
      gasCostETH: '0 ETH',
      error: 'Wallet is frozen',
      permissionCheck: { passed: false, violations: ['Wallet is frozen'] },
    }
  }

  // 2. Permission check — collect all violations without throwing
  const violations: string[] = []
  for (const tx of txs) {
    try {
      permissionManager.validate(tx)
    } catch (err) {
      violations.push(err instanceof Error ? err.message : String(err))
    }
  }

  if (violations.length > 0) {
    return {
      success: false,
      gasEstimate: 0n,
      gasCostETH: '0 ETH',
      error: violations[0],
      permissionCheck: { passed: false, violations },
    }
  }

  // 3. On-chain gas estimation
  try {
    const calls = txs.map((tx) => ({
      to: tx.to as `0x${string}`,
      value: tx.value ?? 0n,
      data: (tx.data ?? '0x') as Hex,
    }))

    const userOp = await smartAccountClient.prepareUserOperation({ calls })
    const gasEstimate = userOp.callGasLimit + userOp.preVerificationGas + userOp.verificationGasLimit

    const gasPrice = (await pimlicoClient.getUserOperationGasPrice()).fast
    const gasCost = gasEstimate * gasPrice.maxFeePerGas
    const gasCostETH = `${formatEther(gasCost)} ETH`

    return {
      success: true,
      gasEstimate,
      gasCostETH,
      permissionCheck: { passed: true, violations: [] },
    }
  } catch (error) {
    const humanized = humanizeError(error)
    return {
      success: false,
      gasEstimate: 0n,
      gasCostETH: '0 ETH',
      error: humanized.message,
      permissionCheck: { passed: true, violations: [] },
    }
  }
}
