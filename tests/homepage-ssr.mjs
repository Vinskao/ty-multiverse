import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout } from 'node:timers/promises';

test('built homepage renders agent instructions as text with HTTP 200', async () => {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const server = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) }, stdio: 'ignore'
  });
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      try { response = await fetch(`http://127.0.0.1:${port}/tymultiverse/`); break; }
      catch { await setTimeout(50); }
    }
    assert.ok(response, 'SSR server started');
    assert.equal(response.status, 200, 'homepage must render, not just compile');
    const html = await response.text();
    assert.ok(html.includes('market-ai-live-context'));
    assert.ok(html.includes('/overseas/{code}?market='));
  } finally { server.kill(); }
});
