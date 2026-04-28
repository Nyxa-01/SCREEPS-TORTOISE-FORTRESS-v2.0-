export const SYSTEM_GENERATION = 23; // Increment this to force global creep recycling

export enum DEFCON {
    GREEN = 'green',
    YELLOW = 'yellow',
    ORANGE = 'orange',
    RED = 'red',
}

export const RAMPART_TARGET_HITS: Readonly<Record<number, number>> = {
    2: 10_000,
    3: 50_000,
    4: 250_000,
    5: 1_000_000,
    6: 5_000_000,
    7: 25_000_000,
    8: 100_000_000,
};

export const BOOST_STOCKPILE = {
    XGHO2: 3_000,
    XLHO2: 3_000,
    XKHO2: 3_000,
    XUH2O: 3_000,
    XZHO2: 3_000,
} as const;

export const BUNKER_DEFENDER_BODY: BodyPartConstant[] = [
    ...Array<BodyPartConstant>(12).fill(TOUGH),
    ...Array<BodyPartConstant>(28).fill(RANGED_ATTACK),
    ...Array<BodyPartConstant>(10).fill(MOVE),
];

export const SAFE_MODE_POLICY = {
    hoardCharges: 3,
    rampartCriticalHits: 25_000,
    triggerBodyParts: [ATTACK, RANGED_ATTACK, WORK, HEAL] as BodyPartConstant[],
} as const;

export const MIN_RAMPART_REPAIR_ENERGY = 800;
export const PATH_CACHE_TTL = 75;
export const SEGMENT_FLUSH_INTERVAL = 2;

export const ROLE_PRIORITY = [
    'emergencyHarvester',
    'defender',
    'hauler',
    'builder',
    'upgrader',
] as const;

export type ColonyRole = (typeof ROLE_PRIORITY)[number];

export const ROLE_BODIES: Readonly<Record<ColonyRole, BodyPartConstant[]>> = {
    emergencyHarvester: [WORK, WORK, CARRY, MOVE],
    defender: BUNKER_DEFENDER_BODY,
    hauler: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
    builder: [WORK, CARRY, CARRY, MOVE, MOVE],
    upgrader: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
};

export const ROLE_MINIMUMS: Readonly<Record<ColonyRole, number>> = {
    emergencyHarvester: 1,
    defender: 0,
    hauler: 2,
    builder: 1,
    upgrader: 1,
};

export const TARGET_SEGMENTS = [0, 1] as const;
