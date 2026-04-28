import { DEFCON, SYSTEM_GENERATION, type ColonyRole } from '../config';
import { BuilderBehavior } from '../behaviors/BuilderBehavior';
import { HarvesterBehavior } from '../behaviors/HarvesterBehavior';
import { HaulerBehavior } from '../behaviors/HaulerBehavior';
import { UpgraderBehavior } from '../behaviors/UpgraderBehavior';
import { DefenderBehavior } from '../behaviors/DefenderBehavior';
import { ConstructionManager } from '../managers/ConstructionManager';
import { DefenseManager } from '../managers/DefenseManager';
import { LogisticsManager } from '../managers/LogisticsManager';
import { SpawnManager } from '../managers/SpawnManager';
import { UpgradeManager } from '../managers/UpgradeManager';
import { Mem } from '../memory/Mem';

interface Behavior {
    run(creep: Creep, colony: Colony): boolean;
}

export class Colony {
    public readonly logisticsManager: LogisticsManager;
    public readonly constructionManager: ConstructionManager;
    public readonly defenseManager: DefenseManager;
    public readonly spawnManager: SpawnManager;
    public readonly upgradeManager: UpgradeManager;

    private readonly behaviors: Record<ColonyRole, Behavior>;

    public constructor(public readonly name: string) {
        this.logisticsManager = new LogisticsManager(this);
        this.constructionManager = new ConstructionManager(this);
        this.defenseManager = new DefenseManager(this);
        this.spawnManager = new SpawnManager(this);
        this.upgradeManager = new UpgradeManager(this);

        this.behaviors = {
            emergencyHarvester: new HarvesterBehavior(),
            hauler: new HaulerBehavior(),
            builder: new BuilderBehavior(),
            upgrader: new UpgraderBehavior(),
            defender: new DefenderBehavior(),
        };
    }

    public get room(): Room | undefined {
        return Game.rooms[this.name];
    }

    public init(): void {
        if (!this.room) {
            return;
        }

        this.defenseManager.init();
        this.logisticsManager.init();
        this.upgradeManager.init();
        this.spawnManager.init();
        this.constructionManager.init();
    }

    public run(): void {
        if (!this.room) {
            return;
        }

        this.defenseManager.run();
        this.spawnManager.run();
        this.runCreeps();
        this.constructionManager.run();
        this.upgradeManager.run();
    }

    public postRun(): void {
        const colonyMemory = Mem.getColony(this.name);
        colonyMemory.s = this.getCreeps().length;
    }

    public getCreeps(role?: ColonyRole): Creep[] {
        return Object.values(Game.creeps).filter((creep) => {
            const inColony = creep.memory.rn === this.name;
            return role ? inColony && creep.memory.r === role : inColony;
        });
    }

    public getPrimarySpawn(): StructureSpawn | undefined {
        return this.room?.find(FIND_MY_SPAWNS)[0];
    }

    private runCreeps(): void {
        let creepErrors = 0;
        const currentDefcon = this.defenseManager.getSnapshot().defcon;

        for (const creep of this.getCreeps()) {
            const role = creep.memory.r;
            const isObsolete = (creep.memory.g ?? 0) < SYSTEM_GENERATION;
            let shouldPurge = false;

            if (isObsolete && currentDefcon === DEFCON.GREEN) {
                if (role === 'emergencyHarvester' || role === 'hauler') {
                    const hasReplacement = this.getCreeps(role).some((candidate) => (candidate.memory.g ?? 0) >= SYSTEM_GENERATION);
                    if (hasReplacement) {
                        shouldPurge = true;
                    }
                } else {
                    shouldPurge = true;
                }
            }

            if (shouldPurge) {
                const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
                if (spawn) {
                    if (creep.store.getUsedCapacity() > 0) {
                        for (const resourceType of Object.keys(creep.store) as ResourceConstant[]) {
                            if (creep.transfer(spawn, resourceType) === ERR_NOT_IN_RANGE) {
                                creep.moveTo(spawn);
                                break;
                            }
                        }
                    } else if (spawn.recycleCreep(creep) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(spawn);
                    }
                } else {
                    creep.suicide();
                }
                continue;
            }

            if (!role) {
                continue;
            }

            const behavior = this.behaviors[role];

            if (!behavior) {
                continue;
            }

            try {
                behavior.run(creep, this);
            } catch (error) {
                creepErrors += 1;
                console.log(`[colony:${this.name}] creep ${creep.name} failed: ${String(error)}`);
            }
        }

        if (creepErrors > 5) {
            throw new Error(`Catastrophic creep failure threshold reached: ${creepErrors} errors.`);
        }
    }
}
