import type { Address, Hex } from 'viem'
import { encodeFunctionData, parseUnits } from 'viem'

import type { LendParams, SupportedChain, TransactionRequest } from '../core/types'
import { resolveToken, getTokenDecimals, isNativeETH } from './tokens'
import { BarzKitError } from '../utils/errors'
import { ERC20_ABI } from '../utils/constants'

/** Aave V3 Pool addresses per chain */
export const AAVE_V3_POOL: Partial<Record<SupportedChain, Address>> = {
  sepolia: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
}

const AAVE_POOL_ABI = [
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
    ],
    name: 'supply',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

/**
 * Build transaction calldata for an Aave V3 supply (lending).
 *
 * Always returns [approve, supply] — two transactions.
 * Native ETH is rejected (wrap to WETH first).
 *
 * Pure function — no network calls.
 */
export function buildLendTransactions(
  params: LendParams,
  chain: SupportedChain,
  account: Address,
): TransactionRequest[] {
  if (params.protocol !== 'aave') {
    throw new BarzKitError(
      `Unknown lending protocol "${params.protocol}". Supported: aave`,
      'UNKNOWN_PROTOCOL',
    )
  }

  const pool = AAVE_V3_POOL[chain]
  if (!pool) {
    throw new BarzKitError(
      `Aave V3 is not available on "${chain}". Supported: ${Object.keys(AAVE_V3_POOL).join(', ')}`,
      'UNSUPPORTED_CHAIN',
    )
  }

  if (isNativeETH(params.token)) {
    throw new BarzKitError(
      'Cannot supply native ETH to Aave. Wrap to WETH first, then supply WETH.',
      'NATIVE_ETH_NOT_SUPPORTED',
    )
  }

  const tokenAddress = resolveToken(params.token, chain)

  const tokenSymbol = params.token.startsWith('0x') ? null : params.token
  const decimals = tokenSymbol ? (getTokenDecimals(tokenSymbol) ?? 18) : 18
  const amount = parseUnits(params.amount, decimals)

  const approveData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [pool, amount],
  })

  const supplyData = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: 'supply',
    args: [tokenAddress, amount, account, 0],
  })

  return [
    {
      to: tokenAddress,
      data: approveData as Hex,
    },
    {
      to: pool,
      data: supplyData as Hex,
    },
  ]
}

/**
 * Get all token addresses involved in a lend operation (for permission validation).
 */
export function getLendTokenAddresses(params: LendParams, chain: SupportedChain): Address[] {
  const tokenAddress = resolveToken(params.token, chain)
  return [tokenAddress]
}
