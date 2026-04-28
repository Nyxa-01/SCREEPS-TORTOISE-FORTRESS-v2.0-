import type { Colony } from '../colony/Colony';
import { PathingService } from '../pathing/PathingService';
import { Selector } from '../tasks/Selector';
import { Sequence } from '../tasks/Sequence';
import { FnTask } from '../tasks/Task';
import type { EnergySourceTarget } from '../managers/LogisticsManager';

export class HaulerBehavior {
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
                this.collectEnergy(activeCreep, activeColony),
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
        const target = colony.logisticsManager.getFillTarget(creep);

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

    private collectEnergy(creep: Creep, colony: Colony): boolean {
        const source = colony.logisticsManager.getEnergySource(creep);

        if (!source) {
            return false;
        }

        if (!creep.pos.isNearTo(source)) {
            PathingService.moveTo(creep, source, 1);
            return true;
        }

        return this.withdrawFromTarget(creep, source);
    }

    private withdrawFromTarget(creep: Creep, target: EnergySourceTarget): boolean {
        if ('resourceType' in target) {
            return creep.pickup(target) === OK;
        }

        if ('store' in target) {
            return creep.withdraw(target, RESOURCE_ENERGY) === OK;
        }

        return creep.harvest(target) === OK;
    }
}
