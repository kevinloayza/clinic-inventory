import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    defaultCommandTimeout: 8000,
  },
  env: { apiUrl: process.env.CYPRESS_API_URL ?? 'http://localhost:4000' },
});
