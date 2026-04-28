import { DEFCON } from '../../src/config';
import { LogisticsManager } from '../../src/managers/LogisticsManager';

function createCarrier(
    name: string,
    role: 'hauler' | 'builder' | 'upgrader',
    x: number,
    y: number,
    freeCapacity = 100,
    targetId?: string,
): Creep {
    return {
        id: `${name}-id`,
        name,
        pos: new RoomPosition(x, y, 'W0N0'),
        memory: {
            r: role,
            rn: 'W0N0',
            t: targetId,
        },
        store: {
            getFreeCapacity: () => freeCapacity,
            getUsedCapacity: () => 0,
        },
    } as unknown as Creep;
}

function createDropped(id: string, x: number, y: number, amount: number): Resource<ResourceConstant> {
    return {
        id,
        pos: new RoomPosition(x, y, 'W0N0'),
        resourceType: RESOURCE_ENERGY,
        amount,
    } as unknown as Resource<ResourceConstant>;
}

function createStoreTarget(
    id: string,
    structureType: StructureConstant,
    x: number,
    y: number,
    usedEnergy: number,
    freeEnergy = 0,
): Tombstone | Ruin | StructureSpawn | StructureExtension | StructureTower | StructureContainer | StructureStorage | StructureTerminal {
    return {
        id,
        structureType,
        pos: new RoomPosition(x, y, 'W0N0'),
        store: {
            getUsedCapacity: () => usedEnergy,
            getFreeCapacity: () => freeEnergy,
        },
    } as unknown as Tombstone | Ruin | StructureSpawn | StructureExtension | StructureTower | StructureContainer | StructureStorage | StructureTerminal;
}

function createColony(options: {
    defcon?: DEFCON;
    haulers?: Creep[];
    roomFind?: (type: number, searchOptions?: { filter?: (candidate: any) => boolean }) => any[];
    storage?: StructureStorage;
    terminal?: StructureTerminal;
}): any {
    return {
        room: {
            name: 'W0N0',
            controller: { safeMode: 0 },
            storage: options.storage,
            terminal: options.terminal,
            find: options.roomFind ?? (() => []),
        },
        getCreeps: jest.fn((role?: string) => {
            if (role === 'hauler') {
                return options.haulers ?? [];
            }

            return [];
        }),
        defenseManager: {
            getSnapshot: () => ({ defcon: options.defcon ?? DEFCON.GREEN, hostileCount: 0 }),
        },
    };
}

function filterByOptions<T>(candidates: readonly T[], searchOptions?: { filter?: (candidate: T) => boolean }): T[] {
    if (!searchOptions?.filter) {
        return [...candidates];
    }

    return candidates.filter((candidate) => searchOptions.filter?.(candidate) ?? true);
}

describe('LogisticsManager', () => {
    it('excludes fully claimed dropped energy from other authorized haulers', () => {
        const claimed = createDropped('drop-claimed', 6, 6, 80);
        const unclaimed = createDropped('drop-open', 7, 7, 120);
        const otherHauler = createCarrier('Erebus-Other', 'hauler', 3, 3, 100, claimed.id);
        const creep = createCarrier('Erebus-Prime', 'hauler', 5, 5, 100);
        const colony = createColony({
            haulers: [creep, otherHauler],
            roomFind: (type, searchOptions) => {
                if (type === FIND_DROPPED_RESOURCES) {
                    return filterByOptions([claimed, unclaimed], searchOptions);
                }

                return [];
            },
        });

        const manager = new LogisticsManager(colony);
        const target = manager.getEnergySource(creep);

        expect(target?.id).toBe(unclaimed.id);
        expect(creep.memory.t).toBe(unclaimed.id);
    });

    it('excludes fully claimed ruins from other authorized haulers', () => {
        const claimedRuin = createStoreTarget('ruin-claimed', STRUCTURE_CONTAINER, 6, 6, 75) as Ruin;
        const openRuin = createStoreTarget('ruin-open', STRUCTURE_CONTAINER, 7, 7, 200) as Ruin;
        const otherHauler = createCarrier('Erebus-Other', 'hauler', 3, 3, 80, claimedRuin.id);
        const creep = createCarrier('Erebus-Prime', 'hauler', 5, 5, 100);
        const colony = createColony({
            haulers: [creep, otherHauler],
            roomFind: (type, searchOptions) => {
                if (type === FIND_DROPPED_RESOURCES || type === FIND_TOMBSTONES) {
                    return [];
                }

                if (type === FIND_RUINS) {
                    return filterByOptions([claimedRuin, openRuin], searchOptions);
                }

                return [];
            },
        });

        const manager = new LogisticsManager(colony);
        const target = manager.getEnergySource(creep);

        expect(target?.id).toBe(openRuin.id);
        expect(creep.memory.t).toBe(openRuin.id);
    });

    it('keeps spawns and extensions ahead of towers while DEFCON is green', () => {
        const spawn = createStoreTarget('spawn-core', STRUCTURE_SPAWN, 12, 12, 0, 100) as StructureSpawn;
        const tower = createStoreTarget('tower-front', STRUCTURE_TOWER, 6, 6, 0, 100) as StructureTower;
        const creep = createCarrier('Erebus-Prime', 'hauler', 5, 5, 100);
        const colony = createColony({
            defcon: DEFCON.GREEN,
            roomFind: (type, searchOptions) => {
                if (type === FIND_MY_STRUCTURES) {
                    return filterByOptions([tower, spawn], searchOptions);
                }

                if (type === FIND_STRUCTURES) {
                    return [];
                }

                return [];
            },
        });

        const manager = new LogisticsManager(colony);

        expect(manager.getFillTarget(creep)?.id).toBe(spawn.id);
    });

    it('elevates towers into the core group once DEFCON rises above green', () => {
        const spawn = createStoreTarget('spawn-core', STRUCTURE_SPAWN, 12, 12, 0, 100) as StructureSpawn;
        const tower = createStoreTarget('tower-front', STRUCTURE_TOWER, 6, 6, 0, 100) as StructureTower;
        const creep = createCarrier('Erebus-Prime', 'hauler', 5, 5, 100);
        const colony = createColony({
            defcon: DEFCON.ORANGE,
            roomFind: (type, searchOptions) => {
                if (type === FIND_MY_STRUCTURES) {
                    return filterByOptions([tower, spawn], searchOptions);
                }

                if (type === FIND_STRUCTURES) {
                    return [];
                }

                return [];
            },
        });

        const manager = new LogisticsManager(colony);

        expect(manager.getFillTarget(creep)?.id).toBe(tower.id);
    });

    it('places containers ahead of storage once core sinks are saturated', () => {
        const container = createStoreTarget('buffer-container', STRUCTURE_CONTAINER, 8, 8, 0, 200) as StructureContainer;
        const storage = createStoreTarget('deep-storage', STRUCTURE_STORAGE, 6, 6, 0, 500) as StructureStorage;
        const creep = createCarrier('Erebus-Prime', 'hauler', 5, 5, 100);
        const colony = createColony({
            storage,
            defcon: DEFCON.GREEN,
            roomFind: (type, searchOptions) => {
                if (type === FIND_MY_STRUCTURES) {
                    return [];
                }

                if (type === FIND_STRUCTURES) {
                    return filterByOptions([container], searchOptions);
                }

                return [];
            },
        });

        const manager = new LogisticsManager(colony);

        expect(manager.getFillTarget(creep)?.id).toBe(container.id);
    });
});