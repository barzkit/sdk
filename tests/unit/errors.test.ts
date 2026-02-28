import { describe, it, expect } from 'vitest'
import { FrozenError, humanizeError, BarzKitError } from '../../src/utils/errors'

describe('humanizeError', () => {
  it('should humanize AA21 errors', () => {
    const error = humanizeError(new Error("AA21 didn't pay prefund"))
    expect(error).toBeInstanceOf(BarzKitError)
    expect(error.message).toContain('insufficient funds')
  })

  it('should humanize AA25 errors', () => {
    const error = humanizeError(new Error('AA25 invalid account nonce'))
    expect(error.message).toContain('Invalid signature')
  })

  it('should humanize AA31 errors', () => {
    const error = humanizeError(new Error('AA31 paymaster deposit too low'))
    expect(error.message).toContain('Paymaster deposit too low')
  })

  it('should handle unknown errors', () => {
    const error = humanizeError(new Error('something random'))
    expect(error.code).toBe('UNKNOWN_ERROR')
  })

  it('should handle non-Error objects', () => {
    const error = humanizeError('string error')
    expect(error).toBeInstanceOf(BarzKitError)
  })
})

describe('FrozenError', () => {
  it('should have correct code and message', () => {
    const error = new FrozenError()
    expect(error.code).toBe('AGENT_FROZEN')
    expect(error.message).toContain('frozen')
  })
})
