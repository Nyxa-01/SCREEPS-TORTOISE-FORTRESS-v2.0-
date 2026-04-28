# SCREEPS TORTOISE FORTRESS v2.0

A production-ready Screeps MMO starter built around the Tortoise doctrine: asymmetric defense, deliberate economic pacing, fortress-first infrastructure, and hard recovery guarantees when the runtime misbehaves.

## Executive Summary

Tortoise Fortress is built on a simple strategic premise: time favors the defender when the defender controls engagement geometry, repair cadence, and memory pressure. Instead of racing into brittle expansion, the bot stabilizes a room through layered ramparts, tower focus fire, defensive spawn ordering, and typed operational state. The result is an AI that prefers durable control over flashy tempo, absorbs attrition efficiently, and keeps the colony online long enough for the defender advantage to compound.

This doctrine expresses itself in code through a strict six-phase loop, explicit Empire to Colony to Manager ownership boundaries, segment-backed state offloading, and defense heuristics that discard low-value edge bait while prioritizing breaches that can actually collapse the shell.

## Fortress Pillars

### Edge-Dance Logic

`DefenseManager` filters hostiles that hover within three tiles of room exits so towers and defenders do not waste cycles on edge-kiting bait. Combat targeting then ranks only actionable threats by net damage and body-part threat profile.

### Rampart HP Ladder

`src/config.ts` defines a room-controller-level rampart ladder from early bunker viability through RCL 8 fortress saturation. `ConstructionManager` uses that ladder to determine which walls and ramparts still require reinforcement.

### Self-Recovery Watchdog

`ErrorMapper` wraps the main loop with source-map-aware stack translation and a consecutive failure counter. After three failed ticks, the watchdog calls `(Game.cpu as any).halt()` to force a VM reset rather than letting a broken runtime thrash indefinitely.

## Technical Specifications

### Rollup Deployment Pipeline

- `rollup.config.js` compiles `src/main.ts` into `dist/main.js` as CommonJS with source maps enabled for Screeps-compatible deployment.
- `@rollup/plugin-node-resolve`, `@rollup/plugin-commonjs`, `@rollup/plugin-replace`, and `@rollup/plugin-typescript` form the build spine.
- `jiti` loads `src/utils/Credentials.ts` at config time so `SCREEPS_TARGET` can switch between SS3-style targets without duplicating configuration.
- `rollup-plugin-screeps` only activates when `DEPLOY=true`, which keeps local build behavior separate from upload behavior.
- Node core modules are marked external, preventing accidental bundling of `fs`, `net`, or other non-Screeps runtime dependencies.

### TypeScript 5+ Integration

- The project runs with `strict: true`, `moduleResolution: "Bundler"`, `noUncheckedIndexedAccess: true`, and the official `@types/screeps` type surface.
- The runtime, tests, and build config all compile against a single `tsconfig.json` tuned for ES2020 output and Screeps-safe module resolution.
- The final debugging pass hardened strict-mode edges with nullish capacity guards, explicit non-null fallbacks for static config lookups, and targeted escape hatches where third-party type surfaces remain looser than runtime guarantees.

### RawMemory Segment Compression

- `SegmentManager` reserves Segment `0` for rolling stats snapshots and Segment `1` for serialized room cost matrices.
- Segment payloads are compressed with `lz-string` UTF-16 packing before being written to `RawMemory.segments`.
- `preTick()` activates and inflates the active segments, while `postTick()` flushes only dirty segments and throttles writes via `SEGMENT_FLUSH_INTERVAL`.
- Cost matrix data is pruned by age and rebuilt lazily, keeping main `Memory` compact while preserving deterministic movement data across ticks.

## Zero-to-Deploy

```bash
npm install
npm run typecheck
npm test
npm run build
SCREEPS_TARGET=main DEPLOY=true npm run deploy
```

Useful scripts:

- `npm run build` bundles `src/main.ts` into `dist/main.js`
- `npm run build:watch` rebuilds continuously while iterating in VS Code
- `npm run typecheck` runs the strict TypeScript compiler without emitting output
- `npm run lint` checks the runtime and tests with ESLint
- `npm test` runs unit and integration coverage with Jest

## SS3 Setup

The project resolves Screeps credentials in this order:

1. `~/.screeps.yaml`
2. `./screeps.json`

`SCREEPS_TARGET` selects the deployment target at build time. For example:

```bash
SCREEPS_TARGET=ptr npm run build
SCREEPS_TARGET=main DEPLOY=true npm run deploy
```

The committed `screeps.json` uses a placeholder token only. Real credentials should live in `~/.screeps.yaml` or be injected through environment variables.

## Operational Layout

- `src/main.ts`: six-phase runtime loop, bootstrap, segment lifecycle, watchdog reset
- `src/empire/Empire.ts`: owned-room discovery, colony refresh, post-run stats emission
- `src/colony/Colony.ts`: per-room orchestration of managers and creep behavior dispatch
- `src/memory/segments.ts`: compressed RawMemory segment offload for stats and cost matrices
- `src/pathing/PathingService.ts`: cached `CostMatrix` generation and `PathFinder` movement
- `src/managers/DefenseManager.ts`: edge-dance filtering, net-damage scoring, focus fire, safe mode
- `test/unit`: defense, spawn ordering, and memory regression coverage
- `test/integration`: six-phase loop smoke test

## AI Credits

This repository summary reflects a collaborative synthesis of multiple model perspectives, consolidated into the final implementation and documentation set.

- Gemini Pro: framed the asymmetric defense doctrine and fortress-first strategic posture.
- Claude 4.7: influenced the deployment ergonomics, SS3 workflow, and progression-oriented project structure.
- GPT 5.4: drove the TypeScript strictness fixes, repository integration work, and final implementation alignment.
- NVIDIA Nemotron 3: reinforced systems-level thinking around recovery behavior, prioritization, and defensive resilience.

## Debugging and Recovery

`src/utils/ErrorMapper.ts` remaps bundle stack traces through the embedded source map when available. The watchdog increments on failed ticks and resets only after a successful six-phase pass, which makes runtime failure visible, bounded, and recoverable.

For a fuller implementation map, see `docs/architecture.md`.
