import { DEFCON } from '../config';
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

type ClaimedLogisticsTarget = EnergySourceTarget | EnergySinkTarget;

export class LogisticsManager {
    public constructor(private readonly colony: Colony) { }

    public init(): void { }

    public run(): void { }

    public getFillTarget(creep: Creep): EnergySinkTarget | undefined {
        const room = this.colony.room;

        if (!room) {
            return undefined;
        }

        const defcon = this.colony.defenseManager.getSnapshot().defcon;
        const reservedDelivery = creep.memory.r === 'hauler'
            ? this.getReservedDeliveryByTarget(creep)
            : new Map<string, number>();
        const coreStructures = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => {
                if (
                    structure.structureType !== STRUCTURE_EXTENSION &&
                    structure.structureType !== STRUCTURE_SPAWN &&
                    structure.structureType !== STRUCTURE_TOWER
                ) {
                    return false;
                }

                return this.getAvailableSinkCapacity(structure, reservedDelivery) > 0;
            },
        }) as Array<StructureSpawn | StructureExtension | StructureTower>;
        const containers = room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                structure.structureType === STRUCTURE_CONTAINER &&
                this.getAvailableSinkCapacity(structure as StructureContainer, reservedDelivery) > 0,
        }) as StructureContainer[];
        const fillTargets: EnergySinkTarget[] = [...coreStructures, ...containers];

        const storage = room.storage;
        if (storage && this.getAvailableSinkCapacity(storage, reservedDelivery) > 0) {
            fillTargets.push(storage);
        }

        const terminal = room.terminal;
        if (terminal && this.getAvailableSinkCapacity(terminal, reservedDelivery) > 0) {
            fillTargets.push(terminal);
        }

        fillTargets.sort((left, right) => {
            const leftPriority = this.getFillPriority(left, defcon);
            const rightPriority = this.getFillPriority(right, defcon);

            if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
            }

            return creep.pos.getRangeTo(left) - creep.pos.getRangeTo(right);
        });

        return this.rememberTarget(creep, fillTargets[0]);
    }

    public getEnergySource(creep: Creep): EnergySourceTarget | undefined {
        const room = this.colony.room;

        if (!room) {
            return undefined;
        }

        const isConsumer = creep.memory.r === 'builder' || creep.memory.r === 'upgrader';
        const reservedTransit = creep.memory.r === 'hauler'
            ? this.getReservedTransitByTarget(creep)
            : new Map<string, number>();

        if (!isConsumer) {
            const droppedEnergy = this.findClosestByPath(
                creep,
                room.find(FIND_DROPPED_RESOURCES, {
                    filter: (resource) =>
                        resource.resourceType === RESOURCE_ENERGY &&
                        resource.amount >= 50 &&
                        !this.isTransitClaimed(resource.id, resource.amount, reservedTransit),
                }) as Resource<ResourceConstant>[],
            );

            if (droppedEnergy) {
                return this.rememberTarget(creep, droppedEnergy);
            }

            const tombstone = this.findClosestByPath(
                creep,
                room.find(FIND_TOMBSTONES, {
                    filter: (candidate) =>
                        candidate.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                        !this.isTransitClaimed(
                            candidate.id,
                            candidate.store.getUsedCapacity(RESOURCE_ENERGY),
                            reservedTransit,
                        ),
                }),
            );

            if (tombstone) {
                return this.rememberTarget(creep, tombstone);
            }

            const ruin = this.findClosestByPath(
                creep,
                room.find(FIND_RUINS, {
                    filter: (candidate) =>
                        candidate.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                        !this.isTransitClaimed(
                            candidate.id,
                            candidate.store.getUsedCapacity(RESOURCE_ENERGY),
                            reservedTransit,
                        ),
                }),
            );

            if (ruin) {
                return this.rememberTarget(creep, ruin);
            }
        } else {
            const localDropped = this.findClosestByPath(
                creep,
                room.find(FIND_DROPPED_RESOURCES, {
                    filter: (resource) =>
                        resource.resourceType === RESOURCE_ENERGY &&
                        resource.amount >= 50 &&
                        creep.pos.getRangeTo(resource) <= 3,
                }) as Resource<ResourceConstant>[],
            );

            if (localDropped) {
                return localDropped;
            }
        }

        if ((room.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return this.rememberTarget(creep, room.storage);
        }

        if ((room.terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
            return this.rememberTarget(creep, room.terminal);
        }

        const containers = room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_LINK) &&
                (structure as StructureContainer | StructureLink).store.getUsedCapacity(RESOURCE_ENERGY) > 0,
        }) as Array<StructureContainer | StructureLink>;

        const storedEnergy = this.findClosestByPath(creep, containers);

        if (storedEnergy) {
            return this.rememberTarget(creep, storedEnergy);
        }

        // Saturation Bypass: Prevent RCL 1 deadlock by allowing workers to tap full spawns
        if (creep.memory.r === 'upgrader' || creep.memory.r === 'builder') {
            const saturatedSpawn = this.findClosestByPath(
                creep,
                room.find(FIND_MY_SPAWNS, {
                    filter: (candidate) => candidate.store.getUsedCapacity(RESOURCE_ENERGY) >= 250,
                }),
            );

            if (saturatedSpawn) {
                return saturatedSpawn;
            }
        }

        return this.rememberTarget(creep, undefined); // STRICT ROLE SEPARATION: Civilians must never mine raw sources.
    }

    private getFillPriority(target: EnergySinkTarget, defcon: DEFCON): number {
        switch (target.structureType) {
            case STRUCTURE_SPAWN:
            case STRUCTURE_EXTENSION:
                return 0;
            case STRUCTURE_TOWER:
                return defcon !== DEFCON.GREEN ? 0 : 1;
            case STRUCTURE_CONTAINER:
                return 2;
            case STRUCTURE_STORAGE:
                return 3;
            case STRUCTURE_TERMINAL:
                return 4;
            default:
                return 5;
        }
    }

    private getReservedDeliveryByTarget(creep: Creep): Map<string, number> {
        const reservedDelivery = new Map<string, number>();

        for (const hauler of this.colony.getCreeps('hauler')) {
            if (
                hauler.name === creep.name ||
                hauler.memory.r !== 'hauler' ||
                hauler.memory.s !== 'work' ||
                !hauler.memory.t
            ) {
                continue;
            }

            const outboundEnergy = hauler.store.getUsedCapacity(RESOURCE_ENERGY);

            if (outboundEnergy <= 0) {
                continue;
            }

            reservedDelivery.set(
                hauler.memory.t,
                (reservedDelivery.get(hauler.memory.t) ?? 0) + outboundEnergy,
            );
        }

        return reservedDelivery;
    }

    private getReservedTransitByTarget(creep: Creep): Map<string, number> {
        const reservedTransit = new Map<string, number>();

        for (const hauler of this.colony.getCreeps('hauler')) {
            if (hauler.name === creep.name || hauler.memory.r !== 'hauler' || !hauler.memory.t) {
                continue;
            }

            const inboundCapacity = hauler.store.getFreeCapacity(RESOURCE_ENERGY);

            if (inboundCapacity <= 0) {
                continue;
            }

            reservedTransit.set(
                hauler.memory.t,
                (reservedTransit.get(hauler.memory.t) ?? 0) + inboundCapacity,
            );
        }

        return reservedTransit;
    }

    private isTransitClaimed(
        targetId: string,
        availableEnergy: number,
        reservedTransit: ReadonlyMap<string, number>,
    ): boolean {
        return (reservedTransit.get(targetId) ?? 0) >= availableEnergy;
    }

    private getAvailableSinkCapacity(
        target: EnergySinkTarget,
        reservedDelivery: ReadonlyMap<string, number>,
    ): number {
        return target.store.getFreeCapacity(RESOURCE_ENERGY) - (reservedDelivery.get(target.id) ?? 0);
    }

    private findClosestByPath<T extends { pos: RoomPosition }>(
        creep: Creep,
        targets: readonly T[],
    ): T | undefined {
        if (targets.length === 0) {
            return undefined;
        }

        return creep.pos.findClosestByPath([...targets]) ?? targets[0];
    }

    private rememberTarget<T extends ClaimedLogisticsTarget | undefined>(creep: Creep, target: T): T {
        if (creep.memory.r !== 'hauler') {
            return target;
        }

        if (target) {
            creep.memory.t = target.id;
        } else {
            delete creep.memory.t;
        }

        return target;
    }
}
