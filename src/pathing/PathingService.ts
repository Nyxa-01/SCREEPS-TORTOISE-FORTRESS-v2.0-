import { PATH_CACHE_TTL } from '../config';
import { SegmentManager } from '../memory/segments';

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
                roomCallback: (roomName) => this.getCostMatrix(roomName),
            },
        );

        const nextStep = search.path[0];

        if (!nextStep) {
            return ERR_NO_PATH;
        }

        creep.memory.w = search.path.slice(0, 12).map((position) => `${position.roomName}:${position.x}:${position.y}`);
        return creep.move(creep.pos.getDirectionTo(nextStep));
    }

    public static getCostMatrix(roomName: string): CostMatrix | boolean {
        const cached = this.matrixCache.get(roomName);

        if (cached && Game.time - cached.tick <= PATH_CACHE_TTL) {
            return cached.matrix;
        }

        const serialized = SegmentManager.getCostMatrix(roomName);

        if (serialized) {
            const matrix = PathFinder.CostMatrix.deserialize(serialized);
            this.matrixCache.set(roomName, { tick: Game.time, matrix });
            return matrix;
        }

        const room = Game.rooms[roomName];

        if (!room) {
            return false;
        }

        const matrix = this.buildCostMatrix(room);
        this.matrixCache.set(roomName, { tick: Game.time, matrix });
        SegmentManager.setCostMatrix(roomName, matrix.serialize());

        return matrix;
    }

    private static buildCostMatrix(room: Room): CostMatrix {
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

        return matrix;
    }
}
