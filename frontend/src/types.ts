export interface Course {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  year?: number | null;
  semester?: number | null;
}

export interface Grade {
  course_name: string;
  grade: string;
  rawgrade: number | null;
  year?: number | null;
  semester?: number | null;
}

export interface Assignment {
  id: number;
  courseName: string;
  name: string;
  duedate: number;
  description: string;
  year?: number | null;
  semester?: number | null;
}

export interface MoodleEvent {
  id: number;
  name: string;
  description: string;
  courseName: string;
  timestart: number;
  formattedtime: string;
  eventtype: string;
  url?: string;
}

export interface Notification {
  id: number;
  subject: string;
  message: string;
  timecreated: number;
  read: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface AuthResponse {
  token: string;
  userID: string;
}

export interface CourseStatistics {
  total: number;
}

export interface CourseModule {
  id: number;
  url?: string;
  name: string;
  modname: string;
  description?: string;
  instance?: number;
  contents?: any[];
}

export interface CourseSection {
  id: number;
  name: string;
  summary: string;
  modules: CourseModule[];
}
