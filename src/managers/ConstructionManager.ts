import { RAMPART_TARGET_HITS } from '../config';
import type { Colony } from '../colony/Colony';

export class ConstructionManager {
    public constructor(private readonly colony: Colony) { }

    public init(): void { }

    public run(): void {
        const room = this.colony.room;
        const controllerLevel = room?.controller?.level ?? 0;

        if (!room || controllerLevel < 2) {
            return;
        }

        if (room.find(FIND_MY_CONSTRUCTION_SITES).length < 5) {
            this.expandBase(STRUCTURE_EXTENSION, CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][controllerLevel] ?? 0);

            if (controllerLevel >= 3) {
                this.expandBase(STRUCTURE_TOWER, CONTROLLER_STRUCTURES[STRUCTURE_TOWER][controllerLevel] ?? 0);
            }
        }

        const bunkerTargets = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) =>
                structure.structureType === STRUCTURE_SPAWN ||
                structure.structureType === STRUCTURE_STORAGE ||
                structure.structureType === STRUCTURE_TERMINAL ||
                structure.structureType === STRUCTURE_TOWER,
        });

        for (const structure of bunkerTargets) {
            const hasRampart = structure.pos
                .lookFor(LOOK_STRUCTURES)
                .some((candidate) => candidate.structureType === STRUCTURE_RAMPART);

            if (!hasRampart) {
                structure.pos.createConstructionSite(STRUCTURE_RAMPART);
                return;
            }
        }
    }

    private expandBase(type: BuildableStructureConstant, max: number): void {
        const room = this.colony.room;
        const spawn = this.colony.getPrimarySpawn();

        if (!room || !spawn) {
            return;
        }

        const current =
            room.find(FIND_MY_STRUCTURES, { filter: (structure) => structure.structureType === type }).length +
            room.find(FIND_MY_CONSTRUCTION_SITES, { filter: (site) => site.structureType === type }).length;

        if (current >= max) {
            return;
        }

        const terrain = room.getTerrain();
        let radius = 2;
        let sitesPlaced = 0;

        while (current + sitesPlaced < max && radius < 15) {
            for (let dx = -radius; dx <= radius; dx += 1) {
                for (let dy = -radius; dy <= radius; dy += 1) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
                        continue;
                    }

                    if ((spawn.pos.x + dx + spawn.pos.y + dy) % 2 !== 0) {
                        continue;
                    }

                    const x = spawn.pos.x + dx;
                    const y = spawn.pos.y + dy;

                    if (x < 0 || x > 49 || y < 0 || y > 49 || terrain.get(x, y) === TERRAIN_MASK_WALL) {
                        continue;
                    }

                    const pos = new RoomPosition(x, y, room.name);
                    const hasStructure = pos.lookFor(LOOK_STRUCTURES).length > 0;
                    const hasSite = pos.lookFor(LOOK_CONSTRUCTION_SITES).length > 0;

                    if (!hasStructure && !hasSite) {
                        if (pos.createConstructionSite(type) === OK) {
                            sitesPlaced += 1;

                            if (current + sitesPlaced >= max) {
                                return;
                            }
                        }
                    }
                }
            }

            radius += 1;
        }
    }

    public getRepairTarget(): StructureRampart | StructureWall | undefined {
        const room = this.colony.room;
        const controllerLevel = room?.controller?.level ?? 0;

        if (!room || controllerLevel < 2) {
            return undefined;
        }

        const targetHits = RAMPART_TARGET_HITS[controllerLevel] ?? RAMPART_TARGET_HITS[8]!;
        const fortifications = room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                (structure.structureType === STRUCTURE_RAMPART || structure.structureType === STRUCTURE_WALL) &&
                structure.hits < targetHits,
        }) as Array<StructureRampart | StructureWall>;

        fortifications.sort((left, right) => left.hits - right.hits);
        return fortifications[0];
    }
}
