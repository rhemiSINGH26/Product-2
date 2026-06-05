# Database & API Implementation Checklist

## ✅ Phase 1: Backend Setup (COMPLETED)

### Database
- [x] PostgreSQL schema with Drizzle ORM
- [x] User, Course, Enrollment, Assessment tables
- [x] Password hashing with bcryptjs
- [x] JWT token generation

### API Endpoints
- [x] POST /api/auth/login
- [x] POST /api/auth/register  
- [x] POST /api/auth/logout

### Configuration
- [x] .env file template and example
- [x] drizzle.config.ts
- [x] Database seed script (seed.ts)

### Documentation
- [x] DATABASE_SETUP.md
- [x] MIGRATION_GUIDE.md

---

## 📋 Phase 2: Local Setup (YOU NEED TO DO THIS)

### Prerequisites
```bash
# 1. Install PostgreSQL (if not already installed)
# Windows: https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql

# 2. Verify PostgreSQL is installed
psql --version

# 3. Create the database
createdb itech_lms

# 4. Create .env file (already created with defaults)
# Edit if your PostgreSQL credentials are different
```

### Initialize Database
```bash
# 1. Generate migrations
npm run db:generate

# 2. Push schema to database
npm run db:push

# 3. Seed with default users
npm run db:seed
```

### Default Test Accounts
After seeding, use these to test login:
- **Admin**: admin@itech.com / admin123
- **Teacher**: teacher@itech.com / teacher123
- **Student**: student@itech.com / student123

---

## 🔄 Phase 3: Frontend Updates (NEEDS TO BE DONE)

### Update Login/Register Routes
- [ ] Replace `import { useAuth } from "./lib/store"` with `import { useAuth } from "./lib/auth-store"`
- [ ] Update login component to use async `await login()`
- [ ] Update register component to use async `await register()`

### Files to Review & Update
- [ ] `src/routes/login.tsx` - Update auth calls
- [ ] `src/routes/student.tsx` - Update data fetching
- [ ] `src/routes/teacher.tsx` - Update data fetching
- [ ] `src/routes/admin.tsx` - Update data fetching
- [ ] `src/components/AppShell.tsx` - Update auth check

### Remove Deprecated Code
- [ ] Delete `src/lib/accounts.ts` (no longer needed)
- [ ] Update `src/lib/store.ts` (remove HARDCODED_ACCOUNTS export)
- [ ] Remove `HARDCODED_ACCOUNTS` from any component imports

---

## 📡 Phase 4: Additional API Endpoints (FUTURE)

### User Management
- [ ] GET /api/users (list all)
- [ ] GET /api/users/:id (get user)
- [ ] PUT /api/users/:id (update)
- [ ] DELETE /api/users/:id

### Course Management
- [ ] GET /api/courses
- [ ] POST /api/courses
- [ ] GET /api/courses/:id
- [ ] PUT /api/courses/:id
- [ ] DELETE /api/courses/:id

### Enrollments
- [ ] POST /api/courses/:id/enroll
- [ ] GET /api/courses/:id/students
- [ ] DELETE /api/enrollments/:id

### Assessments
- [ ] GET /api/assessments/:id
- [ ] POST /api/assessments/:id/submit
- [ ] GET /api/submissions/:id

### Progress & Certificates
- [ ] GET /api/progress
- [ ] POST /api/certificates
- [ ] GET /api/certificates

---

## 🧪 Testing Commands

### Test API (with curl)
```bash
# Login
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@itech.com","password":"admin123"}'

# Register
curl -X POST http://localhost:5173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

### Verify Database
```bash
# Connect to database
psql itech_lms

# List tables
\dt

# Check users table
SELECT id, name, email, role, status FROM users;

# Exit
\q
```

---

## 🚀 Quick Start Guide

```bash
# 1. Install dependencies (already done)
npm install

# 2. Create database
createdb itech_lms

# 3. Setup environment (already done in .env)
# Review .env and update DATABASE_URL if needed

# 4. Initialize database
npm run db:push
npm run db:seed

# 5. Start development server
npm run dev

# 6. Open http://localhost:5173/login
# Login with admin@itech.com / admin123
```

---

## 📚 Documentation Files

- **DATABASE_SETUP.md** - Complete database setup guide
- **MIGRATION_GUIDE.md** - Detailed migration steps from localStorage
- **IMPLEMENTATION_CHECKLIST.md** - This file

---

## ⚠️ Important Notes

1. **PostgreSQL Must Be Running**
   - Check: `psql -U postgres -c "SELECT 1"`
   - Start on macOS: `brew services start postgresql`
   - Start on Windows: PostgreSQL service should auto-start

2. **Environment Variables**
   - DATABASE_URL points to your local PostgreSQL
   - JWT_SECRET should be changed in production
   - Check .env before running `npm run db:push`

3. **Default Passwords**
   - Change all default passwords after first login
   - Reset them using database or registration flow

4. **Next Steps After Setup**
   - Implement remaining API endpoints
   - Add React Query for data fetching
   - Update all components to use new API
   - Remove old localStorage-based code

---

## Support

If you encounter issues:
1. Check DATABASE_SETUP.md troubleshooting section
2. Verify PostgreSQL is running
3. Check .env DATABASE_URL is correct
4. Run `npm run db:push` to recreate tables
5. Run `npm run db:seed` to recreate users
