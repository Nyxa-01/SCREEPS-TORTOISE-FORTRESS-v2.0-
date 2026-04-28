import type { Colony } from '../colony/Colony';
import { PathingService } from '../pathing/PathingService';
import { Selector } from '../tasks/Selector';
import { Sequence } from '../tasks/Sequence';
import { FnTask } from '../tasks/Task';
import type { EnergySourceTarget } from '../managers/LogisticsManager';
import { BaseBehavior } from './BaseBehavior';

export class HaulerBehavior extends BaseBehavior {
    public run(creep: Creep, colony: Colony): boolean {
        this.syncState(creep);

        if (creep.memory.s === 'work') {
            delete creep.memory.t;
        }

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

        if (creep.memory.s === 'work') {
            delete creep.memory.t;
        }

        return handled;
    }

    private deliverEnergy(creep: Creep, colony: Colony): boolean {
        let target: ReturnType<Colony['logisticsManager']['getFillTarget']> | Creep | undefined = colony.logisticsManager.getFillTarget(creep);

        if (!target) {
            target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
                filter: (candidate) =>
                    (candidate.memory.r === 'upgrader' || candidate.memory.r === 'builder') &&
                    candidate.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
            }) ?? undefined;
        }

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
        const provider = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
            filter: (candidate) =>
                candidate.memory.r === 'emergencyHarvester' &&
                candidate.store.getUsedCapacity(RESOURCE_ENERGY) > 20,
        });

        if (provider) {
            delete creep.memory.t;

            if (!creep.pos.isNearTo(provider)) {
                PathingService.moveTo(creep, provider.pos, 1);
                return true;
            }

            return true;
        }

        const source = colony.logisticsManager.getEnergySource(creep);

        if (!source) {
            delete creep.memory.t;
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
