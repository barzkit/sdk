import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import { buildLendTransactions, getLendTokenAddresses, AAVE_V3_POOL } from '../../src/actions/lend'
import { TOKENS } from '../../src/utils/constants'

const ACCOUNT = '0x1234567890123456789012345678901234567890' as Address
const POOL = AAVE_V3_POOL.sepolia!

describe('buildLendTransactions', () => {
  it('should return [approve, supply] for USDC on Aave', () => {
    const txs = buildLendTransactions(
      { token: 'USDC', amount: '100', protocol: 'aave' },
      'sepolia',
      ACCOUNT,
    )

    expect(txs).toHaveLength(2)

    // First tx: approve USDC to pool
    expect(txs[0].to).toBe(TOKENS.sepolia.USDC)
    expect(txs[0].data).toBeDefined()

    // Second tx: supply to pool
    expect(txs[1].to).toBe(POOL)
    expect(txs[1].data).toBeDefined()
  })

  it('should throw for unknown protocol', () => {
    expect(() =>
      buildLendTransactions(
        { token: 'USDC', amount: '100', protocol: 'compound' as 'aave' },
        'sepolia',
        ACCOUNT,
      ),
    ).toThrow('Unknown lending protocol')
  })

  it('should throw for native ETH', () => {
    expect(() =>
      buildLendTransactions(
        { token: 'ETH', amount: '1', protocol: 'aave' },
        'sepolia',
        ACCOUNT,
      ),
    ).toThrow('Cannot supply native ETH')
  })

  it('should throw for unsupported chain', () => {
    expect(() =>
      buildLendTransactions(
        { token: 'USDC', amount: '100', protocol: 'aave' },
        'base' as 'sepolia',
        ACCOUNT,
      ),
    ).toThrow('not available')
  })
})

describe('getLendTokenAddresses', () => {
  it('should return the token address', () => {
    const addresses = getLendTokenAddresses(
      { token: 'USDC', amount: '100', protocol: 'aave' },
      'sepolia',
    )

    expect(addresses).toEqual([TOKENS.sepolia.USDC])
  })
})
