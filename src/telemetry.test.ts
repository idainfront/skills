import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// INTERNAL_TELEMETRY_URL is read from SKILLS_INTERNAL_TELEMETRY_URL at module load
// time, so stub it with a fake test domain (never a real internal URL) and
// dynamically import the module afterwards.
const TEST_INTERNAL_TELEMETRY_URL = 'https://telemetry.example.test/api/telemetry';

let track: typeof import('./telemetry.ts').track;
let flushTelemetry: typeof import('./telemetry.ts').flushTelemetry;

beforeAll(async () => {
  process.env.SKILLS_INTERNAL_TELEMETRY_URL = TEST_INTERNAL_TELEMETRY_URL;
  ({ track, flushTelemetry } = await import('./telemetry.ts'));
});

describe('telemetry routing', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SKILLS_TELEMETRY_URL;
    delete process.env.DISABLE_TELEMETRY;
    delete process.env.DO_NOT_TRACK;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(async () => {
    await flushTelemetry();
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it('sends telemetry to the internal endpoint by default', () => {
    track({
      event: 'install',
      source: 'iic/agent_knowledge',
      skills: 'java-checkstyle',
      agents: 'kilo',
      sourceType: 'bitbucket',
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`${TEST_INTERNAL_TELEMETRY_URL}?`));
  });

  it('does not route bitbucket (internal) skill telemetry to the upstream endpoint', () => {
    track({
      event: 'install',
      source: 'iic/agent_knowledge',
      skills: 'java-checkstyle',
      agents: 'kilo',
      sourceType: 'bitbucket',
    });

    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('add-skill.vercel.sh'));
  });

  it('routes remote (github) skill telemetry to both the internal and upstream endpoints', () => {
    track({
      event: 'install',
      source: 'vercel-labs/agent-skills',
      skills: 'nextjs',
      agents: 'kilo',
      sourceType: 'github',
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`${TEST_INTERNAL_TELEMETRY_URL}?`));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('https://add-skill.vercel.sh/t?'));
  });

  it('does not route find telemetry (no sourceType) to the upstream endpoint', () => {
    track({
      event: 'find',
      query: 'java',
      resultCount: '3',
    });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`${TEST_INTERNAL_TELEMETRY_URL}?`));
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('add-skill.vercel.sh'));
  });
});
