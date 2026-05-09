import {
  configFilePath,
  setKey,
  unsetKey,
  getKey,
  loadConfig,
} from '../config.js';

export interface ConfigOptions {
  verb: 'get' | 'set' | 'unset' | 'path';
  key?: string | undefined;
  value?: string | undefined;
}

export async function runConfig(opts: ConfigOptions): Promise<void> {
  switch (opts.verb) {
    case 'path':
      process.stdout.write(`${configFilePath()}\n`);
      return;
    case 'get': {
      const v = opts.key ? getKey(opts.key) : loadConfig();
      const out = typeof v === 'string' ? v : JSON.stringify(v);
      process.stdout.write(`${out}\n`);
      return;
    }
    case 'set':
      if (!opts.key || opts.value === undefined) {
        throw new Error('set requires <key> and <value>');
      }
      setKey(opts.key, opts.value);
      return;
    case 'unset':
      if (!opts.key) throw new Error('unset requires <key>');
      unsetKey(opts.key);
      return;
  }
}
