# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.1] - 2026-06-05

### Changed
- Updated the minimum supported Obsidian version to `1.13.0`.
- Aligned settings, modal, and view code with current Obsidian review guidance for UI structure, popout compatibility, and safer DOM updates.

### Fixed
- Removed leaf detachment during plugin unload so moved views keep their workspace placement.
- Replaced direct `innerHTML`, `prompt`, `confirm`, and `require()` usage with safer UI flows and static imports.
- Reworked dynamic styling to rely on CSS classes and `setCssProps()` instead of direct static style assignments.
- Reduced unsafe typing around persisted session data, frontmatter synchronization, and modal element access.
- Awaited workspace leaf reveal operations and wrapped modal callbacks so Obsidian review checks no longer flag floating promises.
- Moved timer, board, token, avatar, condition, and HP bar dynamic presentation to CSS-variable driven classes for stricter UI review compatibility.

## [1.2.0] - 2026-06-05

### Added
- A synchronized player-facing dashboard view with turn order, active combatant, visible conditions, optional HP display, and fullscreen support.
- Visual alert banners for turn start, defeated combatants, expired conditions, and turn timer expiration.
- Board mode for both GM and player views with draggable tokens, optional grid, snap-to-grid, background image support, token hiding, and layout save/load tools.
- New YAML field mappings for `avatar` and `icon` so notes can provide richer visual tokens and cards.
- Full combat session persistence, including loaded combatants, active turn, timer state, graveyard state, board background, token positions, hidden tokens, selected tokens, and active log file path.

### Changed
- Refactored the combat state into a shared session so GM and player views stay synchronized in real time.
- Board and player-view settings now provide defaults for grid visibility, snapping, grid size, background image, and HP visibility.

### Fixed
- Persisted sessions now restore combatants and the active combat log safely after reloading the plugin.

## [1.1.0] - 2026-05-26

### Added
- Optional real-time synchronization back to the original Markdown note for tracked combatants.
- New YAML field mappings for `shield` and persisted `conditions`, plus sync scope settings for `PC only` or `all combatants`.
- Inline initiative editing from each combatant card, including double-click editing and automatic tracker reorder.
- Active combatant action flow to pick a target, apply damage, assign a condition with optional round duration, and append a contextual combat log entry.
- Shield-aware damage application controls in both direct damage and contextual action flows.
- ESLint setup for the TypeScript source with a new `npm run lint` script.

### Changed
- Expanded combatant state to persist shield values and conditions with optional duration metadata.
- Advancing turns now decrements timed conditions automatically and removes expired effects while logging the expiration.
- Settings now expose real-time sync, shield behavior, and additional field mappings required by the new combat workflow.

### Fixed
- Merged default field settings defensively during load so older saved configs receive new mappings without manual reset.

## [1.0.0] - 2026-05-23

### Added
- Sidebar panel with initiative order strip.
- Load combatants from any vault notes via searchable modal.
- Auto-load from a configured folder (bestiary support).
- Configurable YAML field mapping (initiative, hp, hp_max, ac, type).
- Unlimited extra numeric fields (mp, stamina, stress, ki…).
- Damage / healing modal per combatant.
- Conditions / status effects modal with customizable condition list.
- Quick notes per combat.
- HP bar with color coding (green / yellow / red).
- Defeat / revive combats.
- Round counter.
- Settings tab for all field names and conditions.
- Combat template notes: `TEMPLATE_Combat.md` (English) and `PLANTILLA_COMBATIENTE` (Spanish).
- Dual language support (English / Spanish) switch in settings, dynamically translating the interface, condition lists, headers, and file names.
- Dynamic combat log system:
  * Prompts to create a new note, use an existing note (searchable list), or run in-memory only.
  * Chronologically appends logs under a customizable Markdown header in the note.
  * Automatically handles missing folder creation and file naming patterns with `{date}`.
- Refactored code architecture into a clean, modular structure under `src/` directory:
  * `main.ts` (Entry Point & Commands)
  * `types.ts` (Data Models)
  * `localization.ts` (Translations)
  * `settings.ts` (Config & Setting Tab Panel)
  * `view.ts` (Battle Tracker View Panel & Combats Flow)
  * `modals.ts` (UI Popups & Choice Modals)

---

## [1.0.1] - 2026-05-25

### Fixed
- Corrected plugin `id` in `manifest.json` to match the expected Obsidian plugin identifier.

---

## [1.0.2] - 2026-05-25

### Added
- **Per-condition color customization** in Settings → Conditions / States:
  * Each condition now has an individual color picker (native browser color input).
  * Colors are applied to condition badges in the combat view (text + border tinted, semi-transparent background — Option A style).
  * Colors are also reflected in the condition toggle modal, making it easy to identify statuses at a glance.
  * Default palette: each of the 10 built-in conditions ships with a distinct preset color (amber, green, violet, orange, slate, blue, purple, red, stone, dark).
- **Add new conditions** with a custom name and color directly from the Settings panel.
- **Delete any condition** from the list via a per-row delete button.
- **Automatic data migration**: existing installations that stored conditions as a comma-separated string are silently upgraded to the new `ConditionEntry[]` format on first load, preserving all custom condition names.
- **Refactored UI styling architecture:** Migrated component styles to a dedicated `styles.css` file. 
  * Organized styles into clean, commented sections:
    * Panel, top bar, buttons.
    * Initiative tracker, combatant cards, avatars, type badges.
    * Condition tags, HP bar, extra fields, notes, actions.
    * Modals (damage, conditions, notes, pick, log).
    * Settings section (condition color management).
  * Streamlined codebase by cleaning up style-related code in `view.ts` and `settings.ts`.

## [1.0.3] - 2026-05-26

### Changed
- Rename plug-in from Simple Battle Tracker to Combat Ledger.
- Update all the files with the new name.


## [1.0.4] - 2026-05-26

### Changed
- Replaced deprecated `builtin-modules` dependency with the native Node.js `builtinModules` API.
- Updated the release workflow to generate GitHub artifact attestations for release assets.

### Fixed
- Updated the plugin description to comply with Obsidian community review guidelines.

### Security
- Release assets now include provenance attestations for cryptographic verification.
