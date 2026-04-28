import type { Colony } from '../colony/Colony';
import { PathingService } from '../pathing/PathingService';
import { Selector } from '../tasks/Selector';
import { Sequence } from '../tasks/Sequence';
import { FnTask } from '../tasks/Task';
import { BaseBehavior } from './BaseBehavior';

export class BuilderBehavior extends BaseBehavior {
    public run(creep: Creep, colony: Colony): boolean {
        this.syncState(creep);

        const behavior = new Selector([
            new Sequence([
                new FnTask(({ creep: activeCreep }) => activeCreep.memory.s === 'work'),
                new FnTask(({ creep: activeCreep, colony: activeColony }) =>
                    this.buildStructures(activeCreep, activeColony),
                ),
            ]),
            new FnTask(({ creep: activeCreep, colony: activeColony }) =>
                this.collectEnergy(activeCreep, activeColony),
            ),
        ]);

        const handled = behavior.run({ creep, colony });
        this.syncState(creep);
        return handled;
    }

    private collectEnergy(creep: Creep, colony: Colony): boolean {
        const target = colony.logisticsManager.getEnergySource(creep);
        if (!target) return false;

        if (!creep.pos.isNearTo(target)) {
            PathingService.moveTo(creep, target, 1);
            return true;
        }

        if ('resourceType' in target) return creep.pickup(target) === OK;
        if ('store' in target) return creep.withdraw(target, RESOURCE_ENERGY) === OK;
        return creep.harvest(target) === OK;
    }

    private buildStructures(creep: Creep, colony: Colony): boolean {
        const room = colony.room;
        if (!room) return false;

        const target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        if (!target) return false;

        if (!creep.pos.inRangeTo(target, 3)) {
            PathingService.moveTo(creep, target, 3);
            return true;
        }

        return creep.build(target) === OK;
    }
}