import axiosInstance from './axiosInstance';

export const activityApi = {
  getRecent: () => axiosInstance.get('/api/admin/activity'),
};

export default activityApi;
