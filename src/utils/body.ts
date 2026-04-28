export function getBodyCost(body: readonly BodyPartConstant[]): number {
    return body.reduce((total, part) => total + BODYPART_COST[part], 0);
}

export function buildRepeatedBody(
    pattern: readonly BodyPartConstant[],
    maxEnergy: number,
    minRepeats = 1,
    maxParts = 50,
): BodyPartConstant[] {
    const patternCost = getBodyCost(pattern);

    if (patternCost === 0 || pattern.length === 0) {
        return [];
    }

    const repeatLimit = Math.floor(maxParts / pattern.length);
    const maxRepeats = Math.min(Math.floor(maxEnergy / patternCost), repeatLimit);

    if (maxRepeats < minRepeats) {
        return pattern.slice(0, Math.min(pattern.length, maxParts));
    }

    return Array.from({ length: maxRepeats }, () => [...pattern]).flat();
}
