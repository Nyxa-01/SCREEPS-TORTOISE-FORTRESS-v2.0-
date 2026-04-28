# Tortoise Fortress Methodology Archive

## The Nyx Narrative (Executive Summary)

Screeps Tortoise Fortress v2.0 began as a programmable interface to a game world and ended as a disciplined autonomous system: typed, testable, adversarially reviewed, continuously validated, and deployable without human improvisation. The core achievement was not merely teaching creeps to move, harvest, defend, and upgrade. It was converting an open-ended MMO scripting problem into a hardened engineering practice where design doctrine, runtime resilience, build determinism, and deployment hygiene were treated as one system.

The project’s final form reflects a deliberate transition from experimentation to architecture. The runtime was organized into a six-phase loop, memory pressure was pushed into RawMemory segments, combat decisions were filtered through asymmetric defense principles, and the delivery path was automated so the live MMO shard received only compiled JavaScript artifacts. What emerged was not a pile of scripts but a fortress-grade software product: a bot that is designed to survive both hostile players and hostile edge cases.

The replicable lesson is simple: treat even a game automation codebase as production software. Define ownership boundaries early, force quality gates into the toolchain, challenge assumptions with adversarial analysis, and design deployment so the runtime receives exactly what it needs and nothing more.

## The Asymmetric Quality Engineering Doctrine

The engineering doctrine behind this project can be summarized as asymmetric quality: invest engineering effort at the points where a small amount of discipline prevents disproportionately large failures later. Instead of optimizing for speed of initial coding, the project optimized for survivability under iteration.

### Strict-Mode TypeScript As Policy

TypeScript was not used as annotation garnish. It was used as a constraint system. The project runs in strict mode with `moduleResolution: "Bundler"`, `noUncheckedIndexedAccess: true`, and the official `@types/screeps` package, which means edge cases must be made explicit rather than hand-waved away.

That decision paid off repeatedly. Strict mode exposed unsafe optional-chaining comparisons, non-null fallback ambiguities, third-party type mismatches, and configuration assumptions that would otherwise have become runtime surprises on the live shard. The methodology takeaway is that strict typing is not about perfectionism. It is about moving failure discovery from production to edit time.

### Rollup As Runtime Contract

The Screeps runtime does not consume TypeScript modules directly. That forced a disciplined bundling story. `rollup.config.js` became the contract between the source tree and the live V8 environment.

- `src/main.ts` is compiled into a single CommonJS entrypoint.
- Node built-ins are externalized so unsupported APIs do not leak into the bundle.
- build-time constants such as `BUILD_TARGET` and `NODE_ENV` are injected deterministically.
- source maps are embedded back into the generated bundle so runtime exceptions can be traced to their TypeScript origins.

This matters methodologically because bundling stops being a packaging concern and becomes part of correctness. The deployment artifact is intentionally narrower than the repository. That separation lets the codebase stay rich while the runtime stays minimal.

### Husky As The First Human-Proximity Gate

The local pre-commit hook is intentionally blunt:

```sh
npm run lint
npm test
```

That bluntness is a feature. It stops sloppy commits before they acquire momentum. The hook blocked lint regressions, caught test-runner misconfigurations, and forced even documentation-adjacent commits to respect the living codebase beneath them.

The methodological principle here is proximity. The cheapest place to reject broken work is the developer workstation. Every failure caught before commit is one less branch, one less review cycle, and one less production surprise.

### Behavioral Isolation Over Manager Monoliths

The codebase also enforced an architectural split between managers and behaviors. Managers decide what should happen. Behaviors decide how a creep performs that work. That distinction matters because complexity grows non-linearly in autonomous systems.

By isolating execution logic into `src/behaviors` and keeping orchestration inside managers and colonies, the system remains debuggable under pressure. This is another asymmetric-quality trade: invest in boundaries early so later features do not collapse into a single impossible-to-test control file.

## Red Team vs. White Hat Validation

The project’s hardening phase explicitly treated runtime logic as an attack surface. Rather than assuming the bot was correct because the happy path worked, the system was stress-tested against hostile scenarios generated from multiple AI baselines acting as adversarial reviewers. The goal was deterministic vulnerability analysis: find logic that could fail silently, stall the runtime, or create a misleadingly stable but strategically dead state.

### Edge-Dance Starvation

The first red-team finding targeted the defense doctrine itself. `DefenseManager` deliberately filtered hostiles within three tiles of room exits to avoid draining towers on edge-kiting bait. That logic was strategically correct in principle but brittle in practice.

The exploit was that edge-dancers could keep the room in a constant state of low-grade hostility without creating actionable ranked targets. The room would not meaningfully escalate, defender production could freeze, and upgrades could stall under a false sense of contained pressure.

The white-hat response was semantic rather than cosmetic. The threat model was updated so edge-dancer presence no longer allowed the room to remain effectively passive, and later live telemetry hardening ensured that even zero-tower rooms could still rank hostile pressure for defender spawning. The methodology lesson is that anti-exploit logic must itself be adversarially reviewed. Every defensive filter creates a blindspot. Every blindspot must be interrogated as if an opponent will live inside it.

### Silent Segment Collapse

The second finding targeted memory architecture. Segment data was compressed with `lz-string`, then deserialized back into runtime state. The original failure mode tolerated malformed payloads by silently returning fallback objects. That seemed safe until viewed through a systems lens: silent fallback does not remove the bug, it removes the evidence.

The red-team concern was CPU inflation through invisible cache invalidation. If segment payloads became malformed or throttled, cost matrices would quietly disappear, forcing the pathing layer to rebuild expensive state without a clear signal that corruption had occurred.

The white-hat patch changed the failure posture from permissive to explicit. Corrupted segments now fail loudly instead of degrading quietly. In methodology terms, recover gracefully only when the degraded state is still trustworthy. If a subsystem can no longer guarantee correctness, surface the failure and let the watchdog or operator intervene.

### Zombie Ticks

The third finding targeted exception topology rather than pure logic. `Colony` protected per-creep behavior execution with local `try/catch` blocks so one failing creep would not immediately crash the room. That local resilience carried a hidden risk: if enough creep-level failures were swallowed inside the colony, the top-level watchdog would never see them.

This created the possibility of a zombie tick: a runtime that appears alive, continues looping, and never resets, but whose creeps are functionally inert because their logic fails every tick before any useful intent is issued.

The white-hat remediation introduced a local error threshold. A few isolated creep failures remain tolerable noise. A mass failure becomes a fatal condition that is deliberately rethrown so `ErrorMapper` and the watchdog can do their job. The methodology pattern is critical: resilience boundaries must aggregate failure, not bury it.

### Validation Model

This phase established an enduring practice for future work:

- assume every heuristic can be gamed
- assume every silent fallback can become a hidden cost center
- assume every localized catch can mask systemic failure
- patch semantics, not symptoms

That is the difference between debugging as repair and validation as engineering.

## DevSecOps & CI/CD Pipeline

The deployment architecture evolved because the project treated credentials, artifacts, and repository history as separate trust domains.

### Credential Isolation Through SS3

Screeps credentials were isolated outside the repository through SS3-style configuration in `~/.screeps.yaml`, with local `screeps.json` retained only as a fallback surface. This separation served two purposes.

First, it prevented live deployment credentials from entering Git history. Second, it allowed the build and deploy pipeline to resolve targets without requiring secret material to exist inside the source tree.

This design also surfaced an important operational lesson: configuration precedence matters. A shadowed home-level YAML file can override a corrected local file and create routing failures that look like code bugs. The eventual resolution of the `/api/api/...` misrouting issue reinforced a reusable rule: deployment configuration must be explicit, centralized, and auditable.

### Why Local Deployment Was Deprioritized

Direct local deployment was useful during bootstrap and diagnostics, but it is ultimately the wrong abstraction for a professional pipeline.

- it relies on workstation state
- it depends on local credentials being correct
- it is vulnerable to environment drift
- it makes deployment success partially a function of the operator’s shell, not the repository itself

For a live MMO deployment target, that is too much ambient risk. The project therefore shifted from local deployment commands toward GitHub Actions as the canonical release path.

### CI As Non-Bypassable Validation

The CI workflow exists because Husky is a local guardrail, not an institutional one. GitHub Actions runs lint, strict typechecking, and Jest validation on pushes and pull requests to `main`. That means the repository has a server-side quality gate even when a change bypasses local tooling.

The workflow intentionally installs dependencies with `npm ci --legacy-peer-deps` to respect the current ecosystem constraints while still making validation reproducible. This is not blind acceptance of dependency debt. It is controlled acknowledgement of it, paired with Dependabot-based gradual modernization.

### Orphan Branch Deployment

The deployment workflow solves a Screeps-specific problem elegantly: GitHub Sync expects JavaScript artifacts, while the primary repository intentionally stores TypeScript source.

The answer was orphan branch deployment.

The `deploy.yml` workflow performs the following sequence:

1. check out `main`
2. install dependencies with `--legacy-peer-deps`
3. build the Rollup artifact into `dist/`
4. create an orphan branch named `deploy`
5. clear tracked files from the working tree with native Git commands
6. move `main.js` and `main.js.map` to the repository root
7. commit only those generated artifacts
8. force-push `deploy` to origin

This pattern is methodologically strong for three reasons.

- The source repository remains pristine and readable.
- The live runtime receives only the exact files it can execute.
- No third-party publishing action is trusted with repository mutation.

That last point matters. The workflow uses native Git commands instead of extra publishing actions, which minimizes the credential and supply-chain surface area inside the automation path.

### Security And Governance Layering

The DevSecOps posture is not a single tool. It is a stack.

- Husky blocks broken local commits.
- CI rejects invalid changes server-side.
- Dependabot introduces steady dependency hygiene.
- SS3 keeps secrets out of the repository.
- the orphan deploy branch isolates executable artifacts from authoring assets.

This stack is replicable well beyond Screeps. The core idea is to let each layer solve one trust problem cleanly instead of expecting a single tool to guarantee everything.

## Live Telemetry & Hotfixing

Once the fortress was live on the MMO shard, the engineering posture changed again. The goal was no longer just correctness under laboratory conditions. The goal was responsiveness to observed behavior under real room geometry, real spawn pressure, and real hostile presence.

### The Pacifist Fortress Bug

The first live-telemetry issue appeared in early-game defense. The bot used net tower damage as a filter to decide whether a hostile was worth ranking. In rooms with zero towers, net damage is naturally zero, which meant the defense layer could ignore hostile pressure entirely. In effect, the fortress became pacifist precisely when it was weakest.

The hotfix changed that semantic filter so zero-tower rooms still treat hostile presence as actionable. The engineering lesson is direct: heuristics that depend on late-game infrastructure must degrade intelligently in early-game conditions.

### The Traffic Jam Bug

The second live issue came from harvester behavior. Harvesters selected sources using nearest-path logic, which made multiple workers collapse onto the same source lane. In tight corridors this created secondary failures: haulers were blocked, pathing clogged, and economic throughput dropped despite there being enough total energy in the room.

The hotfix introduced stable source assignment using creep identity and persistent memory. Instead of repeatedly re-optimizing to the same closest path, each harvester now claims a predictable source target. This transformed source usage from opportunistic crowding into distributed throughput.

### Rapid CI/CD Iteration As Operating Model

The important methodology point is not merely that the bugs were fixed. It is how they were fixed.

- observe live MMO behavior
- define the failure as a named systems bug
- patch the smallest semantic surface that controls the behavior
- validate through strict typechecking, lint, and tests
- commit and push through the same guarded branch workflow
- let CI/CD carry the change into deployment automation

That is professional hotfixing. Not panic. Not manual shell surgery. Not “just this once” exceptions. The pipeline remained intact while the response time stayed fast.

## Replication Principles

For future projects, the Tortoise Fortress methodology can be reproduced by following a few non-negotiable principles.

1. Establish architectural ownership boundaries before the codebase gets large.
2. Use strict typing to force assumptions into the open.
3. Treat bundling and artifact generation as part of correctness, not packaging trivia.
4. Keep secrets outside the repository and document configuration precedence clearly.
5. Layer quality gates from workstation to CI to deployment automation.
6. Perform adversarial reviews that explicitly search for logic blindspots, silent degradation, and masked failures.
7. Hotfix through the existing pipeline rather than bypassing it.
8. Preserve the source repository as an authoring environment and the deploy branch as an execution environment.

The enduring outcome of this project is therefore larger than a Screeps bot. It is a reusable engineering methodology for building autonomous systems that must remain understandable, resilient, and deployable under continuous change.