import { getDb } from "./src/lib/db/client";
import { users } from "./src/lib/db/schema";
import { hashPassword } from "./src/lib/auth";
import type { User } from "./src/lib/mock-data";

async function seed() {
  const db = getDb();
  
  try {
    console.log("Starting database seed...");

    // Create default admin user if it doesn't exist
    const adminExists = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, "admin@itech.com"),
    });

    if (!adminExists) {
      const adminPasswordHash = await hashPassword("admin123");
      await db.insert(users).values({
        id: "admin-root",
        name: "Administrator",
        email: "admin@itech.com",
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "active",
        joinedAt: new Date("2025-01-01"),
      });
      console.log("✓ Created default admin user");
    }

    // Create default teacher user if it doesn't exist
    const teacherExists = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, "teacher@itech.com"),
    });

    if (!teacherExists) {
      const teacherPasswordHash = await hashPassword("teacher123");
      await db.insert(users).values({
        id: "teacher-root",
        name: "Instructor",
        email: "teacher@itech.com",
        passwordHash: teacherPasswordHash,
        role: "teacher",
        status: "active",
        joinedAt: new Date("2025-01-01"),
      });
      console.log("✓ Created default teacher user");
    }

    // Create default student user if it doesn't exist
    const studentExists = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, "student@itech.com"),
    });

    if (!studentExists) {
      const studentPasswordHash = await hashPassword("student123");
      await db.insert(users).values({
        id: "student-root",
        name: "Learner",
        email: "student@itech.com",
        passwordHash: studentPasswordHash,
        role: "student",
        status: "active",
        joinedAt: new Date("2025-01-01"),
      });
      console.log("✓ Created default student user");
    }

    console.log("✓ Seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
