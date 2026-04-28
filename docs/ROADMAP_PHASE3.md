# Phase 3 Roadmap: RCL 2 Builder Expansion

## Objective

The next deployment cycle should focus on removing the first structural stall point in the colony lifecycle: the transition into Room Controller Level 2. The current fortress can harvest, haul, upgrade, defend, and recover, but it lacks a dedicated `Builder` role. Once construction sites appear, especially after RCL 2 unlocks new structures, the colony has no specialized worker to convert raw energy into infrastructure. That gap will delay economic scaling, block extension rollout, and eventually choke spawn throughput.

Phase 3 therefore centers on one immediate goal: make the colony construction-capable without destabilizing the existing defense, logistics, and deployment pipeline.

## The RCL 2 Bottleneck (Priority Alpha)

### Problem Statement

The codebase currently has no `Builder` role in the colony role model, no builder behavior implementation, and no spawn-path integration for construction work. As soon as construction sites are present, the colony must either misuse another role opportunistically or stall entirely. At RCL 2, that becomes a hard bottleneck because extensions and follow-on infrastructure are the gateway to energy scaling.

### Required Implementation Surfaces

#### Create `src/behaviors/BuilderBehavior.ts`

The new builder behavior should follow the same role-execution pattern used by the existing harvester, hauler, upgrader, and defender classes.

- Implement a `load` versus `work` state transition based on carried energy.
- In `load`, acquire energy through the existing logistics layer instead of introducing a parallel resource policy.
- In `work`, prioritize active construction sites first.
- If no construction sites exist, define a safe fallback policy. The most sensible default is controller upgrading or fortification repair, but this should be explicit rather than implicit.

The main architectural requirement is consistency: the builder must remain a behavior-class implementation, not a special-case branch stuffed into a manager.

#### Update `ColonyRole` and related role definitions in `src/config.ts`

The role model must be extended so the runtime can reason about builders as a first-class colony function.

- Add `builder` to the `ColonyRole` union.
- Extend `ROLE_PRIORITY` to include builder placement in the spawn ordering.
- Add a `ROLE_BODIES.builder` definition appropriate for early and mid-game construction work.
- Add a `ROLE_MINIMUMS.builder` target so the spawn system can maintain at least one construction worker when the room needs it.

The important design choice is where `builder` belongs in priority order. It should not outrank emergency harvesting or critical defense, but it must be high enough that construction sites are not starved behind purely opportunistic upgrading.

#### Integrate builder requests into `src/managers/SpawnManager.ts`

The spawn queue needs an explicit builder rule rather than relying on role reuse.

- Detect whether the room has relevant construction work queued.
- Insert builder requests when construction sites exist and current builder count is below the intended minimum.
- Avoid flooding the queue with builders when the room is under active defense pressure or lacks energy stability.

This should preserve the fortress doctrine: construction is important, but not at the expense of economic recovery or room survival.

### Acceptance Criteria

- A room with construction sites spawns at least one builder automatically.
- Builders acquire energy through existing logistics conventions rather than a custom harvesting path.
- Builders spend work cycles on construction before any fallback task.
- The colony no longer stalls at RCL 2 once extensions or roads are placed.

## Extensions & Energy Scaling

### Goal

Once RCL 2 is reached, the colony should begin translating that controller upgrade into actual energy-capacity growth. The immediate mechanism for that is automatic extension placement.

### ConstructionManager Expansion

`src/managers/ConstructionManager.ts` should be extended to place extensions automatically around the primary spawn using a compact grid or checkerboard-style pattern.

Key requirements:

- Detect when the room controller reaches RCL 2 or higher.
- Determine how many extensions are currently allowed versus already built or queued.
- Generate extension placement candidates near the spawn in a pattern that preserves walkability.
- Prefer a checkerboard or alternating-grid approach so paths remain navigable and future roads can be layered in cleanly.
- Avoid blocking spawn exits, controller access, or key bunker lanes.

### Design Notes

- The placement algorithm should be deterministic so rooms do not drift into inconsistent layouts across resets.
- It should account for terrain and existing structures rather than assuming an empty square around the spawn.
- It should stop once the allowed extension count for the current RCL has been satisfied.

### Acceptance Criteria

- RCL 2 triggers automatic extension planning around the spawn.
- Extension sites are laid out in a walkable pattern rather than random adjacency spam.
- ConstructionManager does not repeatedly issue duplicate or invalid construction sites.
- The new builder role can complete those sites without manual intervention.

## Advanced Logistics (Tombstone Baiting)

### Future Red Team Consideration

The current logistics logic treats tombstones and other opportunistic energy sources as immediately attractive if they contain energy. That is efficient in safe rooms, but it opens a future exploit surface: hostile players can bait haulers toward exposed resources or tombstones sitting inside kill zones.

### Required Follow-Up in `src/managers/LogisticsManager.ts`

Before pathing to dropped resources, tombstones, or ruins, logistics selection should include a lightweight threat-assessment step.

Potential guardrails to evaluate:

- Reject targets inside recent hostile threat envelopes.
- Reject pickup targets near room edges during active hostile presence.
- Prefer storage, containers, or safe internal sources when the room is not in a clean `GREEN` state.
- Avoid sending haulers through contested corridors simply because a tombstone has a high energy value.

This does not need to become a full tactical planner in Phase 3, but the roadmap should preserve the principle now: logistics must not outrank survivability.

### Acceptance Criteria

- Haulers no longer treat all tombstones as equally safe.
- Resource pickup logic can distinguish between profitable salvage and obvious sniper bait.
- Threat-aware logistics remains lightweight enough to preserve the CPU budget.

## Recommended Execution Order

1. Add `builder` to `src/config.ts` and wire it into `ColonyRole`, priorities, bodies, and minima.
2. Implement `src/behaviors/BuilderBehavior.ts` using the existing role behavior conventions.
3. Integrate builder spawning conditions into `src/managers/SpawnManager.ts`.
4. Extend `src/colony/Colony.ts` to register and dispatch the builder behavior.
5. Expand `src/managers/ConstructionManager.ts` to place extensions automatically at RCL 2.
6. Add targeted unit or integration coverage for builder spawning and extension placement.
7. Document the tombstone-bait threat model before Phase 4 logistics hardening begins.

## Phase 3 Definition of Done

Phase 3 should be considered complete only when the colony can reach RCL 2, place extension sites automatically, spawn builders to complete them, and continue scaling without manual intervention or role abuse. The fortress is not truly self-sustaining until construction becomes a native part of the colony lifecycle.