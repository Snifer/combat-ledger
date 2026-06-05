import { TFile } from "obsidian";

export interface FieldMapping {
	initiative: string;
	hp: string;
	hp_max: string;
	shield: string;
	xp: string;
	avatar: string;
	icon: string;
	ac: string;
	type: string;          // "PC" | "Enemy" | "NPC"
	extra_fields: string;  // comma-separated extra numeric field names
	conditions: string;
}

export interface ConditionEntry {
	name: string;
	color: string; // hex color, e.g. "#a855f7". Empty string = use default style.
}

export interface ActiveCondition {
	name: string;
	duration: number | null;
}

export interface TokenState {
	x: number;
	y: number;
	hidden: boolean;
	scale: number;
}

export interface SavedBoardLayout {
	name: string;
	background: string;
	gridEnabled: boolean;
	snapToGrid: boolean;
	gridSize: number;
	tokenStates: Record<string, TokenState>;
}

export interface BattleTrackerSettings {
	language: "es" | "en";
	fields: FieldMapping;
	conditions: ConditionEntry[];
	combatantFolder: string;
	realtimeSync: boolean;
	realtimeSyncMode: "pc" | "all";
	shieldAbsorbsDamage: boolean;
	turnTimerEnabled: boolean;
	turnTimerSeconds: number;
	playerViewShowHp: boolean;
	boardGridEnabled: boolean;
	boardSnapToGrid: boolean;
	boardGridSize: number;
	boardDefaultBackground: string;
	savedBoardLayouts: SavedBoardLayout[];
	logEnabled: boolean;
	logMode: "new" | "existing" | "ask";
	logHeader: string;
	logFileName: string;
	logFolder: string;
}

export interface Combatant {
	id: string;           // file path
	name: string;
	initiative: number;
	hp: number;
	hpMax: number;
	shield: number;
	xp: number;
	avatar: string;
	icon: string;
	ac: number;
	combatType: string;
	extraFields: Record<string, number>;
	conditions: ActiveCondition[];
	notes: string;
	alive: boolean;
	file: TFile;
}

export interface CombatAlert {
	id: string;
	message: string;
	createdAt: number;
	type: "turn" | "condition" | "defeat" | "timer";
}

export interface CombatSessionState {
	combatants: Combatant[];
	round: number;
	activeCombatantId: string | null;
	editingInitiativeId: string | null;
	graveyardExpanded: boolean;
	graveyardAssignedXp: number;
	graveyardXpDraft: string | null;
	turnTimerStartedAt: number;
	turnTimerCombatantId: string | null;
	boardBackground: string;
	boardGridEnabled: boolean;
	boardSnapToGrid: boolean;
	boardGridSize: number;
	tokenStates: Record<string, TokenState>;
	selectedTokenIds: string[];
	activeLogFile: TFile | null;
	logDismissed: boolean;
	logQueue: string[];
	logSetupInProgress: boolean;
	alerts: CombatAlert[];
}
