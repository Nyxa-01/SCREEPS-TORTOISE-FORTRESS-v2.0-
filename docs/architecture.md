# Tortoise Fortress Architecture

## Final Type-Safe Build Surface

The production build is driven by `rollup.config.js`, which compiles `src/main.ts` into `dist/main.js` as a Screeps-compatible CommonJS bundle with source maps enabled. The build uses `@rollup/plugin-node-resolve`, `@rollup/plugin-commonjs`, `@rollup/plugin-replace`, and `@rollup/plugin-typescript`, while `rollup-plugin-screeps` handles deployment only when `DEPLOY=true`.

The codebase now targets the official `@types/screeps` package through a strict TypeScript 5+ configuration. `tsconfig.json` runs with `strict`, `moduleResolution: "Bundler"`, and `noUncheckedIndexedAccess`, and the debugging pass hardened the runtime surface with explicit nullish fallbacks, non-null config assertions, and narrowly scoped type escapes for third-party type mismatches.

## Runtime Lifecycle

`src/main.ts` enforces a six-phase loop wrapped by `ErrorMapper.wrapLoop`:

1. `preTick`: bootstrap prototypes, activate segments, prune cost matrices, ensure `Memory` roots, prune dead creeps.
2. `build`: refresh the singleton `Empire` instance from current room ownership.
3. `init`: let each `Colony` refresh manager-local state before actions begin.
4. `run`: execute room orchestration, spawning, defense, logistics, and creep behaviors.
5. `postRun`: append stats, flush dirty segments, and generate a pixel when the bucket is full.
6. `watchdog`: reset the consecutive error counter only after a successful full pass.

If three consecutive loop failures occur, the watchdog calls `(Game.cpu as any).halt()` to force a VM reset instead of leaving the process in a degraded retry cycle.

## Ownership Hierarchy

The starter kit follows an `Empire -> Colony -> Manager` hierarchy.

- `Empire` owns global refresh, init, run, and post-run aggregation.
- `Colony` owns one room and composes `DefenseManager`, `SpawnManager`, `LogisticsManager`, `ConstructionManager`, and `UpgradeManager`.
- Creep behavior dispatch is explicit and role-based through the behavior classes under `src/behaviors`.

This separation keeps room-local decisions inside `Colony` while reserving cross-room state and long-lived snapshots for `Empire` and the memory layer.

## Memory and Segment Architecture

`Mem` maintains the primary `Memory` roots, colony records, and dead-creep pruning. Heavy data is kept out of the main `Memory` tree whenever possible.

- Segment `0`: rolling `StatsSnapshot` history.
- Segment `1`: serialized room `CostMatrix` caches.
- `lz-string` UTF-16 compression is used before writing segment payloads.
- Segment flushes are dirty-tracked and throttled by `SEGMENT_FLUSH_INTERVAL`.

This design reduces persistent heap pressure while keeping pathing and observability data available across ticks.

## Defense Doctrine in Code

`DefenseManager` is the tactical center of the fortress model.

- Edge-dance targets are filtered out when they hover within three tiles of exits.
- Tower focus fire is based on net damage, subtracting hostile healing from projected tower output.
- Threat ordering prefers healers, then ranged attackers, then melee attackers, then work parts.
- Safe mode only activates on confirmed player breaches that penetrate the perimeter and threaten protected assets.

`ConstructionManager` enforces the rampart HP ladder from `src/config.ts`, while defenders use rampart positioning and ranged attack logic to preserve defender advantage.

## Movement and Recovery

`PathingService` rebuilds and caches `CostMatrix` instances, serializes them into Segment `1`, and routes movement through `PathFinder.search` with explicit terrain weights. This keeps bunker movement deterministic and cheap to resume after resets.

`ErrorMapper` embeds the generated Rollup source map into the bundle output and remaps stack traces back to the original TypeScript sources when an exception escapes the loop.

## Validation Surface

The project includes unit coverage for defense calculations, spawn queue ordering, and memory behavior, plus an integration smoke test for the six-phase loop. The architecture is therefore documented against the current type-safe implementation rather than the earlier scaffold-only shape.
