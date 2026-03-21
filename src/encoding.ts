/**
 * Base64 encoding for story data at rest.
 * ALL strings are encoded — both object keys and values.
 *
 * Works in both Node.js and browser environments.
 */

// Environment-agnostic base64 encode/decode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _isNode = typeof Buffer !== 'undefined' && typeof (globalThis as any).window === 'undefined';

export function encodeString(value: string): string {
  if (_isNode) {
    return Buffer.from(value, 'utf-8').toString('base64');
  }
  // Browser: TextEncoder → Uint8Array → base64
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decodeString(value: string): string {
  if (_isNode) {
    return Buffer.from(value, 'base64').toString('utf-8');
  }
  // Browser: base64 → binary string → Uint8Array → TextDecoder
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Recursively encode ALL strings in an object/array — both keys and values.
 */
export function encodeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return encodeString(obj) as T;
  if (Array.isArray(obj)) return obj.map(item => encodeObject(item)) as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const encodedKey = encodeString(key);
      if (typeof val === 'string') {
        result[encodedKey] = encodeString(val);
      } else if (typeof val === 'object' && val !== null) {
        result[encodedKey] = encodeObject(val);
      } else {
        result[encodedKey] = val;
      }
    }
    return result as T;
  }
  return obj;
}

/**
 * Recursively decode ALL strings in an object/array — both keys and values.
 */
export function decodeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return decodeString(obj) as T;
  if (Array.isArray(obj)) return obj.map(item => decodeObject(item)) as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const decodedKey = decodeString(key);
      if (typeof val === 'string') {
        result[decodedKey] = decodeString(val);
      } else if (typeof val === 'object' && val !== null) {
        result[decodedKey] = decodeObject(val);
      } else {
        result[decodedKey] = val;
      }
    }
    return result as T;
  }
  return obj;
}
