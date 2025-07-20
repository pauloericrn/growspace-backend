import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './shared/config/environment.js';
import { UserService } from './shared/services/user-service.js';

/**
 * Cria e configura servidor Fastify simples
 */
async function createServer() {
  const fastify = Fastify({
    logger: true
  });

  // CORS configuração para Railway + Vercel
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'development' 
      ? true 
      : [
          'http://localhost:3000',
          'https://growspace-frontend.vercel.app', // Substitua pelo seu domínio Vercel
          /https:\/\/.*\.vercel\.app$/ // Permite qualquer subdomínio vercel.app
        ],
    credentials: true,
  });

  // Rota hello world
  fastify.get('/', async () => {
    return { 
      message: 'Hello World from GrowSpace Backend!',
      timestamp: new Date().toISOString() 
    };
  });

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0'
    };
  });

  // Rota Google OAuth - Iniciar autenticação
  fastify.get('/auth/google', async () => {
    const clientId = env.GOOGLE_CLIENT_ID;
    const redirectUri = env.GOOGLE_REDIRECT_URI;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `access_type=offline&` +
      `scope=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile&` +
      `prompt=consent&` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;

    return {
      success: true,
      data: {
        authUrl,
        message: 'Acesse esta URL para fazer login com Google'
      }
    };
  });

  // Callback Google OAuth - Processar retorno
  fastify.get('/auth/google/callback', async (request, reply) => {
    try {
      const { code } = request.query as { code?: string };

      if (!code) {
        return reply.status(400).send({
          success: false,
          error: 'Código de autorização não fornecido'
        });
      }

      // Trocar code por access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: env.GOOGLE_REDIRECT_URI,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(`Erro ao trocar tokens: ${tokens.error_description}`);
      }

      // Buscar dados do usuário
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      const googleUserData = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error('Erro ao buscar dados do usuário');
      }

      // Integração com Supabase - criar/buscar usuário
      const userService = new UserService();
      const userResult = await userService.findOrCreateFromGoogle(googleUserData);

      if (!userResult.success) {
        return reply.status(500).send({
          success: false,
          error: 'Erro ao salvar usuário no banco',
          details: userResult.error
        });
      }

      // Retornar dados do usuário (do banco)
      const isRealUser = !userResult.user.id.startsWith('fallback-');
      const statusMessage = isRealUser 
        ? '🎉 Autenticação Google + Supabase COMPLETA!'
        : '🎉 Autenticação Google OK (Supabase: fallback mode)';

      return {
        success: true,
        data: {
          user: {
            id: userResult.user.id,
            email: userResult.user.email,
            name: userResult.user.name,
            avatar: userResult.user.avatar_url,
            google_id: userResult.user.google_id,
            verified: userResult.user.email_verified,
            created_at: userResult.user.created_at,
            integration_status: isRealUser ? 'complete' : 'fallback'
          },
          message: statusMessage,
          note: isRealUser ? 'Usuário persistido no Supabase' : 'Verificar SUPABASE_SERVICE_KEY para persistência completa'
        }
      };

    } catch (error) {
      console.error('Erro no callback OAuth:', error);
      
      return reply.status(500).send({
        success: false,
        error: 'Erro interno no processo de autenticação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  return fastify;
}

/**
 * Inicia o servidor
 */
async function startServer() {
  try {
    const server = await createServer();

    await server.listen({
      port: env.PORT,
      host: '0.0.0.0'
    });

    console.log(`🌱 GrowSpace Backend iniciado na porta ${env.PORT}!`);

  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer(); 