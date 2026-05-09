import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProxyAgent } from 'undici';
import { randomBytes } from 'node:crypto';

export interface ResolvedProxy {
  enabled: boolean;
  url: string | undefined;
}

// Dispatcher typed as unknown to sidestep cross-version conflicts between
// undici 8 and the older undici-types bundled with @types/node.
export interface AgentHandle {
  agent: HttpsProxyAgent<string> | undefined;
  dispatcher: unknown;
  rotate: () => void;
}

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateRandSession(): string {
  const bytes = randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i += 1) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function substituteRand(url: string, session: string): string {
  return url.split('{{rand}}').join(session);
}

export function buildAgent(cfg: ResolvedProxy): AgentHandle {
  const handle: AgentHandle = {
    agent: undefined,
    dispatcher: undefined,
    rotate: () => {},
  };

  if (!cfg.enabled || !cfg.url) {
    return handle;
  }

  const template = cfg.url;
  const make = (): void => {
    const session = generateRandSession();
    const url = substituteRand(template, session);
    handle.agent = new HttpsProxyAgent(url);
    handle.dispatcher = new ProxyAgent(url);
  };

  make();
  handle.rotate = make;
  return handle;
}
