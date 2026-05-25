import api from "./axios";

export const dashboardBaseRequest = async (params = {}) => {
  const res = await api.get("/alertas/dashboard/base", { params });
  return res.data;
};
