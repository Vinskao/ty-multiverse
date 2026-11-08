import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 2026-11-08: with `Recreate` the old pod was stopped first; the new pod then hung in CreateContainerError
// for an hour and the whole site returned 503. A rolling update keeps the old pod serving until the new one is ready.
const jenkinsfile = readFileSync('Jenkinsfile', 'utf8');
const manifest = readFileSync('k8s/deployment.yaml', 'utf8');

describe('frontend rolls out without downtime', () => {
  it('the manifest uses RollingUpdate with no unavailable pods and a readiness probe', () => {
    expect(manifest).not.toMatch(/type:\s*Recreate/);
    expect(manifest).toMatch(/type:\s*RollingUpdate[\s\S]*maxSurge:\s*1[\s\S]*maxUnavailable:\s*0/);
    expect(manifest).toMatch(/readinessProbe:[\s\S]*path:\s*\/robots\.txt[\s\S]*port:\s*4321/);
  });

  it('Jenkins enforces the same strategy and probe on the live deployment before changing the image', () => {
    const patch = jenkinsfile.indexOf('"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}');
    const probe = jenkinsfile.indexOf('"readinessProbe":{"httpGet":{"path":"/robots.txt","port":4321}');
    const setImage = jenkinsfile.indexOf('kubectl set image deployment/ty-multiverse-frontend');
    expect(patch).toBeGreaterThan(-1);
    expect(probe).toBeGreaterThan(-1);
    expect(patch).toBeLessThan(setImage);
  });
});
