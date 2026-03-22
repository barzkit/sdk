import { EventEmitter } from 'events'
import type { EventMap } from './types'

/**
 * Strongly-typed event emitter for BarzKit agent events.
 * @internal
 */
export class TypedEventEmitter {
  private emitter = new EventEmitter()

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof EventMap>(
    event: K,
    handler: (...args: EventMap[K]) => void,
  ): () => void {
    this.emitter.on(event, handler as (...args: unknown[]) => void)
    return () => this.emitter.off(event, handler as (...args: unknown[]) => void)
  }

  /** Emit an event to all registered handlers. */
  emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): void {
    this.emitter.emit(event, ...args)
  }

  /** Remove all listeners and stop all event processing. */
  removeAllListeners(): void {
    this.emitter.removeAllListeners()
  }

  /** Returns the number of listeners for a given event. */
  listenerCount(event: keyof EventMap): number {
    return this.emitter.listenerCount(event)
  }
}
