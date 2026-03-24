/**
 * Browser telemetry — encrypts interaction logs and sends to Cloudflare Worker.
 * Zero user effort: auto-sends on save, periodic, and page unload.
 * All data encrypted with NaCl sealed box — only the project maintainer can read it.
 */

import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';
import { browserLogger } from '../engine/BrowserLogger';

// Public key for encryption (only private key holder can decrypt)
const PUBLIC_KEY = 'OAkulejIG6PceDRCyF8he3G6c+Rc54oi4W01bH0oAlA=';

// Cloudflare Worker endpoint
const WORKER_URL = 'https://void-transit-telemetry.davwright.workers.dev';

let consent = false;
let lastUploadCount = 0;

/** Check if user has given consent (stored in localStorage) */
export function hasConsent(): boolean {
  if (typeof localStorage === 'undefined') return false;
  consent = localStorage.getItem('vt_telemetry_consent') === 'yes';
  return consent;
}

/** Set consent */
export function setConsent(value: boolean): void {
  consent = value;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('vt_telemetry_consent', value ? 'yes' : 'no');
  }
}

/** Encrypt data with NaCl sealed box */
function encrypt(data: string): string {
  const publicKey = decodeBase64(PUBLIC_KEY);
  const message = new TextEncoder().encode(data);

  // NaCl sealed box: ephemeral keypair + box
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(message, nonce, publicKey, ephemeral.secretKey);

  // Pack: ephemeral public key (32) + nonce (24) + ciphertext
  const packed = new Uint8Array(32 + 24 + encrypted.length);
  packed.set(ephemeral.publicKey, 0);
  packed.set(nonce, 32);
  packed.set(encrypted, 56);

  return encodeBase64(packed);
}

/** Upload pending telemetry data */
export async function upload(): Promise<boolean> {
  if (!consent) return false;

  const entries = browserLogger.getRawEntries();
  if (entries.length <= lastUploadCount) return false; // nothing new

  const newEntries = entries.slice(lastUploadCount);
  const payload = JSON.stringify({
    version: '1.0',
    timestamp: new Date().toISOString(),
    entries: newEntries,
    entryCount: newEntries.length,
    sessionDuration: entries.length > 0 ? entries.length : 0,
  });

  const encrypted = encrypt(payload);

  try {
    const response = await fetch(WORKER_URL, {
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

  // Also upload on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (consent && browserLogger.getEntryCount() > lastUploadCount) {
        // Use sendBeacon for reliable delivery on page close
        const entries = browserLogger.getRawEntries().slice(lastUploadCount);
        const payload = JSON.stringify({
          version: '1.0',
          timestamp: new Date().toISOString(),
          entries,
          entryCount: entries.length,
        });
        const encrypted = encrypt(payload);
        navigator.sendBeacon(WORKER_URL, JSON.stringify({ data: encrypted }));
      }
    });
  }
}
