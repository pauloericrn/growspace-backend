import type { FastifyRequest, FastifyReply } from 'fastify';
import { EmailUseCases } from '../application/email-use-cases.js';
import { ResendEmailService } from '../infrastructure/resend-email-service.js';
import { MockEmailService } from '../infrastructure/mock-email-service.js';
import { sendEmailSchema } from '../../../shared/types/email.js';
import { logger } from '../../../shared/utils/logger.js';
import { env } from '../../../shared/config/environment.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Controller para endpoints de email
 * Responsabilidade única: lidar com requisições HTTP relacionadas a emails
 */
export class EmailController {
  private emailUseCases: EmailUseCases;
  private emailServiceType: string;
  private supabase;

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
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
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

  /**
   * Busca template de email por template_key
   */
  private async getEmailTemplate(templateKey: string) {
    try {
      logger.info(`🔍 Buscando template para key: "${templateKey}"`);
      
      const { data: template, error } = await this.supabase
        .from('email_templates')
        .select('*')
        .eq('template_key', templateKey)
        .eq('active', true)
        .single();

      if (error) {
        logger.warn(`❌ Erro ao buscar template "${templateKey}":`, { 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      if (!template) {
        logger.warn(`❌ Template não encontrado para key: "${templateKey}"`);
        return null;
      }

      logger.info(`✅ Template encontrado para "${templateKey}":`, {
        id: template.id,
        name: template.name,
        template_key: template.template_key,
        active: template.active,
        hasSubject: !!template.subject_template,
        hasHtml: !!template.html_template,
        subjectPreview: template.subject_template?.substring(0, 50) + '...'
      });

      return template;
    } catch (error) {
      logger.error(`💥 Exceção ao buscar template "${templateKey}":`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Processa notificações pendentes do banco de dados
   */
  async processPendingNotifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      logger.info('Iniciando processamento de notificações pendentes');

      // Log da query em desenvolvimento
      if (env.NODE_ENV === 'development') {
        const sqlQuery = `
-- Query 1: Buscar notificações pendentes
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  status,
  created_at,
  scheduled_at,
  template_key,
  template_variables,
  payload
FROM notifications
WHERE status = 'pending' 
  AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC
LIMIT 50;

-- Query 2: Buscar template individual (por template_key)
SELECT *
FROM email_templates
WHERE template_key = 'task_reminder'
  AND active = true;`;

        logger.info('🔍 SQL Query (desenvolvimento):', {
          sql: sqlQuery,
          table: 'notifications',
          filters: {
            status: 'pending',
            scheduled_at: '<= NOW()'
          },
          order: 'scheduled_at ASC',
          limit: 50
        });
      }

      // Buscar notificações pendentes
      const { data: pendingNotifications, error: fetchError } = await this.supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          type,
          title,
          message,
          status,
          created_at,
          scheduled_at,
          template_key,
          template_variables,
          payload
        `)
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(50);

      // Log dos resultados em desenvolvimento
      if (env.NODE_ENV === 'development') {
        logger.info('📊 Resultados da query (desenvolvimento):', {
          totalFound: pendingNotifications?.length || 0,
          hasError: !!fetchError,
          error: fetchError,
          sampleData: pendingNotifications?.slice(0, 2), // Mostra apenas 2 registros como exemplo
          templateKeys: pendingNotifications?.map(n => n.template_key)
        });
      }

      if (fetchError) {
        logger.error('Erro ao buscar notificações pendentes', { error: fetchError });
        return reply.status(500).send({
          success: false,
          message: 'Erro ao buscar notificações',
          error: fetchError.message
        });
      }

      if (!pendingNotifications || pendingNotifications.length === 0) {
        logger.info('Nenhuma notificação pendente encontrada');
        return reply.status(200).send({
          success: true,
          message: 'Nenhuma notificação pendente',
          data: {
            processed: 0,
            notifications: []
          }
        });
      }

      logger.info(`Encontradas ${pendingNotifications.length} notificações pendentes`);

      // Preparar dados para envio
      const emailData = [];
      
      logger.info(`🔄 Processando ${pendingNotifications.length} notificações...`);
      
      for (let i = 0; i < pendingNotifications.length; i++) {
        const notification = pendingNotifications[i];
        
        if (!notification) {
          logger.warn(`⚠️ Notificação ${i + 1} é undefined, pulando...`);
          continue;
        }
        
        logger.info(`📝 Processando notificação ${i + 1}/${pendingNotifications.length}:`, {
          id: notification.id,
          template_key: notification.template_key,
          title: notification.title
        });
        
        // Email fixo para desenvolvimento
        const userEmail = env.NODE_ENV === 'development' 
          ? 'pauloericrn@gmail.com' 
          : 'pauloericrn@gmail.com';

        // Buscar template correspondente
        const template = await this.getEmailTemplate(notification.template_key);
        
        if (!template) {
          logger.warn(`Template não encontrado para key: ${notification.template_key}`, {
            notificationId: notification.id,
            templateKey: notification.template_key
          });
          // Fallback para template simples
          emailData.push({
            notificationId: notification.id,
            to: [userEmail],
            subject: `🌱 GrowSpace - ${notification.title}`,
            html: `<div><h2>${notification.title}</h2><p>${notification.message}</p></div>`,
            text: `${notification.title}\n${notification.message}`,
            type: notification.type
          });
          continue;
        }

        // Preparar variáveis para substituição
        const variables = {
          user_name: notification.template_variables?.user_name || 'Usuário',
          task_title: notification.template_variables?.task_title || notification.title,
          task_description: notification.message,
          task_priority: notification.payload?.priority || 'médio',
          due_date: notification.scheduled_at ? new Date(notification.scheduled_at).toLocaleDateString('pt-BR') : 'Hoje',
          plant_name: 'Planta', // Por enquanto fixo
          app_url: 'https://growspace.app' // Por enquanto fixo
        };

        // Substituir variáveis no template
        let htmlContent = template.html_template;
        let subjectContent = template.subject_template;

        // Substituir variáveis básicas
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          htmlContent = htmlContent.replace(regex, value);
          subjectContent = subjectContent.replace(regex, value);
        });

        // Remover condicionais não tratadas ({{#if ...}})
        htmlContent = htmlContent.replace(/\{\{#if [^}]+\}\}[\s\S]*?\{\{\/if\}\}/g, '');

        emailData.push({
          notificationId: notification.id,
          to: [userEmail],
          subject: subjectContent,
          html: htmlContent,
          text: `${notification.title}\n${notification.message}`,
          type: notification.type,
          templateKey: notification.template_key
        });
        
        if (env.NODE_ENV === 'development') {
          logger.info(`✅ Email preparado para notificação ${notification.id}:`, {
            templateKey: notification.template_key,
            subject: subjectContent.substring(0, 50) + '...',
            hasTemplate: true
          });
        }
      }

      // Log dos dados processados em desenvolvimento
      if (env.NODE_ENV === 'development') {
        logger.info('📧 Dados processados para envio (desenvolvimento):', {
          totalEmails: emailData.length,
          templatesFound: emailData.filter(e => e.templateKey).length,
          sampleEmail: emailData[0], // Mostra o primeiro email como exemplo
          sampleEmailKeys: emailData[0] ? Object.keys(emailData[0]) : [],
          allEmailKeys: emailData.map(e => Object.keys(e)),
          templateKeysInData: emailData.map(e => e.templateKey)
        });
      }

      // Log do retorno final
      if (env.NODE_ENV === 'development') {
        const finalResponse = {
          success: true,
          message: 'Notificações processadas com sucesso',
          data: {
            processed: pendingNotifications.length,
            emailData: emailData,
            notifications: pendingNotifications.map(notification => {
              const userEmail = env.NODE_ENV === 'development' 
                ? 'pauloericrn@gmail.com' 
                : 'pauloericrn@gmail.com';

              return {
                id: notification.id,
                type: notification.type,
                userEmail: userEmail,
                status: 'ready_for_send',
                templateKey: notification.template_key
              };
            })
          }
        };
        
        logger.info('📤 Retorno final da API:', {
          emailDataLength: finalResponse.data.emailData.length,
          emailDataKeys: finalResponse.data.emailData[0] ? Object.keys(finalResponse.data.emailData[0]) : [],
          hasTemplateKey: finalResponse.data.emailData[0] ? 'templateKey' in finalResponse.data.emailData[0] : false,
          templateKeyValue: finalResponse.data.emailData[0]?.templateKey
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Notificações processadas com sucesso',
        data: {
          processed: pendingNotifications.length,
          emailData: emailData,
          notifications: pendingNotifications.map(notification => {
            const userEmail = env.NODE_ENV === 'development' 
              ? 'pauloericrn@gmail.com' 
              : 'pauloericrn@gmail.com';

            return {
              id: notification.id,
              type: notification.type,
              userEmail: userEmail,
              status: 'ready_for_send',
              templateKey: notification.template_key
            };
          })
        }
      });
    } catch (error) {
      logger.error('Erro inesperado ao processar notificações', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  /**
   * Atualiza status de uma notificação
   */
  private async updateNotificationStatus(notificationId: string, status: string, sentAt?: Date, errorMessage?: string) {
    try {
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'sent' && sentAt) {
        updateData.sent_at = sentAt.toISOString();
      }

      if (status === 'failed' && errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await this.supabase
        .from('notifications')
        .update(updateData)
        .eq('id', notificationId);

      if (error) {
        logger.error(`Erro ao atualizar status da notificação ${notificationId}:`, { error });
        return false;
      }

      logger.info(`✅ Status atualizado para notificação ${notificationId}: ${status}`);
      return true;
    } catch (error) {
      logger.error(`Exceção ao atualizar status da notificação ${notificationId}:`, { error });
      return false;
    }
  }

  /**
   * Processa e envia notificações pendentes automaticamente
   */
  async processAndSendNotifications(request: FastifyRequest, reply: FastifyReply) {
    const startTime = Date.now();
    
    try {
      logger.info('🚀 Iniciando processamento e envio automático de notificações');

      // Buscar notificações pendentes
      const { data: pendingNotifications, error: fetchError } = await this.supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          type,
          title,
          message,
          status,
          created_at,
          scheduled_at,
          template_key,
          template_variables,
          payload
        `)
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(50);

      if (fetchError) {
        logger.error('Erro ao buscar notificações pendentes', { error: fetchError });
        return reply.status(500).send({
          success: false,
          message: 'Erro ao buscar notificações',
          error: fetchError.message
        });
      }

      if (!pendingNotifications || pendingNotifications.length === 0) {
        logger.info('Nenhuma notificação pendente encontrada');
        return reply.status(200).send({
          success: true,
          message: 'Nenhuma notificação pendente',
          data: {
            processed: 0,
            sent: 0,
            failed: 0,
            successRate: 100,
            processingTime: Date.now() - startTime,
            details: []
          }
        });
      }

      logger.info(`Encontradas ${pendingNotifications.length} notificações pendentes`);

      // Processar e enviar cada notificação
      const results = [];
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < pendingNotifications.length; i++) {
        const notification = pendingNotifications[i];
        
        if (!notification) {
          logger.warn(`⚠️ Notificação ${i + 1} é undefined, pulando...`);
          continue;
        }

        logger.info(`📝 Processando notificação ${i + 1}/${pendingNotifications.length}:`, {
          id: notification.id,
          template_key: notification.template_key,
          title: notification.title
        });

        // Email fixo para desenvolvimento
        const userEmail = env.NODE_ENV === 'development' 
          ? 'pauloericrn@gmail.com' 
          : 'pauloericrn@gmail.com';

        // Buscar template correspondente
        const template = await this.getEmailTemplate(notification.template_key);
        
        if (!template) {
          logger.warn(`Template não encontrado para key: ${notification.template_key}`, {
            notificationId: notification.id,
            templateKey: notification.template_key
          });
          
          // Atualizar status para failed
          await this.updateNotificationStatus(notification.id, 'failed', undefined, 'Template não encontrado');
          
          results.push({
            notificationId: notification.id,
            status: 'failed',
            emailId: null,
            error: 'Template não encontrado'
          });
          failedCount++;
          continue;
        }

        // Preparar variáveis para substituição
        const variables = {
          user_name: notification.template_variables?.user_name || 'Usuário',
          task_title: notification.template_variables?.task_title || notification.title,
          task_description: notification.message,
          task_priority: notification.payload?.priority || 'médio',
          due_date: notification.scheduled_at ? new Date(notification.scheduled_at).toLocaleDateString('pt-BR') : 'Hoje',
          plant_name: 'Planta', // Por enquanto fixo
          app_url: 'https://growspace.app' // Por enquanto fixo
        };

        // Substituir variáveis no template
        let htmlContent = template.html_template;
        let subjectContent = template.subject_template;

        // Substituir variáveis básicas
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          htmlContent = htmlContent.replace(regex, value);
          subjectContent = subjectContent.replace(regex, value);
        });

        // Remover condicionais não tratadas ({{#if ...}})
        htmlContent = htmlContent.replace(/\{\{#if [^}]+\}\}[\s\S]*?\{\{\/if\}\}/g, '');

        // Preparar dados do email
        const emailData = {
          to: [userEmail],
          subject: subjectContent,
          html: htmlContent,
          text: `${notification.title}\n${notification.message}`
        };

        // Enviar email
        try {
          logger.info(`📧 Enviando email para notificação ${notification.id}`);
          
          const emailResult = await this.emailUseCases.sendEmail(emailData);
          
          if (emailResult.success) {
            // Atualizar status para sent
            await this.updateNotificationStatus(notification.id, 'sent', new Date());
            
            logger.info(`✅ Email enviado com sucesso para notificação ${notification.id}`, {
              emailId: emailResult.data?.id
            });
            
            results.push({
              notificationId: notification.id,
              status: 'sent',
              emailId: emailResult.data?.id || 'N/A',
              error: null
            });
            sentCount++;
          } else {
            // Atualizar status para failed
            await this.updateNotificationStatus(notification.id, 'failed', undefined, emailResult.error);
            
            logger.error(`❌ Falha ao enviar email para notificação ${notification.id}`, {
              error: emailResult.error
            });
            
            results.push({
              notificationId: notification.id,
              status: 'failed',
              emailId: null,
              error: emailResult.error
            });
            failedCount++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          
          // Atualizar status para failed
          await this.updateNotificationStatus(notification.id, 'failed', undefined, errorMessage);
          
          logger.error(`💥 Exceção ao enviar email para notificação ${notification.id}`, {
            error: errorMessage
          });
          
          results.push({
            notificationId: notification.id,
            status: 'failed',
            emailId: null,
            error: errorMessage
          });
          failedCount++;
        }

        // Delay para respeitar rate limit do Resend (2 requests/segundo)
        if (i < pendingNotifications.length - 1) {
          logger.info(`⏳ Aguardando 600ms para respeitar rate limit...`);
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }

      const processingTime = Date.now() - startTime;
      const successRate = pendingNotifications.length > 0 ? (sentCount / pendingNotifications.length) * 100 : 100;

      logger.info(`🎉 Processamento concluído:`, {
        total: pendingNotifications.length,
        sent: sentCount,
        failed: failedCount,
        successRate: `${successRate.toFixed(1)}%`,
        processingTime: `${processingTime}ms`
      });

      return reply.status(200).send({
        success: true,
        message: 'Processamento e envio concluído',
        data: {
          processed: pendingNotifications.length,
          sent: sentCount,
          failed: failedCount,
          successRate: successRate,
          processingTime: processingTime,
          details: results
        }
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Erro inesperado ao processar e enviar notificações', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime: processingTime
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor',
        data: {
          processed: 0,
          sent: 0,
          failed: 0,
          successRate: 0,
          processingTime: processingTime,
          details: []
        }
      });
    }
  }
} 