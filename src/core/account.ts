import { http } from 'viem'
import type { Address, Hash, Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { entryPoint06Address } from 'viem/account-abstraction'
import { createSmartAccountClient } from 'permissionless'
import { toTrustSmartAccount } from 'permissionless/accounts'

import type {
  AgentConfig,
  BarzAgent,
  SwapParams,
  LendParams,
  TransactionRequest,
  TransactionReceipt,
  AgentPermissions,
} from './types'
import { createClients } from './client'
import { PermissionManager } from '../permissions/permissions'
import { BarzKitError, ConfigError, FrozenError, PermissionError, humanizeError, TransactionError } from '../utils/errors'
import { ERC20_ABI } from '../utils/constants'
import { buildSwapTransactions, getSwapTokenAddresses } from '../actions/swap'
import { buildLendTransactions, getLendTokenAddresses } from '../actions/lend'

/**
 * Create a Barz agent wallet.
 *
 * @example
 * ```ts
 * const agent = await createBarzAgent({
 *   chain: 'sepolia',
 *   owner: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
 *   pimlico: { apiKey: 'pim_...' },
 * })
 *
 * console.log('Agent address:', agent.address)
 * ```
 */
export async function createBarzAgent(config: AgentConfig): Promise<BarzAgent> {
  validateConfig(config)

  const { publicClient, pimlicoClient, chainConfig, bundlerUrl } = createClients(config)
  const ownerAccount = privateKeyToAccount(config.owner)

  const smartAccount = await toTrustSmartAccount({
    client: publicClient,
    owner: ownerAccount,
    index: config.index ?? 0n,
    entryPoint: {
      address: entryPoint06Address,
      version: '0.6',
    },
  })

  const gasless = config.gasless !== false

  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain: chainConfig.chain,
    bundlerTransport: http(bundlerUrl),
    ...(gasless
      ? {
          paymaster: pimlicoClient,
          userOperation: {
            estimateFeesPerGas: async () =>
              (await pimlicoClient.getUserOperationGasPrice()).fast,
          },
        }
      : {
          userOperation: {
            estimateFeesPerGas: async () =>
              (await pimlicoClient.getUserOperationGasPrice()).fast,
          },
        }),
  })

  if (config.chain === 'base') {
    console.warn('\u26a0\ufe0f Using Base mainnet \u2014 real funds at risk')
  }

  const permissionManager = new PermissionManager(config.permissions)
  let frozen = false

  async function executeBatch(txs: TransactionRequest[]): Promise<Hash> {
    for (const tx of txs) {
      permissionManager.validate(tx)
    }

    try {
      const userOpHash = await smartAccountClient.sendUserOperation({
        calls: txs.map((tx) => ({
          to: tx.to,
          value: tx.value ?? 0n,
          data: tx.data ?? ('0x' as Hex),
        })),
      })

      const receipt = await smartAccountClient.waitForUserOperationReceipt({
        hash: userOpHash,
      })

      const totalValue = txs.reduce((sum, tx) => sum + (tx.value ?? 0n), 0n)
      if (totalValue > 0n) permissionManager.recordSpend(totalValue)

      return receipt.receipt.transactionHash
    } catch (error) {
      throw humanizeError(error)
    }
  }

  const agent: BarzAgent = {
    address: smartAccount.address,
    chain: config.chain,
    owner: ownerAccount.address,

    async sendTransaction(tx: TransactionRequest): Promise<Hash> {
      if (frozen) throw new FrozenError()
      permissionManager.validate(tx)

      try {
        const hash = await smartAccountClient.sendTransaction({
          to: tx.to,
          value: tx.value ?? 0n,
          data: tx.data ?? '0x',
        })

        if (tx.value) permissionManager.recordSpend(tx.value)
        return hash
      } catch (error) {
        throw humanizeError(error)
      }
    },

    async batchTransactions(txs: TransactionRequest[]): Promise<Hash> {
      if (frozen) throw new FrozenError()
      if (txs.length === 0) {
        throw new BarzKitError(
          'batchTransactions requires at least one transaction.',
          'BATCH_EMPTY',
        )
      }

      return executeBatch(txs)
    },

    async getBalance(token?: Address): Promise<bigint> {
      try {
        if (!token) {
          return await publicClient.getBalance({ address: smartAccount.address })
        }

        const balance = await publicClient.readContract({
          address: token,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [smartAccount.address],
        })

        return balance as bigint
      } catch (error) {
        throw humanizeError(error)
      }
    },

    async waitForTransaction(hash: Hash): Promise<TransactionReceipt> {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        return {
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          gasUsed: receipt.gasUsed,
        }
      } catch (error) {
        throw new TransactionError(
          `Failed waiting for transaction ${hash}: ${error instanceof Error ? error.message : error}`,
          hash,
        )
      }
    },

    async swap(params: SwapParams): Promise<Hash> {
      if (frozen) throw new FrozenError()

      const tokenAddresses = getSwapTokenAddresses(params, config.chain)
      validateTokenPermissions(tokenAddresses, permissionManager.permissions)

      const txs = buildSwapTransactions(params, config.chain, smartAccount.address)
      return executeBatch(txs)
    },

    async lend(params: LendParams): Promise<Hash> {
      if (frozen) throw new FrozenError()

      const tokenAddresses = getLendTokenAddresses(params, config.chain)
      validateTokenPermissions(tokenAddresses, permissionManager.permissions)

      const txs = buildLendTransactions(params, config.chain, smartAccount.address)
      return executeBatch(txs)
    },

    getExplorerUrl(hash: Hash): string {
      return `${chainConfig.explorerUrl}/tx/${hash}`
    },

    getPermissions(): AgentPermissions {
      return permissionManager.permissions
    },

    updatePermissions(permissions: Partial<AgentPermissions>): void {
      permissionManager.update(permissions)
    },

    async freeze(): Promise<Hash> {
      frozen = true
      return '0x0000000000000000000000000000000000000000000000000000000000000000' as Hash
    },

    async unfreeze(): Promise<Hash> {
      frozen = false
      return '0x0000000000000000000000000000000000000000000000000000000000000000' as Hash
    },

    async isActive(): Promise<boolean> {
      return !frozen
    },
  }

  return agent
}

function validateConfig(config: AgentConfig): void {
  if (!config) throw new ConfigError('Agent config is required.')

  if (!config.chain) {
    throw new ConfigError('Missing "chain". Supported: sepolia, base-sepolia, base.')
  }
  if (!config.owner) {
    throw new ConfigError('Missing "owner". Provide a hex private key.')
  }
  if (!config.owner.startsWith('0x') || config.owner.length !== 66) {
    throw new ConfigError(
      'Invalid "owner" private key. Must be a 32-byte hex string starting with "0x" (66 chars total).',
    )
  }
  if (!config.pimlico?.apiKey) {
    throw new ConfigError('Missing "pimlico.apiKey". Get a free key at https://dashboard.pimlico.io')
  }
}

function validateTokenPermissions(tokenAddresses: Address[], permissions: AgentPermissions): void {
  if (!permissions.allowedTokens || permissions.allowedTokens.length === 0) return

  const allowed = permissions.allowedTokens.map((a) => a.toLowerCase())
  for (const token of tokenAddresses) {
    if (!allowed.includes(token.toLowerCase())) {
      throw new PermissionError(
        `Token ${token} is not in the allowed list. ` +
        `Allowed: ${permissions.allowedTokens.join(', ')}`,
      )
    }
  }
}
