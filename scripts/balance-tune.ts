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
  const worker = value('worker');
  if (worker) {
    const job = JSON.parse(worker) as {
      policy: PolicyId;
      pacing: PacingId;
      seed: number;
      days: number;
      output: string;
      fingerprint: string;
    };
    const started = Date.now();
    const run = runBalance(job.policy, job.pacing, job.seed, { days: job.days });
    writeJson(job.output, {
      fingerprint: job.fingerprint,
      days: job.days,
      seconds: (Date.now() - started) / 1000,
      run
    });
    return;
  }

  const quick = args.includes('--quick');
  const pacings = (value('pacings') ?? (quick ? 'medium' : 'medium,easy,hard')).split(
    ','
  ) as PacingId[];
  const policies = (value('policies') ?? POLICIES.join(',')).split(',') as PolicyId[];
  const seeds =
    value('seeds')?.split(',').map(Number) ??
    Array.from({ length: quick ? 2 : 20 }, (_, i) => i + 1);
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
  const tasks = pacings.flatMap((pacing) =>
    policies.flatMap((policy) =>
      seeds.map((seed) => ({
        policy,
        pacing,
        seed,
        days,
        fingerprint,
        output: join(cache, `${pacing}-${policy}-${seed}-${days}.json`)
      }))
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
        `[${++done}/${tasks.length}] ${task.pacing}/${task.policy}/seed-${task.seed} (${reused} reused)`
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
    days === 60 &&
    pacings.length === 3 &&
    new Set(pacings).size === 3 &&
    policies.length === POLICIES.length &&
    new Set(policies).size === POLICIES.length &&
    seeds.length === 20 &&
    new Set(seeds).size === 20;
  const medium = evaluateBands(runs, 'medium');
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
    'Targets are SPEC C2 (Medium); other pacings are diagnostics against the same reference bands. Failed bands remain failures. The command verifies the chosen constants; it does not perform an automatic parameter search.',
    '',
    ...comparison,
    ...pacings.map((pacing) =>
      bandsMarkdown(
        evaluateBands(runs, pacing),
        `## ${pacing} pacing (${runs.filter((r) => r.pacing === pacing).length} runs)`
      )
    )
  ].join('\n');
  const output = resolve(
    root,
    value('output') ??
      (full ? 'docs/update-1.6.0/BALANCE_REPORT.md' : '.cache/balance/FOCUSED_REPORT.md')
  );
  writeFileSync(output, report);
  console.log(`Report: ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
