import type { Colony } from '../../src/colony/Colony';
import { BaseBehavior } from '../../src/behaviors/BaseBehavior';

class BehaviorHarness extends BaseBehavior {
    public run(creep: Creep, colony: Colony): boolean {
        void creep;
        void colony;
        return true;
    }

    public sync(creep: Creep): void {
        this.syncState(creep);
    }
}

function createCreep(
    usedCapacity: number,
    freeCapacity: number,
    state?: 'load' | 'work',
    targetId = 'target-1',
): Creep {
    return {
        memory: {
            s: state,
            t: targetId,
        },
        store: {
            getUsedCapacity: () => usedCapacity,
            getFreeCapacity: () => freeCapacity,
        },
    } as unknown as Creep;
}

describe('BaseBehavior', () => {
    it('preserves target claims while remaining in the same load state', () => {
        const behavior = new BehaviorHarness();
        const creep = createCreep(0, 100, 'load', 'drop-1');

        behavior.sync(creep);

        expect(creep.memory.s).toBe('load');
        expect(creep.memory.t).toBe('drop-1');
    });

    it('clears target claims exactly when transitioning into work', () => {
        const behavior = new BehaviorHarness();
        const creep = createCreep(100, 0, 'load', 'drop-1');

        behavior.sync(creep);

        expect(creep.memory.s).toBe('work');
        expect(creep.memory.t).toBeUndefined();
    });

    it('clears target claims exactly when transitioning back into load', () => {
        const behavior = new BehaviorHarness();
        const creep = createCreep(0, 100, 'work', 'spawn-1');

        behavior.sync(creep);

        expect(creep.memory.s).toBe('load');
        expect(creep.memory.t).toBeUndefined();
    });
});