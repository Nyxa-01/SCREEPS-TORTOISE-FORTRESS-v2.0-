describe('Memory systems', () => {
    it('prunes dead creeps from Memory', async () => {
        jest.resetModules();
        const { Mem } = await import('../../src/memory/Mem');

        Memory.creeps = {
            alive: {},
            dead: {},
        } as Record<string, CreepMemory>;
        Game.creeps = {
            alive: {} as Creep,
        };

        Mem.pruneDeadCreeps();

        expect(Memory.creeps.alive).toBeDefined();
        expect(Memory.creeps.dead).toBeUndefined();
    });

    it('compresses and reloads segment payloads', async () => {
        jest.resetModules();
        const { SegmentManager, SegmentId } = await import('../../src/memory/segments');

        SegmentManager.preTick();
        SegmentManager.setCostMatrix('W0N0', [1, 2, 3, 4]);
        (Game as any).time = 2;
        SegmentManager.postTick();

        expect(typeof RawMemory.segments[SegmentId.CostMatrices]).toBe('string');
        RawMemory.segments[SegmentId.CostMatrices] = RawMemory.segments[SegmentId.CostMatrices] as string;

        SegmentManager.preTick();

        expect(SegmentManager.getCostMatrix('W0N0')).toEqual([1, 2, 3, 4]);
    });
});
