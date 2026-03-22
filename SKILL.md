# BarzKit SDK

Self-custody wallet infrastructure for AI agents. TypeScript SDK wrapping Trust Wallet's Barz smart contracts (ERC-4337, Diamond Proxy EIP-2535).

## When to use this skill

Use the barzkit skill when you need to:
- Create a smart account wallet for an AI agent
- Send gasless transactions from an agent wallet
- Set spending limits, contract whitelists, or time windows on agent wallets
- Implement freeze/unfreeze (kill switch) for agent wallets
- Batch multiple transactions into one atomic operation
- Swap tokens via Uniswap V3 or lend via Aave V3 from an agent wallet
- Deploy agent wallets on multiple chains (Sepolia, Base Sepolia, Base)
- Integrate AI agents with DeFi protocols through a self-custody wallet
- Listen for on-chain events (incoming transfers, balance changes) via polling
- Set up webhook forwarding for wallet events

## Install

```bash
npm install @barzkit/sdk viem
```

## Core API

### Create an agent wallet

```typescript
import { createBarzAgent } from '@barzkit/sdk'

const agent = await createBarzAgent({
  chain: 'sepolia',                    // 'sepolia' | 'base-sepolia' | 'base'
  owner: '0xPrivateKey',               // owner private key (hex)
  pimlico: { apiKey: 'pim_...' },      // Pimlico bundler API key
  gasless: true,                       // default: true, paymaster covers gas
  index: 0n,                           // optional: deterministic multi-wallet
  rpcUrl: 'https://...',               // optional: custom RPC
  pollInterval: 15_000,                // optional: event polling interval ms
  permissions: {                       // optional
    maxAmountPerTx: '100 USDC',
    maxDailySpend: '500 USDC',
    allowedTokens: ['0x...'],
    allowedContracts: ['0x...'],
    timeWindow: { start: '09:00', end: '17:00' },
  },
})

console.log(agent.address) // 0x... smart account address
```

### Send transactions

```typescript
// Single transaction (gasless by default)
const hash = await agent.sendTransaction({
  to: '0xRecipient',
  value: parseEther('0.01'),
  data: '0x',  // optional calldata
})

// Batch: multiple txs in one UserOperation (atomic)
const hash = await agent.batchTransactions([
  { to: tokenAddr, data: approveCalldata },
  { to: routerAddr, data: swapCalldata },
])

// Wait for confirmation
const receipt = await agent.waitForTransaction(hash)
// receipt.status: 'success' | 'reverted'
// receipt.blockNumber, receipt.gasUsed

// Check balance (ETH or ERC-20)
const balance = await agent.getBalance()
const usdcBalance = await agent.getBalance('0xUsdcAddress')
```

### DeFi actions

```typescript
// Swap tokens via Uniswap V3 (atomic approve + swap)
const hash = await agent.swap({
  from: 'USDC',        // token symbol or address
  to: 'WETH',          // token symbol or address
  amount: '100',       // human-readable amount
  slippage: 0.5,       // optional: max slippage % (default: 0.5)
  fee: 3000,           // optional: pool fee tier (default: 3000 = 0.3%)
})

// ETH input: no approve needed, router wraps to WETH
const hash = await agent.swap({ from: 'ETH', to: 'USDC', amount: '0.1' })

// Lend (supply) tokens to Aave V3 (atomic approve + supply)
const hash = await agent.lend({
  token: 'USDC',
  amount: '50',
  protocol: 'aave',    // only 'aave' supported currently
})
```

Calldata builders are also exported for advanced use:

```typescript
import { buildSwapTransactions, buildLendTransactions } from '@barzkit/sdk'

const swapTxs = buildSwapTransactions({ from: 'USDC', to: 'WETH', amount: '100' }, 'sepolia', agentAddr)
const lendTxs = buildLendTransactions({ token: 'USDC', amount: '50', protocol: 'aave' }, 'sepolia', agentAddr)
```

### Token utilities

```typescript
import { resolveToken, getTokenDecimals, isNativeETH, ETH_SENTINEL } from '@barzkit/sdk'

resolveToken('USDC', 'sepolia')  // → '0x1c7D...' (checksummed address)
resolveToken('ETH', 'sepolia')   // → ETH_SENTINEL
getTokenDecimals('USDC')         // → 6
getTokenDecimals('WETH')         // → 18
isNativeETH('ETH')               // → true
```

### Permissions

```typescript
// Read current permissions
const perms = agent.getPermissions()

// Update permissions (no re-deploy needed)
agent.updatePermissions({ maxDailySpend: '1000 USDC' })
```

Transactions that violate permissions throw `PermissionError` before reaching the blockchain. Token permissions (`allowedTokens`) are also checked by `swap()` and `lend()`.

### Explorer URLs

```typescript
// Get block explorer link for any tx hash (auto-detects chain)
const url = agent.getExplorerUrl(txHash)
// 'https://sepolia.etherscan.io/tx/0x...'
// 'https://sepolia.basescan.org/tx/0x...'
// 'https://basescan.org/tx/0x...'
```

### Session keys

```typescript
// Create a temporary session key (client-side enforcement)
const session = agent.createSession({
  expiresIn: '24h',          // or expiresAt: new Date(...)
  permissions: {
    maxDailySpend: '200 USDC',
    allowedContracts: ['0xUniswap...'],
  },
  label: 'trading-bot',      // optional
})

// session has: id, privateKey, address, expiresAt, permissions, label
session.isExpired()     // false
session.remainingTime() // seconds remaining

// Create a session-scoped agent
const sessionAgent = await createBarzAgent({
  chain: 'sepolia',
  owner: session.privateKey,
  pimlico: { apiKey: '...' },
  permissions: session.permissions,
  sessionExpiry: session.expiresAt, // throws SessionExpiredError when expired
})

// Manage sessions
agent.getSessions()              // all sessions
agent.revokeSession(session.id)  // remove one
agent.revokeAllSessions()        // remove all
```

Duration formats: `'24h'`, `'30m'`, `'7d'`, `'60s'`. `SessionExpiredError` is thrown automatically.

### Dry run (simulation)

```typescript
// Simulate a single transaction
const result = await agent.dryRun({
  to: '0xRecipient',
  value: parseEther('0.1'),
})

console.log(result.success)              // true/false
console.log(result.gasEstimate)          // bigint gas units
console.log(result.gasCostETH)           // "0.000123 ETH"
console.log(result.permissionCheck)      // { passed, violations }
console.log(result.error)                // revert reason if failed

// Simulate a batch
const result = await agent.dryRun([tx1, tx2, tx3])
```

Checks: frozen state, permission violations (without sending), on-chain gas estimation. If permissions fail, skips on-chain call.

### Transaction history

```typescript
// Fetch last 20 transactions (default)
const txs = await agent.getTransactions()

// With options
const txs = await agent.getTransactions({
  limit: 50,            // max 100
  offset: 0,
  startBlock: 1000000n,
  endBlock: 2000000n,
})

// Each tx has: hash, from, to, value, timestamp, blockNumber, status, direction, explorerUrl
txs[0].direction // 'incoming' | 'outgoing'
txs[0].status    // 'success' | 'failed'
```

Uses Etherscan-compatible API (no API key needed for testnets). Throws `BarzKitError` with code `HISTORY_API_ERROR` on failure.

### x402 payments (machine-to-machine)

```typescript
// Enable x402 with spending limits
agent.enableX402({
  maxPaymentPerRequest: '0.01 USDC',
  maxDailyPayments: '1 USDC',
  allowedDomains: ['api.example.com'],
})

// Fetch with auto-payment on HTTP 402
const response = await agent.fetchWithPayment('https://api.example.com/data')
```

x402 helpers are also exported: `parsePaymentRequired()`, `validateDomain()`, `buildPaymentTransaction()`, `X402Manager`, `createFetchWithPayment()`.

### Safety (kill switch)

```typescript
await agent.freeze()              // stop all transactions immediately
console.log(await agent.isActive()) // false
await agent.unfreeze()             // resume
```

### Events

```typescript
// Listen for balance changes (lazy — polling starts on first on())
agent.on('balanceChange', (change) => {
  console.log(`Balance: ${change.previous} -> ${change.current}`)
})

// Incoming ERC-20 transfers
agent.on('incoming', (tx) => {
  console.log(`Received ${tx.value} of ${tx.token} from ${tx.from}`)
})

// Freeze/unfreeze notifications
agent.on('frozen', () => console.log('Frozen'))
agent.on('unfrozen', () => console.log('Unfrozen'))

// Errors from polling or webhooks
agent.on('error', (err) => console.error(err))

// Unsubscribe
const unsub = agent.on('incoming', handler)
unsub()

// Webhook: forward events as HTTP POST
agent.onWebhook('incoming', 'https://api.example.com/hook')

// Stop all listeners and polling
agent.removeAllListeners()
```

Config: `pollInterval` (ms, default 15000) controls how often the chain is polled.

## Architecture

```
@barzkit/sdk → permissionless.js (Pimlico) → Bundler + Paymaster → Barz Smart Account (on-chain)
```

- **Barz Smart Account**: Diamond Proxy (EIP-2535) with isolated facets
- **ERC-4337**: Account Abstraction, gasless via paymaster
- **Dual key model**: Owner signs with passkey (biometric), agent signs with program key
- **Agent cannot**: change permissions, swap signature scheme, bypass restrictions

## Key concepts

- **Smart Account**: A wallet that is a smart contract with programmable rules, not just a private key
- **UserOperation**: ERC-4337 transaction format, processed by EntryPoint contract
- **Bundler**: Service that submits UserOperations to blockchain (Pimlico)
- **Paymaster**: Service that pays gas fees so agent wallet needs no ETH
- **Diamond Proxy**: Modular contract pattern — each function is a separate facet, hot-swappable
- **Facets**: Account, Secp256k1 (agent key), Secp256r1 (passkey), Guardian, Lock, Restriction, Allowance

## DeFi protocol addresses

- **Uniswap V3 Router (Sepolia)**: `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E`
- **Aave V3 Pool (Sepolia)**: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`

## Dependencies

- `viem` >= 2.0 — Ethereum TypeScript client
- `permissionless` >= 0.3 — Pimlico SDK for ERC-4337
- Pimlico API key (free: 100 UserOps/day at pimlico.io)

## Error handling

SDK throws typed errors: `PermissionError` (limit exceeded), `FrozenError` (wallet frozen), `ConfigError` (invalid config), `TransactionError` (tx failed), `BundlerError` (bundler issue), `X402Error` (payment protocol error), `BarzKitError` (base class, also used for `UNSUPPORTED_CHAIN`, `UNKNOWN_TOKEN`, `INVALID_SWAP`, `UNKNOWN_PROTOCOL`, `NATIVE_ETH_NOT_SUPPORTED`). All include human-readable messages, not hex revert codes.

## Links

- GitHub: https://github.com/barzkit/sdk
- Examples: https://github.com/barzkit/examples
- Barz contracts: https://github.com/trustwallet/barz
- Pimlico docs: https://docs.pimlico.io
