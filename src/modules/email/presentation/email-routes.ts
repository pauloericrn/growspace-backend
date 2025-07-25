import type { FastifyInstance } from 'fastify';
import { EmailController } from './email-controller.js';

/**
 * Registra as rotas de email
 * Responsabilidade única: definir endpoints para envio de emails
 */
export async function emailRoutes(fastify: FastifyInstance) {
  const emailController = new EmailController();

  // Diagnóstico de configuração de email
  fastify.get('/diagnostics', {
    schema: {
      description: 'Verifica a configuração do serviço de email',
      tags: ['Email'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                timestamp: { type: 'string' },
                environment: {
                  type: 'object',
                  properties: {
                    nodeEnv: { type: 'string' },
                    hasResendApiKey: { type: 'boolean' },
                    apiKeyLength: { type: 'number' },
                    fromEmail: { type: 'string' }
                  }
                },
                service: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    isMock: { type: 'boolean' }
                  }
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, (request, reply) => emailController.getEmailDiagnostics(request, reply));

  // Enviar email genérico
  fastify.post('/send', {
    schema: {
      description: 'Envia um email através do Resend',
      tags: ['Email'],
      body: {
        type: 'object',
        required: ['to', 'subject', 'html'],
        properties: {
          to: {
            type: 'array',
            items: { type: 'string', format: 'email' },
            minItems: 1,
            description: 'Lista de emails de destino'
          },
          subject: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description: 'Assunto do email'
          },
          html: {
            type: 'string',
            minLength: 1,
            description: 'Conteúdo HTML do email'
          },
          text: {
            type: 'string',
            description: 'Versão texto plano do email (opcional)'
          },
          from: {
            type: 'string',
            format: 'email',
            description: 'Email remetente (opcional, usa padrão se não fornecido)'
          },
          replyTo: {
            type: 'string',
            format: 'email',
            description: 'Email para resposta (opcional)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                from: { type: 'string' },
                to: { type: 'array', items: { type: 'string' } },
                subject: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, (request, reply) => emailController.sendEmail(request, reply));

  // Enviar email de boas-vindas
  fastify.post('/welcome', {
    schema: {
      description: 'Envia email de boas-vindas para novos usuários',
      tags: ['Email'],
      body: {
        type: 'object',
        required: ['email', 'name'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email do usuário'
          },
          name: {
            type: 'string',
            minLength: 1,
            description: 'Nome do usuário'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                from: { type: 'string' },
                to: { type: 'array', items: { type: 'string' } },
                subject: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, (request, reply) => emailController.sendWelcomeEmail(request, reply));

  // Enviar email de recuperação de senha
  fastify.post('/password-reset', {
    schema: {
      description: 'Envia email de recuperação de senha',
      tags: ['Email'],
      body: {
        type: 'object',
        required: ['email', 'resetToken'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email do usuário'
          },
          resetToken: {
            type: 'string',
            minLength: 1,
            description: 'Token de reset de senha'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                from: { type: 'string' },
                to: { type: 'array', items: { type: 'string' } },
                subject: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, (request, reply) => emailController.sendPasswordResetEmail(request, reply));
} 