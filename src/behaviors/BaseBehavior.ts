import type { Colony } from '../colony/Colony';

export abstract class BaseBehavior {
    public abstract run(creep: Creep, colony: Colony): boolean;

    protected syncState(creep: Creep): void {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            if (creep.memory.s !== 'load') {
                creep.memory.s = 'load';
                delete creep.memory.t;
            }
        } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            if (creep.memory.s !== 'work') {
                creep.memory.s = 'work';
                delete creep.memory.t;
            }
        }
    }
}