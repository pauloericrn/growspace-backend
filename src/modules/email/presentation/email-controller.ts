import type { FastifyRequest, FastifyReply } from 'fastify';
import { EmailUseCases } from '../application/email-use-cases.js';
import { ResendEmailService } from '../infrastructure/resend-email-service.js';
import { MockEmailService } from '../infrastructure/mock-email-service.js';
import { sendEmailSchema } from '../../../shared/types/email.js';
import { logger } from '../../../shared/utils/logger.js';
import { env } from '../../../shared/config/environment.js';
import { createClient } from '@supabase/supabase-js';
import { nowUTC, formatBrazilianDate } from '../../../shared/utils/date-utils.js';

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
        timestamp: nowUTC().toISOString(),
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
      const emailData = sendEmailSchema.parse(request.body);

      logger.info('Executando caso de uso: enviar email', {
        to: emailData.to,
        subject: emailData.subject
      });

      const result = await this.emailUseCases.sendEmail(emailData);

      if (result.success) {
        logger.info('Email enviado com sucesso', { emailId: result.data?.id });
        return reply.status(200).send({
          success: true,
          message: 'Email enviado com sucesso',
          data: result.data
        });
      } else {
        logger.error('Falha ao enviar email', { error: result.error });
        return reply.status(500).send({
          success: false,
          message: 'Falha ao enviar email',
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Erro ao processar requisição de email', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(400).send({
        success: false,
        message: 'Dados inválidos para envio de email',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Envia email de boas-vindas
   */
  async sendWelcomeEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { name, email } = request.body as { name: string; email: string };

      if (!name || !email) {
        return reply.status(400).send({
          success: false,
          message: 'Nome e email são obrigatórios'
        });
      }

      const emailData = {
        to: [email],
        subject: `Bem-vindo ao GrowSpace, ${name}! 🌱`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">🌱 Bem-vindo ao GrowSpace!</h1>
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Estamos muito felizes em tê-lo conosco no GrowSpace, sua plataforma completa para gestão de cultivo.</p>
            <p>Com o GrowSpace, você pode:</p>
            <ul>
              <li>📋 Gerenciar tarefas de cultivo</li>
              <li>🌿 Acompanhar o crescimento das plantas</li>
              <li>📊 Visualizar métricas de produção</li>
              <li>🔔 Receber lembretes automáticos</li>
            </ul>
            <p>Se você tiver alguma dúvida, não hesite em entrar em contato conosco.</p>
            <p>Atenciosamente,<br>Equipe GrowSpace</p>
          </div>
        `,
        text: `Bem-vindo ao GrowSpace, ${name}! Estamos muito felizes em tê-lo conosco.`
      };

      const result = await this.emailUseCases.sendEmail(emailData);

      if (result.success) {
        logger.info('Email de boas-vindas enviado', { email, emailId: result.data?.id });
        return reply.status(200).send({
          success: true,
          message: 'Email de boas-vindas enviado com sucesso',
          data: result.data
        });
      } else {
        logger.error('Falha ao enviar email de boas-vindas', { email, error: result.error });
        return reply.status(500).send({
          success: false,
          message: 'Falha ao enviar email de boas-vindas',
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Erro ao enviar email de boas-vindas', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Envia email de reset de senha
   */
  async sendPasswordResetEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, resetToken } = request.body as { email: string; resetToken: string };

      if (!email || !resetToken) {
        return reply.status(400).send({
          success: false,
          message: 'Email e token de reset são obrigatórios'
        });
      }

      const resetUrl = `https://growspace.app/reset-password?token=${resetToken}`;

      const emailData = {
        to: [email],
        subject: '🔐 Reset de Senha - GrowSpace',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">🔐 Reset de Senha</h1>
            <p>Você solicitou um reset de senha para sua conta no GrowSpace.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Resetar Senha</a>
            <p>Se você não solicitou este reset, ignore este email.</p>
            <p>Este link expira em 1 hora.</p>
            <p>Atenciosamente,<br>Equipe GrowSpace</p>
          </div>
        `,
        text: `Reset de senha solicitado. Acesse: ${resetUrl}`
      };

      const result = await this.emailUseCases.sendEmail(emailData);

      if (result.success) {
        logger.info('Email de reset de senha enviado', { email, emailId: result.data?.id });
        return reply.status(200).send({
          success: true,
          message: 'Email de reset de senha enviado com sucesso',
          data: result.data
        });
      } else {
        logger.error('Falha ao enviar email de reset de senha', { email, error: result.error });
        return reply.status(500).send({
          success: false,
          message: 'Falha ao enviar email de reset de senha',
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Erro ao enviar email de reset de senha', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Busca template de email por chave
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
   * Resolve contexto da tarefa vinculada à notificação
   * - Verifica se já foi concluída
   * - Obtém informações complementares (ex.: nome da planta)
   */
  private async getTaskContext(notification: any): Promise<{
    isCompleted: boolean;
    plantName?: string | undefined;
    taskTitle?: string | undefined;
    taskDueDate?: string | undefined;
    taskPriority?: string | undefined;
    taskCategory?: string | undefined;
    gardenName?: string | undefined;
    completedAt?: string | undefined;
  }> {
    const taskTable: string | undefined = notification.linked_task_table || notification.payload?.task_table;
    const taskId: string | undefined = notification.linked_task_id || notification.payload?.task_id;

    if (!taskTable || !taskId) {
      return { isCompleted: false };
    }

    try {
      // Todos
      if (taskTable === 'todos') {
        const { data, error } = await this.supabase
          .from('todos')
          .select('*, completed_at')
          .eq('id', taskId)
          .single();

        if (error) return { isCompleted: false };

        const isCompleted = !!(data && (data.completed === true || data.status === 'completed'));
        return {
          isCompleted,
          taskTitle: data?.title,
          taskDueDate: data?.due_date,
          taskPriority: data?.priority,
          completedAt: (data as any)?.completed_at || undefined,
        };
      }

      // User tasks (tarefas de cultivo)
      if (taskTable === 'user_tasks') {
        const { data: task, error } = await this.supabase
          .from('user_tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (error) return { isCompleted: false };

        let isCompleted = !!(task && (task.status === 'completed' || task.completed === true));

        // Como fallback, verifica se existe registro de conclusão
        let completedAt: string | undefined = undefined;
        if (!isCompleted) {
          const { data: completion } = await this.supabase
            .from('task_completions')
            .select('completed_at')
            .eq('task_id', taskId)
            .order('completed_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (completion?.completed_at) {
            completedAt = completion.completed_at as string;
            isCompleted = true;
          }
        } else {
          // Caso a task possua completed_at próprio no registro
          completedAt = (task as any)?.completed_at || undefined;
        }

        // Enriquecimento: planta e jardim (tenda)
        let plantName: string | undefined = task?.plant_name;
        let gardenName: string | undefined;
        const rawPlantId = task?.plant_id ?? notification.payload?.plant_id;
        const plantId = (typeof rawPlantId === 'string' && /^\d+$/.test(rawPlantId))
          ? Number(rawPlantId)
          : rawPlantId;

        if (!plantName && plantId !== undefined && plantId !== null) {
          // Preferir user_plants; se não existir, tentar plants
          try {
            const { data: userPlant, error: upErr } = await this.supabase
              .from('user_plants')
              .select('name, tenda_id')
              .eq('id', plantId as any)
              .maybeSingle();
            if (!upErr && userPlant?.name) {
              plantName = userPlant.name;
              logger.info('🌿 plant_name resolvido via user_plants', {
                taskId,
                plantId,
                source: 'user_plants',
                plantName
              });
              const tendaId = (userPlant as any)?.tenda_id;
              if (tendaId !== undefined && tendaId !== null) {
                try {
                  const { data: tenda } = await this.supabase
                    .from('tendas')
                    .select('*')
                    .eq('id', String(tendaId))
                    .maybeSingle();
                  gardenName = ((tenda as any)?.nome || (tenda as any)?.name || (tenda as any)?.title || (tenda as any)?.label) as string | undefined;
                  if (gardenName) {
                    logger.info('🏡 garden_name resolvido via tendas (user_plants)', { taskId, plantId, tendaId, gardenName });
                  } else {
                    logger.info('🏡 tenda sem nome (user_plants)', { taskId, plantId, tendaId, tenda });
                  }
                } catch (e) {
                  logger.info('🏡 erro ao buscar tendas (user_plants)', { taskId, plantId, error: (e as Error).message });
                }
              } else {
                logger.info('🏡 user_plants sem tenda_id', { taskId, plantId });
              }
            }
          } catch {
            // ignore
          }
          if (!plantName) {
            try {
              const { data: plant, error: pErr } = await this.supabase
                .from('plants')
                .select('name, tenda_id')
                .eq('id', plantId as any)
                .maybeSingle();
              if (!pErr && plant?.name) {
                plantName = plant.name;
                logger.info('🌿 plant_name resolvido via plants', {
                  taskId,
                  plantId,
                  source: 'plants',
                  plantName
                });
                const tendaId = (plant as any)?.tenda_id;
                if (tendaId !== undefined && tendaId !== null) {
                  try {
                    const { data: tenda } = await this.supabase
                      .from('tendas')
                      .select('*')
                      .eq('id', String(tendaId))
                      .maybeSingle();
                    gardenName = ((tenda as any)?.nome || (tenda as any)?.name || (tenda as any)?.title || (tenda as any)?.label) as string | undefined;
                    if (gardenName) {
                      logger.info('🏡 garden_name resolvido via tendas (plants)', { taskId, plantId, tendaId, gardenName });
                    } else {
                      logger.info('🏡 tenda sem nome (plants)', { taskId, plantId, tendaId, tenda });
                    }
                  } catch (e) {
                    logger.info('🏡 erro ao buscar tendas (plants)', { taskId, plantId, error: (e as Error).message });
                  }
                } else {
                  logger.info('🏡 plants sem tenda_id', { taskId, plantId });
                }
              }
            } catch {
              // ignore
            }
          }
          // Tabela alternativa em PT-BR: plantas (usa 'strain' como nome)
          if (!plantName) {
            try {
              const { data: planta, error: plErr } = await this.supabase
                .from('plantas')
                .select('strain, tenda_id')
                .eq('id', plantId as any)
                .maybeSingle();
              if (!plErr && planta?.strain) {
                plantName = planta.strain as string;
                logger.info('🌿 plant_name resolvido via plantas', {
                  taskId,
                  plantId,
                  source: 'plantas',
                  plantName
                });
                const tendaId = (planta as any)?.tenda_id;
                if (tendaId !== undefined && tendaId !== null) {
                  try {
                    const { data: tenda } = await this.supabase
                      .from('tendas')
                      .select('*')
                      .eq('id', String(tendaId))
                      .maybeSingle();
                    gardenName = ((tenda as any)?.nome || (tenda as any)?.name || (tenda as any)?.title || (tenda as any)?.label) as string | undefined;
                    if (gardenName) {
                      logger.info('🏡 garden_name resolvido via tendas (plantas)', { taskId, plantId, tendaId, gardenName });
                    } else {
                      logger.info('🏡 tenda sem nome (plantas)', { taskId, plantId, tendaId, tenda });
                    }
                  } catch (e) {
                    logger.info('🏡 erro ao buscar tendas (plantas)', { taskId, plantId, error: (e as Error).message });
                  }
                } else {
                  logger.info('🏡 plantas sem tenda_id', { taskId, plantId });
                }
              }
            } catch {
              // ignore
            }
          }
          if (!plantName) {
            logger.info('🌿 plant_name não encontrado', {
              taskId,
              plantId,
              tried: ['user_plants', 'plants', 'plantas']
            });
          }
        }

        return {
          isCompleted,
          plantName,
          taskTitle: task?.name,
          taskDueDate: task?.due_date,
          taskPriority: task?.priority,
          taskCategory: task?.category,
          gardenName,
          completedAt,
        };
      }

      // Demais tabelas não tratadas
      return { isCompleted: false };
    } catch {
      return { isCompleted: false };
    }
  }

  /**
   * Tenta resolver o nome do jardim (ambiente) em diferentes tabelas/colunas
   */
  private async resolveGardenName(envId: string | number): Promise<string | undefined> {
    const candidates: { table: string; cols: string[] }[] = [
      { table: 'ambientes', cols: ['name', 'nome', 'title', 'titulo', 'label', 'descricao', 'description', 'apelido', 'nome_ambiente', 'display_name', 'nome_display'] },
      { table: 'ambiente', cols: ['name', 'nome', 'titulo', 'label', 'descricao', 'apelido', 'display_name'] },
      { table: 'environments', cols: ['name', 'title', 'label', 'description', 'display_name'] },
      { table: 'gardens', cols: ['name', 'title', 'label', 'description', 'display_name'] },
      { table: 'tendas', cols: ['name', 'nome', 'title', 'apelido', 'display_name'] },
    ];

    for (const { table, cols } of candidates) {
      try {
        const { data } = await this.supabase
          .from(table)
          .select(cols.join(', '))
          .eq('id', envId as any)
          .maybeSingle();

        if (data) {
          for (const col of cols) {
            const value = (data as any)[col];
            if (value) {
              logger.info('🏡 garden_name resolvido (fallback)', { table, col, envId, gardenName: value });
              return String(value);
            }
          }
          logger.info('🏡 registro de ambiente sem campos de nome (fallback)', { table, envId, data });
        }
      } catch (e) {
        logger.info('🏡 erro ao consultar tabela candidata de ambiente', { table, envId, error: (e as Error).message });
      }
    }

    return undefined;
  }

  /**
   * Renderiza template substituindo variáveis e processando condicionais simples {{#if var}}...{{/if}}
   */
  private renderTemplate(templateString: string, variables: Record<string, string | undefined>): string {
    if (!templateString) return '';

    let output = templateString;

    // Processa condicionais: suporta aninhamento simples via substituições iterativas
    const singleIfRegex = /\{\{#if\s+([\w\.]+)\}\}([\s\S]*?)\{\{\/if\}\}/;
    while (singleIfRegex.test(output)) {
      output = output.replace(singleIfRegex, (_match, varName: string, inner: string) => {
        const value = variables[varName];
        return value ? inner : '';
      });
    }

    // Substitui variáveis simples
    Object.entries(variables).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const regex = new RegExp(`\\{\\{${key}\\}\}`, 'g');
      output = output.replace(regex, String(value));
    });

    return output;
  }

  /**
   * Processa notificações pendentes (sem enviar)
   */
  async processPendingNotifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      logger.info('🔍 Buscando notificações pendentes para processamento');

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
          payload,
          linked_task_id,
          linked_task_table
        `)
        .eq('status', 'pending')
        .lte('scheduled_at', nowUTC().toISOString())
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
            emailData: [],
            notifications: []
          }
        });
      }

      logger.info(`Encontradas ${pendingNotifications.length} notificações pendentes`);

      // Processar cada notificação aplicando regras de conclusão antes do horário
      const emailData = [];

      for (const notification of pendingNotifications) {
        if (!notification) {
          logger.warn('⚠️ Notificação undefined, pulando...');
          continue;
        }

        logger.info(`📝 Processando notificação:`, {
          id: notification.id,
          template_key: notification.template_key,
          title: notification.title
        });

        // Email fixo para desenvolvimento
        const userEmail = env.NODE_ENV === 'development' 
          ? 'pauloericrn@gmail.com' 
          : 'pauloericrn@gmail.com';

        // Regra: se a task foi concluída antes do schedule, ignorar envio
        try {
          const taskCtx = await this.getTaskContext(notification);
          const completedAt = taskCtx.completedAt ? new Date(taskCtx.completedAt).getTime() : undefined;
          const scheduledAt = notification.scheduled_at ? new Date(notification.scheduled_at).getTime() : undefined;
          if (completedAt && scheduledAt && completedAt <= scheduledAt) {
            await this.updateNotificationStatus(notification.id, 'failed', undefined, 'completed_before_schedule');
            logger.info('⏭️  Notificação ignorada: completed_before_schedule', { id: notification.id, completedAt: taskCtx.completedAt, scheduled_at: notification.scheduled_at });
            continue;
          }
        } catch (e) {
          logger.warn('Falha ao aplicar regra completed_before_schedule (prosseguindo)', { id: notification?.id, error: (e as Error).message });
        }

        // Buscar template correspondente
        const template = await this.getEmailTemplate(notification.template_key);
        
        if (!template) {
          logger.warn(`Template não encontrado para key: ${notification.template_key}`, {
            notificationId: notification.id,
            templateKey: notification.template_key
          });
          continue;
        }

        // Contexto de tarefa
        const taskCtx = await this.getTaskContext(notification);

        // Preparar variáveis para substituição
        const variables: Record<string, string | undefined> = {
          user_name: notification.template_variables?.user_name || 'Usuário',
          task_title: taskCtx.taskTitle || notification.template_variables?.task_title || notification.title,
          task_description: notification.message || undefined,
          task_priority: (taskCtx.taskPriority || notification.payload?.priority || 'médio') as string,
          due_date: taskCtx.taskDueDate ? formatBrazilianDate(taskCtx.taskDueDate) : (notification.scheduled_at ? formatBrazilianDate(notification.scheduled_at) : 'Hoje'),
          plant_name: taskCtx.plantName || notification.template_variables?.plant_name,
          task_category: taskCtx.taskCategory || notification.template_variables?.task_category,
          garden_name: taskCtx.gardenName,
          days_overdue: undefined,
          app_url: 'https://growspace.app'
        };

        // Renderizar templates (subject e html)
        let htmlContent = this.renderTemplate(template.html_template, variables);
        let subjectContent = this.renderTemplate(template.subject_template, variables);

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
      logger.error('Erro ao processar notificações pendentes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualiza o status de uma notificação
   */
  private async updateNotificationStatus(notificationId: string, status: string, sentAt?: Date, errorMessage?: string) {
    try {
      const updateData: any = {
        status: status,
        updated_at: nowUTC().toISOString()
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
          payload,
          linked_task_id,
          linked_task_table
        `)
        .eq('status', 'pending')
        .lte('scheduled_at', nowUTC().toISOString())
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

        // Contexto da tarefa (antes de enviar)
        const taskCtx = await this.getTaskContext(notification);

        // Regra: se reminder está 5+ dias atrasado e tarefa ainda aberta, usar template overdue
        const isReminder = notification.template_key === 'task_reminder';
        const scheduledAtMs = notification.scheduled_at ? new Date(notification.scheduled_at).getTime() : undefined;
        const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
        const isOld = scheduledAtMs ? (Date.now() - scheduledAtMs) >= fiveDaysMs : false;
        let effectiveTemplate = notification.template_key as string;
        if (isReminder && isOld && !taskCtx.isCompleted) {
          effectiveTemplate = 'task_overdue';
        }

        // Se a tarefa já foi concluída, não enviar
        if (taskCtx.isCompleted) {
          await this.updateNotificationStatus(notification.id, 'failed', undefined, 'Task already completed');
          logger.info(`⏭️  Notificação ${notification.id} ignorada: tarefa já concluída`);
          results.push({
            notificationId: notification.id,
            status: 'skipped_completed',
            emailId: null,
            error: 'Task already completed'
          });
          failedCount++;
          continue;
        }

        // Preparar variáveis para substituição
        let daysOverdueStr: string | undefined = undefined;
        if (effectiveTemplate === 'task_overdue') {
          if (scheduledAtMs) {
            const diffDays = Math.max(1, Math.floor((Date.now() - scheduledAtMs) / (1000 * 60 * 60 * 24)));
            daysOverdueStr = String(diffDays);
          } else if (taskCtx.taskDueDate) {
            const dueMs = new Date(taskCtx.taskDueDate).getTime();
            const diffDays = Math.max(1, Math.floor((Date.now() - dueMs) / (1000 * 60 * 60 * 24)));
            daysOverdueStr = String(diffDays);
          }
        }

        const variables: Record<string, string | undefined> = {
          user_name: notification.template_variables?.user_name || 'Usuário',
          task_title: taskCtx.taskTitle || notification.template_variables?.task_title || notification.title,
          task_description: notification.message || undefined,
          task_priority: (taskCtx.taskPriority || notification.payload?.priority || 'médio') as string,
          due_date: taskCtx.taskDueDate ? formatBrazilianDate(taskCtx.taskDueDate) : (notification.scheduled_at ? formatBrazilianDate(notification.scheduled_at) : 'Hoje'),
          plant_name: taskCtx.plantName || notification.template_variables?.plant_name,
          task_category: taskCtx.taskCategory || notification.template_variables?.task_category,
          garden_name: taskCtx.gardenName,
          days_overdue: daysOverdueStr,
          app_url: 'https://growspace.app'
        };

        // Carregar template efetivo (pode ser overdue)
        const tpl = effectiveTemplate === notification.template_key
          ? template
          : await this.getEmailTemplate(effectiveTemplate);

        // Renderizar templates (subject e html)
        let htmlContent = this.renderTemplate(tpl!.html_template, variables);
        let subjectContent = this.renderTemplate(tpl!.subject_template, variables);

        // Preparar dados do email (sem CTA de completar tarefa por enquanto)
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
            await this.updateNotificationStatus(notification.id, 'sent', nowUTC());
            
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