## Goals

Address every issue raised, keep red/black/white theme, all data in localStorage, no mock data.

## 1. Course access bug + Validity / Lifetime

- Add to `Course`: `accessMode: "lifetime" | "limited"` and reuse `endDate` for the cutoff when limited.
- In `student.courses.$courseId.tsx`: when not lifetime and `today > endDate`, lock the course with a clear "Access expired" panel; otherwise render normally.
- Show validity status on `student.courses.tsx` card (Lifetime badge or "Expires DD-MM" / "Expired").
- Admin course dialog: radio for Lifetime vs Limited (limited reveals end-date picker).

## 2. Account creation + admin password control

- Extend `User` type with `password: string`.
- Login page: add Sign in / Create account tab switch. Create-account form (name, email, password) calls `useAuth.register()` which creates a `student` user in the data store and signs them in.
- `useAuth` accepts both hardcoded accounts and users from the data store; password is stored on the user.
- Admin Users dialog: password field (text, show/hide toggle) for create and edit. Admin can see and change any user's password.
- Hardcoded seed admin/teacher/student remain as fallbacks.

## 3. Teacher chat (Messages page)

- New route `teacher.messages.tsx`: same inbox/sent + compose pattern as student. Recipients = students enrolled in the teacher's courses + the admin user.
- Add Messages link to teacher sidebar nav and unread-message bell logic in AppShell for teachers too.

## 4. Emoji picker for courses

- Replace the free-text emoji input in `admin.courses.tsx` with a popover that shows a grid of curated emojis (📘🚀🧠💻🎨📐⚗️🔬🛠️📊🎬🎵🌐🔐🤖📱☁️ etc.) plus a free-text fallback.

## 5. Assessments inline in course + Final protected test

- Add new `ContentType = "assessment"` (and item.assessmentId field).
- In Content Builder, "Add content" → type Assessment → pick from existing assessments of this course; renders inline in the sidebar with a Start button.
- Add `isFinal: boolean` to `Assessment`. In assessment editor, toggle "This is the final exam".
- `maybeRequestCert` only triggers when the passed assessment is the final one (other quizzes still auto-grade but don't request certs).
- Final attempts default to `proctored: true`.

## 6. Certificate verification visibility

- In `student.certificates.tsx`, surface a banner-style "Verification in progress" block for each pending cert (with the timeline: Requested → Under review → Issued).
- Notification on cert request creation already exists for the student ("Submitted for verification"); add that string explicitly.

## 7. Images in assessment questions

- Extend `Question` with optional `imageUrl?: string`.
- Question editor: add image URL input + "Upload image" button (FileReader → data URL).
- Quiz taker: render the image above the prompt.

## 8. Inline media + file uploads (no redirects)

- Extend `ContentType` with `image` and `ppt`. Item still has `url` and a new optional `fileName`.
- In Content Builder item dialog, every type that takes a URL also gets an "Upload file" button (FileReader → data URL, soft 5 MB warning). PPT URLs render via the Office Online viewer iframe when public (and as a download fallback otherwise).
- In `student.courses.$courseId.tsx`'s ContentViewer:
  - video: existing inline player (YouTube embed or `<video>` for direct URLs / data URLs).
  - pdf: inline iframe (already works; works for data URLs too).
  - image: inline `<img>`.
  - ppt: Office viewer iframe if `https://` URL; otherwise download button.
  - link/download: render an inline preview card with a download/open button — but no automatic redirect away from the academy.

## 9. Remove remaining placeholder strings

- Replace any leftover "Aarav Mehta", "MERN-301" demo placeholders in admin dialogs with generic placeholders ("Full name", "Course code").

## Files to edit/create

Edited:
- `src/lib/mock-data.ts` (User.password, Course.accessMode, Assessment.isFinal, ContentType additions, Question.imageUrl)
- `src/lib/store.ts` (register, lookup against data-store users, password storage)
- `src/lib/data-store.ts` (registerUser, accessor for auth, isFinal gate in maybeRequestCert, helper isCourseExpired)
- `src/components/AppShell.tsx` (teacher messages link + bell logic)
- `src/routes/login.tsx` (signup tab)
- `src/routes/admin.users.tsx` (password field, remove sample placeholder)
- `src/routes/admin.courses.tsx` (emoji picker, lifetime/limited)
- `src/routes/teacher.content.tsx` (file uploads, new types, assessment items)
- `src/routes/teacher.assessments.tsx` (isFinal toggle, image on questions, upload)
- `src/routes/student.courses.$courseId.tsx` (expiry lock, new viewers, inline assessment items)
- `src/routes/student.courses.tsx` (validity badge)
- `src/routes/student.assessments.$assessmentId.tsx` (render question image)
- `src/routes/student.certificates.tsx` (verification banner)

New:
- `src/routes/teacher.messages.tsx`
- `src/components/EmojiPicker.tsx`
- `src/components/FileUploadButton.tsx` (FileReader → data URL helper)

## Technical notes (for reference)

- Storing uploaded files as base64 in localStorage is constrained (~5 MB total quota in most browsers). The UI will warn when a single file exceeds ~4 MB and refuse files over ~8 MB to avoid quota errors. Real production needs Lovable Cloud storage — happy to migrate later.
- Office viewer URL format: `https://view.officeapps.live.com/op/embed.aspx?src=<encoded-public-url>`. Data-URL PPTs cannot be embedded inline.
- Backwards compatibility: a Zustand `version` bump + migration adds defaults for new fields so existing localStorage data keeps working.
