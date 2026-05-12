/**
 * On-screen keyboard layout JSON (`/edex-assets/kb_layouts/*.json`).
 * Row keys are arbitrary section names; values are key cap definitions.
 */

/** One key cap: upstream allows many `*cmd` string fields plus `name`, `icon`, etc. */
export type KeyboardKeyDef = Record<string, unknown>;

/**
 * Document root: map of row id → ordered list of keys in that row.
 * Matches `Record<string, Record<string, unknown>[]>` used in `EdexOnScreenKeyboard`.
 */
export type KeyboardLayoutDocument = Record<string, KeyboardKeyDef[]>;
