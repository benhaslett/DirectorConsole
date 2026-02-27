# Director - AI Video Production Pipeline

**Description:** An end-to-end workflow manager for AI music videos and short films. It orchestrates concept development, shot listing, image generation (ComfyUI), and video animation (Wan 2.1 / LTX.2).

## Core Philosophy

1.  **Concept First:** Define the vibe, lyrics, and theme before pixels.
2.  **Structured Plan:** Generate a `shot_list.json` that acts as the "script" for the entire production.
3.  **Batch Execution:** Automate the tedious parts (queueing 24 prompts) so the creator can focus on review.
4.  **State Tracking:** Know exactly which shots are done, failed, or pending.

## Commands

### 1. Initialize Project
Create a new project folder and configuration.

```bash
node skills/director/scripts/new.js "Project Name"
```

### 2. Planning Phase (The Writer's Room)
Interactive or manual planning. This generates the `shot_list.json`.

```bash
# Open the plan file for manual editing (or ask the AI to fill it)
code projects/Project_Name/shot_list.json
```

### 3. Production Phase (The Shoot)
Execute the plan.

```bash
# Generate Base Images
node skills/director/scripts/shoot.js "Project Name" --phase images

# Animate Video Clips (Wan 2.1 / LTX.2)
node skills/director/scripts/shoot.js "Project Name" --phase video
```

### 4. Director's Console (GUI)
Visual interface for managing shots, uploading images, and reviewing videos.

```bash
node skills/director/scripts/console.js
```
*Port 3000*

## Dependencies
- Requires `comfy-art` skill (port 8000).
- Requires `comfy-art` workflows (Qwen & Wan 2.1).
