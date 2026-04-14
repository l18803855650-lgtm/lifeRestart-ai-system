import { defineConfig, loadEnv } from 'vite';
import { createSystemDialogueHandler } from './server/system-dialogue.js';

function aiApiPlugin(env) {
    const handler = createSystemDialogueHandler({
        ...process.env,
        ...env,
    });

    const attach = server => {
        server.middlewares.use('/api/system-dialogue/health', handler);
        server.middlewares.use('/api/system-dialogue', handler);
    };

    return {
        name: 'life-restart-ai-api',
        configureServer(server) {
            attach(server);
        },
        configurePreviewServer(server) {
            attach(server);
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        root: 'public',
        base: './',
        plugins: [aiApiPlugin(env)],
        build: {
            outDir: '../dist',
            emptyOutDir: true,
        },
    };
});
