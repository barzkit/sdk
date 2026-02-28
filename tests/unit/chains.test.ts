import { describe, it, expect } from 'vitest'
import { getChainConfig, CHAIN_CONFIGS } from '../../src/chains/chains'
import type { Hash } from 'viem'

describe('getChainConfig', () => {
  it('should return config for sepolia', () => {
    const config = getChainConfig('sepolia')
    expect(config.chain.id).toBe(11155111)
    expect(config.entryPointVersion).toBe('0.6')
    expect(config.explorerUrl).toBe('https://sepolia.etherscan.io')
  })

  it('should return config for base-sepolia', () => {
    const config = getChainConfig('base-sepolia')
    expect(config.chain.id).toBe(84532)
    expect(config.entryPointVersion).toBe('0.6')
    expect(config.explorerUrl).toBe('https://sepolia.basescan.org')
  })

  it('should return config for base mainnet', () => {
    const config = getChainConfig('base')
    expect(config.chain.id).toBe(8453)
    expect(config.entryPointVersion).toBe('0.6')
    expect(config.explorerUrl).toBe('https://basescan.org')
  })

  it('should throw on unsupported chain', () => {
    expect(() => getChainConfig('polygon' as any)).toThrow('Unsupported chain')
  })

  it('should use same EntryPoint address on all chains', () => {
    const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
    expect(CHAIN_CONFIGS.sepolia.entryPointAddress).toBe(entryPoint)
    expect(CHAIN_CONFIGS['base-sepolia'].entryPointAddress).toBe(entryPoint)
    expect(CHAIN_CONFIGS.base.entryPointAddress).toBe(entryPoint)
  })

  it('should have correct Pimlico bundler URLs', () => {
    expect(CHAIN_CONFIGS.sepolia.bundlerUrl).toBe('https://api.pimlico.io/v2/sepolia/rpc')
    expect(CHAIN_CONFIGS['base-sepolia'].bundlerUrl).toBe('https://api.pimlico.io/v2/base-sepolia/rpc')
    expect(CHAIN_CONFIGS.base.bundlerUrl).toBe('https://api.pimlico.io/v2/base/rpc')
  })
})

describe('getExplorerUrl', () => {
  const testHash = '0xabc123def456' as Hash

  it('should return correct URL for sepolia', () => {
    const config = getChainConfig('sepolia')
    const url = `${config.explorerUrl}/tx/${testHash}`
    expect(url).toBe(`https://sepolia.etherscan.io/tx/${testHash}`)
  })

  it('should return correct URL for base-sepolia', () => {
    const config = getChainConfig('base-sepolia')
    const url = `${config.explorerUrl}/tx/${testHash}`
    expect(url).toBe(`https://sepolia.basescan.org/tx/${testHash}`)
  })

  it('should return correct URL for base mainnet', () => {
    const config = getChainConfig('base')
    const url = `${config.explorerUrl}/tx/${testHash}`
    expect(url).toBe(`https://basescan.org/tx/${testHash}`)
  })
})
