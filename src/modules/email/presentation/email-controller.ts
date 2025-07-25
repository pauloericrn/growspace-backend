import type { FastifyRequest, FastifyReply } from 'fastify';
import { EmailUseCases } from '../application/email-use-cases.js';
import { ResendEmailService } from '../infrastructure/resend-email-service.js';
import { MockEmailService } from '../infrastructure/mock-email-service.js';
import { sendEmailSchema } from '../../../shared/types/email.js';
import { logger } from '../../../shared/utils/logger.js';
import { env } from '../../../shared/config/environment.js';

/**
 * Controller para endpoints de email
 * Responsabilidade única: lidar com requisições HTTP relacionadas a emails
 */
export class EmailController {
  private emailUseCases: EmailUseCases;
  private emailServiceType: string;

  constructor() {
    let emailService;
    
    if (env.RESEND_API_KEY) {
      logger.info('📧 Usando ResendEmailService (produção)', {
        hasApiKey: !!env.RESEND_API_KEY,
        apiKeyLength: env.RESEND_API_KEY.length,
        fromEmail: env.RESEND_FROM_EMAIL,
      });
      emailService = new ResendEmailService();
      this.emailServiceType = 'ResendEmailService';
    } else {
      logger.warn('📧 RESEND_API_KEY não configurada, usando MockEmailService (desenvolvimento)', {
        hasApiKey: false,
        nodeEnv: env.NODE_ENV,
        fromEmail: env.RESEND_FROM_EMAIL,
      });
      emailService = new MockEmailService();
      this.emailServiceType = 'MockEmailService';
    }
    
    this.emailUseCases = new EmailUseCases(emailService);
  }

  /**
   * Endpoint de diagnóstico para verificar configuração de email
   */
  async getEmailDiagnostics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: env.NODE_ENV,
          hasResendApiKey: !!env.RESEND_API_KEY,
          apiKeyLength: env.RESEND_API_KEY ? env.RESEND_API_KEY.length : 0,
          fromEmail: env.RESEND_FROM_EMAIL,
        },
        service: {
          type: this.emailServiceType,
          isMock: this.emailServiceType === 'MockEmailService',
        },
        recommendations: [] as string[],
      };

      // Adiciona recomendações baseadas na configuração
      if (!env.RESEND_API_KEY) {
        diagnostics.recommendations.push(
          'Configure RESEND_API_KEY no Railway para usar o serviço real de email'
        );
      }

      if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
        diagnostics.recommendations.push(
          '⚠️ ATENÇÃO: Produção sem RESEND_API_KEY - emails não serão enviados!'
        );
      }

      logger.info('Diagnóstico de email solicitado', diagnostics);

      return reply.status(200).send({
        success: true,
        message: 'Diagnóstico de email',
        data: diagnostics,
      });

    } catch (error) {
      logger.error('Erro ao gerar diagnóstico de email', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        success: false,
        message: 'Erro ao gerar diagnóstico',
      });
    }
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
        serviceType: this.emailServiceType,
        hasApiKey: !!env.RESEND_API_KEY,
        nodeEnv: env.NODE_ENV,
      });

      const result = await this.emailUseCases.sendEmail(data);

      if (result.success) {
        logger.info('Email processado com sucesso', {
          emailId: result.data?.id,
          serviceType: this.emailServiceType,
          to: data.to,
        });

        return reply.status(200).send({
          success: true,
          message: 'Email enviado com sucesso',
          data: result.data,
          service: this.emailServiceType,
        });
      } else {
        logger.error('Falha ao enviar email', {
          error: result.error,
          serviceType: this.emailServiceType,
          to: data.to,
        });

        return reply.status(400).send({
          success: false,
          message: 'Falha ao enviar email',
          error: result.error,
          service: this.emailServiceType,
        });
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        logger.warn('Dados inválidos para envio de email', { 
          error: error.message,
          body: request.body,
        });
        return reply.status(400).send({
          success: false,
          message: 'Dados inválidos',
          error: 'Verifique os campos obrigatórios e formatos',
        });
      }

      logger.error('Erro inesperado no controller de email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        serviceType: this.emailServiceType,
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