import type { Colony } from '../colony/Colony';
import { SYSTEM_GENERATION } from '../config';
import { BaseBehavior } from './BaseBehavior';
import { PathingService } from '../pathing/PathingService';

export class HarvesterBehavior extends BaseBehavior {
    public run(creep: Creep, colony: Colony): boolean {
        const haulerCount = colony.getCreeps('hauler').length;

        // MODE 1: Static Miner (Optimal)
        // If haulers exist, continuously harvest and simultaneously offload.
        if (haulerCount > 0) {
            // 1. Offload energy as a parallel intent if carrying anything
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                this.offloadEnergy(creep);
            }
            // 2. Unconditionally harvest every single tick
            return this.harvestEnergy(creep, colony);
        }

        // MODE 2: Emergency Hauler
        // If no haulers exist, use the state machine to run energy back to base
        this.syncState(creep);

        if (creep.memory.s === 'work') {
            return this.deliverEnergy(creep, colony);
        } else {
            return this.harvestEnergy(creep, colony);
        }
    }

    private offloadEnergy(creep: Creep): void {
        const nearbyHauler = creep.pos.findInRange(FIND_MY_CREEPS, 1, {
            filter: (candidate) =>
                candidate.memory.r === 'hauler' &&
                candidate.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        })[0];

        if (nearbyHauler) {
            creep.transfer(nearbyHauler, RESOURCE_ENERGY);
        } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.drop(RESOURCE_ENERGY);
        }
    }

    private deliverEnergy(creep: Creep, colony: Colony): boolean {
        const target = colony.logisticsManager.getFillTarget(creep);
        if (target) {
            if (!creep.pos.isNearTo(target)) {
                PathingService.moveTo(creep, target, 1);
                return true;
            }

            creep.transfer(target, RESOURCE_ENERGY);
            return true;
        }

        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.drop(RESOURCE_ENERGY);
        }

        return true;
    }

    private harvestEnergy(creep: Creep, colony: Colony): boolean {
        const room = colony.room;
        if (!room) return false;

        const sources = room.find(FIND_SOURCES);
        if (sources.length === 0) return false;

        if (!creep.memory.t) {
            sources.sort((left, right) => creep.pos.getRangeTo(left) - creep.pos.getRangeTo(right));

            let bestSource = sources[0]!;
            let minAssigned = Infinity;
            const harvesters = colony.getCreeps('emergencyHarvester');

            for (const sourceCandidate of sources) {
                const assigned = harvesters.filter(
                    (harvester) =>
                        harvester.name !== creep.name &&
                        harvester.memory.t === sourceCandidate.id &&
                        (harvester.memory.g ?? 0) >= SYSTEM_GENERATION,
                ).length;

                if (assigned < minAssigned) {
                    minAssigned = assigned;
                    bestSource = sourceCandidate;
                }
            }

            creep.memory.t = bestSource.id;
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
