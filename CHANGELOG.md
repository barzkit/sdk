# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.2]: https://github.com/barzkit/sdk/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/barzkit/sdk/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/barzkit/sdk/releases/tag/v0.1.0