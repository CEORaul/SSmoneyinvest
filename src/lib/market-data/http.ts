/// Thrown for failures that retrying won't fix (bad/missing token, 404) —
/// callers should skip the item and log it, not burn retry budget on it.
export class NonRetryableHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "NonRetryableHttpError"
  }
}

interface FetchWithRetryOptions {
  retries?: number
  timeoutMs?: number
  backoffMs?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/// Fetch wrapper with a timeout and exponential backoff on transient
/// failures (429/5xx/network errors). Auth failures (401/403) fail fast.
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  { retries = 3, timeoutMs = 10_000, backoffMs = 500 }: FetchWithRetryOptions = {}
): Promise<Response> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timeout)

      if (response.status === 401 || response.status === 403) {
        throw new NonRetryableHttpError(
          response.status,
          `Falha de autenticação (${response.status}) em ${url}`
        )
      }
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status} (retryable) em ${url}`)
      }
      return response
    } catch (error) {
      clearTimeout(timeout)
      if (error instanceof NonRetryableHttpError) throw error
      lastError = error
      if (attempt < retries) {
        await sleep(backoffMs * 2 ** attempt)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
