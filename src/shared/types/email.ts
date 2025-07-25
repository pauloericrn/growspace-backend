import { z } from 'zod';

/**
 * Schema de validação para envio de email
 */
export const sendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1, 'Pelo menos um email de destino é obrigatório'),
  subject: z.string().min(1, 'Assunto é obrigatório').max(200, 'Assunto muito longo'),
  html: z.string().min(1, 'Conteúdo HTML é obrigatório'),
  text: z.string().optional(), // Versão texto plano opcional
  from: z.string().email().optional(), // Opcional, usa padrão se não fornecido
  replyTo: z.string().email().optional(),
});

/**
 * Schema de resposta para envio de email
 */
export const emailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    from: z.string(),
    to: z.array(z.string()),
    subject: z.string(),
    createdAt: z.string(),
  }).optional(),
  error: z.string().optional(),
});

/**
 * Tipos derivados dos schemas
 */
export type SendEmailRequest = z.infer<typeof sendEmailSchema>;
export type EmailResponse = z.infer<typeof emailResponseSchema>;

/**
 * Interface para o serviço de email
 */
export interface IEmailService {
  sendEmail(data: SendEmailRequest): Promise<EmailResponse>;
} 