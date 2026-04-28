import { RAMPART_TARGET_HITS } from '../config';
import type { Colony } from '../colony/Colony';

export class ConstructionManager {
    public constructor(private readonly colony: Colony) { }

    public init(): void { }

    public run(): void {
        const room = this.colony.room;
        const controllerLevel = room?.controller?.level ?? 0;

        if (!room || controllerLevel < 2 || room.find(FIND_MY_CONSTRUCTION_SITES).length >= 5) {
            return;
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
