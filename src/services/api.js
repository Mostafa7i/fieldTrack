import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ft_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ft_token');
      localStorage.removeItem('ft_user');

      // Preserve current locale by extracting it from window.location.pathname
      const currentPath = window.location.pathname;
      const isAr = currentPath.startsWith('/ar');
      const loginPath = isAr ? '/ar/login' : '/en/login';
      
      if (!currentPath.includes('/login')) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/updateprofile', data),
};

// ── Internships ───────────────────────────────────────
export const internshipAPI = {
  getAll: (params) => api.get('/internships', { params }),
  getOne: (id) => api.get(`/internships/${id}`),
  getMy: () => api.get('/internships/my'),
  create: (data) => api.post('/internships', data),
  update: (id, data) => api.put(`/internships/${id}`, data),
  delete: (id) => api.delete(`/internships/${id}`),
};

// ── Applications ──────────────────────────────────────
export const applicationAPI = {
  apply: (data) => api.post('/applications', data),
  getAll: () => api.get('/applications'),
  updateStatus: (id, data) => api.put(`/applications/${id}`, data),
  withdraw: (id) => api.delete(`/applications/${id}`),
};

// ── Training Reports ──────────────────────────────────
export const reportAPI = {
  submit: (data) => api.post('/reports', data),
  getAll: () => api.get('/reports'),
  getOne: (id) => api.get(`/reports/${id}`),
  review: (id, data) => api.put(`/reports/${id}`, data),
};

// ── Evaluations ───────────────────────────────────────
export const evaluationAPI = {
  create: (data) => api.post('/evaluations', data),
  getAll: () => api.get('/evaluations'),
  getOne: (id) => api.get(`/evaluations/${id}`),
  getLeaderboard: () => api.get('/evaluations/leaderboard'),
};

// ── Attendance ────────────────────────────────────────
export const attendanceAPI = {
  log: (data) => api.post('/attendance', data),
  autoLog: (data) => api.post('/attendance/auto', data),
  getAll: (params) => api.get('/attendance', { params }),
  delete: (id) => api.delete(`/attendance/${id}`),
};

// ── Notifications ─────────────────────────────────────
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ── Admin ─────────────────────────────────────────────
export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getCompanies: () => api.get('/admin/companies'),
  verifyCompany: (id) => api.put(`/admin/companies/${id}/verify`),
  assignSupervisor: (studentUserId, supervisorId) => api.put(`/admin/students/${studentUserId}/assign-supervisor`, { supervisorId }),
  getAllInternships: (params) => api.get('/admin/internships', { params }),
  toggleInternship: (id) => api.put(`/admin/internships/${id}/toggle`),
  getAllReports: (params) => api.get('/admin/reports', { params }),
  getAttendanceSummary: () => api.get('/admin/attendance'),
  getPendingUsers: () => api.get('/admin/pending'),
  verifyUser: (id) => api.put(`/admin/users/${id}/verify`),
  rejectUser: (id) => api.put(`/admin/users/${id}/reject`),
};

// ── AI Services ───────────────────────────────────────
export const aiAPI = {
  // data: { message, history: [{role, text}], context }
  chat: (data) => api.post('/ai/chat', data),
  evaluate: (applicationId) => api.get(`/ai/evaluate/${applicationId}`),
  getRecommendations: (locale = 'en') => api.get(`/ai/recommendations?locale=${locale}`),
  health: () => api.get('/ai/health'),
};

// ── Tasks ──────────────────────────────────────────────
export const taskAPI = {
  // Supervisor
  create: (data) => api.post('/tasks', data),
  getSupervisorTasks: () => api.get('/tasks/supervisor'),
  closeTask: (id) => api.put(`/tasks/${id}/close`),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  // Student
  getStudentTasks: () => api.get('/tasks/student'),
  updateStatus: (id, data) => api.put(`/tasks/${id}/status`, data),
};

export default api;
