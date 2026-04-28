import { Empire } from './empire/Empire';
import { Mem } from './memory/Mem';
import { SegmentManager } from './memory/segments';
import { mountPrototypes } from './prototypes';
import { ErrorMapper, Watchdog } from './utils/ErrorMapper';

let runtimeBootstrapped = false;

function bootstrapRuntime(): void {
    if (runtimeBootstrapped) {
        return;
    }

    mountPrototypes();
    runtimeBootstrapped = true;
}

function preTick(): void {
    bootstrapRuntime();
    SegmentManager.preTick();
    SegmentManager.pruneCostMatrices();
    Mem.ensureRoots();
    Mem.pruneDeadCreeps();
}

function build(): Empire {
    const empire = Empire.get();
    empire.refresh();
    return empire;
}

function init(empire: Empire): void {
    empire.init();
}

function run(empire: Empire): void {
    empire.run();
}

function postRun(empire: Empire): void {
    empire.postRun();
    SegmentManager.postTick();

    if (Game.cpu.bucket === 10_000 && typeof Game.cpu.generatePixel === 'function') {
        Game.cpu.generatePixel();
    }
}

function watchdog(): void {
    Watchdog.reset();
}

export const loop = ErrorMapper.wrapLoop(() => {
    preTick();
    const empire = build();
    init(empire);
    run(empire);
    postRun(empire);
    watchdog();
});
