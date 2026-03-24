/**
 * Decrypt telemetry data from GitHub Gists.
 *
 * Usage: TELEMETRY_PRIVATE_KEY=... npx ts-node scripts/decrypt-telemetry.ts <base64_data>
 * Or pipe: echo "base64data" | TELEMETRY_PRIVATE_KEY=... npx ts-node scripts/decrypt-telemetry.ts
 * Or from gist: gh gist view <gist_id> -f telemetry-*.enc | TELEMETRY_PRIVATE_KEY=... npx ts-node scripts/decrypt-telemetry.ts
 */
import nacl from 'tweetnacl';
import { decodeBase64 } from 'tweetnacl-util';
import * as fs from 'fs';

const PRIVATE_KEY = process.env.TELEMETRY_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  process.stderr.write('Set TELEMETRY_PRIVATE_KEY env var\n');
  process.exit(1);
}

const secretKey = decodeBase64(PRIVATE_KEY);

// Read from arg or stdin
let input = process.argv[2];
if (!input) {
  input = fs.readFileSync(0, 'utf-8').trim();
}

try {
  const packed = decodeBase64(input);

  // Unpack: ephemeral public key (32) + nonce (24) + ciphertext
  const ephemeralPubKey = packed.slice(0, 32);
  const nonce = packed.slice(32, 56);
  const ciphertext = packed.slice(56);

  const decrypted = nacl.box.open(ciphertext, nonce, ephemeralPubKey, secretKey);
  if (!decrypted) {
    process.stderr.write('Decryption failed — wrong key or corrupted data\n');
    process.exit(1);
  }

  const text = new TextDecoder().decode(decrypted);
  const data = JSON.parse(text);

  // Pretty print
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}
