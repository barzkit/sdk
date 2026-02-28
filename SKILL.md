# BarzKit SDK

Self-custody wallet infrastructure for AI agents. TypeScript SDK wrapping Trust Wallet's Barz smart contracts (ERC-4337, Diamond Proxy EIP-2535).

## When to use this skill

Use the barzkit skill when you need to:
- Create a smart account wallet for an AI agent
- Send gasless transactions from an agent wallet
- Set spending limits, contract whitelists, or time windows on agent wallets
- Implement freeze/unfreeze (kill switch) for agent wallets
- Batch multiple transactions into one atomic operation
- Integrate AI agents with DeFi protocols through a self-custody wallet

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

### Permissions

```typescript
// Read current permissions
const perms = agent.getPermissions()

// Update permissions (no re-deploy needed)
agent.updatePermissions({ maxDailySpend: '1000 USDC' })
```

Transactions that violate permissions throw `PermissionError` before reaching the blockchain.

### Safety (kill switch)

```typescript
await agent.freeze()              // stop all transactions immediately
console.log(await agent.isActive()) // false
await agent.unfreeze()             // resume
```

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

## Dependencies

- `viem` >= 2.0 — Ethereum TypeScript client
- `permissionless` >= 0.3 — Pimlico SDK for ERC-4337
- Pimlico API key (free: 100 UserOps/day at pimlico.io)

## Error handling

SDK throws typed errors: `PermissionError` (limit exceeded), `FrozenError` (wallet frozen), `ConfigError` (invalid config), `TransactionError` (tx failed), `BundlerError` (bundler issue), `BarzKitError` (base class). All include human-readable messages, not hex revert codes.

## Links

- GitHub: https://github.com/barzkit/sdk
- Examples: https://github.com/barzkit/examples
- Barz contracts: https://github.com/trustwallet/barz
- Pimlico docs: https://docs.pimlico.io
