import { DEFCON } from '../config';

export const Mem = {
    ensureRoots(): void {
        Memory._v ??= 1;
        Memory._seg ??= { v: 1, l: Game.time };
        Memory.creeps ??= {};
        Memory.rooms ??= {};
        Memory.colonies ??= {};
        Memory.stats ??= {};
        Memory.stats.bt ??= BUILD_TARGET;
    },

    pruneDeadCreeps(): void {
        this.ensureRoots();

        for (const creepName of Object.keys(Memory.creeps)) {
            if (!(creepName in Game.creeps)) {
                delete Memory.creeps[creepName];
            }
        }
    },

    getColony(roomName: string): ColonyMemoryData {
        this.ensureRoots();
        Memory.colonies[roomName] ??= { d: DEFCON.GREEN, q: 0 };
        return Memory.colonies[roomName];
    },

    nextUid(): number {
        this.ensureRoots();
        const next = (Memory.stats?.uid ?? 0) + 1;

        if (Memory.stats) {
            Memory.stats.uid = next;
        }

        return next;
    },
};
