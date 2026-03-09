import axios from "@/utils/axios";
import { User } from "@/@types/user";

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  role: "admin" | "user";
}

export interface UserUpdate {
  full_name?: string;
  role?: "admin" | "user";
  is_active?: boolean;
  password?: string;
}

export const userService = {
  getAll: async (): Promise<User[]> => {
    const { data } = await axios.get<User[]>("/users");
    return data;
  },

  getAllNames: async (): Promise<User[]> => {
    const { data } = await axios.get<User[]>("/users/all-names");
    return data;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await axios.get<User>(`/users/${id}`);
    return data;
  },

  create: async (payload: UserCreate): Promise<User> => {
    const { data } = await axios.post<User>("/users", payload);
    return data;
  },

  update: async (id: string, payload: UserUpdate): Promise<User> => {
    const { data } = await axios.put<User>(`/users/${id}`, payload);
    return data;
  },

  deactivate: async (id: string): Promise<void> => {
    await axios.delete(`/users/${id}`);
  },
};
