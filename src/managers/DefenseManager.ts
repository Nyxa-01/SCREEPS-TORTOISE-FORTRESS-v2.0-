import { DEFCON, MIN_RAMPART_REPAIR_ENERGY, SAFE_MODE_POLICY } from '../config';
import type { Colony } from '../colony/Colony';
import { Mem } from '../memory/Mem';
import type { DefenseSnapshot } from '../types/domain';
import { isNearRoomEdge } from '../utils/position';

interface RankedHostile {
    hostile: Creep;
    netDamage: number;
    threat: number;
}

export class DefenseManager {
    private hostiles: Creep[] = [];
    private edgeDanceHostiles: Creep[] = [];
    private rankedTargets: RankedHostile[] = [];
    private snapshot: DefenseSnapshot = {
        defcon: DEFCON.GREEN,
        hostileCount: 0,
    };

    public constructor(private readonly colony: Colony) { }

    public init(): void {
        this.refresh();
    }

    public run(): void {
        this.refresh();
        this.runTowers();
        this.maybeTriggerSafeMode();
    }

    public getSnapshot(): DefenseSnapshot {
        return this.snapshot;
    }

    public getHostiles(): Creep[] {
        return this.hostiles;
    }

    public getEdgeDanceTargets(): Creep[] {
        return this.edgeDanceHostiles;
    }

    public getRequiredDefenderCount(): number {
        if (this.snapshot.defcon === DEFCON.RED) {
            return Math.max(2, this.rankedTargets.length);
        }

        if (this.snapshot.defcon === DEFCON.ORANGE) {
            return Math.max(1, this.rankedTargets.length);
        }

        return 0;
    }

    public getDefenderTarget(creep: Creep): Creep | undefined {
        void creep;
        return this.rankedTargets[0]?.hostile ?? this.hostiles[0];
    }

    public static isEdgeDanceTarget(position: RoomPosition): boolean {
        return isNearRoomEdge(position, 3);
    }

    public static getThreatPriority(hostile: Creep): number {
        return (
            hostile.getActiveBodyparts(HEAL) * 1_000 +
            hostile.getActiveBodyparts(RANGED_ATTACK) * 100 +
            hostile.getActiveBodyparts(ATTACK) * 10 +
            hostile.getActiveBodyparts(WORK)
        );
    }

    public static calculateNetDamage(
        towers: StructureTower[],
        hostile: Creep,
        hostiles: Creep[],
    ): number {
        const towerDamage = towers.reduce(
            (total, tower) => total + DefenseManager.getTowerDamageAtRange(tower.pos.getRangeTo(hostile)),
            0,
        );

        return towerDamage - DefenseManager.getHostileHealing(hostile, hostiles);
    }

    public static getTowerDamageAtRange(range: number): number {
        if (range <= TOWER_OPTIMAL_RANGE) {
            return TOWER_POWER_ATTACK;
        }

        if (range >= TOWER_FALLOFF_RANGE) {
            return Math.floor(TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF));
        }

        const falloffRatio =
            (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);

        return Math.floor(TOWER_POWER_ATTACK * (1 - TOWER_FALLOFF * falloffRatio));
    }

    private static getHostileHealing(target: Creep, hostiles: Creep[]): number {
        let totalHealing = 0;

        for (const hostile of hostiles) {
            const range = hostile.pos.getRangeTo(target);

            if (range > 3) {
                continue;
            }

            for (const part of hostile.body) {
                if (part.type !== HEAL || part.hits <= 0) {
                    continue;
                }

                const basePower = range <= 1 ? HEAL_POWER : RANGED_HEAL_POWER;
                const boostMultiplier =
                    part.boost && (BOOSTS[HEAL] as any)[part.boost]
                        ? (BOOSTS[HEAL][part.boost].heal as number | undefined) ?? 1
                        : 1;

                totalHealing += basePower * boostMultiplier;
            }
        }

        return totalHealing;
    }

    private refresh(): void {
        const room = this.colony.room;

        if (!room) {
            this.hostiles = [];
            this.edgeDanceHostiles = [];
            this.rankedTargets = [];
            this.snapshot = { defcon: DEFCON.GREEN, hostileCount: 0 };
            return;
        }

        this.hostiles = room.find(FIND_HOSTILE_CREEPS);
        this.edgeDanceHostiles = this.hostiles.filter((hostile) => DefenseManager.isEdgeDanceTarget(hostile.pos));

        const towers = this.getTowers();
        this.rankedTargets = this.hostiles
            .filter((hostile) => !DefenseManager.isEdgeDanceTarget(hostile.pos))
            .map((hostile) => ({
                hostile,
                netDamage: DefenseManager.calculateNetDamage(towers, hostile, this.hostiles),
                threat: DefenseManager.getThreatPriority(hostile),
            }))
            .filter((target) => target.netDamage > 0)
            .sort((left, right) => {
                if (left.threat !== right.threat) {
                    return right.threat - left.threat;
                }

                if (left.netDamage !== right.netDamage) {
                    return right.netDamage - left.netDamage;
                }

                return left.hostile.hits - right.hostile.hits;
            });

        const defcon = this.getDefconLevel();
        this.snapshot = {
            defcon,
            hostileCount: this.hostiles.length,
            focusTargetId: this.rankedTargets[0]?.hostile.id,
        };

        const colonyMemory = Mem.getColony(this.colony.name);
        colonyMemory.d = defcon;
        colonyMemory.f = this.snapshot.focusTargetId;
    }

    private runTowers(): void {
        const towers = this.getTowers();

        if (towers.length === 0) {
            return;
        }

        const focusTarget = this.rankedTargets[0]?.hostile;

        if (focusTarget) {
            for (const tower of towers) {
                tower.attack(focusTarget);
            }

            return;
        }

        const totalTowerEnergy = towers.reduce(
            (total, tower) => total + tower.store.getUsedCapacity(RESOURCE_ENERGY),
            0,
        );
        const repairTarget = this.colony.constructionManager.getRepairTarget();

        if (
            repairTarget &&
            totalTowerEnergy > MIN_RAMPART_REPAIR_ENERGY &&
            repairTarget.hits < SAFE_MODE_POLICY.rampartCriticalHits
        ) {
            for (const tower of towers) {
                tower.repair(repairTarget);
            }
        }
    }

    private maybeTriggerSafeMode(): void {
        const room = this.colony.room;
        const controller = room?.controller;

        if (!room || !controller?.my || controller.safeMode || (controller.safeModeAvailable ?? 0) <= 0) {
            return;
        }

        const breachDetected = this.hostiles.some((hostile) => this.isConfirmedPlayerBreach(hostile));

        if (!breachDetected) {
            return;
        }

        const spawnsUnderImmediateThreat = room.find(FIND_MY_SPAWNS).some((spawn) =>
            this.hostiles.some((hostile) => hostile.pos.getRangeTo(spawn) <= 5),
        );

        if (
            spawnsUnderImmediateThreat ||
            (controller.safeModeAvailable ?? 0) > SAFE_MODE_POLICY.hoardCharges
        ) {
            controller.activateSafeMode();
        }
    }

    private isConfirmedPlayerBreach(hostile: Creep): boolean {
        if (hostile.owner.username === 'Invader' || hostile.owner.username === 'Source Keeper') {
            return false;
        }

        if (DefenseManager.isEdgeDanceTarget(hostile.pos)) {
            return false;
        }

        const canBreach = SAFE_MODE_POLICY.triggerBodyParts.some(
            (part) => hostile.getActiveBodyparts(part) > 0,
        );

        if (!canBreach) {
            return false;
        }

        const protectedByRampart = hostile.pos.lookFor(LOOK_STRUCTURES).some((structure) => {
            return structure.structureType === STRUCTURE_RAMPART && (structure as StructureRampart).my;
        });

        return !protectedByRampart;
    }

    private getDefconLevel(): DEFCON {
        if (this.hostiles.length === 0) {
            return DEFCON.GREEN;
        }

        if (this.hostiles.some((hostile) => this.isConfirmedPlayerBreach(hostile))) {
            return DEFCON.RED;
        }

        if (this.rankedTargets.length > 0) {
            return DEFCON.ORANGE;
        }

        return DEFCON.YELLOW;
    }

    private getTowers(): StructureTower[] {
        const room = this.colony.room;

        if (!room) {
            return [];
        }

        return room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_TOWER,
        }) as StructureTower[];
    }
}
