# VOID TRANSIT — GitHub Pages Migration

## Phase 1: Browser Bundle
Remove all Node.js dependencies from shared code, bundle for browser.

- [x] **1a** Make encoding.ts work in browser (btoa/atob instead of Buffer)
- [x] **1b** Refactor engine to accept injected data (no fs.readFileSync)
  - GameEngine constructor takes data object instead of loading from disk
  - ProseGenerator/HaikuParser/Parser accept prompts/verbs as args
- [x] **1c** Create BrowserSaveManager (localStorage instead of fs)
  - Same interface as SaveManager
  - Slots stored as localStorage keys
  - Encoded at rest (same as file saves)
- [x] **1d** Create BrowserLogger (in-memory buffer instead of fs)
  - Stores interaction log entries in array
  - Available for telemetry upload
- [x] **1e** Make Parser/ProseGenerator/StatisticalTagger work without fs
  - Import JSON data directly instead of fs.readFileSync
  - rejected-verbs.json, prompts.json loaded as modules
- [x] **1f** Add Vite bundler config + browser entry point
  - vite.config.ts targeting browser
  - src/browser/index.ts — new entry point
  - JSON data files imported as ES modules (bundled into JS)
- [x] **1g** Wire frontend app.js directly to engine (no fetch)
  - Replace fetch('/api/command') with direct engine.processCommand()
  - Remove server dependency entirely
  - Keep existing terminal UI
- [x] **1h** Build static site and verify game plays offline
  - npm run build:browser → docs/
  - Open docs/index.html — full game works with no server

## Phase 2: LLM Adapters
Support multiple LLM backends — player chooses on first visit.

- [x] **2a** Create LLM adapter interface
  - `{ name, available(), complete(prompt) }`
  - Replaces HaikuParser's execSync Claude CLI call
- [ ] **2b** Implement Groq adapter (free tier, OpenAI-compatible)
  - fetch to api.groq.com/openai/v1/chat/completions
  - Llama/Mixtral models, 30 req/min free
  - API key stored in localStorage
- [ ] **2c** Implement Anthropic adapter (user provides API key)
  - fetch to api.anthropic.com/v1/messages
  - For users who want Claude specifically
  - Check CORS; fall back to Groq if blocked
- [ ] **2d** Implement NoLLM adapter (fallback, default)
  - Returns null — buildFallbackProse() handles everything
  - Zero friction — no signup, no keys, just play
- [ ] **2e** Settings UI — LLM choice, API key entry, connection test
  - `settings` command opens config panel
  - Store choice + keys in localStorage
  - Test connection before confirming
- [x] **2f** Feedback mechanism — thumbs up/down after LLM responses
  - `+` / `-` keys or click after each LLM-generated response
  - Rating stored in interaction log
  - Creates labeled training data: prompt + response + quality

## Phase 3: Telemetry (Opt-In)
Encrypted upload of gameplay data for story improvement.

- [x] **3a** GDPR/privacy disclaimer on first visit
  - No PII collected, no API keys transmitted
  - Consent stored in localStorage
  - Opt out anytime via `settings`
- [x] **3b** Generate NaCl keypair, embed public key
  - scripts/generate-keypair.ts — one-time
  - Public key in src/browser/telemetry/publicKey.ts
  - Private key in GitHub repo secret TELEMETRY_PRIVATE_KEY
- [x] **3c** Implement TelemetryManager — collect, encrypt, zip
  - tweetnacl sealed box encryption (pure JS)
  - Collect: interaction logs, save state, LLM response ratings
  - NOT collected: API keys, browser info, PII
- [ ] **3d** GitHub OAuth device flow for Gist upload
  - Register OAuth App, embed client_id
  - User visits github.com/login/device, enters code
  - Token stored in localStorage
- [x] **3e** Upload encrypted telemetry as GitHub Gist
  - Secret gist with encrypted payload
  - Triggered on save, on game completion, periodic (30 min)
  - Silent after initial consent
- [ ] **3f** Create decrypt-telemetry script for maintainer
  - scripts/decrypt-telemetry.ts
  - Reads private key from env, decrypts gist content
  - Outputs plaintext interaction logs + saves

## Phase 4: Deploy
Ship it.

- [x] **4a** Configure GitHub Pages deployment (docs/ output)
  - npm run build:browser → docs/
  - GitHub Pages source: /docs on main branch
- [x] **4b** Verify server mode still works (npm run dev)
  - Shared code in src/engine/, src/nlp/, src/data/
  - Browser code in src/browser/
  - Server code in src/server.ts
  - Both entry points use same engine
- [x] **4c** Run full test suite, deploy to GitHub Pages
  - npm test — all existing tests pass
  - Push docs/ to main
  - Verify at https://username.github.io/void-transit/

## Dependencies to Add
- `vite` (devDep) — bundler
- `tweetnacl` + `tweetnacl-util` — NaCl encryption (pure JS, ~55KB)

## Key Principle
All Groq-generated content is retained in interaction logs for story improvement.
LLM responses reveal: gaps in pre-written scenery, quality of generated prose,
story inconsistencies. Feedback ratings create labeled training data.

## Phase 5: Story wiring (2026-09-02) — see design/STORY-REVIEW.md (SPOILERS)
- [x] StoryManager evaluates the authored trigger schema (beats, acts, events, endings)
- [x] Puzzles activate on room entry with prerequisites; step effects and timers apply
- [x] Puzzle validation has real semantics (verb + items + room + numbers)
- [x] Final choice commands and all endings reachable
- [x] tests/story.test.ts — command-only happy path replaces the hand-driven god run
- [x] scripts/llm-play.ts — blind LLM playtest driver
- [ ] Run the Haiku playtest and record results in docs/PLAYTESTS.md
- [ ] CO2 cognitive-decline mechanic (event_co2_warning has the data; nothing reads it)
- [ ] Confirmation prompt before the correction burn
- [ ] Vary the JANUS paragraph across endings
- [ ] Reconcile 0.12c vs 19.7 ly vs 42 years in story text
- [ ] Make the no_tether EVA failure reachable (bad ending exists, nothing sets death_cause)
- [ ] SECURITY: move telemetry upload to the Cloudflare worker; revoke the token in src/browser/feedback.ts
