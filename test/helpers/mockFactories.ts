export function createTower(x: number, y: number, roomName = 'W0N0'): StructureTower {
    return {
        id: `tower-${x}-${y}`,
        pos: new RoomPosition(x, y, roomName),
        store: {
            getUsedCapacity: () => 1_000,
        },
    } as unknown as StructureTower;
}

export function createHostile(
    parts: BodyPartConstant[],
    x: number,
    y: number,
    roomName = 'W0N0',
    username = 'Enemy',
): Creep {
    return {
        id: `hostile-${x}-${y}`,
        name: `hostile-${x}-${y}`,
        hits: 1_000,
        pos: new RoomPosition(x, y, roomName),
        owner: {
            username,
        },
        body: parts.map((part) => ({
            type: part,
            hits: 100,
        })),
        getActiveBodyparts(type: BodyPartConstant) {
            return parts.filter((part) => part === type).length;
        },
    } as unknown as Creep;
}
