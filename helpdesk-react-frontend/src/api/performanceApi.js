import axiosInstance from './axiosInstance';
import { format } from 'date-fns';

const fmtDate = (d) => d ? format(d, "yyyy-MM-dd'T'HH:mm:ss") : undefined;

export const getAgentMetrics = (agentId, from, to) =>
  axiosInstance.get(`/api/admin/performance/agents/${agentId}`, {
    params: { from: fmtDate(from), to: fmtDate(to) },
  }).then(r => r.data);

export const getAllAgentMetrics = (from, to) =>
  axiosInstance.get('/api/admin/performance/agents', {
    params: { from: fmtDate(from), to: fmtDate(to) },
  }).then(r => r.data);

export const getUserMetrics = (userId, from, to) =>
  axiosInstance.get(`/api/admin/performance/users/${userId}`, {
    params: { from: fmtDate(from), to: fmtDate(to) },
  }).then(r => r.data);

export const getAllUserMetrics = (from, to, page = 0, size = 20) =>
  axiosInstance.get('/api/admin/performance/users', {
    params: { from: fmtDate(from), to: fmtDate(to), page, size },
  }).then(r => r.data);

export const getTimeline = (filters = {}) => {
  const params = {
    page: filters.page,
    size: filters.size,
    ticketId: filters.ticketId,
    actorId: filters.agentId,
    eventType: filters.eventType,
    from: fmtDate(filters.from),
    to: fmtDate(filters.to),
  };
  return axiosInstance.get('/api/admin/logs/timeline', { params }).then(r => r.data);
};

export const getTicketTimeline = (ticketId) =>
  axiosInstance.get(`/api/admin/logs/timeline/${ticketId}`).then(r => r.data);

export const getBreachLog = (filters = {}) => {
  const params = {
    page: filters.page,
    size: filters.size,
    agentId: filters.agentId,
    priority: filters.priority,
    from: fmtDate(filters.from),
    to: fmtDate(filters.to),
  };
  return axiosInstance.get('/api/admin/logs/breaches', { params }).then(r => r.data);
};

export const getTransferLog = (filters = {}) => {
  const params = {
    page: filters.page,
    size: filters.size,
    fromAgentId: filters.agentId,
    categoryId: filters.category,
    from: fmtDate(filters.from),
    to: fmtDate(filters.to),
  };
  return axiosInstance.get('/api/admin/logs/transfers', { params }).then(r => r.data);
};
