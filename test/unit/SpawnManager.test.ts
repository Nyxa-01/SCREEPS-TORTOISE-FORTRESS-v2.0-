import { DEFCON } from '../../src/config';
import { SpawnManager } from '../../src/managers/SpawnManager';

describe('SpawnManager', () => {
    it('orders the queue by emergency harvester, first hauler, defender, then upgrader', () => {
        const colony = {
            name: 'W0N0',
            room: {
                energyAvailable: 300,
                energyCapacityAvailable: 800,
                find: jest.fn(() => []),
            },
            getCreeps: jest.fn(() => []),
            defenseManager: {
                getRequiredDefenderCount: () => 1,
                getSnapshot: () => ({ defcon: DEFCON.ORANGE, hostileCount: 1 }),
            },
            upgradeManager: {
                shouldUpgrade: () => true,
            },
        } as any;

        const manager = new SpawnManager(colony);
        manager.init();

        expect(manager.getQueue().map((request) => request.role)).toEqual([
            'emergencyHarvester',
            'hauler',
            'defender',
            'upgrader',
        ]);
    });

    it('uses the hybrid elastic defender body when the room cannot afford bunker armor', () => {
        const colony = {
            name: 'W0N0',
            room: {
                energyAvailable: 330,
                energyCapacityAvailable: 330,
                find: jest.fn(() => []),
            },
            getCreeps: jest.fn(() => []),
            defenseManager: {
                getRequiredDefenderCount: () => 1,
                getSnapshot: () => ({ defcon: DEFCON.ORANGE, hostileCount: 1 }),
            },
            upgradeManager: {
                shouldUpgrade: () => false,
            },
        } as any;

        const manager = new SpawnManager(colony);
        manager.init();

        const defenderRequest = manager.getQueue().find((request) => request.role === 'defender');

        expect(defenderRequest?.body).toEqual([RANGED_ATTACK, MOVE, ATTACK, MOVE]);
    });

    it('queues a builder when construction sites exist and no builders are present', () => {
        const mockSite = { id: 'site-1', structureType: STRUCTURE_EXTENSION };
        const colony = {
            name: 'W0N0',
            room: {
                energyAvailable: 550,
                energyCapacityAvailable: 550,
                find: jest.fn((type: number) =>
                    type === FIND_MY_CONSTRUCTION_SITES ? [mockSite] : [],
                ),
            },
            getCreeps: jest.fn(() => []),
            defenseManager: {
                getRequiredDefenderCount: () => 0,
                getSnapshot: () => ({ defcon: DEFCON.GREEN, hostileCount: 0 }),
            },
            upgradeManager: {
                shouldUpgrade: () => false,
            },
        } as any;

        const manager = new SpawnManager(colony);
        manager.init();

        const roles = manager.getQueue().map((request) => request.role);
        expect(roles).toContain('builder');
    });

    it('does not queue a builder when no construction sites are present', () => {
        const colony = {
            name: 'W0N0',
            room: {
                energyAvailable: 550,
                energyCapacityAvailable: 550,
                find: jest.fn(() => []),
            },
            getCreeps: jest.fn(() => []),
            defenseManager: {
                getRequiredDefenderCount: () => 0,
                getSnapshot: () => ({ defcon: DEFCON.GREEN, hostileCount: 0 }),
            },
            upgradeManager: {
                shouldUpgrade: () => false,
            },
        } as any;

        const manager = new SpawnManager(colony);
        manager.init();

        const roles = manager.getQueue().map((request) => request.role);
        expect(roles).not.toContain('builder');
    });
});

