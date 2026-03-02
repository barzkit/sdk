# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-03-02

### Added

- `@barzkit/mcp` — MCP Server for Claude Desktop, Cursor, Windsurf, VS Code Copilot (separate package in `plugins/mcp/`)
- 9 tools: create_wallet, send_transaction, check_balance, swap_tokens, lend_tokens, batch_transactions, freeze_wallet, unfreeze_wallet, fetch_with_payment
- `createBarzMcpServer()` — create MCP server with all wallet tools
- Stdio transport for standard MCP client integration
- MCP Server documentation (`docs/advanced/mcp-server.md`)

## [0.2.0] - 2026-03-02

### Added

- `@barzkit/langchain` — LangChain StructuredTool integration (separate package in `plugins/langchain/`)
- 8 tools: barz_send_transaction, barz_check_balance, barz_swap, barz_lend, barz_batch_transactions, barz_freeze_wallet, barz_unfreeze_wallet, barz_fetch_with_payment
- `createBarzTools(config)` — one-liner to create all tools from AgentConfig
- `createBarzToolkit(agent)` — wrap existing BarzAgent in LangChain tools
- Zod schemas with parameter descriptions for LLM tool calling
- LangChain tools documentation (`docs/advanced/langchain-tool.md`)
- `langchain-agent` example

## [0.1.5] - 2026-03-02

### Added

- `@barzkit/elizaos` — ElizaOS plugin for AI agent wallets (separate package in `plugins/elizaos/`)
- 8 actions: SEND_TRANSACTION, CHECK_BALANCE, SWAP_TOKENS, LEND_TOKENS, BATCH_TRANSACTIONS, FREEZE_WALLET, UNFREEZE_WALLET, FETCH_WITH_PAYMENT
- `BarzService` — ElizaOS service lifecycle for BarzKit smart accounts
- `walletProvider` — wallet context provider (address, balance, status)
- ElizaOS plugin documentation (`docs/advanced/elizaos-plugin.md`)
- `elizaos-agent` example
- `plugins/` directory structure for all `@barzkit` plugins

## [0.1.4] - 2026-03-01

### Added

- x402 payment protocol support: machine-to-machine HTTP 402 payments
- `enableX402()` method on `BarzAgent` — configure payment limits and domain whitelist
- `fetchWithPayment()` method on `BarzAgent` — auto-pay 402 responses and retry with proof
- `X402Config` and `X402PaymentRequest` interfaces
- `X402Manager` — per-request and daily spend limit enforcement with 24h rolling window
- `parsePaymentRequired()` — parse 402 response headers into structured payment request
- `validateDomain()` — domain whitelist check for payment endpoints
- `buildPaymentTransaction()` — build ERC-20 transfer for x402 payment
- `X402Error` error class
- Unit tests for x402 parsing, validation, manager, and fetch flow

## [0.1.3] - 2026-03-01

### Added

- `swap()` method on `BarzAgent` — swap tokens via Uniswap V3 (Sepolia)
- `lend()` method on `BarzAgent` — supply tokens to Aave V3 (Sepolia)
- `SwapParams` and `LendParams` interfaces
- `src/actions/tokens.ts` — `resolveToken()`, `getTokenDecimals()`, `isNativeETH()`, `ETH_SENTINEL`
- `src/actions/swap.ts` — `buildSwapTransactions()`, `getSwapTokenAddresses()`, `UNISWAP_V3_ROUTER`
- `src/actions/lend.ts` — `buildLendTransactions()`, `getLendTokenAddresses()`, `AAVE_V3_POOL`
- Token permission validation for DeFi actions (`allowedTokens` check)
- Unit tests for tokens, swap, and lend calldata builders
- `defi-agent` example
- DeFi actions guide (`docs/guides/defi-actions.md`)

### Changed

- Extracted `executeBatch()` helper in `account.ts` (reused by `batchTransactions`, `swap`, `lend`)

## [0.1.2] - 2026-03-01

### Added

- `explorerUrl` field in `ChainConfig` — block explorer base URL per chain
- `getExplorerUrl(hash)` method on `BarzAgent` — returns full explorer link for a transaction
- Console warning when using Base mainnet (real funds at risk)
- Chain-specific unit tests (`tests/unit/chains.test.ts`)

### Changed

- Updated package description and keywords for better discoverability
- Refactored chain tests into dedicated test file

## [0.1.1] - 2026-03-01

### Added

- `batchTransactions()` — atomic multi-call in a single UserOperation

## [0.1.0] - 2026-02-28

### Added

#### Core API

- `createBarzAgent()` — create an ERC-4337 smart account wallet on any supported chain
- `sendTransaction()` — send gasless transactions via Pimlico bundler + paymaster
- `getBalance()` — query ETH and ERC-20 token balances
- `waitForTransaction()` — wait for on-chain confirmation with structured `TransactionReceipt`
- `getExplorerUrl()` — block explorer URL for any transaction hash

#### Multi-chain

- Chain support: Sepolia, Base Sepolia, Base mainnet
- `CHAIN_CONFIGS` / `getChainConfig` — chain configuration registry
- `TOKENS` — pre-configured token addresses (USDC, WETH, DAI) per chain
- Custom `rpcUrl` option in `AgentConfig`
- Console warning when using Base mainnet (real funds at risk)

#### Permissions

- `AgentPermissions` — spending limits, contract whitelists, time windows
- `getPermissions()` / `updatePermissions()` — runtime permission management
- Client-side validation: per-tx limit, daily spend cap, allowed contracts, time window

#### Safety

- `freeze()` / `unfreeze()` — client-side kill switch (Phase 1)
- `isActive()` — check whether the agent wallet is frozen

#### DX

- Human-readable AA error mapping (AA21, AA25, AA31, AA33, AA40/41)
- Typed error hierarchy: `BarzKitError`, `ConfigError`, `PermissionError`, `FrozenError`, `TransactionError`, `BundlerError`
- Config validation with actionable error messages
- Account `index` for deterministic multi-wallet derivation from the same owner key
- `gasless` config option (default: `true`)
- `ERC20_ABI` — common ERC-20 function ABIs for contract reads
- `AgentEvent` type definitions for future event hooks
- Dual-package build: ESM (`.mjs`) + CJS (`.js`) + DTS (`.d.ts`)

[0.2.1]: https://github.com/barzkit/sdk/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/barzkit/sdk/compare/v0.1.5...v0.2.0
[0.1.5]: https://github.com/barzkit/sdk/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/barzkit/sdk/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/barzkit/sdk/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/barzkit/sdk/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/barzkit/sdk/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/barzkit/sdk/releases/tag/v0.1.0