import { sepolia, baseSepolia, base } from 'viem/chains'
import type { ChainConfig, SupportedChain } from '../core/types'

export const CHAIN_CONFIGS: Record<SupportedChain, ChainConfig> = {
  sepolia: {
    chain: sepolia,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc',
    paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    entryPointVersion: '0.6',
  },
  'base-sepolia': {
    chain: baseSepolia,
    rpcUrl: 'https://sepolia.base.org',
    bundlerUrl: 'https://api.pimlico.io/v2/base-sepolia/rpc',
    paymasterUrl: 'https://api.pimlico.io/v2/base-sepolia/rpc',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    entryPointVersion: '0.6',
  },
  base: {
    chain: base,
    rpcUrl: 'https://mainnet.base.org',
    bundlerUrl: 'https://api.pimlico.io/v2/base/rpc',
    paymasterUrl: 'https://api.pimlico.io/v2/base/rpc',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    entryPointVersion: '0.6',
  },
}

export function getChainConfig(chain: SupportedChain): ChainConfig {
  const config = CHAIN_CONFIGS[chain]
  if (!config) {
    const supported = Object.keys(CHAIN_CONFIGS).join(', ')
    throw new Error(`Unsupported chain: "${chain}". Supported: ${supported}`)
  }
  return config
}

export function buildBundlerUrl(chainConfig: ChainConfig, apiKey: string): string {
  return `${chainConfig.bundlerUrl}?apikey=${apiKey}`
}

export function buildPaymasterUrl(chainConfig: ChainConfig, apiKey: string): string {
  return `${chainConfig.paymasterUrl}?apikey=${apiKey}`
}
