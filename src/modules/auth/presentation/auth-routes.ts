import type { FastifyInstance } from 'fastify';
import { AuthController } from './auth-controller.js';

/**
 * Registra as rotas de autenticação
 * Responsabilidade única: definir endpoints de autenticação
 */
export async function authRoutes(fastify: FastifyInstance) {
  const authController = new AuthController();

  // Iniciar autenticação Google
  fastify.get('/google', {
    schema: {
      description: 'Inicia processo de autenticação Google OAuth',
      tags: ['Auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                authUrl: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, (request, reply) => authController.initiateGoogleAuth(request, reply));

  // Callback Google OAuth
  fastify.get('/google/callback', {
    schema: {
      description: 'Processa callback do Google OAuth',
      tags: ['Auth'],
      querystring: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', description: 'Código de autorização do Google' }
        }
      },
      response: {
        302: {
          type: 'object',
          description: 'Redirecionamento para o frontend'
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            details: { type: 'string' }
          }
        }
      }
    }
  }, (request, reply) => authController.processGoogleCallback(request, reply));
} 