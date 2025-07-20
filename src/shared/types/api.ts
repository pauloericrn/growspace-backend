/**
 * Estrutura padrão para respostas de sucesso da API
 */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    version: string;
  };
}

/**
 * Estrutura padrão para respostas de erro da API
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

/**
 * Resposta de health check do sistema
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected';
    memory: {
      used: number;
      free: number;
      total: number;
    };
  };
}

/**
 * Union type para todas as respostas possíveis
 */
export type StandardResponse<T = unknown> = ApiResponse<T> | ApiErrorResponse; 