import type { FastifyRequest, FastifyReply } from 'fastify';
import type { HealthCheckResponse } from '@/shared/types/api.js';
import { env } from '@/shared/config/environment.js';
import { logger } from '@/shared/utils/logger.js';

/**
 * Controller para endpoints de health check e hello world
 * Mantém responsabilidade única: verificação de saúde do sistema
 */
export class HealthController {
  
  /**
   * Hello World simples para validar funcionamento básico
   */
  async helloWorld(request: FastifyRequest, reply: FastifyReply) {
    logger.info('Hello world endpoint accessed');
    
    return reply.status(200).send({
      success: true,
      data: {
        message: '🌱 GrowSpace Backend está funcionando!',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
      }
    });
  }

  /**
   * Health check completo do sistema
   */
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const healthData: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        version: '1.0.0',
        environment: env.NODE_ENV,
        services: {
          database: 'connected', // TODO: Implementar verificação real do Supabase
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            free: Math.round((memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          }
        }
      };

      logger.debug('Health check performed', { uptime, memory: memoryUsage });

      return reply.status(200).send(healthData);

    } catch (error) {
      logger.error('Health check failed', error);
      
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Sistema temporariamente indisponível'
      });
    }
  }
} 