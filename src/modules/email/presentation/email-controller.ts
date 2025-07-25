import type { FastifyRequest, FastifyReply } from 'fastify';
import { EmailUseCases } from '../application/email-use-cases.js';
import { ResendEmailService } from '../infrastructure/resend-email-service.js';
import { MockEmailService } from '../infrastructure/mock-email-service.js';
import { sendEmailSchema } from '@/shared/types/email.js';
import { logger } from '@/shared/utils/logger.js';
import { env } from '@/shared/config/environment.js';

/**
 * Controller para endpoints de email
 * Responsabilidade única: lidar com requisições HTTP relacionadas a emails
 */
export class EmailController {
  private emailUseCases: EmailUseCases;

  constructor() {
    let emailService;
    
    if (env.RESEND_API_KEY) {
      logger.info('📧 Usando ResendEmailService (produção)');
      emailService = new ResendEmailService();
    } else {
      logger.warn('📧 RESEND_API_KEY não configurada, usando MockEmailService (desenvolvimento)');
      emailService = new MockEmailService();
    }
    
    this.emailUseCases = new EmailUseCases(emailService);
  }

  /**
   * Envia um email
   */
  async sendEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = sendEmailSchema.parse(request.body);

      logger.info('Requisição de envio de email recebida', {
        to: data.to,
        subject: data.subject,
      });

      const result = await this.emailUseCases.sendEmail(data);

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: 'Email enviado com sucesso',
          data: result.data,
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: 'Falha ao enviar email',
          error: result.error,
        });
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        logger.warn('Dados inválidos para envio de email', { error: error.message });
        return reply.status(400).send({
          success: false,
          message: 'Dados inválidos',
          error: 'Verifique os campos obrigatórios e formatos',
        });
      }

      logger.error('Erro inesperado no controller de email', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  /**
   * Envia email de boas-vindas
   */
  async sendWelcomeEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, name } = request.body as { email: string; name: string };

      if (!email || !name) {
        return reply.status(400).send({
          success: false,
          message: 'Email e nome são obrigatórios',
        });
      }

      logger.info('Enviando email de boas-vindas', { email, name });

      const result = await this.emailUseCases.sendWelcomeEmail(email, name);

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: 'Email de boas-vindas enviado com sucesso',
          data: result.data,
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: 'Falha ao enviar email de boas-vindas',
          error: result.error,
        });
      }

    } catch (error) {
      logger.error('Erro ao enviar email de boas-vindas', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  /**
   * Envia email de recuperação de senha
   */
  async sendPasswordResetEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, resetToken } = request.body as { email: string; resetToken: string };

      if (!email || !resetToken) {
        return reply.status(400).send({
          success: false,
          message: 'Email e token de reset são obrigatórios',
        });
      }

      logger.info('Enviando email de recuperação de senha', { email });

      const result = await this.emailUseCases.sendPasswordResetEmail(email, resetToken);

      if (result.success) {
        return reply.status(200).send({
          success: true,
          message: 'Email de recuperação enviado com sucesso',
          data: result.data,
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: 'Falha ao enviar email de recuperação',
          error: result.error,
        });
      }

    } catch (error) {
      logger.error('Erro ao enviar email de recuperação', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }
} 