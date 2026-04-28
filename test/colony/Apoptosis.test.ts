import { readFileSync } from 'fs';
import { join } from 'path';

describe('Codebase Integrity', () => {
    it('should not contain vulnerable for...in loops over creep stores', () => {
        const colonyFile = readFileSync(join(__dirname, '../../src/colony/Colony.ts'), 'utf8');
        const hasVulnerableLoop = colonyFile.includes('for (const resourceType in creep.store)');
        expect(hasVulnerableLoop).toBe(false);
    });
});