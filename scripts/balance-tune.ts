/**
 * Seeded balance verification with content-addressed checkpoints. Full runs cover every policy,
 * pacing and 20 seeds; focused runs never claim full-matrix acceptance.
 * Examples: --quick, --policies=keep-team --pacings=medium --seeds=1,2 --days=30 --jobs=2
 * Interrupted runs resume completed samples automatically. --fresh ignores existing checkpoints.
 */
import { createHash } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bandsMarkdown,
  evaluateBands,
  POLICIES,
  runBalance,
  type BalanceRun,
  type PacingId,
  type PolicyId
} from '../src/game/sim/balance';

import {
  expandBalanceGrid,
  scoreBalanceBands,
  missingSearchBands,
  withBalanceCandidate,
  type BalanceCandidate
} from '../src/game/sim/tuning';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const args = process.argv.slice(2);
const value = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const number = (name: string, fallback: number, max: number) => {
  const n = Number(value(name) ?? fallback);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`Invalid --${name} (1–${max})`);
  return n;
};
const writeJson = (path: string, data: unknown) => {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(data));
  renameSync(temp, path);
};

async function main() {
  if (args.includes('--help')) {
    console.log(
      'balance-tune: --quick --grid=FILE --policies=LIST --pacings=LIST --seeds=LIST --days=N --jobs=1..4 --output=FILE --cache-dir=DIR --fresh'
    );
    console.log(
      'Default: full 6-policy, 3-pacing, 20-seed, 60-day verification. Grid search defaults to Medium / keep-team,fighter,farmer / 2 seeds / 60 days. Search never writes working constants.'
    );
    return;
  }
  const switches = new Set(['--quick', '--fresh']);
  const parameters = new Set([
    'worker',
    'grid',
    'policies',
    'pacings',
    'seeds',
    'days',
    'jobs',
    'output',
    'cache-dir'
  ]);
  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (!switches.has(arg) && (!match || !parameters.has(match[1]!)))
      throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  const worker = value('worker');
  if (worker) {
    const job = JSON.parse(worker) as {
      policy: PolicyId;
      pacing: PacingId;
      seed: number;
      days: number;
      output: string;
      fingerprint: string;
      candidateKey: string;
      candidate: BalanceCandidate;
    };
    const started = Date.now();
    const run = withBalanceCandidate(job.candidate, () =>
      runBalance(job.policy, job.pacing, job.seed, { days: job.days })
    );
    writeJson(job.output, {
      fingerprint: job.fingerprint,
      candidateKey: job.candidateKey,
      candidate: job.candidate,
      days: job.days,
      seconds: (Date.now() - started) / 1000,
      run
    });
    return;
  }

  const quick = args.includes('--quick');
  const gridFile = value('grid');
  const searching = !!gridFile;
  const candidates = gridFile
    ? expandBalanceGrid(JSON.parse(readFileSync(resolve(root, gridFile), 'utf8')))
    : [{}];
  const candidateKey = (candidate: BalanceCandidate) =>
    createHash('sha256').update(JSON.stringify(candidate)).digest('hex').slice(0, 16);
  const pacings = (value('pacings') ?? (quick || searching ? 'medium' : 'medium,easy,hard')).split(
    ','
  ) as PacingId[];
  const policies = (
    value('policies') ?? (searching ? 'keep-team,fighter,farmer' : POLICIES.join(','))
  ).split(',') as PolicyId[];
  const seeds =
    value('seeds')?.split(',').map(Number) ??
    Array.from({ length: quick || searching ? 2 : 20 }, (_, i) => i + 1);
  if (
    pacings.some((p) => !['medium', 'easy', 'hard'].includes(p)) ||
    policies.some((p) => !POLICIES.includes(p)) ||
    seeds.some((s) => !Number.isInteger(s) || s < 1)
  )
    throw new Error('Invalid pacing, policy or seed');
  const days = number('days', quick ? 30 : 60, 365);
  const jobs = number('jobs', 2, 4);
  const hash = createHash('sha256');
  const hashTree = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) hashTree(path);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.json'))
        hash.update(path.slice(root.length)).update(readFileSync(path));
    }
  };
  hashTree(join(root, 'src/game'));
  hash
    .update(readFileSync(fileURLToPath(import.meta.url)))
    .update(readFileSync(join(root, 'package-lock.json')))
    .update(process.version);
  const fingerprint = hash.digest('hex');
  const cache = resolve(root, value('cache-dir') ?? `.cache/balance/${fingerprint}`);
  mkdirSync(cache, { recursive: true });
  const tasks = candidates.flatMap((candidate) =>
    pacings.flatMap((pacing) =>
      policies.flatMap((policy) =>
        seeds.map((seed) => ({
          policy,
          pacing,
          seed,
          days,
          fingerprint,
          candidate,
          candidateKey: candidateKey(candidate),
          output: join(cache, `${candidateKey(candidate)}-${pacing}-${policy}-${seed}-${days}.json`)
        }))
      )
    )
  );
  const runs: BalanceRun[] = new Array(tasks.length);
  let cursor = 0;
  let done = 0;
  let reused = 0;
  const started = Date.now();
  const runner = resolve(here, '../../../node_modules/.bin/vite-node');
  const load = (task: (typeof tasks)[number]): BalanceRun | undefined => {
    try {
      const data = JSON.parse(readFileSync(task.output, 'utf8'));
      if (
        data.fingerprint === fingerprint &&
        data.days === days &&
        data.candidateKey === task.candidateKey &&
        data.run.policy === task.policy &&
        data.run.pacing === task.pacing &&
        data.run.seed === task.seed
      )
        return data.run;
    } catch {
      /* No complete matching checkpoint. */
    }
    return undefined;
  };
  const children = new Set<ChildProcess>();
  const cancel = () => {
    for (const child of children) child.kill('SIGINT');
    console.error('Cancelled; completed source-matched checkpoints are preserved.');
    process.exit(130);
  };
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  const consume = async () => {
    while (cursor < tasks.length) {
      const index = cursor++;
      const task = tasks[index]!;
      let run = args.includes('--fresh') ? undefined : load(task);
      if (run) reused++;
      else {
        await new Promise<void>((ok, fail) => {
          const child = spawn(
            process.execPath,
            [runner, fileURLToPath(import.meta.url), `--worker=${JSON.stringify(task)}`],
            { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] }
          );
          children.add(child);
          child.once('close', () => children.delete(child));
          child.once('error', fail);
          child.once('exit', (code, signal) =>
            code === 0
              ? ok()
              : fail(
                  new Error(
                    `${task.policy}/${task.pacing}/${task.seed}: exit ${code}, signal ${signal}`
                  )
                )
          );
        });
        run = load(task);
        if (!run) throw new Error(`Missing/invalid checkpoint: ${task.output}`);
      }
      runs[index] = run;
      console.log(
        `[${++done}/${tasks.length}] candidate-${task.candidateKey} ${task.pacing}/${task.policy}/seed-${task.seed} (${reused} reused)`
      );
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, consume));
  } catch (error) {
    for (const child of children) child.kill('SIGINT');
    throw error;
  }
  process.removeListener('SIGINT', cancel);
  process.removeListener('SIGTERM', cancel);
  const full =
    !searching &&
    days === 60 &&
    pacings.length === 3 &&
    new Set(pacings).size === 3 &&
    policies.length === POLICIES.length &&
    new Set(policies).size === POLICIES.length &&
    seeds.length === 20 &&
    new Set(seeds).size === 20;
  const groups = candidates.map((candidate) => {
    const key = candidateKey(candidate);
    const sample = runs.filter((_run, index) => tasks[index]!.candidateKey === key);
    const bands = evaluateBands(sample, 'medium');
    return {
      candidate,
      key,
      sample,
      bands,
      missing: missingSearchBands(bands),
      score: scoreBalanceBands(bands)
    };
  });
  const ranked = [...groups].sort((a, b) => a.score - b.score || a.key.localeCompare(b.key));
  const eligible = ranked.filter((group) => group.missing.length === 0);
  const medium = groups[0]!.bands;
  const ranking = !searching
    ? []
    : [
        '## Bounded grid search',
        '',
        'Recommendation only: the working constants were not modified. Every axis is restricted to Appendix T. Each candidate uses identical seeds and policies; full verification of any selected candidate is still required. Capacity and rarity are reported but not optimized by favorable random rolls. Existing Needs owner decisions remain in force.',
        '',
        '| Candidate | Changed values | Score (lower is better) | Failed / missing measured bands |',
        '|---|---|---|---|',
        ...ranked.map(
          (g) =>
            `| ${g.key} | ${JSON.stringify(g.candidate)} | ${g.score.toFixed(4)} | ${
              [
                ...g.bands.filter((b) => !b.pass).map((b) => b.id),
                ...g.missing.map((id) => `missing:${id}`)
              ].join(', ') || 'none in sample'
            } |`
        ),
        '',
        eligible.length
          ? `Suggested candidate: ${eligible[0]!.key}. This is a search result, not release acceptance.`
          : 'No recommendation: this sample does not cover all required search metrics.',
        ''
      ];
  const comparison = [
    '| Medium band | Before (inherited handoff) | After (current sample) |',
    '|---|---|---|',
    ...(
      [
        ['income-early', '₽10714'],
        ['mix-battles', '54%'],
        ['bird', '1/347'],
        ['legendary', '1/3821'],
        ['storage-collector', 'day 3.9']
      ] as const
    ).map(
      ([id, before]) =>
        `| ${id} | ${before} | ${medium.find((b) => b.id === id)?.measured ?? 'not sampled'} |`
    ),
    '',
    'The before values are the LIVE STATE handoff baseline. Harness corrections and quest growth both affect this comparison; it is not an isolated gameplay A/B experiment.',
    ''
  ];
  const report = [
    '# Balance report',
    '',
    `Generated by \`scripts/balance-tune.ts\` in ${((Date.now() - started) / 1000).toFixed(1)} s; ${reused}/${tasks.length} samples reused. **${full ? 'Full matrix' : 'Focused sample — not full acceptance'}**.`,
    `Source fingerprint: \`${fingerprint}\`. ${days} days × 100 cards; seeds ${seeds.join(', ')}; workers ${jobs}.`,
    'Targets are SPEC C2 (Medium); other pacings are diagnostics against the same reference bands. Failed bands remain failures. --grid performs a bounded parameter search in isolated worker processes; no source constants are written automatically.',
    '',
    ...ranking,
    ...comparison,
    ...groups.flatMap((group) =>
      pacings.map((pacing) =>
        bandsMarkdown(
          evaluateBands(group.sample, pacing),
          `## ${searching ? `Candidate ${group.key}: ` : ''}${pacing} pacing (${group.sample.filter((r) => r.pacing === pacing).length} runs)`
        )
      )
    )
  ].join('\n');
  const output = resolve(
    root,
    value('output') ??
      (full
        ? 'docs/update-1.6.0/BALANCE_REPORT.md'
        : searching
          ? '.cache/balance/SEARCH_REPORT.md'
          : '.cache/balance/FOCUSED_REPORT.md')
  );
  writeFileSync(output, report);
  console.log(`Report: ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
