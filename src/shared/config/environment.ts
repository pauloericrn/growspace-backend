import { z } from 'zod';
import { config } from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env
config();

/**
 * Schema de validação para variáveis de ambiente
 * Garante type safety e validação em runtime
 */
const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  // Resend Email
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().default('onboarding@resend.dev'),
});

type Environment = z.infer<typeof environmentSchema>;

/**
 * Carrega e valida as variáveis de ambiente
 * @returns Configuração validada do ambiente
 * @throws Error se alguma variável obrigatória estiver ausente
 */
function loadEnvironment(): Environment {
  try {
    return environmentSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
      LOG_LEVEL: process.env.LOG_LEVEL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    });
  } catch (error) {
    console.error('❌ Erro nas variáveis de ambiente:', error);
    process.exit(1);
  }
}

export const env = loadEnvironment();
export type { Environment }; 