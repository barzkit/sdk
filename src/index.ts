/**
 * @barzkit/sdk — Self-custody wallet infrastructure for AI agents.
 *
 * @example
 * ```ts
 * import { createBarzAgent } from '@barzkit/sdk'
 *
 * const agent = await createBarzAgent({
 *   chain: 'sepolia',
 *   owner: process.env.OWNER_PRIVATE_KEY as `0x${string}`,
 *   pimlico: { apiKey: process.env.PIMLICO_API_KEY! },
 * })
 *
 * console.log('Agent wallet:', agent.address)
 * ```
 *
 * @packageDocumentation
 */

export { createBarzAgent } from './core/account'

export type {
  AgentConfig,
  AgentPermissions,
  BarzAgent,
  SwapParams,
  LendParams,
  TransactionRequest,
  TransactionReceipt,
  SupportedChain,
  ChainConfig,
  AgentEvent,
  X402Config,
  X402PaymentRequest,
} from './core/types'

export type {
  TransactionEvent,
  BalanceChangeEvent,
  IncomingTransferEvent,
  EventMap,
} from './events/types'

export {
  BarzKitError,
  ConfigError,
  PermissionError,
  FrozenError,
  TransactionError,
  BundlerError,
  X402Error,
} from './utils/errors'

export { CHAIN_CONFIGS, getChainConfig } from './chains/chains'
export { TOKENS, ERC20_ABI } from './utils/constants'

export {
  resolveToken,
  getTokenDecimals,
  isNativeETH,
  ETH_SENTINEL,
  buildSwapTransactions,
  getSwapTokenAddresses,
  UNISWAP_V3_ROUTER,
  buildLendTransactions,
  getLendTokenAddresses,
  AAVE_V3_POOL,
  parsePaymentRequired,
  validateDomain,
  X402Manager,
  buildPaymentTransaction,
  createFetchWithPayment,
} from './actions'
