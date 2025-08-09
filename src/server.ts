import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './shared/config/environment.js';
import { appConfig, getCorsConfig } from './shared/config/app-config.js';
import { healthRoutes } from './modules/health/presentation/health-routes.js';
import { emailRoutes } from './modules/email/presentation/email-routes.js';
import { authRoutes } from './modules/auth/presentation/auth-routes.js';
import { logger } from './shared/utils/logger.js';
import { nowUTC } from './shared/utils/date-utils.js';

/**
 * Cria e configura servidor Fastify simples
 */
async function createServer() {
  const fastify = Fastify({
    logger: true
  });

  // CORS configuração centralizada
  await fastify.register(cors, {
    origin: getCorsConfig(),
    credentials: true,
  });

  // Registrar rotas modulares
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(emailRoutes, { prefix: '/email' });
  await fastify.register(authRoutes, { prefix: '/auth' });

  // Rota hello world
  fastify.get('/', async () => {
    return { 
      message: 'Hello World from GrowSpace Backend!',
      timestamp: nowUTC().toISOString() 
    };
  });

  return fastify;
}

/**
 * Inicia o servidor
 */
async function startServer() {
  try {
    const server = await createServer();

    await server.listen({
      port: env.PORT,
      host: '0.0.0.0'
    });

    logger.info(`🌱 GrowSpace Backend iniciado na porta ${env.PORT}!`);

  } catch (error) {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer(); 