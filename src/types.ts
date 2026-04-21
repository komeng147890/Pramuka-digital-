/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon name
  color: string;
  category: 'Kecakapan Umum' | 'Kecakapan Khusus' | 'Penghargaan';
}

export interface Member {
  id: string;
  name: string;
  skuLevel: 'Siaga' | 'Penggalang' | 'Penegak' | 'Pandega';
  unit: string; // Gugus Depan
  joinDate: string;
  status: 'Active' | 'Inactive';
  badges?: string[]; // Array of badge IDs
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  description: string;
  location: string;
  participantsCount: number;
  category: 'Latihan Rutin' | 'Perkemahan' | 'Bakti Sosial' | 'Lomba';
  isArchived?: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Permit' | 'Sick';
  activityId?: string;
}

export type View = 'dashboard' | 'members' | 'activities' | 'attendance' | 'settings' | 'badges' | 'ai-assistant';

export interface ReportSchedule {
  id: string;
  email: string;
  frequency: 'Harian' | 'Mingguan' | 'Bulanan';
  reportType: 'Absensi' | 'Kegiatan' | 'Keduanya';
  status: 'Aktif' | 'Nonaktif';
  lastSent?: string;
  nextRun: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'Admin' | 'Pembina';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'important' | 'activity';
  read: boolean;
}
