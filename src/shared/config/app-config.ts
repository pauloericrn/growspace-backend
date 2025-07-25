import { env } from './environment.js';

/**
 * Configurações centralizadas da aplicação
 * Responsabilidade: Centralizar configurações que podem variar entre ambientes
 */
export const appConfig = {
  // URLs do frontend
  frontend: {
    development: 'http://localhost:3000',
    production: 'https://growspace-swart.vercel.app',
  },

  // Configurações de CORS
  cors: {
    development: true, // Permite qualquer origem em desenvolvimento
    production: [
      'http://localhost:3000',
      'https://growspace-swart.vercel.app',
      /https:\/\/.*\.vercel\.app$/, // Permite qualquer subdomínio vercel.app
    ],
  },

  // Configurações de email
  email: {
    from: env.RESEND_FROM_EMAIL,
    templates: {
      welcome: {
        subject: '🌱 Bem-vindo ao GrowSpace!',
      },
      passwordReset: {
        subject: '🔐 Recuperação de Senha - GrowSpace',
        expirationHours: 1,
      },
    },
  },

  // Configurações de autenticação
  auth: {
    google: {
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      accessType: 'offline',
      prompt: 'consent',
    },
  },

  // Configurações do servidor
  server: {
    port: env.PORT,
    host: '0.0.0.0',
    version: '1.0.0',
  },
} as const;

/**
 * Helper para obter URL do frontend baseado no ambiente
 */
export function getFrontendUrl(): string {
  return env.NODE_ENV === 'development' 
    ? appConfig.frontend.development 
    : appConfig.frontend.production;
}

/**
 * Helper para obter configurações de CORS baseado no ambiente
 */
export function getCorsConfig(): boolean | (string | RegExp)[] {
  return env.NODE_ENV === 'development' 
    ? appConfig.cors.development 
    : [...appConfig.cors.production];
} 