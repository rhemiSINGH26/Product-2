import type { User } from "./mock-data";

export const HARDCODED_ACCOUNTS: Array<User & { password: string }> = [
  {
    id: "admin-root",
    name: "Administrator",
    email: "admin@itech.com",
    password: "admin123",
    role: "admin",
    status: "active",
    joinedAt: "2025-01-01",
  },
  {
    id: "teacher-root",
    name: "Instructor",
    email: "teacher@itech.com",
    password: "teacher123",
    role: "teacher",
    status: "active",
    joinedAt: "2025-01-01",
    courseIds: [],
  },
  {
    id: "student-root",
    name: "Learner",
    email: "student@itech.com",
    password: "student123",
    role: "student",
    status: "active",
    joinedAt: "2025-01-01",
    courseIds: [],
  },
];
