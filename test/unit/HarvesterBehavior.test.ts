import { HarvesterBehavior } from '../../src/behaviors/HarvesterBehavior';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSource(id: string, x = 15, y = 15, energy = 1000, ticksToRegeneration = 0): Source {
    return {
        id,
        energy,
        ticksToRegeneration,
        pos: new RoomPosition(x, y, 'W0N0'),
    } as unknown as Source;
}

function makeCreep(options: {
    usedCapacity?: number;
    freeCapacity?: number;
    state?: 'load' | 'work';
    targetId?: string;
    x?: number;
    y?: number;
    harvest?: jest.Mock;
    transfer?: jest.Mock;
    drop?: jest.Mock;
    findInRange?: jest.Mock;
}): Creep {
    const x = options.x ?? 10;
    const y = options.y ?? 10;
    const used = options.usedCapacity ?? 0;
    const free = options.freeCapacity ?? 100;

    return {
        name: 'harvester-1',
        memory: {
            r: 'emergencyHarvester',
            rn: 'W0N0',
            s: options.state,
            t: options.targetId,
        },
        store: {
            getUsedCapacity: () => used,
            getFreeCapacity: () => free,
        },
        pos: {
            x,
            y,
            roomName: 'W0N0',
            getRangeTo: () => 5,
            isNearTo: () => true,
            findInRange: options.findInRange ?? jest.fn(() => []),
            findClosestByPath: () => null,
        },
        harvest: options.harvest ?? jest.fn(() => OK),
        transfer: options.transfer ?? jest.fn(() => OK),
        drop: options.drop ?? jest.fn(),
    } as unknown as Creep;
}

function makeColony(options: {
    haulerCount?: number;
    harvesterCreeps?: Creep[];
    sources?: Source[];
    fillTarget?: object | null;
    getObjectById?: (id: string) => Source | null;
}): any {
    return {
        room: {
            name: 'W0N0',
            find: jest.fn((type: number) => {
                if (type === FIND_SOURCES || type === FIND_SOURCES_ACTIVE) {
                    return options.sources ?? [];
                }
                return [];
            }),
        },
        getCreeps: jest.fn((role?: string) => {
            if (role === 'hauler') {
                return Array(options.haulerCount ?? 0).fill({});
            }
            if (role === 'emergencyHarvester') {
                return options.harvesterCreeps ?? [];
            }
            return [];
        }),
        logisticsManager: {
            getFillTarget: jest.fn(() => options.fillTarget ?? null),
        },
    };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('HarvesterBehavior — Static Miner mode (haulers present)', () => {
    beforeEach(() => {
        (Game as any).getObjectById = () => null;
    });

    it('calls harvest every tick regardless of carried energy', () => {
        const source = makeSource('src-1');
        (Game as any).getObjectById = () => source;

        const harvestFn = jest.fn(() => OK);
        const creep = makeCreep({ usedCapacity: 50, freeCapacity: 50, targetId: 'src-1', harvest: harvestFn });
        const colony = makeColony({ haulerCount: 1, sources: [source] });

        const behavior = new HarvesterBehavior();
        behavior.run(creep, colony);

        expect(harvestFn).toHaveBeenCalledWith(source);
    });

    it('transfers to adjacent hauler as parallel intent when carrying energy', () => {
        const source = makeSource('src-1');
        (Game as any).getObjectById = () => source;

        const transferFn = jest.fn(() => OK);
        const hauler = {
            memory: { r: 'hauler' },
            store: { getFreeCapacity: () => 50 },
        } as unknown as Creep;

        const findInRange = jest.fn(() => [hauler]);
        const creep = makeCreep({
            usedCapacity: 50,
            freeCapacity: 50,
            targetId: 'src-1',
            transfer: transferFn,
            findInRange,
        });
        const colony = makeColony({ haulerCount: 1, sources: [source] });

        const behavior = new HarvesterBehavior();
        behavior.run(creep, colony);

        expect(transferFn).toHaveBeenCalledWith(hauler, RESOURCE_ENERGY);
        expect(findInRange).toHaveBeenCalledWith(FIND_MY_CREEPS, 1, expect.any(Object));
    });

    it('drops energy when full and no adjacent hauler is available', () => {
        const source = makeSource('src-1');
        (Game as any).getObjectById = () => source;

        const dropFn = jest.fn();
        const findInRange = jest.fn(() => []);
        const creep = makeCreep({
            usedCapacity: 100,
            freeCapacity: 0,
            targetId: 'src-1',
            drop: dropFn,
            findInRange,
        });
        const colony = makeColony({ haulerCount: 1, sources: [source] });

        const behavior = new HarvesterBehavior();
        behavior.run(creep, colony);

        expect(dropFn).toHaveBeenCalledWith(RESOURCE_ENERGY);
    });

    it('does not drop when carrying energy but not yet full', () => {
        const source = makeSource('src-1');
        (Game as any).getObjectById = () => source;

        const dropFn = jest.fn();
        const findInRange = jest.fn(() => []);
        const creep = makeCreep({
            usedCapacity: 40,
            freeCapacity: 60,
            targetId: 'src-1',
            drop: dropFn,
            findInRange,
        });
        const colony = makeColony({ haulerCount: 1, sources: [source] });

        const behavior = new HarvesterBehavior();
        behavior.run(creep, colony);

        expect(dropFn).not.toHaveBeenCalled();
    });

    it('skips offload entirely when carrying zero energy', () => {
        const source = makeSource('src-1');
        (Game as any).getObjectById = () => source;

        const transferFn = jest.fn(() => OK);
        const dropFn = jest.fn();
        const findInRange = jest.fn(() => []);
        const creep = makeCreep({
            usedCapacity: 0,
            freeCapacity: 100,
            targetId: 'src-1',
            transfer: transferFn,
            drop: dropFn,
            findInRange,
        });
        const colony = makeColony({ haulerCount: 1, sources: [source] });

        const behavior = new HarvesterBehavior();
        behavior.run(creep, colony);

        expect(findInRange).not.toHaveBeenCalled();
        expect(transferFn).not.toHaveBeenCalled();
        expect(dropFn).not.toHaveBeenCalled();
    });
});

describe('HarvesterBehavior — Emergency Hauler mode (no haulers)', () => {
    beforeEach(() => {
        (Game as any).getObjectById = () => null;
    });

    it('harvests when empty (load state)', () => {
        const source = makeSource('src-1');
        (Game as any).getObjectById = () => source;

        const harvestFn = jest.fn(() => OK);
        const creep = makeCreep({
            usedCapacity: 0,
            freeCapacity: 100,
            state: 'load',
            targetId: 'src-1',
            harvest: harvestFn,
        });
        const colony = makeColony({ haulerCount: 0, sources: [source] });

        const behavior = new HarvesterBehavior();
        behavior.run(creep, colony);

        expect(harvestFn).toHaveBeenCalledWith(source);
    });

    it('delivers to fill target when full (work state)', () => {
        const fillTarget = {
            id: 'spawn-1',
            store: { getFreeCapacity: () => 100 },
            pos: new RoomPosition(11, 10, 'W0N0'),
        };
        const transferFn = jest.fn(() => OK);
        const creep = makeCreep({
            usedCapacity: 100,
            freeCapacity: 0,
            state: 'work',
            transfer: transferFn,
        });
        const colony = makeColony({ haulerCount: 0, fillTarget });

        const behavior = new HarvesterBehavior();
        behavior.run(creep, colony);

        expect(transferFn).toHaveBeenCalledWith(fillTarget, RESOURCE_ENERGY);
    });

    it('does not call harvest while in work state', () => {
        const fillTarget = {
            id: 'spawn-1',
            store: { getFreeCapacity: () => 100 },
            pos: new RoomPosition(11, 10, 'W0N0'),
        };
        const harvestFn = jest.fn(() => OK);
        const creep = makeCreep({
            usedCapacity: 100,
            freeCapacity: 0,
            state: 'work',
            harvest: harvestFn,
        });
        const colony = makeColony({ haulerCount: 0, fillTarget });

        const behavior = new HarvesterBehavior();
        behavior.run(creep, colony);

        expect(harvestFn).not.toHaveBeenCalled();
    });
});
