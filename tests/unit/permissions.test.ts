import { describe, it, expect } from 'vitest'
import { PermissionManager } from '../../src/permissions/permissions'
import { PermissionError } from '../../src/utils/errors'

describe('PermissionManager', () => {
  describe('allowedContracts', () => {
    it('should allow transactions to whitelisted contracts', () => {
      const pm = new PermissionManager({
        allowedContracts: ['0x1234567890abcdef1234567890abcdef12345678'],
      })
      expect(() =>
        pm.validate({ to: '0x1234567890abcdef1234567890abcdef12345678' }),
      ).not.toThrow()
    })

    it('should reject transactions to non-whitelisted contracts', () => {
      const pm = new PermissionManager({
        allowedContracts: ['0x1234567890abcdef1234567890abcdef12345678'],
      })
      expect(() =>
        pm.validate({ to: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }),
      ).toThrow(PermissionError)
    })

    it('should be case-insensitive', () => {
      const pm = new PermissionManager({
        allowedContracts: ['0xABCDEF1234567890ABCDEF1234567890ABCDEF12'],
      })
      expect(() =>
        pm.validate({ to: '0xabcdef1234567890abcdef1234567890abcdef12' }),
      ).not.toThrow()
    })

    it('should skip check if no allowedContracts defined', () => {
      const pm = new PermissionManager({})
      expect(() =>
        pm.validate({ to: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }),
      ).not.toThrow()
    })
  })

  describe('maxAmountPerTx', () => {
    it('should allow transactions within limit', () => {
      const pm = new PermissionManager({ maxAmountPerTx: '1 ETH' })
      expect(() =>
        pm.validate({ to: '0x1234567890abcdef1234567890abcdef12345678', value: BigInt(0.5e18) }),
      ).not.toThrow()
    })

    it('should reject transactions exceeding limit', () => {
      const pm = new PermissionManager({ maxAmountPerTx: '1 ETH' })
      expect(() =>
        pm.validate({ to: '0x1234567890abcdef1234567890abcdef12345678', value: BigInt(2e18) }),
      ).toThrow(PermissionError)
    })
  })

  describe('maxDailySpend', () => {
    it('should track daily spending and reject when exceeded', () => {
      const pm = new PermissionManager({ maxDailySpend: '1 ETH' })

      pm.validate({ to: '0x1234567890abcdef1234567890abcdef12345678', value: BigInt(0.6e18) })
      pm.recordSpend(BigInt(0.6e18))

      expect(() =>
        pm.validate({ to: '0x1234567890abcdef1234567890abcdef12345678', value: BigInt(0.5e18) }),
      ).toThrow(PermissionError)
    })
  })

  describe('updatePermissions', () => {
    it('should update and apply new limits', () => {
      const pm = new PermissionManager({ maxAmountPerTx: '1 ETH' })
      pm.update({ maxAmountPerTx: '10 ETH' })

      expect(() =>
        pm.validate({ to: '0x1234567890abcdef1234567890abcdef12345678', value: BigInt(5e18) }),
      ).not.toThrow()
    })
  })
})
