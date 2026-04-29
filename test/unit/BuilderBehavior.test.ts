import { BuilderBehavior } from '../../src/behaviors/BuilderBehavior';

function createCreep(options: {
    state: 'load' | 'work';
    usedCapacity?: number;
    freeCapacity?: number;
    x?: number;
    y?: number;
    findClosestByPath?: (type: number) => object | null;
    inRangeTo?: (target: object, range: number) => boolean;
    build?: jest.Mock;
    repair?: jest.Mock;
    upgradeController?: jest.Mock;
    withdraw?: jest.Mock;
    pickup?: jest.Mock;
}): Creep {
    const x = options.x ?? 10;
    const y = options.y ?? 10;
    return {
        memory: { s: options.state, r: 'builder', rn: 'W0N0' },
        store: {
            getUsedCapacity: () => options.usedCapacity ?? (options.state === 'work' ? 100 : 0),
            getFreeCapacity: () => options.freeCapacity ?? (options.state === 'work' ? 0 : 100),
        },
        pos: {
            x,
            y,
            roomName: 'W0N0',
            findClosestByPath: options.findClosestByPath ?? (() => null),
            isNearTo: () => true,
            inRangeTo: options.inRangeTo ?? (() => true),
            getRangeTo: () => 0,
        },
        build: options.build ?? jest.fn(() => OK),
        repair: options.repair ?? jest.fn(() => OK),
        upgradeController: options.upgradeController ?? jest.fn(() => OK),
        withdraw: options.withdraw ?? jest.fn(() => OK),
        pickup: options.pickup ?? jest.fn(() => OK),
    } as unknown as Creep;
}

function makeConstructionSite(id = 'site-1', x = 12, y = 12): ConstructionSite {
    return {
        id,
        pos: new RoomPosition(x, y, 'W0N0'),
    } as unknown as ConstructionSite;
}

function makeRampart(id: string, hits: number, x = 15, y = 15): StructureRampart {
    return {
        id,
        structureType: STRUCTURE_RAMPART,
        hits,
        pos: new RoomPosition(x, y, 'W0N0'),
    } as unknown as StructureRampart;
}

function createColony(options: {
    constructionSites?: ConstructionSite[];
    myStructures?: AnyOwnedStructure[];
    controllerLevel?: number;
    controllerMy?: boolean;
    energySource?: object | null;
    upgradeTarget?: StructureController | undefined;
}): any {
    const sites = options.constructionSites ?? [];
    const structures = options.myStructures ?? [];
    const rcl = options.controllerLevel ?? 2;

    return {
        room: {
            name: 'W0N0',
            controller: {
                level: rcl,
                my: options.controllerMy ?? true,
                id: 'ctrl-1',
                pos: new RoomPosition(25, 25, 'W0N0'),
            },
            find: jest.fn((type: number, searchOptions?: { filter?: (s: any) => boolean }) => {
                if (type === FIND_MY_CONSTRUCTION_SITES) return sites;
                if (type === FIND_MY_STRUCTURES) {
                    return searchOptions?.filter ? structures.filter(searchOptions.filter) : structures;
                }
                return [];
            }),
        },
        logisticsManager: {
            getEnergySource: jest.fn(() => options.energySource ?? null),
        },
        upgradeManager: {
            getTarget: jest.fn(() => options.upgradeTarget),
        },
    };
}

describe('BuilderBehavior', () => {
    describe('load state — energy collection', () => {
        it('requests an energy source from the logistics manager when in load state', () => {
            const source = {
                id: 'container-1',
                store: { getUsedCapacity: () => 200, getFreeCapacity: () => 0 },
                pos: new RoomPosition(11, 10, 'W0N0'),
            };
            const withdraw = jest.fn(() => OK);
            const creep = createCreep({ state: 'load', withdraw });
            const colony = createColony({ energySource: source });

            const behavior = new BuilderBehavior();
            behavior.run(creep as Creep, colony);

            expect(colony.logisticsManager.getEnergySource).toHaveBeenCalledWith(creep);
        });

        it('returns false and does not call build when no energy source is available', () => {
            const buildFn = jest.fn(() => OK);
            const creep = createCreep({ state: 'load', build: buildFn });
            const colony = createColony({ energySource: null });

            const behavior = new BuilderBehavior();
            const result = behavior.run(creep as Creep, colony);

            expect(result).toBe(false);
            expect(buildFn).not.toHaveBeenCalled();
        });
    });

    describe('work state — primary build task', () => {
        it('calls build() when a construction site is in range', () => {
            const site = makeConstructionSite();
            const buildFn = jest.fn(() => OK);
            const creep = createCreep({
                state: 'work',
                findClosestByPath: () => site,
                build: buildFn,
            });
            const colony = createColony({ constructionSites: [site] });

            const behavior = new BuilderBehavior();
            behavior.run(creep as Creep, colony);

            expect(buildFn).toHaveBeenCalledWith(site);
        });

        it('does not call repair() or upgradeController() when a construction site is present', () => {
            const site = makeConstructionSite();
            const repairFn = jest.fn(() => OK);
            const upgradeFn = jest.fn(() => OK);
            const controller = { id: 'ctrl-1', pos: new RoomPosition(25, 25, 'W0N0') } as unknown as StructureController;
            const creep = createCreep({
                state: 'work',
                findClosestByPath: () => site,
                repair: repairFn,
                upgradeController: upgradeFn,
            });
            const colony = createColony({ constructionSites: [site], upgradeTarget: controller });

            const behavior = new BuilderBehavior();
            behavior.run(creep as Creep, colony);

            expect(repairFn).not.toHaveBeenCalled();
            expect(upgradeFn).not.toHaveBeenCalled();
        });
    });

    describe('work state — repair fallback', () => {
        it('repairs the weakest rampart below the RCL target when no construction sites exist', () => {
            const weakRampart = makeRampart('ramp-weak', 1_000);
            const strongRampart = makeRampart('ramp-strong', 8_000);
            const repairFn = jest.fn(() => OK);
            const creep = createCreep({
                state: 'work',
                findClosestByPath: () => null,
                repair: repairFn,
            });
            const colony = createColony({
                constructionSites: [],
                myStructures: [weakRampart, strongRampart] as unknown as AnyOwnedStructure[],
                controllerLevel: 2,
            });

            const behavior = new BuilderBehavior();
            behavior.run(creep as Creep, colony);

            expect(repairFn).toHaveBeenCalledWith(weakRampart);
        });

        it('does not call upgradeController() when rampart repair work is available', () => {
            const rampart = makeRampart('ramp-1', 500);
            const upgradeFn = jest.fn(() => OK);
            const creep = createCreep({
                state: 'work',
                findClosestByPath: () => null,
                upgradeController: upgradeFn,
            });
            const colony = createColony({
                constructionSites: [],
                myStructures: [rampart] as unknown as AnyOwnedStructure[],
                controllerLevel: 2,
            });

            const behavior = new BuilderBehavior();
            behavior.run(creep as Creep, colony);

            expect(upgradeFn).not.toHaveBeenCalled();
        });

        it('skips repair when all ramparts already meet the RCL target', () => {
            const healthyRampart = makeRampart('ramp-healthy', 10_000);
            const upgradeFn = jest.fn(() => OK);
            const controller = { id: 'ctrl-1', pos: new RoomPosition(25, 25, 'W0N0') } as unknown as StructureController;
            const creep = createCreep({
                state: 'work',
                findClosestByPath: () => null,
                upgradeController: upgradeFn,
            });
            const colony = createColony({
                constructionSites: [],
                myStructures: [healthyRampart] as unknown as AnyOwnedStructure[],
                controllerLevel: 2,
                upgradeTarget: controller,
            });

            const behavior = new BuilderBehavior();
            behavior.run(creep as Creep, colony);

            expect(upgradeFn).toHaveBeenCalledWith(controller);
        });
    });

    describe('work state — upgrade controller fallback', () => {
        it('calls upgradeController() when no construction sites and no ramparts to repair', () => {
            const controller = { id: 'ctrl-1', pos: new RoomPosition(25, 25, 'W0N0') } as unknown as StructureController;
            const upgradeFn = jest.fn(() => OK);
            const creep = createCreep({
                state: 'work',
                findClosestByPath: () => null,
                upgradeController: upgradeFn,
            });
            const colony = createColony({
                constructionSites: [],
                myStructures: [],
                upgradeTarget: controller,
            });

            const behavior = new BuilderBehavior();
            behavior.run(creep as Creep, colony);

            expect(upgradeFn).toHaveBeenCalledWith(controller);
        });

        it('returns false when no work target and no energy source are available', () => {
            const creep = createCreep({
                state: 'work',
                findClosestByPath: () => null,
            });
            const colony = createColony({
                constructionSites: [],
                myStructures: [],
                upgradeTarget: undefined,
                energySource: null,
            });

            const behavior = new BuilderBehavior();
            const result = behavior.run(creep as Creep, colony);

            expect(result).toBe(false);
        });
    });
});
