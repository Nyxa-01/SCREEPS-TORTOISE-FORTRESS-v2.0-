import type { Colony } from '../colony/Colony';

export abstract class BaseBehavior {
    public abstract run(creep: Creep, colony: Colony): boolean;

    protected syncState(creep: Creep): void {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'load';
        } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'work';
        }
    }
}