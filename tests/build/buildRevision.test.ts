import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRevision } from '../../src/scripts/buildRevision';

describe('deployed build revision', () => {
    it('shows a short commit identity and omits absent or placeholder revisions', () => {
        expect(buildRevision(' 63d943bcc80373a0ce67ef62c2d27e63d7d7af11 ')).toBe('63d943bc');
        expect(buildRevision('3a513b3')).toBe('3a513b3');
        for (const value of [undefined, '', 'unknown', '${GIT_COMMIT}', 'release candidate']) {
            expect(buildRevision(value)).toBeNull();
        }
    });
    it('passes Jenkins revision into the Docker build stage', () => {
        const docker = readFileSync(resolve(process.cwd(), 'Dockerfile'), 'utf8');
        const buildStage = docker.split('FROM build-deps AS build')[1].split('FROM base AS runtime')[0];
        expect(buildStage).toContain('ARG PUBLIC_BUILD_REVISION');
        expect(buildStage).toContain('ENV PUBLIC_BUILD_REVISION=${PUBLIC_BUILD_REVISION}');
    });
});
