/** A commit identifier for support; absent build metadata stays out of the public UI. */
export function buildRevision(value?: string): string | null {
    const revision = value?.trim();
    return revision && /^[a-f0-9]{7,40}$/i.test(revision) ? revision.slice(0, 8) : null;
}
