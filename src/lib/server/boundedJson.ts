export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('request_body_too_large');
    this.name = 'RequestBodyTooLargeError';
  }
}

/**
 * `request.json()` parses the complete body before Zod sees it. Public routes
 * use this helper so a valid small schema cannot still be reached through an
 * arbitrarily large allocation.
 */
export async function readBoundedJson(
  request: Request,
  maxBytes: number
): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestBodyTooLargeError();
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new RequestBodyTooLargeError();
  }
  return JSON.parse(text) as unknown;
}
