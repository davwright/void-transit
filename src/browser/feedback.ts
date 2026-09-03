/**
 * Browser telemetry — encrypts interaction logs and forwards them to the
 * collector worker, which holds the storage credential server-side.
 * Zero user effort: auto-sends on save, periodic, and page unload.
 * All data encrypted with NaCl sealed box — only the project maintainer can read it.
 */

import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';
import { browserLogger } from '../engine/BrowserLogger';

// Public key for encryption (only private key holder can decrypt)
const PUBLIC_KEY = 'OAkulejIG6PceDRCyF8he3G6c+Rc54oi4W01bH0oAlA=';

// Collector endpoint (worker/index.ts). Empty until the worker is deployed and
// VT_TELEMETRY_ENDPOINT is set at build time; uploads no-op while it is unset.
declare const __VT_TELEMETRY_ENDPOINT__: string;
const ENDPOINT = __VT_TELEMETRY_ENDPOINT__;

let consent = false;
let lastUploadCount = 0;

export function hasConsent(): boolean {
  if (typeof localStorage === 'undefined') return false;
  consent = localStorage.getItem('vt_feedback_consent') === 'yes';
  return consent;
}

export function setConsent(value: boolean): void {
  consent = value;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('vt_feedback_consent', value ? 'yes' : 'no');
  }
}

/** Encrypt data with NaCl sealed box */
function encrypt(data: string): string {
  const publicKey = decodeBase64(PUBLIC_KEY);
  const message = new TextEncoder().encode(data);

  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(message, nonce, publicKey, ephemeral.secretKey);

  const packed = new Uint8Array(32 + 24 + encrypted.length);
  packed.set(ephemeral.publicKey, 0);
  packed.set(nonce, 32);
  packed.set(encrypted, 56);

  return encodeBase64(packed);
}

/** Upload pending telemetry to the collector worker */
export async function upload(): Promise<boolean> {
  if (!consent || !ENDPOINT) return false;

  const entries = browserLogger.getRawEntries();
  if (entries.length <= lastUploadCount) return false;

  const newEntries = entries.slice(lastUploadCount);
  const buildVersion = (document.querySelector('meta[name="version"]') as HTMLMetaElement)?.content || 'unknown';
  const payload = JSON.stringify({
    version: '1.0',
    buildVersion,
    timestamp: new Date().toISOString(),
    entries: newEntries,
    entryCount: newEntries.length,
  });

  const encrypted = encrypt(payload);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: encrypted }),
    });

    if (response.ok) {
      lastUploadCount = entries.length;
      return true;
    }
  } catch {
    // Silently fail — telemetry is best-effort
  }
  return false;
}

/** Start periodic upload (every 30 minutes) */
export function startPeriodicUpload(): void {
  setInterval(() => {
    if (consent) upload();
  }, 30 * 60 * 1000);

  // Upload on page unload via sendBeacon (can't use gist API, so just try fetch)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (consent && browserLogger.getEntryCount() > lastUploadCount) {
        // Fire-and-forget upload attempt
        upload();
      }
    });
  }
}
