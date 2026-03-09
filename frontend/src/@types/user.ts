export type UserRole = "admin" | "user";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Keep compat with template
  name?: string;
  avatarUrl?: string;
}
