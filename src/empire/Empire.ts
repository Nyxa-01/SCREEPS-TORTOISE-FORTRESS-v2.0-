import { Colony } from '../colony/Colony';
import { SegmentManager } from '../memory/segments';
import type { StatsSnapshot } from '../types/domain';

export class Empire {
    private static instance: Empire | undefined;

    private readonly colonies = new Map<string, Colony>();

    public static get(): Empire {
        Empire.instance ??= new Empire();
        return Empire.instance;
    }

    public refresh(): void {
        const ownedRooms = Object.values(Game.rooms)
            .filter((room) => room.controller?.my || room.find(FIND_MY_SPAWNS).length > 0)
            .map((room) => room.name);

        for (const roomName of ownedRooms) {
            if (!this.colonies.has(roomName)) {
                this.colonies.set(roomName, new Colony(roomName));
            }
        }

        for (const roomName of [...this.colonies.keys()]) {
            if (!ownedRooms.includes(roomName)) {
                this.colonies.delete(roomName);
            }
        }
    }

    public init(): void {
        for (const colony of this.getColonies()) {
            colony.init();
        }
    }

    public run(): void {
        for (const colony of this.getColonies()) {
            colony.run();
        }
    }

    public postRun(): void {
        for (const colony of this.getColonies()) {
            colony.postRun();
        }

        SegmentManager.appendStats(this.buildStatsSnapshot());
    }

    public getColonies(): Colony[] {
        return [...this.colonies.values()];
    }

    private buildStatsSnapshot(): StatsSnapshot {
        return {
            time: Game.time,
            cpu: Game.cpu.getUsed(),
            bucket: Game.cpu.bucket,
            colonies: this.colonies.size,
            creeps: Object.keys(Game.creeps).length,
            buildTarget: BUILD_TARGET,
        };
    }
}
