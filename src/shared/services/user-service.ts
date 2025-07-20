import { SupabaseUserRepository } from '../infrastructure/supabase-user-repository.js';
import type { User, GoogleUser, UserResponse, UserError } from '../types/user.js';

/**
 * Serviço de usuário
 * Responsabilidade única: lógica de negócio para usuários
 */
export class UserService {
  private userRepository: SupabaseUserRepository;

  constructor() {
    this.userRepository = new SupabaseUserRepository();
  }

  /**
   * Cria ou busca usuário baseado nos dados do Google
   * Implementa a lógica: buscar primeiro, criar se não existir
   */
  async findOrCreateFromGoogle(googleUser: GoogleUser): Promise<UserResponse | UserError> {
    try {
      console.log('🚀 [UserService] Iniciando processamento usuário Google:', {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name
      });

      // Primeiro tenta buscar por Google ID
      console.log('🔍 [UserService] Buscando por Google ID...');
      let user = await this.userRepository.findByGoogleId(googleUser.id);
      
      if (user) {
        // Usuário existe, atualiza informações se necessário
        const shouldUpdate = this.shouldUpdateUser(user, googleUser);
        
        if (shouldUpdate) {
          const updateData = SupabaseUserRepository.fromGoogleUser(googleUser);
          user = await this.userRepository.update(user.id, updateData);
        }
        
        return { success: true, user };
      }

      // Se não encontrou por Google ID, busca por email (pode ser usuário existente sem Google)
      user = await this.userRepository.findByEmail(googleUser.email);
      
      if (user) {
        // Usuário existe mas não tem Google ID, adiciona Google ID
        const updateData: any = { google_id: googleUser.id };
        if (googleUser.picture) updateData.avatar_url = googleUser.picture;
        if (googleUser.verified_email !== undefined) updateData.email_verified = googleUser.verified_email;
        
        user = await this.userRepository.update(user.id, updateData);
        
        return { success: true, user };
      }

      // Usuário não existe, cria novo
      const userData = SupabaseUserRepository.fromGoogleUser(googleUser);
      user = await this.userRepository.create(userData);
      
      return { success: true, user };

    } catch (error) {
      console.error('❌ [UserService] ERRO COMPLETO:', error);
      console.error('❌ [UserService] Stack trace:', error instanceof Error ? error.stack : 'Sem stack');
      
      return {
        success: false,
        error: 'Erro ao processar usuário',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Verifica se deve atualizar dados do usuário
   * Lógica simples: atualiza se avatar ou nome mudaram
   */
  private shouldUpdateUser(existingUser: User, googleUser: GoogleUser): boolean {
    return (
      existingUser.name !== googleUser.name ||
      existingUser.avatar_url !== googleUser.picture ||
      existingUser.email_verified !== googleUser.verified_email
    );
  }
} 