# 🎯 Prompt Instruction for Claude (Antigravity IDE - Thinking Model)

**Role:** You are an Expert Mobile App Developer specializing in React Native and Expo.
**Project Context:** A Food Randomizer Application. The app handles user authentication (including Guest mode), a Home screen, a Randomizer screen, and a Real-time Multiplayer Randomizer ("Random with Friends!").

<instructions>
Please analyze the following requirements carefully. Use your <thinking> process to plan the state management, UI layout (using Flexbox and SafeArea), and data flow before generating the final code. Output the necessary code updates for each screen/component and provide clear instructions.
</instructions>

<objectives>
Here are the 6 tasks to implement:

## 1. Guest User Restrictions (Profile/Settings)
- **Condition:** If `user.isGuest` (or equivalent auth state) is `true`.
- **Action:** Disable the image picker and all text input fields (Name, etc.).
- **UI Update:** Render a warning message or overlay stating: *"บัญชี Guest ไม่สามารถแก้ไขข้อมูลโปรไฟล์ได้"* (Guest accounts cannot edit profile data) to make the UX clear.

## 2. Layout Fix: Random Food Screen (Avoid Top Notch)
- **Problem:** The UI elements are colliding with the top edge of the screen (Status Bar / Notch).
- **Action:** Implement `SafeAreaView` from `react-native-safe-area-context` as the outermost container. Alternatively, use `Platform.OS === 'android' ? StatusBar.currentHeight : 0` to add dynamic `paddingTop`. Ensure the layout looks clean and spaced properly.

## 3. Home Screen Redesign
- **Current State:** The Home screen currently has the food randomizer logic/UI directly on it.
- **New Flow:** 
  1. Remove the direct randomizer UI from the Home screen.
  2. Create a new button titled **"สุ่มอาหาร"** (Random Food).
  3. This new button must trigger `navigation.navigate('RandomFoodScreen')`.
  4. Place this button alongside the existing **"สุ่มกับเพื่อน!"** (Random with Friends!) button, ensuring the styling (width, height, colors, icons) is consistent and aesthetically pleasing.

## 4. Category Selection Filter (Random Food Screen)
- **Action:** Add a horizontal list of category selectors (Filter Chips) above the randomizer UI.
- **Categories:** "ทั้งหมด" (All), "อาหารไทย" (Thai), "อาหารญี่ปุ่น" (Japanese), "สุขภาพ" (Healthy), etc.
- **Logic:** Update the randomizer function. When a user presses "สุ่ม" (Random), the function must first filter the main food array based on the selected category, and then pick a random item from that filtered subset.

## 5. Profile Picture on Home Screen
- **Action:** In the `HomeScreen`, add a top header section.
- **UI:** Display the user's profile image in the top-right corner. It should be a circular avatar (e.g., `width: 40, height: 40, borderRadius: 20`).
- **Fallback:** If the user is a Guest or hasn't uploaded a picture, display a default placeholder avatar. 

## 6. "Random with Friends!" Feature - Implementation & Testing Guide
- **Action:** I want to test and understand how the "สุ่มกับเพื่อน!" feature works.
- **Requirement:** 
  1. Provide the structural code or pseudo-code for how this room-based system should work (e.g., using Firebase Realtime Database or Socket.io to sync state: Create Room -> Share PIN -> Join Room -> Sync Random Result).
  2. Write a clear, step-by-step guide on how I can test this feature in my development environment (e.g., running two simulators/devices).
</objectives>

<output_format>
- Please provide the updated code for `HomeScreen`, `RandomFoodScreen`, and `ProfileScreen`.
- Clearly comment where changes were made.
- At the end, provide a clear explanation for Task 6.
</output_format>
