import type { ColonyRole, DEFCON } from '../config';

export interface SpawnRequest {
    role: ColonyRole;
    priority: number;
    body: BodyPartConstant[];
    memory: CreepMemory;
    reason: string;
}

export interface DefenseSnapshot {
    defcon: DEFCON;
    focusTargetId?: Id<Creep>;
    hostileCount: number;
}

export interface StatsSnapshot {
    time: number;
    cpu: number;
    bucket: number;
    colonies: number;
    creeps: number;
    buildTarget: string;
}
