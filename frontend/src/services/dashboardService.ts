import axios from "@/utils/axios";
import { AdminDashboardStats, UserDashboardStats } from "@/@types/dashboard";

export const dashboardService = {
  getAdminStats: async (): Promise<AdminDashboardStats> => {
    const { data } = await axios.get<AdminDashboardStats>("/dashboard/admin");
    return data;
  },

  getUserStats: async (): Promise<UserDashboardStats> => {
    const { data } = await axios.get<UserDashboardStats>("/dashboard/user");
    return data;
  },
};
