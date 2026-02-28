import { createPublicClient, http } from 'viem'
import type { PublicClient, HttpTransport, Chain } from 'viem'
import { createPimlicoClient } from 'permissionless/clients/pimlico'
import { entryPoint06Address } from 'viem/account-abstraction'
import type { AgentConfig, ChainConfig } from './types'
import { getChainConfig, buildBundlerUrl } from '../chains/chains'
import { ConfigError } from '../utils/errors'

export interface BarzClients {
  publicClient: PublicClient<HttpTransport, Chain>
  pimlicoClient: ReturnType<typeof createPimlicoClient>
  chainConfig: ChainConfig
  bundlerUrl: string
}

export function createClients(config: AgentConfig): BarzClients {
  if (!config.chain) {
    throw new ConfigError('Missing required field: "chain". Example: { chain: "sepolia" }')
  }
  if (!config.owner) {
    throw new ConfigError('Missing required field: "owner". Provide a hex private key.')
  }
  if (!config.pimlico?.apiKey) {
    throw new ConfigError(
      'Missing required field: "pimlico.apiKey". ' +
      'Get a free API key at https://dashboard.pimlico.io',
    )
  }

  const chainConfig = getChainConfig(config.chain)
  const rpcUrl = config.rpcUrl || chainConfig.rpcUrl
  const bundlerUrl = buildBundlerUrl(chainConfig, config.pimlico.apiKey)

  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(rpcUrl),
  })

  const pimlicoClient = createPimlicoClient({
    transport: http(bundlerUrl),
    entryPoint: {
      address: entryPoint06Address,
      version: '0.6',
    },
  })

  return {
    publicClient: publicClient as PublicClient<HttpTransport, Chain>,
    pimlicoClient,
    chainConfig,
    bundlerUrl,
  }
}
