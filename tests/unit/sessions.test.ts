import { describe, it, expect, vi, afterEach } from 'vitest'
import { createSession, parseDuration, SessionManager } from '../../src/sessions/session'
import { BarzKitError } from '../../src/utils/errors'
import { SessionExpiredError } from '../../src/utils/errors'

describe('parseDuration', () => {
  it('should parse hours', () => {
    expect(parseDuration('24h')).toBe(24 * 60 * 60 * 1000)
  })

  it('should parse minutes', () => {
    expect(parseDuration('30m')).toBe(30 * 60 * 1000)
  })

  it('should parse days', () => {
    expect(parseDuration('7d')).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('should parse seconds', () => {
    expect(parseDuration('60s')).toBe(60 * 1000)
  })

  it('should throw on invalid format', () => {
    expect(() => parseDuration('invalid')).toThrow(BarzKitError)
    expect(() => parseDuration('24x')).toThrow(BarzKitError)
  })
})

describe('createSession', () => {
  it('should create a session with expiresIn', () => {
    const session = createSession({ expiresIn: '1h' })

    expect(session.id).toBeDefined()
    expect(session.privateKey).toMatch(/^0x[0-9a-f]{64}$/)
    expect(session.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(session.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
    expect(session.isExpired()).toBe(false)
    expect(session.remainingTime()).toBeGreaterThan(0)
  })

  it('should create a session with expiresAt', () => {
    const future = new Date(Date.now() + 3600 * 1000)
    const session = createSession({ expiresAt: future })

    expect(session.expiresAt).toBe(Math.floor(future.getTime() / 1000))
    expect(session.isExpired()).toBe(false)
  })

  it('should include permissions', () => {
    const session = createSession({
      expiresIn: '1h',
      permissions: { maxAmountPerTx: '50 USDC' },
    })

    expect(session.permissions.maxAmountPerTx).toBe('50 USDC')
  })

  it('should include label', () => {
    const session = createSession({
      expiresIn: '1h',
      label: 'test-session',
    })

    expect(session.label).toBe('test-session')
  })

  it('should throw if neither expiresIn nor expiresAt', () => {
    expect(() => createSession({})).toThrow('expiresIn')
  })

  it('should throw if both expiresIn and expiresAt', () => {
    expect(() => createSession({
      expiresIn: '1h',
      expiresAt: new Date(Date.now() + 3600_000),
    })).toThrow('not both')
  })

  it('should throw if expiresAt is in the past', () => {
    expect(() => createSession({
      expiresAt: new Date(Date.now() - 1000),
    })).toThrow('future')
  })

  it('isExpired should return true for expired session', () => {
    const session = createSession({ expiresIn: '1h' })
    // Manually set to past
    session.expiresAt = Math.floor(Date.now() / 1000) - 10
    expect(session.isExpired()).toBe(true)
    expect(session.remainingTime()).toBe(0)
  })
})

describe('SessionManager', () => {
  it('should create and list sessions', () => {
    const manager = new SessionManager()
    const s1 = manager.create({ expiresIn: '1h', label: 'one' })
    const s2 = manager.create({ expiresIn: '2h', label: 'two' })

    const sessions = manager.getAll()
    expect(sessions).toHaveLength(2)
    expect(sessions.map(s => s.label)).toContain('one')
    expect(sessions.map(s => s.label)).toContain('two')
  })

  it('should revoke a session by id', () => {
    const manager = new SessionManager()
    const s = manager.create({ expiresIn: '1h' })

    expect(manager.revoke(s.id)).toBe(true)
    expect(manager.getAll()).toHaveLength(0)
  })

  it('should return false revoking non-existent id', () => {
    const manager = new SessionManager()
    expect(manager.revoke('non-existent')).toBe(false)
  })

  it('should revoke all sessions', () => {
    const manager = new SessionManager()
    manager.create({ expiresIn: '1h' })
    manager.create({ expiresIn: '2h' })

    manager.revokeAll()
    expect(manager.getAll()).toHaveLength(0)
  })
})

describe('SessionExpiredError', () => {
  it('should include elapsed time in message', () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 3600
    const err = new SessionExpiredError(expiredAt)
    expect(err.message).toContain('ago')
    expect(err.code).toBe('SESSION_EXPIRED')
    expect(err.name).toBe('SessionExpiredError')
  })
})
