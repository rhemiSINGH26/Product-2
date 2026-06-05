# Migration Guide: From LocalStorage to Database + API

## Summary of Changes

### ✅ Completed
1. **PostgreSQL Database Setup**
   - Drizzle ORM schema created with all tables
   - Password hashing configured with bcryptjs
   - JWT token generation implemented

2. **Backend API Endpoints**
   - `POST /api/auth/login` - Authenticate users
   - `POST /api/auth/register` - Create new accounts
   - `POST /api/auth/logout` - Clear session

3. **Security Improvements**
   - Passwords stored as bcrypt hashes
   - JWT-based authentication
   - HttpOnly cookies for token storage
   - Removed hardcoded accounts from code

4. **New Files Created**
   - `src/lib/db/schema.ts` - Database schema
   - `src/lib/db/client.ts` - Database connection
   - `src/lib/auth.ts` - Auth utilities (hashing, JWT)
   - `src/lib/auth-store.ts` - Updated auth store using API
   - `src/lib/api/client.ts` - Frontend API client
   - `src/routes/api/auth/login.ts` - Login endpoint
   - `src/routes/api/auth/register.ts` - Register endpoint
   - `src/routes/api/auth/logout.ts` - Logout endpoint
   - `drizzle.config.ts` - Drizzle configuration
   - `.env` - Environment variables
   - `seed.ts` - Database seed script

### 📝 Next Steps: Update Existing Code

#### 1. Replace `useAuth` import in login/registration pages
```typescript
// OLD
import { useAuth, HARDCODED_ACCOUNTS } from "./lib/store";

// NEW
import { useAuth } from "./lib/auth-store";
```

#### 2. Update login page to handle async operations
```typescript
// OLD
const result = login(email, password);

// NEW
const result = await login(email, password);
```

#### 3. Remove data-store usage and replace with API calls
```typescript
// OLD - using localStorage
useData.getState().courses.find(...)

// NEW - will use React Query with API
const { data: courses } = useQuery({
  queryKey: ["courses"],
  queryFn: () => fetchCourses(),
});
```

#### 4. Update route loaders
Replace any route loaders that use `useData()` with API calls:
```typescript
// In TanStack Router route loaders
export const Route = createFileRoute('/courses')({
  component: CoursesPage,
  loader: async () => {
    const courses = await fetchCourses();
    return courses;
  }
})
```

### 🗑️ Files to Remove
- ❌ `src/lib/accounts.ts` - No longer needed
- ❌ Update `src/lib/store.ts` - Remove localStorage auth data (keep data store for now)
- ❌ Remove any references to `HARDCODED_ACCOUNTS` in components

### 🔧 Required Configuration

#### PostgreSQL Setup
```bash
# Create database
createdb itech_lms

# Set environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

#### Run Migrations
```bash
npm run db:push
npm run db:seed
```

#### Update Login Credentials
Default test accounts after seeding:
- **Admin**: admin@itech.com / admin123
- **Teacher**: teacher@itech.com / teacher123  
- **Student**: student@itech.com / student123

## Testing the Migration

### 1. Start PostgreSQL
```bash
# On Windows with PostgreSQL installed
# psql is already available in PowerShell

# On macOS
brew services start postgresql
```

### 2. Create database and run migrations
```bash
npm run db:push
npm run db:seed
```

### 3. Start dev server
```bash
npm run dev
```

### 4. Test login
Visit `http://localhost:5173/login` and try:
- Email: admin@itech.com
- Password: admin123

## Remaining API Endpoints to Implement

### User Management
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (admin only)

### Courses
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course (teacher/admin)
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Enrollments
- `POST /api/courses/:id/enroll` - Enroll student
- `GET /api/courses/:id/students` - List enrolled students

### Assessments
- `GET /api/assessments/:id` - Get assessment
- `POST /api/assessments/:id/submit` - Submit assessment

### Progress & Certificates
- `GET /api/progress/:studentId/:courseId` - Get progress
- `POST /api/certificates` - Request certificate
- `GET /api/certificates` - List certificates

## Troubleshooting

### "Cannot find module 'pg'"
```bash
npm install pg drizzle-orm bcryptjs jsonwebtoken
```

### Login returns 401
- Check PostgreSQL is running
- Verify DATABASE_URL is correct in `.env`
- Ensure seed script was run (`npm run db:seed`)

### "Unexpected token" errors
- Check TypeScript files are valid
- Run `npm run build` to verify compilation

## Performance Notes
- Add React Query for client-side caching of courses, assessments, etc.
- Implement pagination for large datasets
- Consider adding database indexes for frequently queried fields
