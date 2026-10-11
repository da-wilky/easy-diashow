import { readFileSync } from 'node:fs'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

// the preview server (used by the e2e tests) enforces the production CSP
const csp = /Content-Security-Policy "([^"]+)"/.exec(readFileSync('Caddyfile', 'utf8'))![1]!

export default defineConfig({
  plugins: [svelte()],
  preview: { headers: { 'Content-Security-Policy': csp } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
})
