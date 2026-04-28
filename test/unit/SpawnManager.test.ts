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
});
