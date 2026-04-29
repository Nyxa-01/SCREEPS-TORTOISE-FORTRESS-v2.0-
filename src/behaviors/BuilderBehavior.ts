import { RAMPART_TARGET_HITS } from '../config';
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
                new Selector([
                    new FnTask(({ creep: activeCreep, colony: activeColony }) =>
                        this.buildStructures(activeCreep, activeColony),
                    ),
                    new FnTask(({ creep: activeCreep, colony: activeColony }) =>
                        this.repairRamparts(activeCreep, activeColony),
                    ),
                    new FnTask(({ creep: activeCreep, colony: activeColony }) =>
                        this.upgradeController(activeCreep, activeColony),
                    ),
                ]),
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

    private repairRamparts(creep: Creep, colony: Colony): boolean {
        const room = colony.room;
        if (!room) return false;

        const rcl = room.controller?.level ?? 0;
        const targetHits = RAMPART_TARGET_HITS[rcl] ?? 0;
        if (targetHits === 0) return false;

        const ramparts = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) =>
                structure.structureType === STRUCTURE_RAMPART &&
                (structure as StructureRampart).hits < targetHits,
        }) as StructureRampart[];

        if (ramparts.length === 0) return false;

        ramparts.sort((left, right) => left.hits - right.hits);
        const target = ramparts[0]!;

        if (!creep.pos.inRangeTo(target, 3)) {
            PathingService.moveTo(creep, target, 3);
            return true;
        }

        return creep.repair(target) === OK;
    }

    private upgradeController(creep: Creep, colony: Colony): boolean {
        const controller = colony.upgradeManager.getTarget();
        if (!controller) return false;

        if (!creep.pos.inRangeTo(controller, 3)) {
            PathingService.moveTo(creep, controller, 3);
            return true;
        }

        return creep.upgradeController(controller) === OK;
    }
}