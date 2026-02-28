export class BarzKitError extends Error {
  public readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'BarzKitError'
    this.code = code
  }
}

export class ConfigError extends BarzKitError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR')
    this.name = 'ConfigError'
  }
}

export class PermissionError extends BarzKitError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED')
    this.name = 'PermissionError'
  }
}

export class FrozenError extends BarzKitError {
  constructor() {
    super(
      'Agent wallet is frozen. Call agent.unfreeze() to resume operation.',
      'AGENT_FROZEN',
    )
    this.name = 'FrozenError'
  }
}

export class TransactionError extends BarzKitError {
  public readonly txHash?: string

  constructor(message: string, txHash?: string) {
    super(message, 'TRANSACTION_FAILED')
    this.name = 'TransactionError'
    this.txHash = txHash
  }
}

export class BundlerError extends BarzKitError {
  constructor(message: string) {
    super(message, 'BUNDLER_ERROR')
    this.name = 'BundlerError'
  }
}

export function humanizeError(error: unknown): BarzKitError {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('AA21')) {
    return new TransactionError(
      'Smart account has insufficient funds to pay for gas. ' +
      'Send ETH to the agent wallet address, or enable gasless mode.',
    )
  }

  if (message.includes('AA25')) {
    return new TransactionError(
      'Invalid signature. The agent key may not be authorized for this account.',
    )
  }

  if (message.includes('AA31')) {
    return new TransactionError(
      'Paymaster deposit too low. The paymaster may be out of funds. ' +
      'Try again later or switch to self-funded mode.',
    )
  }

  if (message.includes('AA33')) {
    return new TransactionError(
      'Transaction reverted during validation. The calldata may be invalid ' +
      'or the target contract may have rejected the call.',
    )
  }

  if (message.includes('AA40') || message.includes('AA41')) {
    return new TransactionError(
      'Paymaster validation failed. The paymaster may not support this operation.',
    )
  }

  if (message.includes('insufficient funds')) {
    return new TransactionError(
      'Insufficient funds in the agent wallet. Check balance with agent.getBalance().',
    )
  }

  return new BarzKitError(`Transaction failed: ${message}`, 'UNKNOWN_ERROR')
}
