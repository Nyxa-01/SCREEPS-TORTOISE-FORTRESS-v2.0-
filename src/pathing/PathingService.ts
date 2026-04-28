import { PATH_CACHE_TTL } from '../config';

type MoveTarget = RoomPosition | { pos: RoomPosition };

interface MatrixCacheEntry {
    tick: number;
    matrix: CostMatrix;
}

function resolveTarget(target: MoveTarget): RoomPosition {
    return 'pos' in target ? target.pos : target;
}

export class PathingService {
    private static readonly matrixCache = new Map<string, MatrixCacheEntry>();

    public static moveTo(creep: Creep, target: MoveTarget, range = 1): ScreepsReturnCode {
        const targetPos = resolveTarget(target);

        if (creep.pos.inRangeTo(targetPos, range)) {
            return OK;
        }

        const isCombatant = creep.memory.r === 'defender';

        const search = PathFinder.search(
            creep.pos,
            {
                pos: targetPos,
                range,
            },
            {
                plainCost: 2,
                swampCost: 10,
                maxOps: 8_000,
                roomCallback: (roomName) => this.getCostMatrix(roomName, isCombatant),
            },
        );

        const nextStep = search.path[0];

        if (!nextStep) {
            return ERR_NO_PATH;
        }

        creep.memory.w = search.path.slice(0, 12).map((position) => `${position.roomName}:${position.x}:${position.y}`);
        const direction = creep.pos.getDirectionTo(nextStep);

        // Traffic Evasion: If an allied creep is on the next step, command it to swap places
        const blockingCreep = nextStep.lookFor(LOOK_CREEPS)[0];
        if (blockingCreep && blockingCreep.my) {
            blockingCreep.move(nextStep.getDirectionTo(creep.pos));
        }

        return creep.move(direction);
    }

    public static getCostMatrix(roomName: string, ignoreThreats = false): CostMatrix | boolean {
        const cacheKey = `${roomName}_${ignoreThreats ? 'combat' : 'civilian'}`;
        const cached = this.matrixCache.get(cacheKey);

        if (cached && Game.time - cached.tick <= PATH_CACHE_TTL) {
            return cached.matrix;
        }

        const room = Game.rooms[roomName];

        if (!room) {
            return false;
        }

        const matrix = this.buildCostMatrix(room, ignoreThreats);
        this.matrixCache.set(cacheKey, { tick: Game.time, matrix });

        return matrix;
    }

    private static buildCostMatrix(room: Room, ignoreThreats: boolean): CostMatrix {
        const matrix = new PathFinder.CostMatrix();

        for (const structure of room.find(FIND_STRUCTURES)) {
            if (structure.structureType === STRUCTURE_ROAD) {
                matrix.set(structure.pos.x, structure.pos.y, 1);
                continue;
            }

            if (structure.structureType === STRUCTURE_CONTAINER) {
                continue;
            }

            if (structure.structureType === STRUCTURE_RAMPART && structure.my) {
                continue;
            }

            if (structure.structureType !== STRUCTURE_CONTROLLER) {
                matrix.set(structure.pos.x, structure.pos.y, 255);
            }
        }

        for (const site of room.find(FIND_CONSTRUCTION_SITES)) {
            if (
                site.structureType !== STRUCTURE_CONTAINER &&
                site.structureType !== STRUCTURE_ROAD &&
                site.structureType !== STRUCTURE_RAMPART
            ) {
                matrix.set(site.pos.x, site.pos.y, 255);
            }
        }

        if (!ignoreThreats) {
            const hostiles = room.find(FIND_HOSTILE_CREEPS);
            for (const hostile of hostiles) {
                const minX = Math.max(0, hostile.pos.x - 3);
                const maxX = Math.min(49, hostile.pos.x + 3);
                const minY = Math.max(0, hostile.pos.y - 3);
                const maxY = Math.min(49, hostile.pos.y + 3);

                for (let x = minX; x <= maxX; x++) {
                    for (let y = minY; y <= maxY; y++) {
                        matrix.set(x, y, 255);
                    }
                }
            }
        }

        return matrix;
    }
}
