describe('main loop integration', () => {
    it('runs a full six-phase tick without crashing', async () => {
        jest.resetModules();
        (Game as any).cpu.bucket = 10_000;

        const { loop } = await import('../../src/main');

        expect(() => loop()).not.toThrow();
        expect(RawMemory.setActiveSegments).toHaveBeenCalled();
        expect(Game.cpu.generatePixel).toHaveBeenCalled();
        expect(Memory.creeps).toBeDefined();
        expect(Memory.colonies).toBeDefined();
    });
});
