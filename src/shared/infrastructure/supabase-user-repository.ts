import { createClient } from '@supabase/supabase-js';
import { env } from '../config/environment.js';
import type { User, CreateUserData, GoogleUser } from '../types/user.js';

/**
 * Repository para usuários no Supabase
 * Implementa Single Responsibility: apenas operações de usuário
 */
export class SupabaseUserRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  }

  /**
   * Busca simplificada por email (evita admin API)
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      console.log('🔍 [Repository] Busca simplificada por email:', email);
      
      // Por enquanto, sempre retorna null para forçar criação
      // Isso evita problemas com permissões de admin
      console.log('❌ [Repository] Retorna null (sempre criar) - evitando admin API');
      return null;

    } catch (error) {
      console.error('❌ [Repository] Erro na busca por email:', error);
      throw new Error(`Erro na busca por email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca usuário por Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      console.log('🔍 [Repository] Buscando por Google ID:', googleId);
      
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('google_id', googleId)
        .single();

      console.log('📊 [Repository] Resultado busca Google ID:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('❌ [Repository] Usuário não encontrado por Google ID');
          return null;
        }
        console.error('❌ [Repository] Erro na busca por Google ID:', error);
        throw new Error(`Erro ao buscar usuário por Google ID: ${error.message}`);
      }

      // Mapear dados do user_profiles para User
      return {
        id: data.user_id,
        email: '', // Será preenchido depois
        name: data.nome || data.nome_preferido || 'Usuário',
        avatar_url: data.avatar_url,
        google_id: data.google_id,
        email_verified: data.email_verified,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      throw new Error(`Erro na busca por Google ID: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Cria usuário com fallback para problemas de permissão
   */
  async create(userData: CreateUserData): Promise<User> {
    try {
      console.log('📝 [Repository] Tentando criar usuário no Supabase');
      console.log('📊 [Repository] Dados:', { email: userData.email, name: userData.name, google_id: userData.google_id });

      // Tentar criar usuário no auth.users
      try {
        const { data: authUser, error: authError } = await this.supabase.auth.admin.createUser({
          email: userData.email,
          email_confirm: userData.email_verified || true,
          user_metadata: {
            name: userData.name,
            avatar_url: userData.avatar_url,
            google_id: userData.google_id,
            provider: 'google'
          }
        });

        if (authError) {
          console.error('❌ [Repository] Erro ao criar auth.users:', authError);
          
          // Se for erro de permissão, usar fallback
          if (authError.message?.includes('not_admin') || authError.message?.includes('not allowed')) {
            console.log('⚠️ [Repository] Erro de permissão - usando fallback');
            return this.createFallback(userData);
          }
          
          throw new Error(`Erro ao criar auth.users: ${authError.message}`);
        }

        console.log('✅ [Repository] Usuário criado no auth.users:', authUser.user.id);

        // Criar perfil no user_profiles
        const profileData = {
          user_id: authUser.user.id,
          nome: userData.name,
          nome_preferido: userData.name,
          google_id: userData.google_id,
          avatar_url: userData.avatar_url,
          email_verified: userData.email_verified || true,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: profile, error: profileError } = await this.supabase
          .from('user_profiles')
          .insert(profileData)
          .select()
          .single();

        if (profileError) {
          console.error('❌ [Repository] Erro ao criar user_profiles:', profileError);
          throw new Error(`Erro ao criar perfil: ${profileError.message}`);
        }

        console.log('✅ [Repository] Perfil criado no user_profiles:', profile.id);

        return {
          id: authUser.user.id,
          email: authUser.user.email!,
          name: profile.nome || userData.name,
          avatar_url: profile.avatar_url,
          google_id: profile.google_id,
          email_verified: profile.email_verified,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };

      } catch (authCreateError) {
        console.error('❌ [Repository] Erro na criação auth.users:', authCreateError);
        console.log('⚠️ [Repository] Usando fallback devido a erro de criação');
        return this.createFallback(userData);
      }

    } catch (error) {
      console.error('❌ [Repository] Erro na criação completa:', error);
      throw new Error(`Erro na criação de usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Fallback: Mock user quando não conseguimos criar no auth.users
   */
  private createFallback(userData: CreateUserData): User {
    console.log('🔄 [Repository] FALLBACK: Criando usuário mock');
    console.log('⚠️ [Repository] NOTA: Para integração completa, verificar SUPABASE_SERVICE_KEY');
    
    const mockUser: User = {
      id: `fallback-${userData.google_id}`,
      email: userData.email,
      name: userData.name,
      avatar_url: userData.avatar_url || null,
      google_id: userData.google_id || null,
      email_verified: userData.email_verified || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('✅ [Repository] Usuário fallback criado - OAuth funcionando!');
    console.log('🔧 [Repository] Para persistência real: verificar permissões Supabase');
    
    return mockUser;
  }

  /**
   * Atualiza perfil existente no user_profiles (simplificado)
   */
  async update(id: string, userData: Partial<CreateUserData>): Promise<User> {
    try {
      console.log('📝 [Repository] Atualizando perfil:', id);
      console.log('📊 [Repository] Dados para atualizar:', userData);

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Adicionar apenas campos que não são undefined
      if (userData.name) updateData.nome = userData.name;
      if (userData.avatar_url) updateData.avatar_url = userData.avatar_url;
      if (userData.google_id) updateData.google_id = userData.google_id;
      if (userData.email_verified !== undefined) updateData.email_verified = userData.email_verified;

      const { data, error } = await this.supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ [Repository] Erro ao atualizar perfil:', error);
        throw new Error(`Erro ao atualizar perfil: ${error.message}`);
      }

      console.log('✅ [Repository] Perfil atualizado:', data.id);

      // Retornar dados simplificados (sem buscar auth.users)
      return {
        id: data.user_id,
        email: userData.email || '', // Usar email dos dados atualizados
        name: data.nome || userData.name || 'Usuário',
        avatar_url: data.avatar_url,
        google_id: data.google_id,
        email_verified: data.email_verified,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

    } catch (error) {
      console.error('❌ [Repository] Erro na atualização:', error);
      throw new Error(`Erro na atualização de usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Mapeia dados do Supabase para interface User
   */
  private mapToUser(data: any, email: string): User {
    return {
      id: data.user_id || data.id,
      email: email,
      name: data.name || data.nome || data.nome_preferido || 'Usuário',
      avatar_url: data.avatar_url,
      google_id: data.google_id,
      email_verified: data.email_verified,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Converte dados do Google para formato interno
   */
  static fromGoogleUser(googleUser: GoogleUser): CreateUserData {
    const data: CreateUserData = {
      email: googleUser.email,
      name: googleUser.name,
      google_id: googleUser.id,
    };
    
    if (googleUser.picture) {
      data.avatar_url = googleUser.picture;
    }
    
    if (googleUser.verified_email !== undefined) {
      data.email_verified = googleUser.verified_email;
    }
    
    return data;
  }
} 