import { SourceMapConsumer } from 'source-map-js';

const SOURCE_MAP_PLACEHOLDER = '__SCREEPS_SOURCE_MAP__';
const STACK_LINE_PATTERN = /(main(?:\.js)?):(\d+):(\d+)/g;

let consecutiveErrors = 0;
let sourceMapConsumer: SourceMapConsumer | undefined;

function getConsumer(): SourceMapConsumer | undefined {
    if (sourceMapConsumer) {
        return sourceMapConsumer;
    }

    if (__SCREEPS_SOURCE_MAP__ === SOURCE_MAP_PLACEHOLDER) {
        return undefined;
    }

    try {
        sourceMapConsumer = new SourceMapConsumer(JSON.parse(__SCREEPS_SOURCE_MAP__) as any);
    } catch (error) {
        console.log(`[error-mapper] Failed to load source map: ${String(error)}`);
    }

    return sourceMapConsumer;
}

function mapStackTrace(stack: string): string {
    const consumer = getConsumer();

    if (!consumer) {
        return stack;
    }

    return stack.replace(STACK_LINE_PATTERN, (_match, fileName: string, line: string, column: string) => {
        const original = consumer.originalPositionFor({
            line: Number(line),
            column: Number(column),
        });

        if (!original.source || original.line == null || original.column == null) {
            return `${fileName}:${line}:${column}`;
        }

        return `${original.source}:${original.line}:${original.column}`;
    });
}

function haltVm(): void {
    const haltableCpu = Game.cpu as CPU & { halt?: () => void };

    if (typeof haltableCpu.halt === 'function') {
        haltableCpu.halt();
    }
}

export const Watchdog = {
    get consecutiveErrors(): number {
        return consecutiveErrors;
    },
    reset(): void {
        consecutiveErrors = 0;
    },
    record(error: unknown): void {
        consecutiveErrors += 1;

        const stack = error instanceof Error ? error.stack ?? error.message : String(error);
        console.log(mapStackTrace(stack));

        if (consecutiveErrors >= 3) {
            console.log(`[watchdog] Halting VM after ${consecutiveErrors} consecutive loop failures.`);
            haltVm();
        }
    },
};

export class ErrorMapper {
    public static wrapLoop(loop: () => void): () => void {
        return () => {
            try {
                loop();
            } catch (error) {
                Watchdog.record(error);
            }
        };
    }
}
