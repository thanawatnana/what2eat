# Project Specification: React Native App Refactoring & Bug Fixes

## 1. Context & Environment
- **Framework:** React Native / Expo
- **Backend:** Supabase (PostgreSQL, Storage)
- **Current Issue:** Need to implement UI/UX improvements, fix a specific React Native crypto bug, and resolve a null reference crash upon logout.

## 2. Tasks & Business Logic

### Task 1: Toggle Password Visibility (Login & Register)
- **Goal:** Allow users to see the password they are typing.
- **Implementation:** Add an eye icon (toggle button) inside or next to the password input fields. Bind it to a boolean state (e.g., `secureTextEntry={!isPasswordVisible}`).

### Task 2: Fix Bcrypt Crash on React Native
- **Error Log:** `Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative.`
- **Cause:** React Native lacks Node's native `crypto` module which `bcrypt`/`bcryptjs` relies on.
- **Implementation:** 
  - Provide a robust workaround for React Native.
  - Implement `bcryptjs` with a proper random fallback (e.g., using `isaac` or a secure random generator compatible with React Native).
  - *Alternative:* If hashing client-side is too complex in RN, provide a clear utility function that correctly configures the fallback before hashing.

### Task 3: Revamp "Add Menu" Form
- **Database Schema Update (Already Executed):** `emoji` column is dropped, `image_url` is added.
- **Implementation:**
  1. **Remove Emoji Input:** Delete all UI and state logic related to emojis.
  2. **Add Image Upload:** Implement an image picker (using `expo-image-picker`). The image should be uploaded to Supabase Storage, and the returned public URL saved to `image_url` in the database.
  3. **Dynamic Category Selector:** 
     - Change the category input from a plain text field to a Dropdown/Select component (Picker).
     - Add an option named "อื่นๆ" (Other).
     - If "อื่นๆ" is selected, render a hidden Text Input field below it, allowing the user to type a custom category.

### Task 4: Menu Screen Enhancements
- **Goal:** Improve CRUD operations on the main Menu screen.
- **Implementation:**
  1. Add a prominent "Add Food" button (preferably a Floating Action Button or sticky bottom button).
  2. On each existing food item card/list item, add an "Edit" button (pencil icon) that navigates to or opens a form to update that specific item's details.

### Task 5: Account Settings / Profile Page
- **Database Schema Update (Already Executed):** Added `profile_image_url` to `users` table.
- **Implementation:**
  1. **Profile Picture:** Add functionality to select an image, upload it to Supabase Storage, update the `profile_image_url` in the DB, and display it on the profile screen.
  2. **Editable Display Name (`name_account`):**
     - Show an "Edit" button.
     - When editing, track changes in a temporary state.
     - If the user cancels (or navigates away without saving), revert the text input to the original database value.
     - Save only when "Confirm/Save" is pressed.
  3. **Read-Only Username:** The `Username` field must be strictly disabled/read-only.

### Task 6: Fix Logout Crash (Render Error in SoloScreen)
- **Error Log:** `Cannot read property 'id' of null` in `SoloScreen.js`.
- **Cause:** When the user logs out, the global user state becomes `null`. Components still mounted (like `SoloScreen`) try to access `user.id` and crash.
- **Implementation:**
  - In `SoloScreen.js` (and any other authenticated screens), implement safety checks.
  - Use optional chaining (`user?.id`) or early returns (`if (!user) return null;`) to prevent rendering crashes while the navigation router redirects the user back to the Login screen.

## 3. AI Instructions
- Review the `SoloScreen.js` and Auth components thoroughly before modifying.
- Ensure all Supabase Storage uploads handle loading states and error catching (try/catch).
- Think step-by-step for the `bcryptjs` fallback solution to ensure it genuinely works on React Native without ejecting.
- Provide clean, modular code snippets for each task.