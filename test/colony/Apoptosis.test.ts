import { readFileSync } from 'fs';
import { join } from 'path';
import { Colony } from '../../src/colony/Colony';
import { DEFCON, SYSTEM_GENERATION } from '../../src/config';

function createStore(usedEnergy: number): StoreDefinition {
    const store = {
        [RESOURCE_ENERGY]: usedEnergy,
    } as StoreDefinition;

    Object.defineProperty(store, 'getUsedCapacity', {
        value: () => usedEnergy,
        enumerable: false,
    });
    Object.defineProperty(store, 'getFreeCapacity', {
        value: () => 0,
        enumerable: false,
    });

    return store;
}

function createSpawn(): StructureSpawn {
    return {
        id: 'spawn-1',
        pos: new RoomPosition(10, 10, 'W0N0'),
        recycleCreep: jest.fn(() => OK),
    } as unknown as StructureSpawn;
}

function createObsoleteHauler(
    spawn: StructureSpawn,
    options: {
        near?: boolean;
        transferResult?: ScreepsReturnCode;
    } = {},
): Creep {
    const pos = new RoomPosition(options.near === false ? 13 : 10, 10, 'W0N0');
    pos.findClosestByPath = jest.fn(() => spawn);

    return {
        id: 'obsolete-hauler-id',
        name: 'obsolete-hauler',
        pos,
        memory: {
            g: SYSTEM_GENERATION - 1,
            r: 'hauler',
            rn: 'W0N0',
        },
        store: createStore(50),
        moveTo: jest.fn(() => OK),
        transfer: jest.fn(() => options.transferResult ?? OK),
        drop: jest.fn(() => OK),
        suicide: jest.fn(() => OK),
    } as unknown as Creep;
}

function createReplacementHauler(): Creep {
    return {
        id: 'replacement-hauler-id',
        name: 'replacement-hauler',
        pos: new RoomPosition(12, 12, 'W0N0'),
        memory: {
            g: SYSTEM_GENERATION,
            r: 'hauler',
            rn: 'W0N0',
        },
        store: createStore(0),
    } as unknown as Creep;
}

describe('Codebase Integrity', () => {
    it('should not contain vulnerable for...in loops over creep stores', () => {
        const colonyFile = readFileSync(join(__dirname, '../../src/colony/Colony.ts'), 'utf8');
        const hasVulnerableLoop = colonyFile.includes('for (const resourceType in creep.store)');
        expect(hasVulnerableLoop).toBe(false);
    });

    it('drops carried energy when an obsolete creep reaches a saturated spawn', () => {
        const colony = new Colony('W0N0');
        const spawn = createSpawn();
        const obsoleteHauler = createObsoleteHauler(spawn, { transferResult: ERR_FULL });
        const replacementHauler = createReplacementHauler();

        jest.spyOn(colony.defenseManager, 'getSnapshot').mockReturnValue({
            defcon: DEFCON.GREEN,
            hostileCount: 0,
        });

        (Game as { creeps: Record<string, Creep> }).creeps = {
            [obsoleteHauler.name]: obsoleteHauler,
            [replacementHauler.name]: replacementHauler,
        };

        (colony as unknown as { runCreeps(): void }).runCreeps();

        expect(obsoleteHauler.transfer).toHaveBeenCalledWith(spawn, RESOURCE_ENERGY);
        expect(obsoleteHauler.drop).toHaveBeenCalledWith(RESOURCE_ENERGY);
        expect(spawn.recycleCreep).not.toHaveBeenCalled();
    });

    it('moves obsolete creeps into range before attempting purge interactions', () => {
        const colony = new Colony('W0N0');
        const spawn = createSpawn();
        const obsoleteHauler = createObsoleteHauler(spawn, { near: false });
        const replacementHauler = createReplacementHauler();

        jest.spyOn(colony.defenseManager, 'getSnapshot').mockReturnValue({
            defcon: DEFCON.GREEN,
            hostileCount: 0,
        });

        (Game as { creeps: Record<string, Creep> }).creeps = {
            [obsoleteHauler.name]: obsoleteHauler,
            [replacementHauler.name]: replacementHauler,
        };

        (colony as unknown as { runCreeps(): void }).runCreeps();

        expect(obsoleteHauler.moveTo).toHaveBeenCalledWith(spawn);
        expect(obsoleteHauler.transfer).not.toHaveBeenCalled();
        expect(spawn.recycleCreep).not.toHaveBeenCalled();
    });
});