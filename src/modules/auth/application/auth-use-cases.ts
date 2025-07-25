import type { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '@/shared/services/user-service.js';
import { logger } from '@/shared/utils/logger.js';
import { env } from '@/shared/config/environment.js';
import { appConfig, getFrontendUrl } from '@/shared/config/app-config.js';

/**
 * Casos de uso para autenticação
 * Responsabilidade: Orquestrar operações de autenticação
 */
export class AuthUseCases {
  constructor(private userService: UserService) {}

  /**
   * Gera URL de autenticação Google
   */
  generateGoogleAuthUrl(): string {
    const clientId = env.GOOGLE_CLIENT_ID;
    const redirectUri = env.GOOGLE_REDIRECT_URI;
    
    const params = new URLSearchParams({
      access_type: appConfig.auth.google.accessType,
      scope: appConfig.auth.google.scopes.join(' '),
      prompt: appConfig.auth.google.prompt,
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Processa callback do Google OAuth
   */
  async processGoogleCallback(code: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
    redirectUrl?: string;
  }> {
    try {
      logger.info('Processando callback Google OAuth', { code: code.substring(0, 10) + '...' });

      // Trocar code por access token
      const tokens = await this.exchangeCodeForTokens(code);
      
      // Buscar dados do usuário
      const googleUserData = await this.fetchGoogleUserData(tokens.access_token);
      
      // Criar/buscar usuário no banco
      const userResult = await this.userService.findOrCreateFromGoogle(googleUserData);
      
      if (!userResult.success) {
        return {
          success: false,
          error: 'Erro ao salvar usuário no banco',
        };
      }

      // Gerar URL de redirecionamento
      const redirectUrl = this.generateRedirectUrl(userResult.user);
      
      return {
        success: true,
        user: userResult.user,
        redirectUrl,
      };

    } catch (error) {
      logger.error('Erro no processamento do callback Google', { error });
      return {
        success: false,
        error: 'Erro interno no processo de autenticação',
      };
    }
  }

  /**
   * Troca código de autorização por tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<{ access_token: string }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
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

    const tokens = await response.json();

    if (!response.ok) {
      throw new Error(`Erro ao trocar tokens: ${tokens.error_description}`);
    }

    return tokens;
  }

  /**
   * Busca dados do usuário no Google
   */
  private async fetchGoogleUserData(accessToken: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await response.json();

    if (!response.ok) {
      throw new Error('Erro ao buscar dados do usuário');
    }

    return userData;
  }

  /**
   * Gera URL de redirecionamento para o frontend
   */
  private generateRedirectUrl(user: any): string {
    const isRealUser = !user.id.startsWith('fallback-');
    const frontendUrl = getFrontendUrl();
      
    const params = new URLSearchParams({
      success: 'true',
      user_id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar_url || '',
      google_id: user.google_id || '',
      verified: String(user.email_verified),
      integration_status: isRealUser ? 'complete' : 'fallback',
    });

    return `${frontendUrl}/auth/callback?${params.toString()}`;
  }
} 