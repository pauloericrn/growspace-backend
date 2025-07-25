import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthUseCases } from '../application/auth-use-cases.js';
import { UserService } from '../../../shared/services/user-service.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Controller para autenticação
 * Responsabilidade única: lidar com requisições HTTP de autenticação
 */
export class AuthController {
  private authUseCases: AuthUseCases;

  constructor() {
    const userService = new UserService();
    this.authUseCases = new AuthUseCases(userService);
  }

  /**
   * Inicia processo de autenticação Google
   */
  async initiateGoogleAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
      logger.info('Iniciando autenticação Google');

      const authUrl = this.authUseCases.generateGoogleAuthUrl();

      return reply.status(200).send({
        success: true,
        data: {
          authUrl,
          message: 'Acesse esta URL para fazer login com Google'
        }
      });

    } catch (error) {
      logger.error('Erro ao iniciar autenticação Google', { error });
      
      return reply.status(500).send({
        success: false,
        error: 'Erro interno ao iniciar autenticação'
      });
    }
  }

  /**
   * Processa callback do Google OAuth
   */
  async processGoogleCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { code } = request.query as { code?: string };

      if (!code) {
        return reply.status(400).send({
          success: false,
          error: 'Código de autorização não fornecido'
        });
      }

      const result = await this.authUseCases.processGoogleCallback(code);

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          error: result.error
        });
      }

      return reply.redirect(result.redirectUrl!);

    } catch (error) {
      logger.error('Erro no callback OAuth', { error });
      
      return reply.status(500).send({
        success: false,
        error: 'Erro interno no processo de autenticação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
} 