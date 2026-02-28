import { describe, it, expect } from 'vitest'
import { resolveToken, getTokenDecimals, isNativeETH, ETH_SENTINEL } from '../../src/actions/tokens'
import { TOKENS } from '../../src/utils/constants'

describe('resolveToken', () => {
  it('should resolve USDC to its sepolia address', () => {
    const address = resolveToken('USDC', 'sepolia')
    expect(address).toBe(TOKENS.sepolia.USDC)
  })

  it('should be case-insensitive', () => {
    const lower = resolveToken('usdc', 'sepolia')
    const upper = resolveToken('USDC', 'sepolia')
    expect(lower).toBe(upper)
  })

  it('should resolve ETH to sentinel address', () => {
    const address = resolveToken('ETH', 'sepolia')
    expect(address).toBe(ETH_SENTINEL)
  })

  it('should pass through raw addresses', () => {
    const raw = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    const address = resolveToken(raw, 'sepolia')
    expect(address.toLowerCase()).toBe(raw.toLowerCase())
  })

  it('should throw for unknown token symbol', () => {
    expect(() => resolveToken('SHIBA', 'sepolia')).toThrow('Unknown token')
  })
})

describe('getTokenDecimals', () => {
  it('should return 18 for ETH', () => {
    expect(getTokenDecimals('ETH')).toBe(18)
  })

  it('should return 6 for USDC', () => {
    expect(getTokenDecimals('USDC')).toBe(6)
  })

  it('should return 18 for DAI', () => {
    expect(getTokenDecimals('DAI')).toBe(18)
  })

  it('should return 18 for WETH', () => {
    expect(getTokenDecimals('WETH')).toBe(18)
  })

  it('should return null for unknown tokens', () => {
    expect(getTokenDecimals('UNKNOWN')).toBeNull()
  })

  it('should be case-insensitive', () => {
    expect(getTokenDecimals('usdc')).toBe(6)
  })
})

describe('isNativeETH', () => {
  it('should return true for "ETH" symbol', () => {
    expect(isNativeETH('ETH')).toBe(true)
  })

  it('should return true for ETH sentinel address', () => {
    expect(isNativeETH(ETH_SENTINEL)).toBe(true)
  })

  it('should return false for WETH', () => {
    expect(isNativeETH('WETH')).toBe(false)
  })

  it('should return false for random address', () => {
    expect(isNativeETH('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238')).toBe(false)
  })
})
