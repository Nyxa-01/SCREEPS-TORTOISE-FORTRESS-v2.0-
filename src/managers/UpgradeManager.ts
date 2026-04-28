import { DEFCON } from '../config';
import type { Colony } from '../colony/Colony';

export class UpgradeManager {
    public constructor(private readonly colony: Colony) { }

    public init(): void { }

    public run(): void { }

    public shouldUpgrade(): boolean {
        const room = this.colony.room;
        const controller = room?.controller;

        if (!room || !controller?.my) {
            return false;
        }

        const reserve = room.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? room.energyAvailable;
        const currentDefcon = this.colony.defenseManager.getSnapshot().defcon;

        return currentDefcon === DEFCON.GREEN || reserve > room.energyCapacityAvailable;
    }

    public getTarget(): StructureController | undefined {
        if (!this.shouldUpgrade()) {
            return undefined;
        }

        return this.colony.room?.controller;
    }
}
