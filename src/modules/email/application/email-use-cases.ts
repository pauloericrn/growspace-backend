import type { IEmailService, SendEmailRequest, EmailResponse } from '@/shared/types/email.js';
import { logger } from '@/shared/utils/logger.js';
import { appConfig, getFrontendUrl } from '@/shared/config/app-config.js';

/**
 * Casos de uso para o módulo de email
 * Responsabilidade: Orquestrar operações de negócio relacionadas a emails
 */
export class EmailUseCases {
  constructor(private emailService: IEmailService) {}

  /**
   * Envia um email
   * Caso de uso principal para envio de emails
   */
  async sendEmail(data: SendEmailRequest): Promise<EmailResponse> {
    try {
      logger.info('Executando caso de uso: enviar email', {
        to: data.to,
        subject: data.subject,
      });

      const result = await this.emailService.sendEmail(data);

      if (result.success) {
        logger.info('Email enviado com sucesso', {
          emailId: result.data?.id,
        });
      } else {
        logger.error('Falha ao enviar email', {
          error: result.error,
        });
      }

      return result;

    } catch (error) {
      logger.error('Erro inesperado no caso de uso de envio de email', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    }
  }

  /**
   * Envia email de boas-vindas
   * Caso de uso específico para emails de boas-vindas
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<EmailResponse> {
    const welcomeEmailData: SendEmailRequest = {
      to: [userEmail],
      subject: appConfig.email.templates.welcome.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">🌱 Bem-vindo ao GrowSpace!</h1>
          <p>Olá <strong>${userName}</strong>,</p>
          <p>Estamos muito felizes em tê-lo conosco no GrowSpace!</p>
          <p>Com nossa plataforma, você poderá:</p>
          <ul>
            <li>Gerenciar seus cultivos de forma inteligente</li>
            <li>Acompanhar o crescimento das suas plantas</li>
            <li>Receber lembretes e dicas personalizadas</li>
            <li>Conectar-se com outros cultivadores</li>
          </ul>
          <p>Se você tiver alguma dúvida, não hesite em nos contatar.</p>
          <p>Atenciosamente,<br>Equipe GrowSpace</p>
        </div>
      `,
      text: `
        Bem-vindo ao GrowSpace!
        
        Olá ${userName},
        
        Estamos muito felizes em tê-lo conosco no GrowSpace!
        
        Com nossa plataforma, você poderá:
        - Gerenciar seus cultivos de forma inteligente
        - Acompanhar o crescimento das suas plantas
        - Receber lembretes e dicas personalizadas
        - Conectar-se com outros cultivadores
        
        Se você tiver alguma dúvida, não hesite em nos contatar.
        
        Atenciosamente,
        Equipe GrowSpace
      `,
    };

    return this.sendEmail(welcomeEmailData);
  }

  /**
   * Envia email de recuperação de senha
   * Caso de uso específico para recuperação de senha
   */
  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<EmailResponse> {
    const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetToken}`;
    
    const resetEmailData: SendEmailRequest = {
      to: [userEmail],
      subject: appConfig.email.templates.passwordReset.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">🔐 Recuperação de Senha</h1>
          <p>Você solicitou a recuperação de senha da sua conta GrowSpace.</p>
          <p>Clique no botão abaixo para redefinir sua senha:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Redefinir Senha
          </a>
          <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>Este link expira em 1 hora por motivos de segurança.</p>
          <p>Se você não solicitou esta recuperação, ignore este email.</p>
          <p>Atenciosamente,<br>Equipe GrowSpace</p>
        </div>
      `,
      text: `
        Recuperação de Senha - GrowSpace
        
        Você solicitou a recuperação de senha da sua conta GrowSpace.
        
        Clique no link abaixo para redefinir sua senha:
        ${resetUrl}
        
        Este link expira em 1 hora por motivos de segurança.
        
        Se você não solicitou esta recuperação, ignore este email.
        
        Atenciosamente,
        Equipe GrowSpace
      `,
    };

    return this.sendEmail(resetEmailData);
  }
} 