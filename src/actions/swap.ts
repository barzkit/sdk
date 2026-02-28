import type { Address, Hex } from 'viem'
import { encodeFunctionData, parseUnits } from 'viem'

import type { SwapParams, SupportedChain, TransactionRequest } from '../core/types'
import { resolveToken, getTokenDecimals, isNativeETH, ETH_SENTINEL } from './tokens'
import { BarzKitError } from '../utils/errors'
import { ERC20_ABI } from '../utils/constants'

/** Uniswap V3 SwapRouter02 addresses per chain */
export const UNISWAP_V3_ROUTER: Partial<Record<SupportedChain, Address>> = {
  sepolia: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
}

const SWAP_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const

/**
 * Build transaction calldata for a Uniswap V3 swap.
 *
 * - ETH input: single swap tx with value (router wraps to WETH)
 * - ERC20 input: [approve, swap] — two transactions
 *
 * Pure function — no network calls.
 */
export function buildSwapTransactions(
  params: SwapParams,
  chain: SupportedChain,
  account: Address,
): TransactionRequest[] {
  const router = UNISWAP_V3_ROUTER[chain]
  if (!router) {
    throw new BarzKitError(
      `Uniswap V3 is not available on "${chain}". Supported: ${Object.keys(UNISWAP_V3_ROUTER).join(', ')}`,
      'UNSUPPORTED_CHAIN',
    )
  }

  const tokenIn = resolveToken(params.from, chain)
  const tokenOut = resolveToken(params.to, chain)

  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
    throw new BarzKitError(
      `Cannot swap a token to itself ("${params.from}" → "${params.to}").`,
      'INVALID_SWAP',
    )
  }

  const fromIsETH = isNativeETH(params.from)

  // Determine decimals from the input token symbol
  const fromSymbol = params.from.startsWith('0x') ? null : params.from
  const decimals = fromSymbol ? (getTokenDecimals(fromSymbol) ?? 18) : 18
  const amountIn = parseUnits(params.amount, decimals)

  // For router: ETH swaps use WETH address as tokenIn
  const routerTokenIn = fromIsETH
    ? resolveToken('WETH', chain)
    : tokenIn

  // ETH output: the router sends WETH, so tokenOut stays as resolved
  // (user receives WETH which they can unwrap separately)
  const routerTokenOut = isNativeETH(params.to)
    ? resolveToken('WETH', chain)
    : tokenOut

  const fee = params.fee ?? 3000
  // amountOutMinimum: 0 for simplicity in Phase 1 (slippage protection via deadline)
  const amountOutMinimum = 0n

  const swapData = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: routerTokenIn,
        tokenOut: routerTokenOut,
        fee,
        recipient: account,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })

  const txs: TransactionRequest[] = []

  if (fromIsETH) {
    // ETH swap: no approve needed, pass value directly
    txs.push({
      to: router,
      value: amountIn,
      data: swapData as Hex,
    })
  } else {
    // ERC20 swap: approve + swap
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [router, amountIn],
    })

    txs.push({
      to: tokenIn,
      data: approveData as Hex,
    })

    txs.push({
      to: router,
      data: swapData as Hex,
    })
  }

  return txs
}

/**
 * Get all token addresses involved in a swap (for permission validation).
 */
export function getSwapTokenAddresses(params: SwapParams, chain: SupportedChain): Address[] {
  const addresses: Address[] = []

  const tokenIn = resolveToken(params.from, chain)
  const tokenOut = resolveToken(params.to, chain)

  if (tokenIn !== ETH_SENTINEL) addresses.push(tokenIn)
  if (tokenOut !== ETH_SENTINEL) addresses.push(tokenOut)

  return addresses
}
