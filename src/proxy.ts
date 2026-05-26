import { ProxyAgent } from 'undici';
import { randomBytes } from 'node:crypto';

export interface ResolvedProxy {
  enabled: boolean;
  url: string | undefined;
}

export interface AgentHandle {
  dispatcher: unknown;
  rotate: () => boolean;
  proxyUrls?: string[];
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

export function buildDisabledHandle(): AgentHandle {
  return { dispatcher: undefined, rotate: () => false };
}

export function buildSingleProxyHandle(url: string): AgentHandle {
  const template = url;
  let rotated = false;
  const handle: AgentHandle = { dispatcher: undefined, rotate: () => false };

  const make = (): void => {
    const session = generateRandSession();
    const resolved = substituteRand(template, session);
    handle.dispatcher = new ProxyAgent(resolved);
  };

  make();

  handle.rotate = () => {
    if (rotated) return false;
    rotated = true;
    make();
    return true;
  };

  return handle;
}

export function buildListProxyHandle(proxyUrls: string[]): AgentHandle {
  let index = 0;
  const handle: AgentHandle = { dispatcher: undefined, rotate: () => false };

  if (proxyUrls.length === 0) {
    return handle;
  }

  handle.dispatcher = new ProxyAgent(proxyUrls[0]!);
  handle.proxyUrls = proxyUrls;

  handle.rotate = () => {
    index += 1;
    if (index >= proxyUrls.length) {
      return false;
    }
    handle.dispatcher = new ProxyAgent(proxyUrls[index]!);
    return true;
  };

  return handle;
}
