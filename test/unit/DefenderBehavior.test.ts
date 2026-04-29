import { DefenderBehavior } from '../../src/behaviors/DefenderBehavior';
import { PathingService } from '../../src/pathing/PathingService';

describe('DefenderBehavior', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('pursues hostile creeps to melee range instead of holding at range three', () => {
        const behavior = new DefenderBehavior();
        const creep = {
            memory: { r: 'defender' },
            pos: new RoomPosition(10, 10, 'W0N0'),
            attack: jest.fn(() => OK),
            rangedAttack: jest.fn(() => OK),
            rangedMassAttack: jest.fn(() => OK),
        } as unknown as Creep;
        const target = {
            pos: new RoomPosition(13, 10, 'W0N0'),
        } as Creep;
        const colony = {
            room: {
                find: jest.fn(() => []),
            },
            getPrimarySpawn: () => undefined,
            defenseManager: {
                getDefenderTarget: () => target,
            },
        } as any;

        const moveSpy = jest.spyOn(PathingService, 'moveTo').mockReturnValue(OK);

        expect(behavior.run(creep, colony)).toBe(true);
        expect(moveSpy).toHaveBeenCalledWith(creep, target, 1);
    });

    it('executes melee alongside ranged fire when adjacent to a target', () => {
        const behavior = new DefenderBehavior();
        const creep = {
            memory: { r: 'defender' },
            pos: new RoomPosition(10, 10, 'W0N0'),
            attack: jest.fn(() => OK),
            rangedAttack: jest.fn(() => OK),
            rangedMassAttack: jest.fn(() => OK),
        } as unknown as Creep;
        const target = {
            pos: new RoomPosition(11, 10, 'W0N0'),
        } as Creep;
        const colony = {
            room: {
                find: jest.fn(() => []),
            },
            getPrimarySpawn: () => undefined,
            defenseManager: {
                getDefenderTarget: () => target,
            },
        } as any;

        expect(behavior.run(creep, colony)).toBe(true);
        expect(creep.attack).toHaveBeenCalledWith(target);
        expect(creep.rangedMassAttack).toHaveBeenCalled();
        expect(creep.rangedAttack).not.toHaveBeenCalled();
    });
});