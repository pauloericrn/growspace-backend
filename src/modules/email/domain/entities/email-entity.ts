import { randomUUID } from 'crypto';
import { nowUTC } from '../../../../shared/utils/date-utils.js';

/**
 * Entidade de Email para o domínio
 * Representa um email no sistema
 */
export class EmailEntity {
  constructor(
    public readonly id: string,
    public readonly from: string,
    public readonly to: string[],
    public readonly subject: string,
    public readonly html: string,
    public readonly text?: string,
    public readonly replyTo?: string,
    public readonly createdAt: Date = nowUTC(),
    public readonly status: 'pending' | 'sent' | 'failed' = 'pending'
  ) {}

  /**
   * Factory method para criar uma nova entidade de email
   */
  static create(data: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
  }): EmailEntity {
    return new EmailEntity(
      randomUUID(),
      data.from,
      data.to,
      data.subject,
      data.html,
      data.text,
      data.replyTo
    );
  }

  /**
   * Marca o email como enviado
   */
  markAsSent(): EmailEntity {
    return new EmailEntity(
      this.id,
      this.from,
      this.to,
      this.subject,
      this.html,
      this.text,
      this.replyTo,
      this.createdAt,
      'sent'
    );
  }

  /**
   * Marca o email como falhou
   */
  markAsFailed(): EmailEntity {
    return new EmailEntity(
      this.id,
      this.from,
      this.to,
      this.subject,
      this.html,
      this.text,
      this.replyTo,
      this.createdAt,
      'failed'
    );
  }
} 