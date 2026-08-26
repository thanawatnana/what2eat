# Project Specification: Authentication System (Login, Register, Guest Mode)

## 1. Overview
Implement an authentication system containing Login, Register, and Guest Mode. The system uses a custom `users` table. Passwords must be securely hashed. The design must anticipate a future "User Profile" feature.

## 2. Database Schema Reference
Table: `public.users`
- `id` (UUID, Primary Key)
- `name_account` (String)
- `username` (String, Unique)
- `email` (String, Unique)
- `password_hash` (String)
- `is_guest` (Boolean, Default: false)

## 3. Features & Requirements

### 3.1. Register Page
**Fields Required:**
1. `Name_Account` (Display name)
2. `Username`
3. `Email`
4. `Password`

**Validation & Business Logic:**
- **Email Validation:** Must check for a valid email format (e.g., using Regex or a validation library). *Note: Treat as "Real Email Address required" at the validation layer.*
- **Uniqueness Check (Crucial):** 
  - Before inserting, query the database to check if `Username` OR `Email` already exists.
  - If `Username` exists: Throw error "Username นี้ถูกใช้งานแล้ว"
  - If `Email` exists: Throw error "Email นี้ถูกใช้งานแล้ว"
  - *Note: Duplicate passwords among different users are perfectly fine.*
- **Security:** Hash the `Password` before saving to the database. Use **Bcrypt** (salt rounds >= 10) or **Argon2id**. NEVER store plain text passwords.
- **Success:** Redirect to Login page with a success message.

### 3.2. Login Page
**Fields Required:**
1. `Username`
2. `Password`

**Validation & Business Logic:**
- Query the user by `Username`.
- If user not found -> Throw error "Username หรือ Password ไม่ถูกต้อง"
- If user found -> Compare the entered password with `password_hash` using the hashing library's compare function.
- If match -> Generate session/token (JWT or Auth Cookie) and redirect to Dashboard/Home.
- If not match -> Throw error "Username หรือ Password ไม่ถูกต้อง" (Do not specify exactly which one is wrong for security reasons).
- **Edge Case:** Deny login if `is_guest == true`.

### 3.3. Guest Mode
**Trigger:** "Continue as Guest" button on the Login/Register page.
**Business Logic:**
- Does NOT require any input fields.
- Bypass standard authentication.
- Automatically assign the session/state to the predefined Guest User record in the database (`id`: '00000000-0000-4000-8000-000000000000').
- **Constraint:** Guest state is strictly **READ-ONLY**. The application will render the exact same UI and data for all users who click Guest Mode. Guest users cannot edit this profile.

## 4. Technical Constraints & AI Instructions
1. **Error Handling:** Implement clear `try-catch` blocks. Return user-friendly error messages as specified.
2. **Hashing Implementation:** Explicitly implement the hashing logic using standard libraries (e.g., `bcryptjs` or `argon2`). Show the exact implementation of hash generation and hash verification.
3. **State Management:** Ensure the frontend correctly handles the Guest state vs Authenticated User state.
4. **Future-Proofing (Profile System):** When creating the global state/context for the logged-in user, ensure `id`, `name_account`, and `username` are easily accessible for the upcoming Profile feature.

## 5. Deliverables Required from AI
- Frontend UI components for Login and Register (with form validation).
- API Routes / Backend controllers for `/register` and `/login`.
- Hashing utility functions.
- Integration code connecting the frontend to the backend/database.