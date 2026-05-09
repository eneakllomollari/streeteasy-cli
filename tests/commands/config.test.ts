import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runConfig } from '../../src/commands/config.js';

let dir: string;
const origHome = process.env.HOME;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'streeteasy-cfg-cmd-'));
  process.env.HOME = dir;
});
afterEach(() => {
  process.env.HOME = origHome;
  rmSync(dir, { recursive: true, force: true });
});

describe('runConfig', () => {
  it('set then get prints the value', async () => {
    await runConfig({ verb: 'set', key: 'proxy.url', value: 'http://x:y@h:1' });
    const out = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await runConfig({ verb: 'get', key: 'proxy.url' });
    const printed = out.mock.calls.map((c) => c[0]).join('').trim();
    expect(printed).toBe('http://x:y@h:1');
  });

  it('set proxy.enabled coerces booleans', async () => {
    await runConfig({ verb: 'set', key: 'proxy.enabled', value: 'true' });
    const out = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await runConfig({ verb: 'get', key: 'proxy.enabled' });
    expect(out.mock.calls.map((c) => c[0]).join('').trim()).toBe('true');
  });

  it('unset removes the key', async () => {
    await runConfig({ verb: 'set', key: 'proxy.url', value: 'http://a' });
    await runConfig({ verb: 'unset', key: 'proxy.url' });
    const out = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await runConfig({ verb: 'get', key: 'proxy.url' });
    expect(out.mock.calls.map((c) => c[0]).join('').trim()).toBe('undefined');
  });

  it('path prints the config file location', async () => {
    const out = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    await runConfig({ verb: 'path' });
    const printed = out.mock.calls.map((c) => c[0]).join('').trim();
    expect(printed).toContain('/.config/streeteasy/config.json');
  });

  it('rejects unknown keys', async () => {
    await expect(
      runConfig({ verb: 'set', key: 'wrong.key', value: 'x' }),
    ).rejects.toThrow(/unknown/i);
  });
});
