import type { Colony } from '../colony/Colony';
import { PathingService } from '../pathing/PathingService';
import { Selector } from '../tasks/Selector';
import { Sequence } from '../tasks/Sequence';
import { FnTask } from '../tasks/Task';

export class HarvesterBehavior {
    public run(creep: Creep, colony: Colony): boolean {
        this.syncState(creep);

        const behavior = new Selector([
            new Sequence([
                new FnTask(({ creep: activeCreep }) => activeCreep.memory.s === 'work'),
                new FnTask(({ creep: activeCreep, colony: activeColony }) =>
                    this.deliverEnergy(activeCreep, activeColony),
                ),
            ]),
            new FnTask(({ creep: activeCreep, colony: activeColony }) =>
                this.harvestEnergy(activeCreep, activeColony),
            ),
        ]);

        const handled = behavior.run({ creep, colony });
        this.syncState(creep);
        return handled;
    }

    private syncState(creep: Creep): void {
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'load';
        } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.s = 'work';
        }
    }

    private deliverEnergy(creep: Creep, colony: Colony): boolean {
        const target = colony.logisticsManager.getFillTarget(creep) ?? colony.room?.storage;

        if (!target) {
            return false;
        }

        if (!creep.pos.isNearTo(target)) {
            PathingService.moveTo(creep, target, 1);
            return true;
        }

        const result = creep.transfer(target, RESOURCE_ENERGY);
        return result === OK || result === ERR_FULL;
    }

    private harvestEnergy(creep: Creep, colony: Colony): boolean {
        const room = colony.room;

        if (!room) {
            return false;
        }

        if (!creep.memory.t) {
            const sources = room.find(FIND_SOURCES);
            const uid = parseInt(creep.name.split('-').pop() ?? '0', 10) || 0;
            const assigned = sources[uid % sources.length];
            if (assigned) creep.memory.t = assigned.id;
        }

        const source = Game.getObjectById(creep.memory.t as Id<Source>);

        if (!source || (source.energy === 0 && source.ticksToRegeneration > 0)) {
            return false;
        }

        if (!creep.pos.isNearTo(source)) {
            PathingService.moveTo(creep, source, 1);
            return true;
        }

        return creep.harvest(source) === OK;
    }
}
