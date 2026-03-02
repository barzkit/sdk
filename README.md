<p align="center">
  <h1 align="center">BarzKit</h1>
  <p align="center">Self-custody wallet infrastructure for AI agents.</p>
  <p align="center">
    <a href="https://www.npmjs.com/package/@barzkit/sdk"><img src="https://img.shields.io/npm/v/@barzkit/sdk.svg" alt="npm version"></a>
    <a href="https://github.com/barzkit/sdk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/tests-77%20passed-brightgreen" alt="tests">
  </p>
</p>

---

Deploy an autonomous, audited smart account for your AI agent in 5 minutes. Powered by [Trust Wallet's Barz](https://github.com/trustwallet/barz) (ERC-4337), with passkeys, gasless transactions, and programmable permissions via Diamond Proxy (EIP-2535).

## Why BarzKit?

AI agents need wallets. Existing solutions are either custodial (Coinbase Agentic Wallets) or too low-level (Safe, raw ERC-4337). BarzKit fills the gap:

| | Coinbase | Safe | **BarzKit** |
|---|---------|------|-------------|
| Self-custody | ❌ Custodial | ✅ | ✅ |
| Agent-specific DX | ✅ | ❌ | ✅ |
| Passkeys | ❌ | ❌ | ✅ |
| Gasless | Base only | ❌ | ✅ Any chain |
| Time to deploy | 2 min | Hours | **5 min** |
| Audits | Coinbase | Multiple | **Certik + Halborn** |

## Quickstart

```bash
npm install @barzkit/sdk
```

```typescript
import { createBarzAgent } from '@barzkit/sdk'
import { parseEther } from 'viem'

const agent = await createBarzAgent({
  chain: 'sepolia',
  owner: '0xYOUR_PRIVATE_KEY',
  pimlico: { apiKey: 'pim_YOUR_KEY' },
  permissions: {
    maxDailySpend: '100 USDC',
    allowedContracts: ['0xUniswapRouter...'],
  },
})

console.log('Address:', agent.address)

// Gasless transaction
const tx = await agent.sendTransaction({
  to: '0xRecipient...',
  value: parseEther('0.01'),
})

// Emergency: freeze the agent
await agent.freeze()
```

## Features

**Self-Custody** — Keys never leave your infrastructure. Built on Trust Wallet's Barz, audited by Certik and Halborn.

**Gasless Transactions** — Agents don't need ETH for gas. Paymaster covers fees. Enabled by default.

**Programmable Permissions** — Spending limits, contract whitelists, time windows. Powered by Diamond Proxy facets.

**Passkey Owner Control** — Human owner controls via FaceID/TouchID. Agent operates with a separate program key. Agent cannot change its own permissions.

**Kill Switch** — Freeze the agent wallet instantly via Guardian Facet.

**DeFi Actions** — Swap tokens (Uniswap V3) and lend (Aave V3) with atomic approve+execute batches.

**x402 Payments** — Machine-to-machine HTTP payments. Auto-pay 402 responses, retry with proof. `fetchWithPayment()`.

**Multi-Chain** — Sepolia, Base Sepolia, Base mainnet. Add a new chain in 5 lines.

**24/7 Security Monitoring** — Trust Wallet monitors every Barz account deployed via SDK. Free.

## Plugins

Use BarzKit with your AI framework of choice:

| Plugin | Install | Description |
|--------|---------|-------------|
| [`@barzkit/elizaos`](https://www.npmjs.com/package/@barzkit/elizaos) | `npm i @barzkit/elizaos` | [ElizaOS](https://github.com/elizaOS/eliza) plugin — 8 actions, wallet provider, service |
| [`@barzkit/langchain`](https://www.npmjs.com/package/@barzkit/langchain) | `npm i @barzkit/langchain` | [LangChain](https://github.com/langchain-ai/langchainjs) tools — 8 StructuredTools with zod schemas |
| [`@barzkit/mcp`](https://www.npmjs.com/package/@barzkit/mcp) | `npx @barzkit/mcp` | [MCP](https://modelcontextprotocol.io) server — 9 tools for Claude Desktop, Cursor, Windsurf |

## API

```typescript
// Create
const agent = await createBarzAgent(config)

// Transactions
await agent.sendTransaction({ to, value, data })
await agent.batchTransactions([tx1, tx2, tx3])
await agent.getBalance()          // ETH
await agent.getBalance(usdcAddr)  // ERC-20
await agent.waitForTransaction(hash)

// Permissions
agent.getPermissions()
agent.updatePermissions({ maxDailySpend: '200 USDC' })

// Safety
await agent.freeze()
await agent.unfreeze()
await agent.isActive()
```

## Configuration

```typescript
interface AgentConfig {
  chain: 'sepolia' | 'base-sepolia' | 'base'
  owner: `0x${string}`
  pimlico: { apiKey: string }

  // Optional
  permissions?: {
    maxAmountPerTx?: string       // '100 USDC'
    maxDailySpend?: string        // '500 USDC'
    allowedTokens?: Address[]
    allowedContracts?: Address[]
    timeWindow?: { start: string; end: string }
  }
  gasless?: boolean  // default: true
  index?: bigint     // multiple wallets per owner
}
```

## Architecture

```
Your AI Agent
      │
  @barzkit/sdk
      │
  permissionless.js (Pimlico)
      │
      ├── Bundler → UserOperation batching
      └── Paymaster → gasless transactions
            │
  Barz Smart Account (on-chain)
      ├── Diamond Proxy (EIP-2535) — modular facets
      ├── Passkeys (Secp256r1) — owner biometric control
      ├── Restrictions — spending limits, whitelists
      ├── Guardian — kill switch
      └── Trust Wallet 24/7 monitoring
```

## Prerequisites

- Node.js >= 18
- [Pimlico API key](https://dashboard.pimlico.io) (free tier: 100 UserOps/day)
- Test ETH on Sepolia: [sepoliafaucet.com](https://sepoliafaucet.com)

## Examples

See [examples](https://github.com/barzkit/examples) for complete working examples.

## Security

- Smart contracts audited by **Certik** and **Halborn**
- Dual key model: Owner (passkey) + Agent (program key)
- Agent cannot escalate its own permissions
- Trust Wallet ISO-certified security monitoring
- Open source: [trustwallet/barz](https://github.com/trustwallet/barz) (Apache-2.0)

## Roadmap

- [x] Core SDK: createWallet, sendTransaction, permissions, freeze
- [x] Batch transactions: atomic multi-call in one UserOperation
- [x] Multi-chain: Base Sepolia, Base mainnet
- [x] DeFi actions: swap, lend (Uniswap, Aave)
- [x] x402 payment handler
- [x] ElizaOS plugin
- [x] LangChain tool
- [x] MCP Server (Claude Desktop, Cursor, Windsurf)
- [ ] On-chain permission enforcement via Diamond Facets

## Contributing

Contributions welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT

---

[Documentation](https://github.com/barzkit/docs) · [Examples](https://github.com/barzkit/examples) · [Plugins](https://github.com/barzkit/plugins) · [Trust Wallet Barz](https://github.com/trustwallet/barz) · [Pimlico Docs](https://docs.pimlico.io)
