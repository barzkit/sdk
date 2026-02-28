import { describe, it, expect } from 'vitest'
import { PermissionManager } from '../../src/permissions/permissions'
import { BarzKitError, PermissionError, FrozenError } from '../../src/utils/errors'

describe('batchTransactions validation', () => {
  it('should validate a batch of 2 transactions within permissions', () => {
    const pm = new PermissionManager({
      maxAmountPerTx: '1 ETH',
      allowedContracts: [
        '0x1234567890abcdef1234567890abcdef12345678',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ],
    })

    const txs = [
      { to: '0x1234567890abcdef1234567890abcdef12345678' as const, value: BigInt(0.5e18) },
      { to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const, value: BigInt(0.3e18) },
    ]

    for (const tx of txs) {
      expect(() => pm.validate(tx)).not.toThrow()
    }
  })

  it('should reject batch when one transaction violates per-tx limit', () => {
    const pm = new PermissionManager({ maxAmountPerTx: '1 ETH' })

    const txs = [
      { to: '0x1234567890abcdef1234567890abcdef12345678' as const, value: BigInt(0.5e18) },
      { to: '0x1234567890abcdef1234567890abcdef12345678' as const, value: BigInt(2e18) },
      { to: '0x1234567890abcdef1234567890abcdef12345678' as const, value: BigInt(0.1e18) },
    ]

    // First tx passes
    expect(() => pm.validate(txs[0])).not.toThrow()
    // Second tx exceeds limit — batch should fail here
    expect(() => pm.validate(txs[1])).toThrow(PermissionError)
  })

  it('should throw FrozenError for frozen agent', () => {
    const error = new FrozenError()
    expect(error).toBeInstanceOf(BarzKitError)
    expect(error.code).toBe('AGENT_FROZEN')
    expect(error.message).toContain('frozen')
  })

  it('should throw BarzKitError for empty batch', () => {
    const error = new BarzKitError(
      'batchTransactions requires at least one transaction.',
      'BATCH_EMPTY',
    )
    expect(error).toBeInstanceOf(BarzKitError)
    expect(error.code).toBe('BATCH_EMPTY')
  })

  it('should reject batch when second tx violates contract whitelist', () => {
    const pm = new PermissionManager({
      allowedContracts: ['0x1234567890abcdef1234567890abcdef12345678'],
    })

    const txs = [
      { to: '0x1234567890abcdef1234567890abcdef12345678' as const },
      { to: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as const },
    ]

    expect(() => pm.validate(txs[0])).not.toThrow()
    expect(() => pm.validate(txs[1])).toThrow(PermissionError)
  })
})
