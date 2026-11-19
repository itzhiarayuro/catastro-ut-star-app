import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const requiredConfig = {
    VITE_FIREBASE_API_KEY: 'apiKey', VITE_FIREBASE_AUTH_DOMAIN: 'authDomain',
    VITE_FIREBASE_PROJECT_ID: 'projectId', VITE_FIREBASE_STORAGE_BUCKET: 'storageBucket',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId', VITE_FIREBASE_APP_ID: 'appId',
};
const buildEnvironment = { ...process.env };
if (Object.keys(requiredConfig).some(name => !buildEnvironment[name])) {
    const projectId = JSON.parse(readFileSync('.firebaserc', 'utf8')).projects?.default;
    if (!projectId) throw new Error('No hay un proyecto default en .firebaserc');
    const response = JSON.parse(execFileSync('firebase', ['apps:sdkconfig', 'WEB', '--project', projectId, '--json'], { encoding: 'utf8' }));
    const sdkConfig = response.result?.sdkConfig;
    if (!sdkConfig) throw new Error('Firebase CLI no entregó la configuración WEB');
    for (const [environmentName, configName] of Object.entries(requiredConfig)) buildEnvironment[environmentName] = sdkConfig[configName];
}
for (const name of Object.keys(requiredConfig)) if (!buildEnvironment[name]) throw new Error(`Falta la configuración requerida: ${name}`);
const run = (executable, args) => {
    const result = spawnSync(process.execPath, [executable, ...args], { env: buildEnvironment, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
};
run('./node_modules/typescript/bin/tsc', []);
run('./node_modules/vite/bin/vite.js', ['build']);
