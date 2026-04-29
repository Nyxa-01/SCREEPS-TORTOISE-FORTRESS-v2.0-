import { HaulerBehavior } from '../../src/behaviors/HaulerBehavior';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeCreep(options: {
    state: 'load' | 'work';
    usedCapacity?: number;
    freeCapacity?: number;
    x?: number;
    y?: number;
    transfer?: jest.Mock;
    withdraw?: jest.Mock;
    pickup?: jest.Mock;
    findClosestByPath?: jest.Mock;
}): Creep {
    const x = options.x ?? 10;
    const y = options.y ?? 10;
    const used = options.usedCapacity ?? (options.state === 'work' ? 100 : 0);
    const free = options.freeCapacity ?? (options.state === 'work' ? 0 : 100);

    return {
        name: 'hauler-1',
        memory: {
            r: 'hauler',
            rn: 'W0N0',
            s: options.state,
        },
        store: {
            getUsedCapacity: () => used,
            getFreeCapacity: () => free,
        },
        pos: {
            x,
            y,
            roomName: 'W0N0',
            getRangeTo: jest.fn(() => 10),
            isNearTo: () => true,
            inRangeTo: () => false,
            findClosestByPath: options.findClosestByPath ?? jest.fn(() => null),
        },
        transfer: options.transfer ?? jest.fn(() => OK),
        withdraw: options.withdraw ?? jest.fn(() => OK),
        pickup: options.pickup ?? jest.fn(() => OK),
    } as unknown as Creep;
}

function makeColony(options: {
    fillTarget?: object | null;
    energySource?: object | null;
    spawnPos?: { x: number; y: number };
}): any {
    const spawnX = options.spawnPos?.x ?? 25;
    const spawnY = options.spawnPos?.y ?? 25;

    return {
        room: {
            name: 'W0N0',
            find: jest.fn((type: number) => {
                if (type === FIND_MY_SPAWNS) {
                    return [{ pos: new RoomPosition(spawnX, spawnY, 'W0N0') }];
                }
                return [];
            }),
        },
        logisticsManager: {
            getFillTarget: jest.fn(() => options.fillTarget ?? null),
            getEnergySource: jest.fn(() => options.energySource ?? null),
        },
    };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('HaulerBehavior — deliver path (work state)', () => {
    it('transfers energy to fill target when in range', () => {
        const transferFn = jest.fn(() => OK);
        const fillTarget = {
            id: 'spawn-1',
            store: { getFreeCapacity: () => 200, getUsedCapacity: () => 0 },
            pos: new RoomPosition(11, 10, 'W0N0'),
        };
        const creep = makeCreep({ state: 'work', transfer: transferFn });
        const colony = makeColony({ fillTarget });

        new HaulerBehavior().run(creep, colony);

        expect(transferFn).toHaveBeenCalledWith(fillTarget, RESOURCE_ENERGY);
    });

    it('parks near the spawn when full but no fill target is available', () => {
        const getRangeTo = jest.fn(() => 10);
        const creep = makeCreep({ state: 'work' });
        (creep.pos as any).getRangeTo = getRangeTo;
        const colony = makeColony({ fillTarget: null });

        // park() calls PathingService.moveTo — mock it so it doesn't throw
        const mockMoveTo = jest.fn();
        jest.mock('../../src/pathing/PathingService', () => ({
            PathingService: { moveTo: mockMoveTo },
        }));

        new HaulerBehavior().run(creep, colony);

        // park() should read the spawn from the room
        expect(colony.room.find).toHaveBeenCalledWith(FIND_MY_SPAWNS);
    });

    it('returns true even when the base is full (prevents Selector fallback)', () => {
        const creep = makeCreep({ state: 'work' });
        const colony = makeColony({ fillTarget: null });

        const result = new HaulerBehavior().run(creep, colony);

        expect(result).toBe(true);
    });

    it('does not call getEnergySource when full and base is full', () => {
        const creep = makeCreep({ state: 'work' });
        const colony = makeColony({ fillTarget: null });

        new HaulerBehavior().run(creep, colony);

        // collectEnergy must not be called — getEnergySource should not be queried
        // (getFillTarget is called in deliverEnergy, not getEnergySource)
        expect(colony.logisticsManager.getEnergySource).not.toHaveBeenCalled();
    });
});

describe('HaulerBehavior — collect path (load state)', () => {
    it('withdraws from a container source when in range', () => {
        const withdrawFn = jest.fn(() => OK);
        const source = {
            id: 'container-1',
            structureType: STRUCTURE_CONTAINER,
            store: { getUsedCapacity: () => 200, getFreeCapacity: () => 0 },
            pos: new RoomPosition(11, 10, 'W0N0'),
        };
        const creep = makeCreep({ state: 'load', withdraw: withdrawFn });
        const colony = makeColony({ energySource: source });

        new HaulerBehavior().run(creep, colony);

        expect(withdrawFn).toHaveBeenCalledWith(source, RESOURCE_ENERGY);
    });

    it('picks up a dropped resource when in range', () => {
        const pickupFn = jest.fn(() => OK);
        const dropped = {
            id: 'drop-1',
            resourceType: RESOURCE_ENERGY,
            amount: 150,
            pos: new RoomPosition(11, 10, 'W0N0'),
        };
        const creep = makeCreep({ state: 'load', pickup: pickupFn });
        const colony = makeColony({ energySource: dropped });

        new HaulerBehavior().run(creep, colony);

        expect(pickupFn).toHaveBeenCalledWith(dropped);
    });

    it('returns false when no energy source is available in load state', () => {
        const creep = makeCreep({ state: 'load' });
        const colony = makeColony({ energySource: null });

        const result = new HaulerBehavior().run(creep, colony);

        expect(result).toBe(false);
    });
});

describe('HaulerBehavior — partial-load paralysis fix', () => {
    it('forces state to work when carrying energy but no source is available', () => {
        const creep = makeCreep({
            state: 'load',
            usedCapacity: 45,
            freeCapacity: 55,
        });
        const colony = makeColony({ energySource: null, fillTarget: null });

        new HaulerBehavior().run(creep, colony);

        expect(creep.memory.s).toBe('work');
    });

    it('keeps load state when carrying energy and a source is still available', () => {
        const source = {
            id: 'container-1',
            store: { getUsedCapacity: () => 200, getFreeCapacity: () => 0 },
            pos: new RoomPosition(11, 10, 'W0N0'),
        };
        const creep = makeCreep({
            state: 'load',
            usedCapacity: 45,
            freeCapacity: 55,
        });
        const colony = makeColony({ energySource: source });

        new HaulerBehavior().run(creep, colony);

        expect(creep.memory.s).toBe('load');
    });

    it('does not force state switch when carrying zero energy', () => {
        const creep = makeCreep({
            state: 'load',
            usedCapacity: 0,
            freeCapacity: 100,
        });
        const colony = makeColony({ energySource: null });

        new HaulerBehavior().run(creep, colony);

        // Should remain in load (and just return false since no source)
        expect(creep.memory.s).toBe('load');
    });
});
