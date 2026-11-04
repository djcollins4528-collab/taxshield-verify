import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: '.', testMatch: '*.spec.mjs', workers: 1, retries: 0,
 reporter: [['list'], ['json',{outputFile: 'results/results.json'}]],
 use: {baseURL: process.env.PROOFLINE_BROWSER_URL || 'http://127.0.0.1:4187', screenshot:'only-on-failure', trace:'off'},
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
 webServer: process.env.PROOFLINE_BROWSER_URL ? undefined : {command:'node serve.mjs',port:4187,reuseExistingServer:false}
});
