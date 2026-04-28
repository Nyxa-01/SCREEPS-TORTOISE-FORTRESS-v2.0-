export function isNearRoomEdge(position: RoomPosition, distance = 3): boolean {
    return (
        position.x <= distance ||
        position.x >= 49 - distance ||
        position.y <= distance ||
        position.y >= 49 - distance
    );
}
