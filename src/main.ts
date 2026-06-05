import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { BattleTrackerSettings, CombatSessionState, Combatant } from "./types";
import { DEFAULT_SETTINGS, BattleTrackerSettingTab } from "./settings";
import { PLAYER_VIEW_TYPE, VIEW_TYPE, BattleTrackerView } from "./view";

interface SerializedCombatant extends Omit<Combatant, "file"> {
	file: string;
}

interface SerializedSession extends Omit<CombatSessionState, "combatants" | "activeLogFile"> {
	combatants: SerializedCombatant[];
	activeLogFile: string | null;
}

interface PersistedPluginData {
	settings?: Partial<BattleTrackerSettings>;
	session?: Partial<SerializedSession>;
}

export default class BattleTrackerPlugin extends Plugin {
	settings: BattleTrackerSettings;
	session: CombatSessionState = this.createDefaultSession();
	sessionSaveTimeout: number | null = null;

	createDefaultSession(): CombatSessionState {
		return {
			combatants: [],
			round: 1,
			activeCombatantId: null,
			editingInitiativeId: null,
			graveyardExpanded: true,
			graveyardAssignedXp: 0,
			graveyardXpDraft: null,
			turnTimerStartedAt: 0,
			turnTimerCombatantId: null,
			boardBackground: "",
			boardGridEnabled: true,
			boardSnapToGrid: false,
			boardGridSize: 64,
			tokenStates: {},
			selectedTokenIds: [],
			activeLogFile: null,
			logDismissed: false,
			logQueue: [],
			logSetupInProgress: false,
			alerts: [],
		};
	}

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => new BattleTrackerView(leaf, this, "gm"));
		this.registerView(PLAYER_VIEW_TYPE, (leaf) => new BattleTrackerView(leaf, this, "player"));

		this.addRibbonIcon("sword", "Combat Ledger", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-view",
			name: this.settings.language === "es" ? "Abrir Combat Ledger" : "Open Combat Ledger",
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: "open-player-view",
			name: this.settings.language === "es" ? "Abrir vista de jugadores" : "Open player view",
			callback: () => {
				void this.activatePlayerView();
			},
		});

		this.addSettingTab(new BattleTrackerSettingTab(this.app, this));
	}

	onunload() {
		void this.persistData();
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const existing = workspace.getLeavesOfType(VIEW_TYPE);
		if (existing.length) {
			leaf = existing[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		}
		if (leaf) await workspace.revealLeaf(leaf);
	}

	async activatePlayerView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const existing = workspace.getLeavesOfType(PLAYER_VIEW_TYPE);
		if (existing.length) {
			leaf = existing[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: PLAYER_VIEW_TYPE, active: true });
		}
		if (leaf) await workspace.revealLeaf(leaf);
	}

	refreshViews() {
		const leaves = [
			...this.app.workspace.getLeavesOfType(VIEW_TYPE),
			...this.app.workspace.getLeavesOfType(PLAYER_VIEW_TYPE),
		];
		leaves.forEach((leaf) => {
			if (leaf.view instanceof BattleTrackerView) {
				leaf.view.render();
			}
		});
	}

	scheduleSessionSave() {
		if (this.sessionSaveTimeout !== null) {
			window.clearTimeout(this.sessionSaveTimeout);
		}
		this.sessionSaveTimeout = window.setTimeout(() => {
			this.sessionSaveTimeout = null;
			void this.persistData();
		}, 150);
	}

	async persistData() {
		const serializedCombatants: SerializedCombatant[] = this.session.combatants.map((combatant) => ({
			...combatant,
			file: combatant.file.path,
		}));
		const serializableSession: SerializedSession = {
			...this.session,
			combatants: serializedCombatants,
			activeLogFile: this.session.activeLogFile?.path ?? null,
		};
		await this.saveData({
			settings: this.settings,
			session: serializableSession,
		});
	}

	async loadSettings() {
		const rawData = await this.loadData() as PersistedPluginData | Partial<BattleTrackerSettings> | null;
		const hasWrappedData = Boolean(rawData && typeof rawData === "object" && "settings" in rawData);
		const storedSettings = (hasWrappedData ? (rawData as PersistedPluginData).settings : rawData) ?? {};
		const storedSession: Partial<SerializedSession> | null = hasWrappedData ? (rawData as PersistedPluginData).session ?? null : null;

		this.settings = Object.assign({}, DEFAULT_SETTINGS, storedSettings);
		this.settings.fields = Object.assign({}, DEFAULT_SETTINGS.fields, this.settings.fields ?? {});

		const session: CombatSessionState = Object.assign(this.createDefaultSession(), storedSession ?? {});
		const activeLogPath = storedSession?.activeLogFile;
		const activeLogFile = typeof activeLogPath === "string" ? this.app.vault.getAbstractFileByPath(activeLogPath) : null;
		session.activeLogFile = activeLogFile instanceof TFile ? activeLogFile : null;
		const storedCombatants = storedSession?.combatants;
		const restoredCombatants = Array.isArray(storedCombatants)
			? storedCombatants
				.map((entry) => {
					const file = typeof entry.file === "string" ? this.app.vault.getAbstractFileByPath(entry.file) : null;
					if (!(file instanceof TFile)) return null;
					return {
						...entry,
						file,
					};
				})
				.filter((entry): entry is Combatant => Boolean(entry))
			: [];
		session.combatants = restoredCombatants;
		session.boardBackground = session.boardBackground || this.settings.boardDefaultBackground;
		session.boardGridEnabled = typeof session.boardGridEnabled === "boolean" ? session.boardGridEnabled : this.settings.boardGridEnabled;
		session.boardSnapToGrid = typeof session.boardSnapToGrid === "boolean" ? session.boardSnapToGrid : this.settings.boardSnapToGrid;
		session.boardGridSize = session.boardGridSize || this.settings.boardGridSize;
		this.session = session;

		// Migration: convert legacy comma-separated conditions string to ConditionEntry[]
		if (typeof this.settings.conditions === "string") {
			this.settings.conditions = (this.settings.conditions as unknown as string)
				.split(",")
				.map(s => s.trim())
				.filter(Boolean)
				.map(name => ({ name, color: "" }));
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.persistData();
	}
}
