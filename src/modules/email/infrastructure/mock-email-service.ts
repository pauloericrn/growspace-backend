import type { IEmailService, SendEmailRequest, EmailResponse } from '../../../shared/types/email.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Serviço de email mock para testes
 * Usado quando RESEND_API_KEY não está configurada
 */
export class MockEmailService implements IEmailService {
  async sendEmail(data: SendEmailRequest): Promise<EmailResponse> {
    logger.info('📧 [MOCK] Simulando envio de email', {
      to: data.to,
      subject: data.subject,
    });

    // Simula um delay de envio
    await new Promise(resolve => setTimeout(resolve, 1000));

    logger.info('📧 [MOCK] Email "enviado" com sucesso', {
      to: data.to,
      subject: data.subject,
    });

    return {
      success: true,
      data: {
        id: `mock-${Date.now()}`,
        from: data.from || 'mock@resend.dev',
        to: data.to,
        subject: data.subject,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
} 