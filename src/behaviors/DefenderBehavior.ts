import type { Colony } from '../colony/Colony';
import { PathingService } from '../pathing/PathingService';

export class DefenderBehavior {
    public run(creep: Creep, colony: Colony): boolean {
        if (this.handleBoosting(creep)) {
            return true;
        }

        const target = colony.defenseManager.getDefenderTarget(creep);

        if (!target) {
            const rallyPoint = colony.getPrimarySpawn() ?? colony.room?.controller;

            if (rallyPoint && !creep.pos.inRangeTo(rallyPoint, 3)) {
                PathingService.moveTo(creep, rallyPoint, 3);
                return true;
            }

            return false;
        }

        const rampart = this.getBestRampart(colony, target, creep);

        if (rampart && !creep.pos.isEqualTo(rampart.pos)) {
            PathingService.moveTo(creep, rampart, 0);
            return true;
        }

        if (creep.pos.getRangeTo(target) > 3) {
            PathingService.moveTo(creep, target, 3);
            return true;
        }

        if (creep.pos.getRangeTo(target) <= 1 && creep.rangedMassAttack() === OK) {
            return true;
        }

        return creep.rangedAttack(target) === OK;
    }

    private handleBoosting(creep: Creep): boolean {
        const boostRequest = creep.memory.b;

        if (!boostRequest || boostRequest.done) {
            return false;
        }

        const lab = Game.getObjectById(boostRequest.labId);

        if (!lab) {
            creep.memory.b = { ...boostRequest, done: true };
            return false;
        }

        if (!creep.pos.isNearTo(lab)) {
            PathingService.moveTo(creep, lab, 1);
            return true;
        }

        const result = lab.boostCreep(creep);

        if (result === OK || result === ERR_NOT_ENOUGH_RESOURCES || result === ERR_NOT_FOUND) {
            creep.memory.b = { ...boostRequest, done: true };
        }

        return true;
    }

    private getBestRampart(
        colony: Colony,
        target: Creep,
        creep: Creep,
    ): StructureRampart | undefined {
        const room = colony.room;

        if (!room) {
            return undefined;
        }

        const ramparts = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) =>
                structure.structureType === STRUCTURE_RAMPART && structure.pos.inRangeTo(target, 3),
        }) as StructureRampart[];

        ramparts.sort((left, right) => creep.pos.getRangeTo(left) - creep.pos.getRangeTo(right));
        return ramparts[0];
    }
}
