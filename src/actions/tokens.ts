import type { Address } from 'viem'
import { getAddress } from 'viem'

import type { SupportedChain } from '../core/types'
import { TOKENS } from '../utils/constants'
import { BarzKitError } from '../utils/errors'

/** Sentinel address representing native ETH in token registries */
export const ETH_SENTINEL: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

const TOKEN_DECIMALS: Record<string, number> = {
  ETH: 18,
  WETH: 18,
  USDC: 6,
  USDT: 6,
  DAI: 18,
  USDbC: 6,
}

/**
 * Resolve a token symbol or address to a checksummed address.
 *
 * - Symbols are looked up in the TOKENS registry for the given chain.
 * - "ETH" resolves to ETH_SENTINEL.
 * - Raw hex addresses (0x...) are passed through with checksum validation.
 */
export function resolveToken(symbolOrAddress: string, chain: SupportedChain): Address {
  // Raw address passthrough
  if (symbolOrAddress.startsWith('0x')) {
    return getAddress(symbolOrAddress) as Address
  }

  const symbol = symbolOrAddress.toUpperCase()

  if (symbol === 'ETH') {
    return ETH_SENTINEL
  }

  const chainTokens = TOKENS[chain]
  if (!chainTokens) {
    throw new BarzKitError(
      `No tokens configured for chain "${chain}".`,
      'UNSUPPORTED_CHAIN',
    )
  }

  const address = chainTokens[symbol]
  if (!address) {
    throw new BarzKitError(
      `Unknown token "${symbolOrAddress}" on ${chain}. Available: ${Object.keys(chainTokens).join(', ')}`,
      'UNKNOWN_TOKEN',
    )
  }

  return address
}

/**
 * Get the number of decimals for a known token symbol.
 * Returns null for unknown symbols.
 */
export function getTokenDecimals(symbol: string): number | null {
  return TOKEN_DECIMALS[symbol.toUpperCase()] ?? null
}

/** Check if a token address or symbol represents native ETH */
export function isNativeETH(token: string): boolean {
  if (token.toUpperCase() === 'ETH') return true
  if (token.startsWith('0x')) {
    return token.toLowerCase() === ETH_SENTINEL.toLowerCase()
  }
  return false
}
