/**
 * Tipos compartilhados para usuários
 * Compatível com estrutura existente do Supabase
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  google_id?: string | null;
  email_verified?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
}

export interface CreateUserData {
  email: string;
  name: string;
  avatar_url?: string;
  google_id?: string;
  email_verified?: boolean;
}

export interface UserResponse {
  success: true;
  user: User;
}

export interface UserError {
  success: false;
  error: string;
  details?: string;
} 