class MockRoomPosition {
    public constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly roomName: string,
    ) { }

    public getRangeTo(target: { pos?: MockRoomPosition; x?: number; y?: number }): number {
        const position = 'pos' in target && target.pos ? target.pos : (target as MockRoomPosition);
        return Math.max(Math.abs(this.x - position.x), Math.abs(this.y - position.y));
    }

    public inRangeTo(target: { pos?: MockRoomPosition }, range: number): boolean {
        return this.getRangeTo(target) <= range;
    }

    public isNearTo(target: { pos?: MockRoomPosition }): boolean {
        return this.getRangeTo(target) <= 1;
    }

    public findClosestByPath<T>(targets: T[] | number): T | null {
        if (!Array.isArray(targets)) {
            return null;
        }

        return targets[0] ?? null;
    }

    public findClosestByRange<T>(targets: T[] | number): T | null {
        if (!Array.isArray(targets)) {
            return null;
        }

        return targets[0] ?? null;
    }

    public getDirectionTo(): DirectionConstant {
        return 1 as DirectionConstant;
    }

    public lookFor<T>(type: string): T[] {
        void type;
        return [];
    }
}

class MockCostMatrix {
    private readonly data = new Map<string, number>();

    public set(x: number, y: number, value: number): void {
        this.data.set(`${x}:${y}`, value);
    }

    public serialize(): number[] {
        return [...this.data.values()];
    }

    public static deserialize(data: number[]): MockCostMatrix {
        const matrix = new MockCostMatrix();
        data.forEach((value, index) => {
            matrix.data.set(`0:${index}`, value);
        });
        return matrix;
    }
}

const globalScope = globalThis as Record<string, unknown>;

Object.assign(globalScope, {
    BUILD_TARGET: 'test',
    NODE_ENV: 'test',
    __SCREEPS_SOURCE_MAP__: '__SCREEPS_SOURCE_MAP__',
    OK: 0,
    ERR_FULL: -8,
    ERR_NOT_FOUND: -5,
    ERR_NOT_ENOUGH_RESOURCES: -6,
    ERR_NO_PATH: -2,
    WORK: 'work',
    CARRY: 'carry',
    MOVE: 'move',
    ATTACK: 'attack',
    RANGED_ATTACK: 'ranged_attack',
    HEAL: 'heal',
    TOUGH: 'tough',
    RESOURCE_ENERGY: 'energy',
    STRUCTURE_EXTENSION: 'extension',
    STRUCTURE_SPAWN: 'spawn',
    STRUCTURE_TOWER: 'tower',
    STRUCTURE_CONTAINER: 'container',
    STRUCTURE_STORAGE: 'storage',
    STRUCTURE_TERMINAL: 'terminal',
    STRUCTURE_LINK: 'link',
    STRUCTURE_RAMPART: 'rampart',
    STRUCTURE_WALL: 'constructedWall',
    STRUCTURE_CONTROLLER: 'controller',
    STRUCTURE_ROAD: 'road',
    STRUCTURE_LAB: 'lab',
    FIND_MY_STRUCTURES: 1,
    FIND_STRUCTURES: 2,
    FIND_SOURCES_ACTIVE: 3,
    FIND_SOURCES: 4,
    FIND_HOSTILE_CREEPS: 5,
    FIND_DROPPED_RESOURCES: 6,
    FIND_TOMBSTONES: 7,
    FIND_RUINS: 8,
    FIND_MY_SPAWNS: 9,
    FIND_MY_CONSTRUCTION_SITES: 10,
    FIND_MY_CREEPS: 11,
    LOOK_STRUCTURES: 'structure',
    LOOK_CONSTRUCTION_SITES: 'constructionSite',
    TERRAIN_MASK_WALL: 1,
    TOWER_OPTIMAL_RANGE: 5,
    TOWER_FALLOFF_RANGE: 20,
    TOWER_FALLOFF: 0.75,
    TOWER_POWER_ATTACK: 600,
    HEAL_POWER: 12,
    RANGED_HEAL_POWER: 4,
    LAB_BOOST_ENERGY: 20,
    LAB_BOOST_MINERAL: 30,
    BOOSTS: {
        heal: {},
    },
    BODYPART_COST: {
        move: 50,
        work: 100,
        attack: 80,
        carry: 50,
        heal: 250,
        ranged_attack: 150,
        tough: 10,
    },
    RoomPosition: MockRoomPosition,
    PathFinder: {
        search: jest.fn(() => ({ path: [] })),
        CostMatrix: MockCostMatrix,
    },
});

beforeEach(() => {
    const cpu = {
        bucket: 5_000,
        getUsed: jest.fn(() => 1.25),
        generatePixel: jest.fn(),
        halt: jest.fn(),
    };

    Object.assign(globalScope, {
        Game: {
            time: 1,
            creeps: {},
            rooms: {},
            cpu,
        },
        Memory: {
            creeps: {},
            rooms: {},
            colonies: {},
            stats: {},
        },
        RawMemory: {
            segments: {},
            setActiveSegments: jest.fn(),
        },
    });
});
