import { DefenseManager } from '../../src/managers/DefenseManager';
import { createHostile, createTower } from '../helpers/mockFactories';

describe('DefenseManager', () => {
    it('detects edge-dance hostiles near exits', () => {
        expect(DefenseManager.isEdgeDanceTarget(new RoomPosition(2, 24, 'W0N0'))).toBe(true);
        expect(DefenseManager.isEdgeDanceTarget(new RoomPosition(47, 20, 'W0N0'))).toBe(true);
        expect(DefenseManager.isEdgeDanceTarget(new RoomPosition(24, 24, 'W0N0'))).toBe(false);
    });

    it('subtracts hostile healing from tower damage', () => {
        const tower = createTower(10, 10);
        const target = createHostile([RANGED_ATTACK], 13, 10);
        const healer = createHostile([HEAL, HEAL], 14, 10);

        expect(DefenseManager.calculateNetDamage([tower], target, [target, healer])).toBe(576);
    });
});
