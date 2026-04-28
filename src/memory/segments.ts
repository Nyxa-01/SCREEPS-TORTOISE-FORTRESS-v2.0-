import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

import { SEGMENT_FLUSH_INTERVAL, TARGET_SEGMENTS } from '../config';
import type { StatsSnapshot } from '../types/domain';

export enum SegmentId {
    Stats = 0,
    CostMatrices = 1,
}

interface StatsSegmentData {
    history: StatsSnapshot[];
}

interface CostMatrixRecord {
    tick: number;
    data: number[];
}

interface CostMatrixSegmentData {
    rooms: Record<string, CostMatrixRecord>;
}

const cache: {
    [SegmentId.Stats]: StatsSegmentData;
    [SegmentId.CostMatrices]: CostMatrixSegmentData;
} = {
    [SegmentId.Stats]: { history: [] },
    [SegmentId.CostMatrices]: { rooms: {} },
};

const dirtySegments = new Set<SegmentId>();

function deserializeSegment<T>(segmentId: SegmentId, fallback: T): T {
    const raw = RawMemory.segments[segmentId];

    if (typeof raw !== 'string' || raw.length === 0) {
        return fallback;
    }

    const inflated = decompressFromUTF16(raw) ?? raw;

    try {
        return JSON.parse(inflated) as T;
    } catch {
        return fallback;
    }
}

function serializeSegment(payload: unknown): string {
    return compressToUTF16(JSON.stringify(payload));
}

function markDirty(segmentId: SegmentId): void {
    dirtySegments.add(segmentId);
}

export const SegmentManager = {
    preTick(): void {
        RawMemory.setActiveSegments([...TARGET_SEGMENTS]);

        if (RawMemory.segments[SegmentId.Stats] !== undefined) {
            cache[SegmentId.Stats] = deserializeSegment(SegmentId.Stats, { history: [] });
        }

        if (RawMemory.segments[SegmentId.CostMatrices] !== undefined) {
            cache[SegmentId.CostMatrices] = deserializeSegment(SegmentId.CostMatrices, { rooms: {} });
        }
    },

    postTick(): void {
        RawMemory.setActiveSegments([...TARGET_SEGMENTS]);

        if (dirtySegments.size === 0) {
            return;
        }

        const pending = [...dirtySegments];
        const flushNow = Game.time % SEGMENT_FLUSH_INTERVAL === 0 ? pending : pending.slice(0, 1);

        for (const segmentId of flushNow) {
            RawMemory.segments[segmentId] = serializeSegment(cache[segmentId]);
            dirtySegments.delete(segmentId);
        }
    },

    appendStats(snapshot: StatsSnapshot): void {
        const history = cache[SegmentId.Stats].history;
        history.push(snapshot);

        while (history.length > 250) {
            history.shift();
        }

        markDirty(SegmentId.Stats);
    },

    getStatsHistory(): StatsSnapshot[] {
        return cache[SegmentId.Stats].history;
    },

    getCostMatrix(roomName: string): number[] | undefined {
        return cache[SegmentId.CostMatrices].rooms[roomName]?.data;
    },

    setCostMatrix(roomName: string, data: number[]): void {
        cache[SegmentId.CostMatrices].rooms[roomName] = {
            tick: Game.time,
            data,
        };

        markDirty(SegmentId.CostMatrices);
    },

    pruneCostMatrices(ttl = 500): void {
        const rooms = cache[SegmentId.CostMatrices].rooms;

        for (const [roomName, record] of Object.entries(rooms)) {
            if (Game.time - record.tick > ttl) {
                delete rooms[roomName];
                markDirty(SegmentId.CostMatrices);
            }
        }
    },
};
