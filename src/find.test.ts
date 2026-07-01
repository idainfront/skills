import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type {
  parseFindOptions as ParseFindOptions,
  searchSkillsAPI as SearchSkillsAPI,
} from './find.ts';

// SEARCH_API_BASE is read from SKILLS_API_URL at module load time, so stub it
// with a fake test domain (never a real internal URL) and dynamically import
// the module afterwards.
const TEST_API_URL = 'https://api.example.test';

let parseFindOptions: typeof ParseFindOptions;
let searchSkillsAPI: typeof SearchSkillsAPI;

beforeAll(async () => {
  process.env.SKILLS_API_URL = TEST_API_URL;
  ({ parseFindOptions, searchSkillsAPI } = await import('./find.ts'));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseFindOptions', () => {
  it('separates and normalizes an owner from a multi-word query', () => {
    expect(parseFindOptions(['react', 'native', '--owner', 'Vercel'])).toEqual({
      query: 'react native',
      options: { owner: 'vercel' },
      errors: [],
    });
  });

  it('supports the --owner=value form', () => {
    expect(parseFindOptions(['--owner=vercel-labs', 'next'])).toEqual({
      query: 'next',
      options: { owner: 'vercel-labs' },
      errors: [],
    });
  });

  it('rejects missing and invalid owners', () => {
    expect(parseFindOptions(['react', '--owner']).errors).toEqual([
      '--owner requires a GitHub owner',
    ]);
    expect(parseFindOptions(['react', '--owner', 'not/an/owner']).errors).toEqual([
      '--owner must be a valid GitHub owner',
    ]);
  });
});

describe('searchSkillsAPI', () => {
  it('sends the owner as an API query parameter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ skills: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await searchSkillsAPI('react native', 'vercel');

    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.origin).toBe(TEST_API_URL);
    expect(url.pathname).toBe('/api/search');
    expect(url.searchParams.get('q')).toBe('react native');
    expect(url.searchParams.get('owner')).toBe('vercel');
    expect(url.searchParams.get('limit')).toBe('10');
  });
});
