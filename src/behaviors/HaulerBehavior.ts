import type { Colony } from '../colony/Colony';
import { PathingService } from '../pathing/PathingService';
import type { EnergySourceTarget } from '../managers/LogisticsManager';
import { BaseBehavior } from './BaseBehavior';

export class HaulerBehavior extends BaseBehavior {
    public run(creep: Creep, colony: Colony): boolean {
        this.syncState(creep);

        // FIX 1: Prevent "Partial Load" Paralysis
        // If we have some energy but no sources are left, force switch to 'work'
        if (creep.memory.s === 'load' && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            const availableSource = colony.logisticsManager.getEnergySource(creep);
            if (!availableSource) {
                creep.memory.s = 'work';
                delete creep.memory.t;
            }
        }

        // Standard execution flow bypassing the error-prone Selector
        if (creep.memory.s === 'work') {
            const delivered = this.deliverEnergy(creep, colony);

            // FIX 2: Prevent Full Fallback to Source
            // If we are full but base is full, don't try to collect. Park instead.
            if (!delivered) {
                this.park(creep, colony);
            }
            return true;
        } else {
            return this.collectEnergy(creep, colony);
        }
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
        // Redundancy check: A full hauler should never collect
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return false;

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

    // Idle behavior so full haulers don't clog up logistics paths
    private park(creep: Creep, colony: Colony): void {
        const spawn = colony.room?.find(FIND_MY_SPAWNS)[0];
        if (spawn && creep.pos.getRangeTo(spawn) > 3) {
            PathingService.moveTo(creep, spawn, 3);
        }
    }
}
