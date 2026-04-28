import type { ColonyRole, DEFCON } from '../config';

export { };

declare global {
    interface ColonyMemoryData {
        d?: DEFCON;
        f?: Id<Creep>;
        s?: number;
        q?: number;
    }

    interface StatsMemoryData {
        uid?: number;
        bt?: string;
        rst?: number;
    }

    interface SegmentRootMemory {
        v?: number;
        l?: number;
    }

    interface BoostRequestMemory {
        labId: Id<StructureLab>;
        mineral: MineralBoostConstant;
        done?: boolean;
    }

    interface Memory {
        _v?: number;
        _seg?: SegmentRootMemory;
        colonies: Record<string, ColonyMemoryData>;
        creeps: Record<string, CreepMemory>;
        rooms: Record<string, RoomMemory>;
        stats?: StatsMemoryData;
    }

    interface CreepMemory {
        g?: number;
        r?: ColonyRole;
        rn?: string;
        t?: string;
        s?: 'load' | 'work';
        w?: string[];
        b?: BoostRequestMemory;
        x?: number;
        y?: number;
    }

    interface RoomMemory {
        defcon?: DEFCON;
    }
}
