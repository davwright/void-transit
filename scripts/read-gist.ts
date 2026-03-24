/**
 * Decrypt and display telemetry from GitHub Gists.
 *
 * Usage:
 *   npx ts-node scripts/read-gist.ts              # latest gist
 *   npx ts-node scripts/read-gist.ts --all         # all gists
 *   npx ts-node scripts/read-gist.ts <gist_id>     # specific gist
 *   npx ts-node scripts/read-gist.ts --summary      # stats only, no commands
 *
 * Requires: TELEMETRY_PRIVATE_KEY env var (or uses default for this project)
 */
import { execSync } from 'child_process';
import nacl from 'tweetnacl';
import { decodeBase64 } from 'tweetnacl-util';

const PRIVATE_KEY = process.env.TELEMETRY_PRIVATE_KEY || 'Ayo7YLyitpoFWxQ9TuChHIFxiblTbhSXRrQ5ak25MXk=';
const args = process.argv.slice(2);
const showAll = args.includes('--all');
const summaryOnly = args.includes('--summary');
const specificId = args.find(a => !a.startsWith('--'));

function decrypt(encoded: string): any {
  const secretKey = decodeBase64(PRIVATE_KEY);
  const packed = decodeBase64(encoded.trim());
  const ephemeralPubKey = packed.slice(0, 32);
  const nonce = packed.slice(32, 56);
  const ciphertext = packed.slice(56);
  const decrypted = nacl.box.open(ciphertext, nonce, ephemeralPubKey, secretKey);
  if (!decrypted) throw new Error('Decryption failed');
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function dec(s: string): string {
  try { return Buffer.from(s, 'base64').toString('utf8'); } catch { return s; }
}

function displaySession(data: any) {
  const w = process.stdout.write.bind(process.stdout);

  w(`\n━━━ Session ${data.timestamp} ━━━\n`);
  w(`Version: ${data.buildVersion || '?'}  Entries: ${data.entryCount}\n`);

  if (summaryOnly) {
    // Just stats
    let rooms = new Set<string>();
    let moves = 0, examines = 0, takes = 0, fails = 0;
    for (const e of data.entries) {
      if (e.type !== 'interaction') continue;
      rooms.add(dec(e.room));
      if (e.resultType === 'move_success') moves++;
      if (e.resultType === 'examine' || e.resultType === 'examine_scenery') examines++;
      if (e.resultType === 'take_success') takes++;
      if (e.resultType.includes('failed') || e.resultType === 'unknown') fails++;
    }
    w(`Rooms: ${rooms.size}  Moves: ${moves}  Examines: ${examines}  Takes: ${takes}  Fails: ${fails}\n`);
    return;
  }

  w('\n');
  let n = 0;
  for (const e of data.entries) {
    if (e.type !== 'interaction') continue;
    n++;
    const input = dec(e.rawInput);
    const room = dec(e.room);
    const type = e.resultType;
    const msg = e.resultMessage ? dec(e.resultMessage) : '';

    // Color-code by type
    const typeColor = type.includes('success') ? '✓' : type.includes('failed') || type === 'unknown' ? '✗' : type === 'rejected' ? '⊘' : '·';

    w(`${String(n).padStart(3)}. ${typeColor} [${room}] ${input}\n`);

    // Show response for interesting types
    if (type.includes('failed') || type === 'unknown' || type === 'rejected') {
      w(`     → ${type}: ${msg.substring(0, 150)}\n`);
    }
  }
  w(`\n${n} commands\n`);
}

async function main() {
  // Get gist list
  const listCmd = showAll ? 'gh gist list --limit 50' : specificId ? '' : 'gh gist list --limit 1';

  let gistIds: string[] = [];
  if (specificId) {
    gistIds = [specificId];
  } else {
    const list = execSync(listCmd, { encoding: 'utf-8' });
    for (const line of list.trim().split('\n')) {
      if (line.includes('void-transit-telemetry')) {
        gistIds.push(line.split('\t')[0]);
      }
    }
  }

  if (gistIds.length === 0) {
    process.stdout.write('No telemetry gists found.\n');
    return;
  }

  process.stdout.write(`Found ${gistIds.length} telemetry gist(s)\n`);

  for (const id of gistIds) {
    try {
      const raw = execSync(`gh gist view ${id} -r`, { encoding: 'utf-8' });
      // Skip first line (gist description)
      const encoded = raw.split('\n').slice(1).join('\n').trim();
      const data = decrypt(encoded);
      displaySession(data);
    } catch (err: any) {
      process.stdout.write(`\nFailed to decrypt ${id}: ${err.message}\n`);
    }
  }
}

main();
