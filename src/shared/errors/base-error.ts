/**
 * Classe base para erros customizados
 * Fornece estrutura consistente para tratamento de erros
 */
export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Erro de validação (400)
 */
export class ValidationError extends BaseError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Erro de autorização (401)
 */
export class UnauthorizedError extends BaseError {
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message: string = 'Não autorizado', context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Erro de recurso não encontrado (404)
 */
export class NotFoundError extends BaseError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(message: string = 'Recurso não encontrado', context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Erro interno do servidor (500)
 */
export class InternalServerError extends BaseError {
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(message: string = 'Erro interno do servidor', context?: Record<string, unknown>) {
    super(message, context);
  }
} 