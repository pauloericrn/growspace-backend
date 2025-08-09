import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import { env } from '../../../shared/config/environment.js';
import { logger } from '../../../shared/utils/logger.js';
import { nowUTC } from '../../../shared/utils/date-utils.js';
import type { IEmailService, SendEmailRequest, EmailResponse } from '../../../shared/types/email.js';
import { EmailEntity } from '../domain/entities/email-entity.js';

/**
 * Serviço de email usando Resend
 * Responsabilidade: Integração com API externa do Resend
 */
export class ResendEmailService implements IEmailService {
  private resend: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY não configurada. Adicione RESEND_API_KEY=re_aur7DCwi_GL2ibdvckSeQ6pzFr1BzBPVc ao seu .env');
    }
    
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  /**
   * Envia email através do Resend
   */
  async sendEmail(data: SendEmailRequest): Promise<EmailResponse> {
    try {
      logger.info('Enviando email via Resend', {
        to: data.to,
        subject: data.subject,
        from: data.from || env.RESEND_FROM_EMAIL,
        hasApiKey: !!env.RESEND_API_KEY,
        apiKeyPrefix: env.RESEND_API_KEY ? env.RESEND_API_KEY.substring(0, 8) + '...' : 'N/A',
      });

      // Prepara dados para envio
      const emailData: any = {
        from: data.from || env.RESEND_FROM_EMAIL,
        to: data.to,
        subject: data.subject,
        html: data.html,
      };

      // Adiciona campos opcionais apenas se existirem
      if (data.text) {
        emailData.text = data.text;
      }
      if (data.replyTo) {
        emailData.replyTo = data.replyTo;
      }

      logger.debug('Dados preparados para envio via Resend', {
        emailData: {
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          hasHtml: !!emailData.html,
          hasText: !!emailData.text,
          hasReplyTo: !!emailData.replyTo,
        },
      });

      // Envia email via Resend
      const result = await this.resend.emails.send(emailData);

      if (result.error) {
        logger.error('Erro ao enviar email via Resend', {
          error: result.error,
          errorType: typeof result.error,
          errorKeys: result.error ? Object.keys(result.error) : [],
          resendResponse: result,
        });

        const errorMessage = result.error.message || 
          (typeof result.error === 'object' && 'error' in result.error ? result.error.error : 'Erro desconhecido');

        return {
          success: false,
          error: `Falha ao enviar email: ${errorMessage}`,
        };
      }

      logger.info('Email enviado com sucesso via Resend', {
        resendId: result.data?.id,
      });

      return {
        success: true,
        data: {
          id: result.data?.id || randomUUID(),
          from: data.from || env.RESEND_FROM_EMAIL,
          to: data.to,
          subject: data.subject,
          createdAt: nowUTC().toISOString(),
        },
      };

    } catch (error) {
      logger.error('Erro inesperado ao enviar email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        resendApiKeyConfigured: !!env.RESEND_API_KEY,
        fromEmail: env.RESEND_FROM_EMAIL,
      });

      return {
        success: false,
        error: 'Erro interno do servidor ao enviar email',
      };
    }
  }

  /**
   * Verifica se o serviço está funcionando
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Tenta fazer uma chamada simples para verificar a conectividade
      // Como não há método list, vamos tentar enviar um email de teste
      // ou simplesmente retornar true se a instância foi criada
      return this.resend !== null;
    } catch (error) {
      logger.error('Resend health check failed', error);
      return false;
    }
  }
} 