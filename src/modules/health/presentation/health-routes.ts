import type { FastifyInstance } from 'fastify';
import { HealthController } from './health-controller.js';

/**
 * Registra as rotas de health check
 * Responsabilidade única: definir endpoints de saúde do sistema
 */
export async function healthRoutes(fastify: FastifyInstance) {
  const healthController = new HealthController();

  // Hello World - validação básica
  fastify.get('/', {
    schema: {
      description: 'Hello World endpoint para validação básica',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                timestamp: { type: 'string' },
                environment: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, healthController.helloWorld);

  // Health Check completo
  fastify.get('/health', {
    schema: {
      description: 'Health check completo do sistema',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            environment: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string', enum: ['connected', 'disconnected'] },
                memory: {
                  type: 'object',
                  properties: {
                    used: { type: 'number' },
                    free: { type: 'number' },
                    total: { type: 'number' }
                  }
                }
              }
            }
          }
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, healthController.healthCheck);
} 