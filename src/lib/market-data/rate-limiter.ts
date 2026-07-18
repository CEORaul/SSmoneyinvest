interface RateLimiterOptions {
  maxRequests: number
  intervalMs: number
}

/// In-process sliding-window limiter guarding outbound provider calls.
/// Single-instance only by design — a multi-instance deployment would need
/// a shared store (e.g. Redis/Upstash) behind the same `schedule()`
/// interface instead; this is the extension point for that later.
export class RateLimiter {
  private readonly maxRequests: number
  private readonly intervalMs: number
  private timestamps: number[] = []

  constructor({ maxRequests, intervalMs }: RateLimiterOptions) {
    this.maxRequests = maxRequests
    this.intervalMs = intervalMs
  }

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    await this.waitForSlot()
    return task()
  }

  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        const now = Date.now()
        this.timestamps = this.timestamps.filter(
          (timestamp) => now - timestamp < this.intervalMs
        )
        if (this.timestamps.length < this.maxRequests) {
          this.timestamps.push(now)
          resolve()
          return
        }
        const waitMs = this.intervalMs - (now - this.timestamps[0]) + 10
        setTimeout(tryAcquire, waitMs)
      }
      tryAcquire()
    })
  }
}
