import axios from 'axios';
import type { 
  AuthResponse, 
  Course, 
  Grade, 
  Assignment, 
  MoodleEvent, 
  NotificationsResponse,
  CourseStatistics,
  CourseSection
} from '../types';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add retry logic to handle temporary backend unavailability after login
api.interceptors.response.use(undefined, async (err) => {
  const { config } = err;
  
  // Only retry if it's a network error or a 400/500 error that might be transient
  // and if we haven't reached the max retries (e.g., 3)
  if (!config || !config.retryCount) {
    config.retryCount = 0;
  }
  
  const MAX_RETRIES = 3;
  if (config.retryCount < MAX_RETRIES) {
    config.retryCount += 1;
    
    // Wait for a short period before retrying (exponential backoff or fixed delay)
    const delay = config.retryCount * 500; // 500ms, 1000ms, 1500ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return api(config);
  }
  
  return Promise.reject(err);
});

// Since the backend saves token in src/data.json and reads it from there, 
// the frontend login just triggers that save. 
// However, normally we would pass the token in headers.
// Looking at the backend, it seems to read the token from a local file on the server.
// This is a bit unusual for a typical SPA but we will follow the backend's logic.

export const authApi = {
  login: (username: string, password: string) => 
    api.post<AuthResponse>('/login', { username, password }),
};

export interface GetAssignmentsParams {
  status?: 'completed' | 'not_completed';
  year?: string;
  semester?: string;
  sortByDate?: 'asc' | 'desc';
  dateFrom?: number;
  dateTo?: number;
  sortByStatus?: 'asc' | 'desc';
}

export const moodleApi = {
  getCourses: () => api.get<Course[]>('/moodle/courses'),
  getGrades: () => api.get<{ grades: Grade[] }>('/moodle/grades'),
  getAssignments: (params?: GetAssignmentsParams) => api.get<Assignment[]>('/moodle/assignments', { params }),
  getEvents: () => api.get<MoodleEvent[]>('/moodle/events'),
  getNotifications: () => api.get<NotificationsResponse>('/moodle/notifications'),
  getStatistics: () => api.get<CourseStatistics>('/moodle/statistics'),
  getCourseContents: (courseId: number) => api.get<CourseSection[]>(`/moodle/courses/${courseId}/contents`),
  getAssignmentStatus: (assignId: number) => api.get<any>(`/moodle/assignments/${assignId}/status`),
  submitAssignment: (assignId: number, text?: string, fileItemId?: number) => api.post<any>(`/moodle/assignments/${assignId}/submission`, { text, fileItemId }),
  uploadFile: (filename: string, filebase64: string) => api.post<any>('/moodle/files/upload', { filename, filebase64 }),
};

export default api;
