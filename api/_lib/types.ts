export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: User;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  goal: string;
  status: 'active' | 'paused' | 'stopped';
  started_at: string;
  ended_at?: string;
  total_duration?: number;
}

export interface Screenshot {
  id: string;
  session_id: string;
  user_id: string;
  file_path: string;
  captured_at: string;
  analyzed: boolean;
}

export interface Goal {
  id: string;
  user_id: string;
  team_id?: string;
  type: 'personal_micro' | 'personal_macro' | 'team_micro' | 'team_macro';
  title: string;
  description?: string;
  target_date?: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}
