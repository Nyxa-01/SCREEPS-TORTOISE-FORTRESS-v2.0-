import type { Colony } from '../colony/Colony';
import { BaseBehavior } from './BaseBehavior';
import { PathingService } from '../pathing/PathingService';
import { Selector } from '../tasks/Selector';
import { Sequence } from '../tasks/Sequence';
import { FnTask } from '../tasks/Task';

export class HarvesterBehavior extends BaseBehavior {
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
                activeColony.room ? this.harvestEnergy(activeCreep, activeColony.room) : false,
            ),
        ]);

        const handled = behavior.run({ creep, colony });
        this.syncState(creep);
        return handled;
    }

    private deliverEnergy(creep: Creep, colony: Colony): boolean {
        void colony;

        const nearbyHauler = creep.pos.findInRange(FIND_MY_CREEPS, 1, {
            filter: (candidate) =>
                candidate.memory.r === 'hauler' &&
                candidate.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        })[0];

        if (nearbyHauler) {
            creep.transfer(nearbyHauler, RESOURCE_ENERGY);
            return true;
        }

        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.drop(RESOURCE_ENERGY);
        }

        return true;
    }

    private harvestEnergy(creep: Creep, room: Room): boolean {
        const sources = room.find(FIND_SOURCES);
        if (sources.length === 0) return false;

        if (!creep.memory.t) {
            const nameParts = creep.name.split('-');
            const uid = parseInt(nameParts[nameParts.length - 1] ?? '0', 10) || 0;
            creep.memory.t = sources[uid % sources.length]!.id;
        }

        let source: Source | null = Game.getObjectById(creep.memory.t as Id<Source>);

        if (!source || (source.energy === 0 && source.ticksToRegeneration > 0)) {
            source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        }

        if (!source) return false;

        if (!creep.pos.isNearTo(source)) {
            PathingService.moveTo(creep, source.pos, 1);
            return true;
        }

        return creep.harvest(source) === OK;
    }
}
