# SPECIFICATION: `director` Skill Rework

## 1. Overview & Objective
The `director` skill is being overhauled to provide end-to-end automation of video production. It bridges the gap between conversational ideation and heavy-lifting generation (ComfyUI) by **embedding the Koda assistant directly into the tool's interface.**

The ultimate goal is a dual-mode system:
- **Full Auto (Overnight) Mode:** The user provides a prompt/concept in chat, goes to bed, and the system autonomously generates the shot list, plates, video prompts, and final videos.
- **Supervised (Human-in-the-Loop) Mode:** The system pauses for user sign-off/editing at each major stage, facilitated by conversational tweaking.

## 2. The Embedded Co-Pilot (Fixing Context Loss)
To completely eliminate context switching, the UI will feature an embedded chat interface with Koda.
- **Shared Brain:** The chat has real-time access to the Project State (Concept, Visual Style, Character Sheets).
- **Direct Manipulation:** As Ben chats with Koda to ideate, Koda can directly update the tool's state (e.g., "Koda, let's make the third shot a close-up instead" -> Koda updates the Shot List UI data).
- **Persistent Thread:** The conversation history is saved alongside the project file, ensuring the narrative thread is never lost across sessions.

## 3. Core Workflows & Jobs
The skill must orchestrate four distinct generation phases, driven either by full-auto scripts or the embedded chat:
1. **Shot List Generation:** Translate high-level concepts and narrative threads into a structured shot list displayed in the UI.
2. **Plate Generation:** Generate static image plates for each shot using the best available local image generation models (recommended by Koda).
3. **Video Prompt Generation:** Create highly optimized video generation prompts based on the shot list and the generated plate. Must adhere to specific video model prompt guides (e.g., LTX 2.3).
4. **Video Generation:** Dispatch the plates and video prompts to the local video generator (ComfyUI) in batches.

## 4. UI / UX Requirements
- **Split-Pane Design:** Left pane for the Embedded Assistant Chat; Right pane for the Project Dashboard / Shot List.
- **Global Settings & Assets:** Dedicated UI inputs for overarching Project Concept, Visual Style, and Character references.
  - *Character Sheet Support:* Must be configurable to an arbitrary path (Default: `C:\Users\benha\OneDrive\03_CREATIVE\Music\My Ways of Songs\_Assets\Characters`).
- **The "Shot Dashboard":** A UI view displaying the generated image plate alongside an editable text field for the video prompt.
- **Batch Queueing:** Seamless integration to queue jobs to ComfyUI for video generation batches.
- **Mode Toggles:** Clear UI toggles for "Supervised Workflow" vs. "Full Auto".

## 5. Technical Integration Points
- **Assistant Integration:** Hook into the OpenClaw session/messaging API to provide the embedded chat experience.
- **Image Generation:** API/Queue integration with local ComfyUI for image plates. 
- **Video Generation:** API/Queue integration with ComfyUI for video generation. 
  - *Current Target:* LTX 2.3
  - *Reference Workflow:* `C:\Users\benha\Downloads\video_ltx2_3_i2v-genvideo.json`
- **Context Injection:** Logic to dynamically inject the Project Concept, Visual Style, and Character Sheet data into the generation nodes.