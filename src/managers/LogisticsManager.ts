import type { Colony } from '../colony/Colony';

export type EnergySourceTarget =
    | Resource<ResourceConstant>
    | Tombstone
    | Ruin
    | StructureSpawn
    | StructureContainer
    | StructureStorage
    | StructureTerminal
    | StructureLink
    | Source;

export type EnergySinkTarget =
    | StructureSpawn
    | StructureExtension
    | StructureTower
    | StructureStorage
    | StructureTerminal
    | StructureContainer;

export class LogisticsManager {
    public constructor(private readonly colony: Colony) { }

    public init(): void { }

    public run(): void { }

    public getFillTarget(creep: Creep): EnergySinkTarget | undefined {
        const room = this.colony.room;

        if (!room) {
            return undefined;
        }

        const safeModeActive = (room.controller?.safeMode ?? 0) > 0;
        const defenseActive = !safeModeActive && this.colony.defenseManager.getSnapshot().hostileCount > 0;
        const energyStructures = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => {
                if (
                    structure.structureType !== STRUCTURE_EXTENSION &&
                    structure.structureType !== STRUCTURE_SPAWN &&
                    structure.structureType !== STRUCTURE_TOWER
                ) {
                    return false;
                }

                return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            },
        }) as Array<StructureSpawn | StructureExtension | StructureTower>;

        energyStructures.sort((left, right) => {
            const leftPriority = defenseActive && left.structureType === STRUCTURE_TOWER ? 0 : 1;
            const rightPriority = defenseActive && right.structureType === STRUCTURE_TOWER ? 0 : 1;

            if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
            }

            return creep.pos.getRangeTo(left) - creep.pos.getRangeTo(right);
        });

        if (energyStructures[0]) {
            return energyStructures[0];
        }

        if ((room.storage?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return room.storage;
        }

        if ((room.terminal?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return room.terminal;
        }

        const containers = room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                structure.structureType === STRUCTURE_CONTAINER &&
                (structure as StructureContainer).store.getFreeCapacity(RESOURCE_ENERGY) > 0,
        }) as StructureContainer[];

        return creep.pos.findClosestByPath(containers) ?? containers[0];
    }

    public getEnergySource(creep: Creep): EnergySourceTarget | undefined {
        const room = this.colony.room;

        if (!room) {
            return undefined;
        }

        const isConsumer = creep.memory.r === 'builder' || creep.memory.r === 'upgrader';

        if (!isConsumer) {
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (resource) => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50,
            }) as Resource<ResourceConstant> | null;

            if (droppedEnergy) {
                return droppedEnergy;
            }

            const tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {
                filter: (candidate) => candidate.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
            });

            if (tombstone) {
                return tombstone;
            }

            const ruin = creep.pos.findClosestByPath(FIND_RUINS, {
                filter: (candidate) => candidate.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
            });

            if (ruin) {
                return ruin;
            }
        } else {
            const localDropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (resource) =>
                    resource.resourceType === RESOURCE_ENERGY &&
                    resource.amount >= 50 &&
                    creep.pos.getRangeTo(resource) <= 3,
            }) as Resource<ResourceConstant> | null;

            if (localDropped) {
                return localDropped;
            }
        }

        if ((room.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return room.storage;
        }

        if ((room.terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return room.terminal;
        }

        const containers = room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_LINK) &&
                (structure as StructureContainer | StructureLink).store.getUsedCapacity(RESOURCE_ENERGY) > 0,
        }) as Array<StructureContainer | StructureLink>;

        const storedEnergy = creep.pos.findClosestByPath(containers) ?? containers[0];

        if (storedEnergy) {
            return storedEnergy;
        }

        // Saturation Bypass: Prevent RCL 1 deadlock by allowing workers to tap full spawns
        if (creep.name.includes('upgrader') || creep.name.includes('builder')) {
            const saturatedSpawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS, {
                filter: (s) => s.store.getUsedCapacity(RESOURCE_ENERGY) >= 250,
            });
            if (saturatedSpawn) return saturatedSpawn;
        }

        return undefined; // STRICT ROLE SEPARATION: Civilians must never mine raw sources.
    }
}
