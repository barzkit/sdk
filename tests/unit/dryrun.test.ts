import { describe, it, expect, vi } from 'vitest'
import { executeDryRun } from '../../src/core/dryrun'
import { PermissionManager } from '../../src/permissions/permissions'
import type { TransactionRequest } from '../../src/core/types'

const TX: TransactionRequest = {
  to: '0x1234567890abcdef1234567890abcdef12345678',
  value: 1000n,
}

function createMockClients(overrides: {
  callGasLimit?: bigint
  preVerificationGas?: bigint
  verificationGasLimit?: bigint
  maxFeePerGas?: bigint
  revertError?: Error
} = {}) {
  const smartAccountClient = {
    prepareUserOperation: overrides.revertError
      ? vi.fn().mockRejectedValue(overrides.revertError)
      : vi.fn().mockResolvedValue({
          callGasLimit: overrides.callGasLimit ?? 50000n,
          preVerificationGas: overrides.preVerificationGas ?? 20000n,
          verificationGasLimit: overrides.verificationGasLimit ?? 30000n,
        }),
  }

  const pimlicoClient = {
    getUserOperationGasPrice: vi.fn().mockResolvedValue({
      fast: {
        maxFeePerGas: overrides.maxFeePerGas ?? 1000000000n, // 1 gwei
        maxPriorityFeePerGas: 100000000n,
      },
    }),
  }

  return { smartAccountClient, pimlicoClient }
}

describe('executeDryRun', () => {
  it('should return frozen error when wallet is frozen', async () => {
    const { smartAccountClient, pimlicoClient } = createMockClients()
    const pm = new PermissionManager()

    const result = await executeDryRun(smartAccountClient, pimlicoClient, TX, pm, true)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Wallet is frozen')
    expect(result.permissionCheck.passed).toBe(false)
    expect(result.permissionCheck.violations).toContain('Wallet is frozen')
    expect(result.gasEstimate).toBe(0n)
  })

  it('should return permission violations without calling chain', async () => {
    const { smartAccountClient, pimlicoClient } = createMockClients()
    const pm = new PermissionManager({
      allowedContracts: ['0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    })

    const result = await executeDryRun(smartAccountClient, pimlicoClient, TX, pm, false)

    expect(result.success).toBe(false)
    expect(result.permissionCheck.passed).toBe(false)
    expect(result.permissionCheck.violations.length).toBeGreaterThan(0)
    expect(result.permissionCheck.violations[0]).toContain('not in the allowed list')
    expect(smartAccountClient.prepareUserOperation).not.toHaveBeenCalled()
  })

  it('should return success with gas estimate for valid tx', async () => {
    const { smartAccountClient, pimlicoClient } = createMockClients()
    const pm = new PermissionManager()

    const result = await executeDryRun(smartAccountClient, pimlicoClient, TX, pm, false)

    expect(result.success).toBe(true)
    expect(result.gasEstimate).toBe(100000n) // 50000 + 20000 + 30000
    expect(result.gasCostETH).toContain('ETH')
    expect(result.gasCostETH).not.toBe('0 ETH')
    expect(result.permissionCheck.passed).toBe(true)
    expect(result.permissionCheck.violations).toEqual([])
  })

  it('should handle batch transactions', async () => {
    const { smartAccountClient, pimlicoClient } = createMockClients()
    const pm = new PermissionManager()

    const txs: TransactionRequest[] = [
      { to: '0x1234567890abcdef1234567890abcdef12345678', value: 100n },
      { to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', value: 200n },
    ]

    const result = await executeDryRun(smartAccountClient, pimlicoClient, txs, pm, false)

    expect(result.success).toBe(true)
    expect(result.gasEstimate).toBeGreaterThan(0n)
    expect(smartAccountClient.prepareUserOperation).toHaveBeenCalledWith({
      calls: expect.arrayContaining([
        expect.objectContaining({ value: 100n }),
        expect.objectContaining({ value: 200n }),
      ]),
    })
  })

  it('should return error on revert', async () => {
    const { smartAccountClient, pimlicoClient } = createMockClients({
      revertError: new Error('execution reverted: insufficient balance'),
    })
    const pm = new PermissionManager()

    const result = await executeDryRun(smartAccountClient, pimlicoClient, TX, pm, false)

    expect(result.success).toBe(false)
    expect(result.error).toContain('insufficient balance')
    expect(result.permissionCheck.passed).toBe(true)
    expect(result.gasEstimate).toBe(0n)
  })

  it('should collect multiple permission violations from batch', async () => {
    const { smartAccountClient, pimlicoClient } = createMockClients()
    const pm = new PermissionManager({
      allowedContracts: ['0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    })

    const txs: TransactionRequest[] = [
      { to: '0x1111111111111111111111111111111111111111', value: 100n },
      { to: '0x2222222222222222222222222222222222222222', value: 200n },
    ]

    const result = await executeDryRun(smartAccountClient, pimlicoClient, txs, pm, false)

    expect(result.permissionCheck.passed).toBe(false)
    expect(result.permissionCheck.violations.length).toBe(2)
  })
})
