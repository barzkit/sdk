import type { Hash } from 'viem'

/**
 * Guardian state tracker.
 *
 * Phase 1: Client-side freeze flag (instant, no gas)
 * Phase 2: On-chain freeze via Guardian + Lock Facets
 */
export class GuardianManager {
  private _frozen = false

  get isFrozen(): boolean {
    return this._frozen
  }

  async freeze(): Promise<Hash> {
    this._frozen = true
    // TODO Phase 2: on-chain Lock Facet call
    return '0x0000000000000000000000000000000000000000000000000000000000000000' as Hash
  }

  async unfreeze(): Promise<Hash> {
    this._frozen = false
    // TODO Phase 2: on-chain Lock Facet call (owner-only)
    return '0x0000000000000000000000000000000000000000000000000000000000000000' as Hash
  }
}
