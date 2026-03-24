/**
 * Generate NaCl keypair for telemetry encryption.
 * Public key → embedded in browser bundle
 * Private key → stored as GitHub secret + Cloudflare Worker secret
 *
 * Run once: npx ts-node scripts/generate-keypair.ts
 */
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

const keypair = nacl.box.keyPair();

process.stdout.write('=== VOID TRANSIT TELEMETRY KEYPAIR ===\n\n');
process.stdout.write('PUBLIC KEY (embed in browser bundle):\n');
process.stdout.write(encodeBase64(keypair.publicKey) + '\n\n');
process.stdout.write('PRIVATE KEY (store as secret — NEVER commit):\n');
process.stdout.write(encodeBase64(keypair.secretKey) + '\n\n');
process.stdout.write('Store the private key in:\n');
process.stdout.write('  - GitHub secret: TELEMETRY_PRIVATE_KEY\n');
process.stdout.write('  - Cloudflare Worker secret: TELEMETRY_PRIVATE_KEY\n');
