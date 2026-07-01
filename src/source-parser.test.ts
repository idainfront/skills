import { beforeAll, describe, it, expect } from 'vitest';
import type { parseSource as ParseSource } from './source-parser.js';

// Bitbucket shorthand resolution reads SKILLS_BITBUCKET_URL at module load time,
// so stub it with a fake test domain (never a real internal URL) and dynamically
// import the module afterwards.
const TEST_BITBUCKET_URL = 'https://stash.example.com';
const TEST_BITBUCKET_SSH_HOST = 'stash.example.com:7999';

let parseSource: typeof ParseSource;

beforeAll(async () => {
  process.env.SKILLS_BITBUCKET_URL = TEST_BITBUCKET_URL;
  process.env.SKILLS_BITBUCKET_SSH_HOST = TEST_BITBUCKET_SSH_HOST;
  ({ parseSource } = await import('./source-parser.js'));
});

describe('source-parser', () => {
  describe('GitLab Custom Domains & Subgroups', () => {
    it('parses custom gitlab domain with deep subgroup paths', () => {
      const result = parseSource('https://git.corp.com/group/subgroup/project/-/tree/main/src');
      expect(result).toEqual({
        type: 'gitlab',
        url: 'https://git.corp.com/group/subgroup/project.git',
        ref: 'main',
        subpath: 'src',
      });
    });

    it('parses gitlab tree with branch but no path', () => {
      const result = parseSource('https://gitlab.example.com/org/repo/-/tree/v1.0');
      expect(result).toEqual({
        type: 'gitlab',
        url: 'https://gitlab.example.com/org/repo.git',
        ref: 'v1.0',
      });
    });

    it('parses custom gitlab domain with port number', () => {
      const result = parseSource('https://git.corp.com:8443/group/repo/-/tree/main');
      expect(result).toMatchObject({
        type: 'gitlab',
        url: 'https://git.corp.com:8443/group/repo.git',
        ref: 'main',
      });
    });

    it('parses http protocol (non-ssl)', () => {
      const result = parseSource('http://git.local/group/repo/-/tree/dev');
      expect(result).toMatchObject({
        type: 'gitlab',
        url: 'http://git.local/group/repo.git',
      });
    });

    it('parses personal project path (~user)', () => {
      const result = parseSource('https://gitlab.com/~user/project/-/tree/main');
      expect(result).toMatchObject({
        type: 'gitlab',
        url: 'https://gitlab.com/~user/project.git',
      });
    });
  });

  describe('Simplified Git Strategy', () => {
    it('treats custom domains with .git as generic git', () => {
      const result = parseSource('https://git.mycompany.com/my-group/my-repo.git');
      expect(result).toEqual({
        type: 'git',
        url: 'https://git.mycompany.com/my-group/my-repo.git',
      });
    });

    it('prevents false positives for generic URLs (falls through to well-known)', () => {
      const result = parseSource('https://google.com/search/result');
      expect(result.type).toBe('well-known');
      expect(result.url).toBe('https://google.com/search/result');
    });

    it('retains official gitlab.com parsing for convenience', () => {
      const result = parseSource('https://gitlab.com/owner/repo');
      expect(result).toEqual({
        type: 'gitlab',
        url: 'https://gitlab.com/owner/repo.git',
      });
    });
  });

  describe('Existing GitHub Support', () => {
    it('parses bare shorthand as Bitbucket with a GitHub fallback', () => {
      const result = parseSource('vercel-labs/agent-skills');
      expect(result).toEqual({
        type: 'bitbucket',
        url: `ssh://git@${TEST_BITBUCKET_SSH_HOST}/vercel-labs/agent-skills.git`,
        githubFallbackUrl: 'https://github.com/vercel-labs/agent-skills.git',
      });
    });

    it('parses github-prefixed shorthand as GitHub', () => {
      const result = parseSource('github:vercel-labs/agent-skills@nextjs');
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/vercel-labs/agent-skills.git',
        skillFilter: 'nextjs',
      });
    });

    it('parses github full URL', () => {
      const result = parseSource('https://github.com/owner/repo/tree/main/path');
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/owner/repo.git',
        ref: 'main',
        subpath: 'path',
      });
    });

    it('does not treat GitHub blob anchors as refs', () => {
      const result = parseSource('https://github.com/owner/repo/blob/main/README.md#L10');
      expect(result).toEqual({
        type: 'github',
        url: 'https://github.com/owner/repo.git',
      });
    });

    it('parses github shorthand with #branch', () => {
      const result = parseSource('vercel-labs/agent-skills#feature/install');
      expect(result).toEqual({
        type: 'bitbucket',
        url: `ssh://git@${TEST_BITBUCKET_SSH_HOST}/vercel-labs/agent-skills.git`,
        ref: 'feature/install',
        githubFallbackUrl: 'https://github.com/vercel-labs/agent-skills.git',
      });
    });

    it('parses github shorthand with trailing slash', () => {
      const result = parseSource('vercel-labs/agent-skills/');
      expect(result).toEqual({
        type: 'bitbucket',
        url: `ssh://git@${TEST_BITBUCKET_SSH_HOST}/vercel-labs/agent-skills.git`,
        githubFallbackUrl: 'https://github.com/vercel-labs/agent-skills.git',
      });
    });

    it('parses SSH git URL with #branch', () => {
      const result = parseSource('git@github.com:owner/repo.git#feature/install');
      expect(result).toEqual({
        type: 'git',
        url: 'git@github.com:owner/repo.git',
        ref: 'feature/install',
      });
    });
  });
});
