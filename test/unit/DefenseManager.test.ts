import { DefenseManager } from '../../src/managers/DefenseManager';
import { createHostile, createTower } from '../helpers/mockFactories';

describe('DefenseManager', () => {
    it('only grants edge-dance immunity to combat creeps near exits', () => {
        expect(DefenseManager.isEdgeDanceTarget(createHostile([RANGED_ATTACK], 2, 24))).toBe(true);
        expect(DefenseManager.isEdgeDanceTarget(createHostile([CARRY], 47, 20))).toBe(false);
        expect(DefenseManager.isEdgeDanceTarget(createHostile([ATTACK], 24, 24))).toBe(false);
    });

    it('assigns a non-zero threat score to carry-based thieves', () => {
        expect(DefenseManager.getThreatPriority(createHostile([CARRY, CARRY], 10, 10))).toBe(2);
    });

    it('subtracts hostile healing from tower damage', () => {
        const tower = createTower(10, 10);
        const target = createHostile([RANGED_ATTACK], 13, 10);
        const healer = createHostile([HEAL, HEAL], 14, 10);

        expect(DefenseManager.calculateNetDamage([tower], target, [target, healer])).toBe(576);
    });
});
