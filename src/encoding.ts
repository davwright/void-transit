/**
 * Base64 encoding for story data at rest.
 * ALL strings are encoded — both object keys and values.
 *
 * encodeObject: encodes all keys and string values recursively.
 * decodeObject: decodes all keys and string values recursively.
 */

export function encodeString(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64');
}

export function decodeString(value: string): string {
  return Buffer.from(value, 'base64').toString('utf-8');
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
