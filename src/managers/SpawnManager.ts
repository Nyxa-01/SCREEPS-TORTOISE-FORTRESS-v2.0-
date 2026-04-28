import {
    BOOST_STOCKPILE,
    BUNKER_DEFENDER_BODY,
    ROLE_MINIMUMS,
    SYSTEM_GENERATION,
    type ColonyRole,
} from '../config';
import type { Colony } from '../colony/Colony';
import { Mem } from '../memory/Mem';
import type { SpawnRequest } from '../types/domain';
import { buildRepeatedBody, getBodyCost } from '../utils/body';

const EMERGENCY_HARVESTER_PATTERN: BodyPartConstant[] = [WORK, CARRY, MOVE];
const HAULER_PATTERN: BodyPartConstant[] = [CARRY, CARRY, MOVE];
const BUILDER_PATTERN: BodyPartConstant[] = [WORK, CARRY, CARRY, MOVE, MOVE];
const UPGRADER_PATTERN: BodyPartConstant[] = [WORK, CARRY, MOVE, MOVE];
const DEFENDER_PATTERN: BodyPartConstant[] = [TOUGH, RANGED_ATTACK, MOVE, MOVE];

export class SpawnManager {
    private queue: SpawnRequest[] = [];

    public constructor(private readonly colony: Colony) { }

    public init(): void {
        this.queue = this.buildQueue();
        Mem.getColony(this.colony.name).q = this.queue.length;
    }

    public run(): void {
        const room = this.colony.room;

        if (!room || this.queue.length === 0) {
            return;
        }

        const idleSpawns = room.find(FIND_MY_SPAWNS, {
            filter: (spawn) => !spawn.spawning,
        });

        for (const spawn of idleSpawns) {
            const next = this.queue[0];

            if (!next) {
                break;
            }

            const creepName = `${this.colony.name}-${next.role}-${Game.time}-${Mem.nextUid()}`;
            const result = spawn.spawnCreep(next.body, creepName, { memory: next.memory });

            if (result === OK) {
                this.queue.shift();
            }
        }

        Mem.getColony(this.colony.name).q = this.queue.length;
    }

    public getQueue(): SpawnRequest[] {
        return [...this.queue];
    }

    private buildQueue(): SpawnRequest[] {
        const room = this.colony.room;

        if (!room) {
            return [];
        }

        const roleCounts: Record<ColonyRole, number> = {
            emergencyHarvester: this.colony.getCreeps('emergencyHarvester').length,
            defender: this.colony.getCreeps('defender').length,
            hauler: this.colony.getCreeps('hauler').length,
            builder: this.colony.getCreeps('builder').length,
            upgrader: this.colony.getCreeps('upgrader').length,
        };

        const requests: SpawnRequest[] = [];

        if (roleCounts.emergencyHarvester === 0) {
            requests.push(this.createRequest('emergencyHarvester', 0, 'bootstrap economy'));
        }

        const requiredDefenders = this.colony.defenseManager.getRequiredDefenderCount();
        for (let index = roleCounts.defender; index < requiredDefenders; index += 1) {
            requests.push(this.createRequest('defender', 1, 'bunker defense'));
        }

        const minimumHaulers = room.storage ? ROLE_MINIMUMS.hauler : 1;
        for (let index = roleCounts.hauler; index < minimumHaulers; index += 1) {
            requests.push(this.createRequest('hauler', 2, 'maintain logistics throughput'));
        }

        const minimumBuilders = room.find(FIND_MY_CONSTRUCTION_SITES).length > 0 ? ROLE_MINIMUMS.builder : 0;
        for (let index = roleCounts.builder; index < minimumBuilders; index += 1) {
            requests.push(this.createRequest('builder', 3, 'complete construction sites'));
        }

        const minimumUpgraders = this.colony.upgradeManager.shouldUpgrade() ? ROLE_MINIMUMS.upgrader : 0;
        for (let index = roleCounts.upgrader; index < minimumUpgraders; index += 1) {
            requests.push(this.createRequest('upgrader', 4, 'maintain controller progress'));
        }

        return requests.sort((left, right) => left.priority - right.priority);
    }

    private createRequest(role: ColonyRole, priority: number, reason: string): SpawnRequest {
        const room = this.colony.room;
        const energyBudget =
            role === 'emergencyHarvester' ? room?.energyAvailable ?? 300 : room?.energyCapacityAvailable ?? 300;

        const memory: CreepMemory = {
            g: SYSTEM_GENERATION,
            r: role,
            rn: this.colony.name,
            s: 'load',
        };

        if (role === 'defender') {
            const boost = this.findBoostRequest();

            if (boost) {
                memory.b = boost;
            }
        }

        return {
            role,
            priority,
            body: this.getBody(role, energyBudget),
            memory,
            reason,
        };
    }

    private getBody(role: ColonyRole, energyBudget: number): BodyPartConstant[] {
        const room = this.colony.room;
        const energyLimit = room?.energyCapacityAvailable ?? energyBudget;
        const scaledBudget = Math.min(energyBudget, energyLimit);
        const buildElasticBody = (pattern: readonly BodyPartConstant[]): BodyPartConstant[] => {
            const body = buildRepeatedBody(pattern, scaledBudget, 1);

            if (getBodyCost(body) > energyLimit) {
                return [WORK, CARRY, MOVE];
            }

            return body;
        };

        switch (role) {
            case 'emergencyHarvester':
                return buildElasticBody(EMERGENCY_HARVESTER_PATTERN);
            case 'hauler':
                return buildElasticBody(HAULER_PATTERN);
            case 'builder':
                return buildElasticBody(BUILDER_PATTERN);
            case 'upgrader':
                return buildElasticBody(UPGRADER_PATTERN);
            case 'defender':
                if (getBodyCost(BUNKER_DEFENDER_BODY) <= scaledBudget) {
                    return [...BUNKER_DEFENDER_BODY];
                }

                return buildElasticBody(DEFENDER_PATTERN);
            default:
                return [...EMERGENCY_HARVESTER_PATTERN];
        }
    }

    private findBoostRequest(): BoostRequestMemory | undefined {
        const room = this.colony.room;

        if (!room) {
            return undefined;
        }

        const labs = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_LAB,
        }) as StructureLab[];

        for (const lab of labs) {
            for (const mineral of Object.keys(BOOST_STOCKPILE) as MineralBoostConstant[]) {
                if (
                    lab.store.getUsedCapacity(RESOURCE_ENERGY) >= LAB_BOOST_ENERGY &&
                    lab.store.getUsedCapacity(mineral) >= LAB_BOOST_MINERAL
                ) {
                    return {
                        labId: lab.id,
                        mineral,
                    };
                }
            }
        }

        return undefined;
    }
}
