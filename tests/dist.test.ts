import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const rootDir = join(import.meta.dirname, '..');

describe('dist build', () => {
  it('builds and runs without errors', { timeout: 30000 }, () => {
    // Build the project — SKILLS_* URLs are required at build time (see
    // build.config.mjs); use fake test values here rather than real endpoints.
    execSync('pnpm build', {
      cwd: rootDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        SKILLS_INTERNAL_TELEMETRY_URL: 'https://telemetry.example.test/api/telemetry',
        SKILLS_API_URL: 'https://api.example.test',
        SKILLS_BITBUCKET_URL: 'https://stash.example.com',
      },
    });

    // Run the CLI - should exit cleanly with help output
    const result = execSync('node dist/cli.mjs --help', {
      cwd: rootDir,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    expect(result).toContain('skills');
  });
});
