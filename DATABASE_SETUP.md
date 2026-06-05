# Database Setup Guide

## Overview
This LMS project now uses PostgreSQL with Drizzle ORM for type-safe database management. All hardcoded accounts and localStorage have been removed in favor of a proper backend API.

## Prerequisites
- PostgreSQL 14+ installed and running
- Node.js 18+

## Setup Steps

### 1. Create PostgreSQL Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE itech_lms;

# Exit psql
\q
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update with your credentials:
```bash
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/itech_lms
JWT_SECRET=your-secret-key-change-in-production
```

### 3. Generate & Run Migrations
```bash
# Generate migration files from schema
npm run db:generate

# Push schema to database (creates tables)
npm run db:push
```

### 4. Seed Initial Data
```bash
# Create default admin, teacher, and student accounts
npm run db:seed
```

This creates:
- **Admin**: admin@itech.com / admin123
- **Teacher**: teacher@itech.com / teacher123
- **Student**: student@itech.com / student123

> ⚠️ Change these passwords in production!

## Database Schema

### Core Tables
- **users**: All user accounts with hashed passwords
- **courses**: Course definitions with teacher assignments
- **enrollments**: Student course enrollments
- **sections**: Course sections/modules
- **contentItems**: Course materials (videos, readings, etc.)
- **assessments**: Quizzes and exams
- **questions**: Quiz/exam questions
- **submissions**: Student quiz/exam submissions
- **certificates**: Course completion certificates
- **notifications**: User notifications
- **messages**: User-to-user messaging

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Existing Endpoints (to be implemented)
- Course management (GET, POST, PUT, DELETE)
- Enrollment management
- Assessment submission
- Progress tracking
- Certificate management

## Migration Commands
```bash
# Generate new migrations
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push entire schema (use for development)
npm run db:push

# Seed database
npm run db:seed
```

## Key Changes from Previous Setup

### Removed
- ❌ Hardcoded `accounts.ts` file
- ❌ localStorage for user data
- ❌ Client-side only data storage

### Added
- ✅ PostgreSQL database backend
- ✅ Drizzle ORM with migrations
- ✅ API endpoints for all operations
- ✅ JWT-based authentication
- ✅ Hashed password storage (bcrypt)
- ✅ Server-side data validation

## Testing Authentication
```bash
# Start the dev server
npm run dev

# Test login with curl
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@itech.com","password":"admin123"}'
```

## Troubleshooting

### "DATABASE_URL is not set"
Ensure `.env` file exists with valid PostgreSQL URL

### Migration errors
- Check PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
- Verify database exists: `psql -U postgres -l | grep itech_lms`

### Password hashing issues
Ensure bcryptjs is installed: `npm install bcryptjs`

## Next Steps
1. Implement remaining API endpoints (courses, assessments, etc.)
2. Update frontend store to use API endpoints
3. Add React Query for client-side caching
4. Set up proper error handling and logging
