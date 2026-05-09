import { Command, CommanderError, Option } from 'commander';
import { StreetEasyClient } from './client.js';
import { resolveProxy } from './config.js';
import {
  parseSearchInput,
  runSearch,
  type SearchOptions,
} from './commands/search.js';
import { runDetails, type DetailsOptions } from './commands/details.js';
import { runConfig } from './commands/config.js';

const program = new Command();

program
  .name('streeteasy')
  .description('StreetEasy rental search CLI')
  .version('0.1.0')
  .exitOverride();

interface ProxyFlags {
  proxyUrl?: string;
  proxy?: boolean;
}

const addProxyFlags = (cmd: Command): Command =>
  cmd
    .option('--proxy-url <url>', 'override proxy URL for this invocation')
    .option('--no-proxy', 'disable proxy for this invocation');

const buildSearchCommand = (verb: 'search' | 'list'): Command =>
  addProxyFlags(
    new Command(verb)
      .exitOverride()
      .description(
        `${verb === 'search' ? 'Search' : 'List'} rental listings. Note: --cache-dir writes the search response and is consumed by the details command; search itself always fetches fresh.`,
      )
      .requiredOption(
        '--area <name...>',
        'neighborhood name (repeatable, required)',
      )
      .option('--min-price <n>', 'minimum price', (v) => Number(v))
      .option('--max-price <n>', 'maximum price', (v) => Number(v))
      .option('--beds <n>', 'exact bedroom count', (v) => Number(v))
      .option('--baths <n>', 'minimum bathroom count', (v) => Number(v))
      .addOption(
        new Option('--sort <attr>', 'sort attribute')
          .choices([
            'LISTED_AT',
            'PRICE',
            'RECOMMENDED',
            'INTERESTING_CHANGE_AT',
            'SQFT',
          ])
          .default('LISTED_AT'),
      )
      .addOption(
        new Option('--direction <dir>')
          .choices(['ASCENDING', 'DESCENDING'])
          .default('DESCENDING'),
      )
      .option('--page <n>', 'page number', (v) => Number(v), 1)
      .option('--per-page <n>', 'per-page count', (v) => Number(v), 50)
      .option('--all-pages', 'paginate to totalCount')
      .option('--cache-dir <path>', 'opt-in disk cache directory')
      .option('--json', 'emit JSON instead of human output'),
  ).action(
    async (opts: SearchOptions & ProxyFlags) => {
      // Validate inputs early — exit 2 for invalid input.
      try {
        parseSearchInput(opts);
      } catch (err) {
        process.stderr.write(`${(err as Error).message}\n`);
        process.exit(2);
      }

      const proxy = resolveProxy({
        proxyUrl: opts.proxyUrl,
        noProxy: opts.proxy === false,
      });
      const client = new StreetEasyClient({ proxy });
      try {
        await runSearch(opts, client);
      } catch (err) {
        process.stderr.write(`${(err as Error).message}\n`);
        process.exit(1);
      }
    },
  );

program.addCommand(buildSearchCommand('search'));
program.addCommand(buildSearchCommand('list'));

program.addCommand(
  addProxyFlags(
    new Command('details')
      .exitOverride()
      .description('Fetch one rental listing by id or URL')
      .argument('<id-or-url>', 'numeric id, full URL, or /rental/<id> path')
      .option('--cache-dir <path>', 'opt-in disk cache directory')
      .option('--json', 'emit raw GraphQL JSON instead of human output')
      .option('--summary', 'emit projected summary JSON (implies --json)'),
  ).action(
    async (
      idOrUrl: string,
      opts: ProxyFlags & {
        json?: boolean;
        summary?: boolean;
        cacheDir?: string;
      },
    ) => {
      const proxy = resolveProxy({
        proxyUrl: opts.proxyUrl,
        noProxy: opts.proxy === false,
      });
      const client = new StreetEasyClient({ proxy });
      const json: DetailsOptions['json'] = opts.summary
        ? 'summary'
        : opts.json
          ? 'raw'
          : undefined;
      const detailsOpts: DetailsOptions = {
        idOrUrl,
        json,
        cacheDir: opts.cacheDir,
      };
      try {
        await runDetails(detailsOpts, client);
      } catch (err) {
        const msg = (err as Error).message;
        process.stderr.write(`${msg}\n`);
        // Input-validation errors (unparseable id) → exit 2
        process.exit(/cannot parse listing id/i.test(msg) ? 2 : 1);
      }
    },
  ),
);

const configCmd = new Command('config')
  .exitOverride()
  .description('Manage CLI configuration');
configCmd
  .command('get [key]')
  .exitOverride()
  .action(async (key?: string) => {
    try {
      await runConfig({ verb: 'get', key });
    } catch (err) {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exit(2);
    }
  });
configCmd
  .command('set <key> <value>')
  .exitOverride()
  .action(async (key: string, value: string) => {
    try {
      await runConfig({ verb: 'set', key, value });
    } catch (err) {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exit(2);
    }
  });
configCmd
  .command('unset <key>')
  .exitOverride()
  .action(async (key: string) => {
    try {
      await runConfig({ verb: 'unset', key });
    } catch (err) {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exit(2);
    }
  });
configCmd
  .command('path')
  .exitOverride()
  .action(async () => {
    await runConfig({ verb: 'path' });
  });
program.addCommand(configCmd);

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof CommanderError) {
    // commander already wrote help/error to stderr.
    if (
      err.code === 'commander.helpDisplayed' ||
      err.code === 'commander.version' ||
      err.code === 'commander.help'
    ) {
      process.exit(0);
    }
    // missingArgument, unknownOption, invalidArgument, etc. → invalid input
    process.exit(2);
  }
  process.stderr.write(`${(err as Error).message}\n`);
  process.exit(1);
});
