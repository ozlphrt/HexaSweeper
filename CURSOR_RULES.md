# CURSOR_RULES

- Always ask one **multi-choice** question at a time when decisions are ambiguous.
- Maintain **modular docs**; do not collapse files into one unless asked.
- Prefer **small, testable increments**; open PRs from feature branches to main.
- Respect visual spec: sandstone pillars, void, neutral daylight, glass UI.
- For code generation:
  - Use **r3f + drei** components idiomatically.
  - Use **@react-three/rapier** for physics; pillars start as `type="fixed"`.
  - On click, set body type to `dynamic` and focus camera via Zustand target.
  - Keep materials simple; no external textures for the POC.
- For UI:
  - Keep a **glass-morphism** look using CSS (no Tailwind for POC).
  - Expose **Reset** and **Sunlight** controls only.
