import { defineBuildConfig } from 'obuild/config';

// https://github.com/unjs/obuild
export default defineBuildConfig({
  entries: [{ type: 'bundle', input: './src/cli.ts' }],
  define: (() => {
    // Internal API URLs must be supplied as env vars at build time (e.g. via Jenkins).
    // The bundler replaces process.env.* with the resolved string literal in the output,
    // so no env var is required at runtime.
    const required = ['SKILLS_INTERNAL_TELEMETRY_URL', 'SKILLS_API_URL', 'SKILLS_BITBUCKET_URL'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Build error: missing required env vars: ${missing.join(', ')}`);
    }
    return {
      'process.env.SKILLS_INTERNAL_TELEMETRY_URL': JSON.stringify(process.env.SKILLS_INTERNAL_TELEMETRY_URL),
      'process.env.SKILLS_API_URL': JSON.stringify(process.env.SKILLS_API_URL),
      'process.env.SKILLS_BITBUCKET_URL': JSON.stringify(process.env.SKILLS_BITBUCKET_URL),
    };
  })(),
});
