import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
// FIX: `__dirname` is not available in ES modules. This is the standard way to recreate it.
import { fileURLToPath } from 'url';
// FIX: Import `process` to ensure correct TypeScript types are available for `process.exit`.
import process from 'process';


const server = Fastify({
  logger: true,
});

// FIX: Define __dirname for ES Modules environment.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the static frontend assets from the `frontend/dist` directory
server.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/dist'),
});

// For client-side routing (e.g., React Router), redirect all non-api requests to index.html
server.setNotFoundHandler((request, reply) => {
    // Exclude API routes from this fallback
    if (request.raw.url && request.raw.url.startsWith('/api')) {
        reply.code(404).send({ error: 'Not Found' });
        return;
    }
    reply.sendFile('index.html');
});


// Placeholder for API routes. In a real app, these would be in separate files.
server.register(async function apiRoutes(fastify, options) {
    fastify.get('/api/health', (req, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // All your other API routes from `frontend/src/services/api.ts` would be defined here.
    // e.g., fastify.post('/auth/login', ...)
});


// Start the server
const start = async () => {
  try {
    // For containerized environments, listen on 0.0.0.0
    // Use PORT from env, fallback to 3001
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await server.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();