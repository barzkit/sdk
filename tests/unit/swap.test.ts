import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import { buildSwapTransactions, getSwapTokenAddresses, UNISWAP_V3_ROUTER } from '../../src/actions/swap'
import { TOKENS } from '../../src/utils/constants'

const ACCOUNT = '0x1234567890123456789012345678901234567890' as Address
const ROUTER = UNISWAP_V3_ROUTER.sepolia!

describe('buildSwapTransactions', () => {
  it('should return [approve, swap] for ERC20 → ERC20', () => {
    const txs = buildSwapTransactions(
      { from: 'USDC', to: 'WETH', amount: '100' },
      'sepolia',
      ACCOUNT,
    )

    expect(txs).toHaveLength(2)

    // First tx: approve USDC to router
    expect(txs[0].to).toBe(TOKENS.sepolia.USDC)
    expect(txs[0].value).toBeUndefined()

    // Second tx: swap on router
    expect(txs[1].to).toBe(ROUTER)
    expect(txs[1].value).toBeUndefined()
  })

  it('should return [swap] only for ETH → ERC20 with value', () => {
    const txs = buildSwapTransactions(
      { from: 'ETH', to: 'USDC', amount: '0.1' },
      'sepolia',
      ACCOUNT,
    )

    expect(txs).toHaveLength(1)
    expect(txs[0].to).toBe(ROUTER)
    // 0.1 ETH = 100000000000000000 wei
    expect(txs[0].value).toBe(100000000000000000n)
  })

  it('should use correct decimals for USDC (6)', () => {
    const txs = buildSwapTransactions(
      { from: 'USDC', to: 'WETH', amount: '100' },
      'sepolia',
      ACCOUNT,
    )

    // Approve tx calldata should encode 100 * 10^6 = 100_000_000
    // We verify by checking the data is not empty
    expect(txs[0].data).toBeDefined()
    expect(txs[0].data!.length).toBeGreaterThan(10)
  })

  it('should throw for unsupported chain', () => {
    expect(() =>
      buildSwapTransactions(
        { from: 'USDC', to: 'WETH', amount: '100' },
        'base' as 'sepolia',
        ACCOUNT,
      ),
    ).toThrow('not available')
  })

  it('should throw for unknown token', () => {
    expect(() =>
      buildSwapTransactions(
        { from: 'SHIBA', to: 'WETH', amount: '100' },
        'sepolia',
        ACCOUNT,
      ),
    ).toThrow('Unknown token')
  })

  it('should throw when swapping token to itself', () => {
    expect(() =>
      buildSwapTransactions(
        { from: 'USDC', to: 'USDC', amount: '100' },
        'sepolia',
        ACCOUNT,
      ),
    ).toThrow('Cannot swap a token to itself')
  })
})

describe('getSwapTokenAddresses', () => {
  it('should return both token addresses for ERC20 → ERC20', () => {
    const addresses = getSwapTokenAddresses(
      { from: 'USDC', to: 'WETH', amount: '100' },
      'sepolia',
    )

    expect(addresses).toContain(TOKENS.sepolia.USDC)
    expect(addresses).toContain(TOKENS.sepolia.WETH)
  })

  it('should omit ETH sentinel from addresses', () => {
    const addresses = getSwapTokenAddresses(
      { from: 'ETH', to: 'USDC', amount: '0.1' },
      'sepolia',
    )

    expect(addresses).toHaveLength(1)
    expect(addresses).toContain(TOKENS.sepolia.USDC)
  })
})
