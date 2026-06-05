import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import BattleTrackerPlugin from "./main";
import { ActiveCondition, CombatAlert, Combatant } from "./types";
import { LOCALIZATION } from "./localization";
import { ActionModal, ConditionModal, DmgModal, NoteModal, PickCombatantsModal } from "./modals";

export const VIEW_TYPE = "combat-ledger-view";
export const PLAYER_VIEW_TYPE = "combat-ledger-player-view";

interface DamageResult {
	finalDamage: number;
	absorbedByShield: number;
	defeated: boolean;
	healed: number;
}

interface TurnTimerState {
	totalMs: number;
	remainingMs: number;
	expired: boolean;
	progress: number;
}

export class BattleTrackerView extends ItemView {
	plugin: BattleTrackerPlugin;
	turnTimerInterval: number | null = null;
	mode: "gm" | "player";
	lastTimerExpiredFor: string | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: BattleTrackerPlugin, mode: "gm" | "player") {
		super(leaf);
		this.plugin = plugin;
		this.mode = mode;
	}

	getViewType() {
		return this.mode === "player" ? PLAYER_VIEW_TYPE : VIEW_TYPE;
	}

	getDisplayText() {
		return this.mode === "player" ? "Combat Ledger Player" : "Combat Ledger";
	}

	getIcon() {
		return this.mode === "player" ? "monitor-up" : "sword";
	}

	get combatants() { return this.plugin.session.combatants; }
	set combatants(value: Combatant[]) { this.plugin.session.combatants = value; }
	get round() { return this.plugin.session.round; }
	set round(value: number) { this.plugin.session.round = value; }
	get activeCombatantId() { return this.plugin.session.activeCombatantId; }
	set activeCombatantId(value: string | null) { this.plugin.session.activeCombatantId = value; }
	get editingInitiativeId() { return this.plugin.session.editingInitiativeId; }
	set editingInitiativeId(value: string | null) { this.plugin.session.editingInitiativeId = value; }
	get graveyardExpanded() { return this.plugin.session.graveyardExpanded; }
	set graveyardExpanded(value: boolean) { this.plugin.session.graveyardExpanded = value; }
	get graveyardAssignedXp() { return this.plugin.session.graveyardAssignedXp; }
	set graveyardAssignedXp(value: number) { this.plugin.session.graveyardAssignedXp = value; }
	get graveyardXpDraft() { return this.plugin.session.graveyardXpDraft; }
	set graveyardXpDraft(value: string | null) { this.plugin.session.graveyardXpDraft = value; }
	get turnTimerStartedAt() { return this.plugin.session.turnTimerStartedAt; }
	set turnTimerStartedAt(value: number) { this.plugin.session.turnTimerStartedAt = value; }
	get turnTimerCombatantId() { return this.plugin.session.turnTimerCombatantId; }
	set turnTimerCombatantId(value: string | null) { this.plugin.session.turnTimerCombatantId = value; }
	get boardBackground() { return this.plugin.session.boardBackground; }
	set boardBackground(value: string) { this.plugin.session.boardBackground = value; }
	get boardGridEnabled() { return this.plugin.session.boardGridEnabled; }
	set boardGridEnabled(value: boolean) { this.plugin.session.boardGridEnabled = value; }
	get boardSnapToGrid() { return this.plugin.session.boardSnapToGrid; }
	set boardSnapToGrid(value: boolean) { this.plugin.session.boardSnapToGrid = value; }
	get boardGridSize() { return this.plugin.session.boardGridSize; }
	set boardGridSize(value: number) { this.plugin.session.boardGridSize = value; }
	get tokenStates() { return this.plugin.session.tokenStates; }
	set tokenStates(value: Record<string, { x: number; y: number; hidden: boolean; scale: number }>) { this.plugin.session.tokenStates = value; }
	get selectedTokenIds() { return this.plugin.session.selectedTokenIds; }
	set selectedTokenIds(value: string[]) { this.plugin.session.selectedTokenIds = value; }
	get activeLogFile() { return this.plugin.session.activeLogFile; }
	set activeLogFile(value: TFile | null) { this.plugin.session.activeLogFile = value; }
	get logDismissed() { return this.plugin.session.logDismissed; }
	set logDismissed(value: boolean) { this.plugin.session.logDismissed = value; }
	get logQueue() { return this.plugin.session.logQueue; }
	set logQueue(value: string[]) { this.plugin.session.logQueue = value; }
	get logSetupInProgress() { return this.plugin.session.logSetupInProgress; }
	set logSetupInProgress(value: boolean) { this.plugin.session.logSetupInProgress = value; }
	get alerts() { return this.plugin.session.alerts; }
	set alerts(value: CombatAlert[]) { this.plugin.session.alerts = value; }

	async onOpen() {
		this.render();
	}

	refresh() {
		this.plugin.scheduleSessionSave();
		this.plugin.refreshViews();
	}

	pushAlert(type: CombatAlert["type"], message: string) {
		const now = Date.now();
		this.alerts = [
			...this.alerts.filter((alert) => now - alert.createdAt < 8000),
			{ id: `${type}-${now}-${Math.random().toString(36).slice(2, 8)}`, type, message, createdAt: now },
		];
	}

	getVisibleAlerts(): CombatAlert[] {
		const now = Date.now();
		const visible = this.alerts.filter((alert) => now - alert.createdAt < 8000);
		if (visible.length !== this.alerts.length) {
			this.alerts = visible;
		}
		return visible;
	}

	resolveAvatarSrc(combatant: Combatant): string {
		const value = combatant.avatar?.trim();
		if (!value) return "";
		if (/^(https?:)?\/\//.test(value)) return value;
		const vaultFile = this.app.vault.getAbstractFileByPath(value);
		if (vaultFile instanceof TFile) {
			return this.app.vault.getResourcePath(vaultFile);
		}
		return value;
	}

	resolveBackgroundSrc(background: string): string {
		const value = background.trim();
		if (!value) return "";
		if (/^(https?:)?\/\//.test(value)) return value;
		const vaultFile = this.app.vault.getAbstractFileByPath(value);
		if (vaultFile instanceof TFile) {
			return this.app.vault.getResourcePath(vaultFile);
		}
		return value;
	}

	applyAvatar(avatarEl: HTMLElement, combatant: Combatant) {
		const avatarSrc = this.resolveAvatarSrc(combatant);
		avatarEl.empty();
		if (avatarSrc) {
			avatarEl.addClass("bt-avatar-image");
			avatarEl.style.backgroundImage = `url("${avatarSrc}")`;
			avatarEl.style.backgroundSize = "cover";
			avatarEl.style.backgroundPosition = "center";
			return;
		}

		avatarEl.removeClass("bt-avatar-image");
		avatarEl.style.backgroundImage = "";
		avatarEl.setText((combatant.icon || combatant.name.slice(0, 2)).toUpperCase());
	}

	async toggleFullscreen() {
		const target = this.containerEl.closest(".workspace-leaf-content") ?? this.containerEl;
		if (document.fullscreenElement) {
			await document.exitFullscreen();
			return;
		}
		if (target instanceof HTMLElement && target.requestFullscreen) {
			await target.requestFullscreen();
		}
	}

	ensureTokenState(combatant: Combatant, index: number) {
		if (this.tokenStates[combatant.id]) return this.tokenStates[combatant.id];
		const columns = 4;
		const spacing = this.boardGridSize || 64;
		const tokenState = {
			x: 40 + (index % columns) * (spacing + 20),
			y: 40 + Math.floor(index / columns) * (spacing + 20),
			hidden: false,
			scale: 1,
		};
		this.tokenStates = { ...this.tokenStates, [combatant.id]: tokenState };
		return tokenState;
	}

	updateTokenState(id: string, patch: Partial<{ x: number; y: number; hidden: boolean; scale: number }>) {
		const current = this.tokenStates[id] ?? { x: 40, y: 40, hidden: false, scale: 1 };
		this.tokenStates = {
			...this.tokenStates,
			[id]: { ...current, ...patch },
		};
	}

	centerTokens() {
		const alive = this.aliveSorted();
		alive.forEach((combatant, index) => {
			const columns = Math.max(2, Math.ceil(Math.sqrt(alive.length || 1)));
			const spacing = this.boardGridSize || 64;
			this.updateTokenState(combatant.id, {
				x: 40 + (index % columns) * (spacing + 24),
				y: 40 + Math.floor(index / columns) * (spacing + 24),
			});
		});
		this.refresh();
	}

	saveBoardLayout() {
		const name = window.prompt(LOCALIZATION[this.plugin.settings.language].boardSavePrompt);
		if (!name?.trim()) return;
		const layoutName = name.trim();
		const layouts = this.plugin.settings.savedBoardLayouts.filter((layout) => layout.name !== layoutName);
		layouts.push({
			name: layoutName,
			background: this.boardBackground,
			gridEnabled: this.boardGridEnabled,
			snapToGrid: this.boardSnapToGrid,
			gridSize: this.boardGridSize,
			tokenStates: this.tokenStates,
		});
		this.plugin.settings.savedBoardLayouts = layouts;
		void this.plugin.saveSettings();
	}

	loadBoardLayout() {
		if (!this.plugin.settings.savedBoardLayouts.length) {
			new Notice(LOCALIZATION[this.plugin.settings.language].boardNoLayouts);
			return;
		}
		const name = window.prompt(LOCALIZATION[this.plugin.settings.language].boardLoadPrompt);
		if (!name?.trim()) return;
		const layout = this.plugin.settings.savedBoardLayouts.find((entry) => entry.name === name.trim());
		if (!layout) return;
		this.boardBackground = layout.background;
		this.boardGridEnabled = layout.gridEnabled;
		this.boardSnapToGrid = layout.snapToGrid;
		this.boardGridSize = layout.gridSize;
		this.tokenStates = { ...layout.tokenStates };
		this.refresh();
	}

	clearBoardLayout() {
		this.boardBackground = this.plugin.settings.boardDefaultBackground;
		this.boardGridEnabled = this.plugin.settings.boardGridEnabled;
		this.boardSnapToGrid = this.plugin.settings.boardSnapToGrid;
		this.boardGridSize = this.plugin.settings.boardGridSize;
		this.tokenStates = {};
		this.selectedTokenIds = [];
		this.centerTokens();
	}

	async writeToLog(actionText: string) {
		if (!this.plugin.settings.logEnabled) return;
		if (this.logDismissed) return;

		if (!this.activeLogFile) {
			this.logQueue.push(actionText);
			if (!this.logSetupInProgress) {
				this.triggerLogSetup();
			}
			return;
		}

		const lang = this.plugin.settings.language;
		const now = new Date();
		const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
		const prefix = `[${timeStr}] (${lang === "es" ? "Ronda" : "Round"} ${this.round})`;
		const logLine = `- ${prefix} ${actionText}`;

		try {
			const file = this.activeLogFile;
			const content = await this.app.vault.read(file);
			const lines = content.split("\n");

			const targetHeader = this.plugin.settings.logHeader.trim();
			const headerRegex = /^(#+)\s+(.*)$/;
			const targetMatch = targetHeader.match(headerRegex);

			if (targetMatch) {
				const targetLevel = targetMatch[1].length;
				const targetName = targetMatch[2].trim().toLowerCase();
				let headerIndex = -1;

				for (let i = 0; i < lines.length; i++) {
					const match = lines[i].match(headerRegex);
					if (match && match[2].trim().toLowerCase() === targetName) {
						headerIndex = i;
						break;
					}
				}

				if (headerIndex !== -1) {
					let insertIndex = lines.length;
					for (let i = headerIndex + 1; i < lines.length; i++) {
						const match = lines[i].match(headerRegex);
						if (!match) continue;
						const level = match[1].length;
						if (level <= targetLevel) {
							insertIndex = i;
							break;
						}
					}

					lines.splice(insertIndex, 0, logLine);
					await this.app.vault.modify(file, lines.join("\n"));
					return;
				}
			}

			const newContent = content.trimEnd() + `\n\n${targetHeader}\n${logLine}\n`;
			await this.app.vault.modify(file, newContent);
		} catch (e) {
			console.error("Error writing to combat log:", e);
			new Notice(lang === "es" ? "Error al escribir en el registro de combate." : "Error writing to combat log.");
		}
	}

	triggerLogSetup() {
		if (this.activeLogFile || this.logDismissed || this.logSetupInProgress) return;

		this.logSetupInProgress = true;
		const { LogSetupModal } = require("./modals");
		new LogSetupModal(this.app, this.plugin, this, async (file: TFile | null) => {
			this.logSetupInProgress = false;
			if (file) {
				this.activeLogFile = file;
				this.logDismissed = false;
				const lang = this.plugin.settings.language;
				const startMsg = LOCALIZATION[lang].logStarted;
				const currentQueue = [startMsg, ...this.logQueue];
				this.logQueue = [];
				for (const msg of currentQueue) {
					await this.writeToLog(msg);
				}
			} else {
				this.logDismissed = true;
				this.logQueue = [];
			}
			this.refresh();
		}).open();
	}

	async createNewLogFile(): Promise<TFile> {
		const folderPath = this.plugin.settings.logFolder.trim();
		if (folderPath) {
			const folderExists = this.app.vault.getAbstractFileByPath(folderPath);
			if (!folderExists) {
				await this.app.vault.createFolder(folderPath);
			}
		}

		const now = new Date();
		const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
		let fileName = this.plugin.settings.logFileName.replace("{date}", dateStr);
		if (!fileName.endsWith(".md")) fileName += ".md";

		const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
		let uniquePath = fullPath;
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(uniquePath)) {
			uniquePath = fullPath.replace(/\.md$/, ` (${counter}).md`);
			counter++;
		}

		const header = this.plugin.settings.logHeader;
		return await this.app.vault.create(uniquePath, `# ${fileName.replace(/\.md$/, "")}\n\n${header}\n`);
	}

	parseConditionToken(token: unknown): ActiveCondition | null {
		if (typeof token === "string") {
			const match = token.match(/^(.*?)(?:\s*\((\d+)\))?$/);
			if (!match) return null;
			const name = match[1].trim();
			if (!name) return null;
			const duration = match[2] ? Number(match[2]) : null;
			return { name, duration: duration && duration > 0 ? duration : null };
		}

		if (token && typeof token === "object") {
			const maybe = token as { name?: unknown; duration?: unknown };
			if (typeof maybe.name !== "string" || !maybe.name.trim()) return null;
			const durationValue = Number(maybe.duration);
			return {
				name: maybe.name.trim(),
				duration: Number.isFinite(durationValue) && durationValue > 0 ? durationValue : null,
			};
		}

		return null;
	}

	parseStoredConditions(raw: unknown): ActiveCondition[] {
		if (Array.isArray(raw)) {
			return raw
				.map((entry) => this.parseConditionToken(entry))
				.filter((entry): entry is ActiveCondition => Boolean(entry));
		}

		if (typeof raw === "string") {
			return raw
				.split(",")
				.map((entry) => this.parseConditionToken(entry.trim()))
				.filter((entry): entry is ActiveCondition => Boolean(entry));
		}

		const single = this.parseConditionToken(raw);
		return single ? [single] : [];
	}

	serializeConditions(conditions: ActiveCondition[]): string[] {
		return conditions.map((entry) => entry.duration ? `${entry.name} (${entry.duration})` : entry.name);
	}

	formatConditionLabel(condition: ActiveCondition): string {
		return condition.duration ? `${condition.name} · ${condition.duration}` : condition.name;
	}

	async fileToCombatant(file: TFile): Promise<Combatant> {
		const f = this.plugin.settings.fields;
		const meta = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};

		const extraNames = f.extra_fields
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		const extraFields: Record<string, number> = {};
		for (const key of extraNames) {
			if (meta[key] !== undefined) extraFields[key] = Number(meta[key]) || 0;
		}

		const hpMax = Number(meta[f.hp_max] ?? meta[f.hp] ?? 10) || 10;
		const hp = Number(meta[f.hp] ?? hpMax) || hpMax;
		const shield = f.shield ? Number(meta[f.shield] ?? 0) || 0 : 0;
		const xp = f.xp ? Number(meta[f.xp] ?? 0) || 0 : 0;
		const avatar = f.avatar ? String(meta[f.avatar] ?? "") : "";
		const icon = f.icon ? String(meta[f.icon] ?? "") : "";
		const storedConditions = f.conditions ? this.parseStoredConditions(meta[f.conditions]) : [];

		return {
			id: file.path,
			name: file.basename,
			initiative: Number(meta[f.initiative] ?? 0) || 0,
			hp,
			hpMax,
			shield,
			xp,
			avatar,
			icon,
			ac: Number(meta[f.ac] ?? 10) || 10,
			combatType: String(meta[f.type] ?? "NPC"),
			extraFields,
			conditions: storedConditions,
			notes: "",
			alive: hp > 0,
			file,
		};
	}

	shouldSyncCombatant(combatant: Combatant): boolean {
		if (!this.plugin.settings.realtimeSync) return false;
		if (this.plugin.settings.realtimeSyncMode === "all") return true;
		return combatant.combatType === "PC";
	}

	async syncCombatantToNote(combatant: Combatant) {
		if (!this.shouldSyncCombatant(combatant)) return;

		const fields = this.plugin.settings.fields;
		try {
			await this.app.fileManager.processFrontMatter(combatant.file, (frontmatter) => {
				frontmatter[fields.hp] = combatant.hp;
				if (fields.initiative) frontmatter[fields.initiative] = combatant.initiative;
				if (fields.shield) frontmatter[fields.shield] = combatant.shield;
				if (fields.xp) frontmatter[fields.xp] = combatant.xp;
				if (fields.conditions) frontmatter[fields.conditions] = this.serializeConditions(combatant.conditions);

				Object.entries(combatant.extraFields).forEach(([key, value]) => {
					frontmatter[key] = value;
				});
			});
		} catch (error) {
			console.error("Failed to sync combatant note:", error);
			new Notice(this.plugin.settings.language === "es" ? `No se pudo sincronizar ${combatant.name}.` : `Could not sync ${combatant.name}.`);
		}
	}

	async syncXpToNote(combatant: Combatant) {
		const xpField = this.plugin.settings.fields.xp;
		if (!xpField) return;

		try {
			await this.app.fileManager.processFrontMatter(combatant.file, (frontmatter) => {
				frontmatter[xpField] = combatant.xp;
			});
		} catch (error) {
			console.error("Failed to sync combatant XP:", error);
			new Notice(this.plugin.settings.language === "es" ? `No se pudo sincronizar la XP de ${combatant.name}.` : `Could not sync ${combatant.name}'s XP.`);
		}
	}

	ensureActiveCombatant() {
		const alive = this.aliveSorted();
		if (!alive.length) {
			this.activeCombatantId = null;
			this.setupTurnTimer();
			return;
		}
		if (!this.activeCombatantId || !alive.some((combatant) => combatant.id === this.activeCombatantId)) {
			this.activeCombatantId = alive[0].id;
			this.setupTurnTimer(true);
			return;
		}
		this.setupTurnTimer();
	}

	sorted(): Combatant[] {
		return [...this.combatants].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
	}

	aliveSorted(): Combatant[] {
		return this.sorted().filter((combatant) => combatant.alive);
	}

	deadSorted(): Combatant[] {
		return this.sorted().filter((combatant) => !combatant.alive);
	}

	pcCombatants(): Combatant[] {
		return this.combatants.filter((combatant) => combatant.combatType === "PC");
	}

	getDefeatedXpTotal(): number {
		return this.deadSorted().reduce((sum, combatant) => sum + Math.max(0, combatant.xp || 0), 0);
	}

	getPendingGraveyardXp(): number {
		return Math.max(0, this.getDefeatedXpTotal() - this.graveyardAssignedXp);
	}

	getTurnTimerState(): TurnTimerState | null {
		if (!this.plugin.settings.turnTimerEnabled || !this.activeCombatantId) return null;
		const totalMs = Math.max(5, this.plugin.settings.turnTimerSeconds) * 1000;
		if (!this.turnTimerStartedAt) {
			return {
				totalMs,
				remainingMs: totalMs,
				expired: false,
				progress: 1,
			};
		}

		const elapsed = Date.now() - this.turnTimerStartedAt;
		const remainingMs = Math.max(0, totalMs - elapsed);
		if (remainingMs <= 0 && this.activeCombatantId && this.lastTimerExpiredFor !== this.activeCombatantId) {
			this.lastTimerExpiredFor = this.activeCombatantId;
			this.pushAlert("timer", LOCALIZATION[this.plugin.settings.language].alertTimerExpired);
		}
		if (remainingMs > 0) {
			this.lastTimerExpiredFor = null;
		}
		return {
			totalMs,
			remainingMs,
			expired: remainingMs <= 0,
			progress: totalMs > 0 ? remainingMs / totalMs : 0,
		};
	}

	getCurrentTurnIndex(alive = this.aliveSorted()): number {
		if (!alive.length || !this.activeCombatantId) return 0;
		const index = alive.findIndex((combatant) => combatant.id === this.activeCombatantId);
		return index >= 0 ? index : 0;
	}

	getCombatant(id: string): Combatant | undefined {
		return this.combatants.find((combatant) => combatant.id === id);
	}

	clearTurnTimer() {
		if (this.turnTimerInterval !== null) {
			window.clearInterval(this.turnTimerInterval);
			this.turnTimerInterval = null;
		}
	}

	setupTurnTimer(reset = false) {
		if (!this.plugin.settings.turnTimerEnabled || !this.activeCombatantId) {
			this.turnTimerCombatantId = null;
			this.turnTimerStartedAt = 0;
			this.clearTurnTimer();
			return;
		}

		if (reset || this.turnTimerCombatantId !== this.activeCombatantId) {
			this.turnTimerCombatantId = this.activeCombatantId;
			this.turnTimerStartedAt = Date.now();
			this.lastTimerExpiredFor = null;
		}

		if (this.turnTimerInterval === null) {
			this.turnTimerInterval = window.setInterval(() => {
				if (!this.plugin.settings.turnTimerEnabled || !this.activeCombatantId) {
					this.clearTurnTimer();
					return;
				}
				this.refresh();
			}, 1000);
		}
	}

	async processConditionDurations(combatant: Combatant) {
		if (!combatant.conditions.length) return;
		const lang = this.plugin.settings.language;
		const retained: ActiveCondition[] = [];
		let changed = false;

		for (const condition of combatant.conditions) {
			if (condition.duration == null) {
				retained.push(condition);
				continue;
			}

			const nextDuration = condition.duration - 1;
			changed = true;
			if (nextDuration <= 0) {
				this.pushAlert("condition", `${LOCALIZATION[lang].alertConditionExpired}: ${condition.name}`);
				await this.writeToLog(lang === "es"
					? `${combatant.name} pierde la condición por expiración: ${condition.name}`
					: `${combatant.name} loses condition by expiration: ${condition.name}`);
				continue;
			}

			retained.push({ ...condition, duration: nextDuration });
		}

		if (changed) {
			combatant.conditions = retained;
			await this.syncCombatantToNote(combatant);
		}
	}

	async nextTurn() {
		const alive = this.aliveSorted();
		if (!alive.length) return;

		this.ensureActiveCombatant();
		const currentIndex = this.getCurrentTurnIndex(alive);
		const nextIndex = (currentIndex + 1) % alive.length;
		if (nextIndex === 0) this.round++;
		this.activeCombatantId = alive[nextIndex].id;
		this.setupTurnTimer(true);

		const currentCombatant = alive[nextIndex];
		await this.processConditionDurations(currentCombatant);
		this.pushAlert("turn", `${LOCALIZATION[this.plugin.settings.language].alertTurnStart} ${currentCombatant.name}`);
		await this.writeToLog(this.plugin.settings.language === "es"
			? `Turno de ${currentCombatant.name}`
			: `Turn of ${currentCombatant.name}`);

		this.refresh();
	}

	async markCombatantDefeated(combatant: Combatant, message?: string) {
		combatant.alive = false;
		combatant.hp = 0;
		await this.syncCombatantToNote(combatant);
		await this.writeToLog(message ?? (this.plugin.settings.language === "es"
			? `${combatant.name} ha sido derrotado`
			: `${combatant.name} has been defeated`));
		this.pushAlert("defeat", `${LOCALIZATION[this.plugin.settings.language].alertDefeated}: ${combatant.name}`);
		this.graveyardXpDraft = String(this.getPendingGraveyardXp());
		this.ensureActiveCombatant();
	}

	getGraveyardAwardAmount(): number {
		const pending = this.getPendingGraveyardXp();
		if (this.graveyardXpDraft == null || this.graveyardXpDraft.trim() === "") return pending;
		return Math.max(0, Number(this.graveyardXpDraft) || 0);
	}

	async awardXp(amount: number, recipients: Combatant[], split: boolean) {
		const lang = this.plugin.settings.language;
		const normalizedAmount = Math.max(0, Math.floor(amount));
		if (!normalizedAmount) {
			new Notice(lang === "es" ? "No hay XP para repartir." : "There is no XP to award.");
			return;
		}

		if (!recipients.length) {
			new Notice(lang === "es" ? "No hay PCs cargados para recibir XP." : "There are no loaded PCs to receive XP.");
			return;
		}

		if (split) {
			const baseAmount = Math.floor(normalizedAmount / recipients.length);
			let remainder = normalizedAmount % recipients.length;
			const awarded: string[] = [];
			for (const recipient of recipients) {
				const xpDelta = baseAmount + (remainder > 0 ? 1 : 0);
				if (remainder > 0) remainder--;
				if (xpDelta <= 0) continue;
				recipient.xp += xpDelta;
				await this.syncXpToNote(recipient);
				await this.syncCombatantToNote(recipient);
				awarded.push(`${recipient.name} +${xpDelta} XP`);
			}
			this.graveyardAssignedXp += normalizedAmount;
			this.graveyardXpDraft = String(this.getPendingGraveyardXp());
			await this.writeToLog(lang === "es"
				? `XP repartida desde el cementerio: ${awarded.join(", ")}`
				: `XP awarded from the graveyard: ${awarded.join(", ")}`);
		} else {
			const recipient = recipients[0];
			recipient.xp += normalizedAmount;
			this.graveyardAssignedXp += normalizedAmount;
			this.graveyardXpDraft = String(this.getPendingGraveyardXp());
			await this.syncXpToNote(recipient);
			await this.syncCombatantToNote(recipient);
			await this.writeToLog(lang === "es"
				? `${recipient.name} recibe ${normalizedAmount} XP desde el cementerio`
				: `${recipient.name} receives ${normalizedAmount} XP from the graveyard`);
		}

		this.refresh();
	}

	applyDamage(combatant: Combatant, amount: number, heal: boolean, useShield: boolean): DamageResult {
		if (heal) {
			const previous = combatant.hp;
			combatant.hp = Math.min(combatant.hpMax, combatant.hp + amount);
			if (combatant.hp > 0) combatant.alive = true;
			return {
				finalDamage: 0,
				absorbedByShield: 0,
				defeated: false,
				healed: combatant.hp - previous,
			};
		}

		let remaining = Math.max(0, amount);
		let absorbedByShield = 0;
		if (useShield && combatant.shield > 0) {
			absorbedByShield = Math.min(combatant.shield, remaining);
			combatant.shield -= absorbedByShield;
			remaining -= absorbedByShield;
		}

		combatant.hp = Math.max(0, combatant.hp - remaining);
		if (combatant.hp === 0) combatant.alive = false;

		return {
			finalDamage: remaining,
			absorbedByShield,
			defeated: combatant.hp === 0,
			healed: 0,
		};
	}

	async applyDmg(id: string, amount: number, heal: boolean, useShield: boolean) {
		const combatant = this.getCombatant(id);
		if (!combatant) return;

		const lang = this.plugin.settings.language;
		const result = this.applyDamage(combatant, amount, heal, useShield);
		if (heal) {
			await this.writeToLog(lang === "es"
				? `${combatant.name} se cura ${result.healed} PV (PV: ${combatant.hp}/${combatant.hpMax})`
				: `${combatant.name} heals ${result.healed} HP (HP: ${combatant.hp}/${combatant.hpMax})`);
		} else {
			const shieldText = result.absorbedByShield > 0
				? lang === "es"
					? `, ${result.absorbedByShield} absorbidos por escudo`
					: `, ${result.absorbedByShield} absorbed by shield`
				: "";
			await this.writeToLog(lang === "es"
				? `${combatant.name} recibe ${result.finalDamage} de daño${shieldText} (PV: ${combatant.hp}/${combatant.hpMax})`
				: `${combatant.name} takes ${result.finalDamage} damage${shieldText} (HP: ${combatant.hp}/${combatant.hpMax})`);
			if (result.defeated) {
				await this.markCombatantDefeated(combatant);
				this.refresh();
				return;
			}
		}

		await this.syncCombatantToNote(combatant);
		this.ensureActiveCombatant();
		this.refresh();
	}

	async setInitiative(id: string, initiative: number) {
		const combatant = this.getCombatant(id);
		if (!combatant) return;
		combatant.initiative = initiative;
		this.editingInitiativeId = null;
		await this.syncCombatantToNote(combatant);
		await this.writeToLog(this.plugin.settings.language === "es"
			? `${combatant.name} cambia su iniciativa a ${initiative}`
			: `${combatant.name} changes initiative to ${initiative}`);
		this.ensureActiveCombatant();
		this.refresh();
	}

	async updateConditions(id: string, updated: ActiveCondition[]) {
		const combatant = this.getCombatant(id);
		if (!combatant) return;
		const lang = this.plugin.settings.language;

		const oldMap = new Map(combatant.conditions.map((condition) => [condition.name, condition.duration]));
		const newMap = new Map(updated.map((condition) => [condition.name, condition.duration]));

		combatant.conditions = updated;

		for (const condition of updated) {
			if (!oldMap.has(condition.name)) {
				await this.writeToLog(lang === "es"
					? `${combatant.name} obtiene la condición: ${this.formatConditionLabel(condition)}`
					: `${combatant.name} gains condition: ${this.formatConditionLabel(condition)}`);
			} else if (oldMap.get(condition.name) !== condition.duration) {
				await this.writeToLog(lang === "es"
					? `${combatant.name} actualiza la duración de ${condition.name} a ${condition.duration ?? "∞"}`
					: `${combatant.name} updates ${condition.name} duration to ${condition.duration ?? "∞"}`);
			}
		}

		for (const [name] of oldMap.entries()) {
			if (!newMap.has(name)) {
				await this.writeToLog(lang === "es"
					? `${combatant.name} pierde la condición: ${name}`
					: `${combatant.name} loses condition: ${name}`);
			}
		}

		await this.syncCombatantToNote(combatant);
		this.refresh();
	}

	async modExtra(id: string, key: string, delta: number) {
		const combatant = this.getCombatant(id);
		if (!combatant) return;
		combatant.extraFields[key] = Math.max(0, (combatant.extraFields[key] ?? 0) + delta);
		await this.syncCombatantToNote(combatant);
		await this.writeToLog(this.plugin.settings.language === "es"
			? `${combatant.name} - ${key.toUpperCase()} modificado a ${combatant.extraFields[key]}`
			: `${combatant.name} - ${key.toUpperCase()} modified to ${combatant.extraFields[key]}`);
		this.refresh();
	}

	async removeCombatant(id: string) {
		const combatant = this.getCombatant(id);
		if (combatant) {
			await this.writeToLog(this.plugin.settings.language === "es"
				? `${combatant.name} retirado del combate`
				: `${combatant.name} removed from combat`);
		}
		this.combatants = this.combatants.filter((entry) => entry.id !== id);
		if (this.activeCombatantId === id) this.activeCombatantId = null;
		this.ensureActiveCombatant();
		this.refresh();
	}

	resetBattle() {
		void this.writeToLog(LOCALIZATION[this.plugin.settings.language].logEnded);
		this.combatants = [];
		this.round = 1;
		this.activeCombatantId = null;
		this.activeLogFile = null;
		this.logDismissed = false;
		this.logQueue = [];
		this.editingInitiativeId = null;
		this.graveyardAssignedXp = 0;
		this.graveyardXpDraft = null;
		this.turnTimerStartedAt = 0;
		this.turnTimerCombatantId = null;
		this.boardBackground = this.plugin.settings.boardDefaultBackground;
		this.boardGridEnabled = this.plugin.settings.boardGridEnabled;
		this.boardSnapToGrid = this.plugin.settings.boardSnapToGrid;
		this.boardGridSize = this.plugin.settings.boardGridSize;
		this.tokenStates = {};
		this.selectedTokenIds = [];
		this.alerts = [];
		this.clearTurnTimer();
		this.refresh();
	}

	async applyAction(attackerId: string, payload: {
		targetId: string;
		damage: number;
		useShield: boolean;
		conditionName: string;
		conditionDuration: number | null;
		note: string;
	}) {
		const attacker = this.getCombatant(attackerId);
		const target = this.getCombatant(payload.targetId);
		if (!attacker || !target) return;

		const lang = this.plugin.settings.language;
		const result = payload.damage > 0
			? this.applyDamage(target, payload.damage, false, payload.useShield)
			: { finalDamage: 0, absorbedByShield: 0, defeated: false, healed: 0 };

		if (payload.conditionName) {
			const existing = target.conditions.find((condition) => condition.name === payload.conditionName);
			if (existing) existing.duration = payload.conditionDuration;
			else target.conditions.push({ name: payload.conditionName, duration: payload.conditionDuration });
		}

		const parts: string[] = [];
		if (payload.damage > 0) {
			parts.push(lang === "es"
				? `le inflige ${result.finalDamage} de daño`
				: `deals ${result.finalDamage} damage`);
			if (result.absorbedByShield > 0) {
				parts.push(lang === "es"
					? `${result.absorbedByShield} absorbidos por escudo`
					: `${result.absorbedByShield} absorbed by shield`);
			}
		}
		if (payload.conditionName) {
			parts.push(lang === "es"
				? `aplica ${payload.conditionName}${payload.conditionDuration ? ` (${payload.conditionDuration})` : ""}`
				: `applies ${payload.conditionName}${payload.conditionDuration ? ` (${payload.conditionDuration})` : ""}`);
		}
		if (payload.note) parts.push(payload.note);

		const actionVerb = lang === "es" ? "ataca a" : "attacks";
		const suffix = parts.length ? ` ${lang === "es" ? "y" : "and"} ${parts.join(", ")}` : "";
		await this.writeToLog(lang === "es"
			? `${attacker.name} ${actionVerb} ${target.name}${suffix}.`
			: `${attacker.name} ${actionVerb} ${target.name}${suffix}.`);

		if (result.defeated) {
			await this.markCombatantDefeated(target);
		} else {
			await this.syncCombatantToNote(target);
		}

		this.ensureActiveCombatant();
		this.refresh();
	}

	async loadFromVault() {
		const folder = this.plugin.settings.combatantFolder.trim();
		const lang = this.plugin.settings.language;
		let files: TFile[];

		if (folder) {
			const folderObj = this.app.vault.getAbstractFileByPath(folder);
			if (!folderObj) {
				new Notice(lang === "es" ? `Carpeta "${folder}" no encontrada.` : `Folder "${folder}" not found.`);
				return;
			}
			files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(folder + "/"));
		} else {
			new PickCombatantsModal(this.app, this.plugin, async (picked) => {
				const loaded = await Promise.all(picked.map((file) => this.fileToCombatant(file)));
				for (const combatant of loaded) {
					if (!this.combatants.find((entry) => entry.id === combatant.id)) {
						this.combatants.push(combatant);
					}
				}
				this.ensureActiveCombatant();
				for (const combatant of loaded) {
					await this.writeToLog(lang === "es"
						? `Combatiente cargado: ${combatant.name} (Iniciativa: ${combatant.initiative}, PV: ${combatant.hp}/${combatant.hpMax})`
						: `Combatant loaded: ${combatant.name} (Initiative: ${combatant.initiative}, HP: ${combatant.hp}/${combatant.hpMax})`);
				}
				this.refresh();
				if (this.combatants.length > 0) this.triggerLogSetup();
			}).open();
			return;
		}

		const loaded = await Promise.all(files.map((file) => this.fileToCombatant(file)));
		for (const combatant of loaded) {
			if (!this.combatants.find((entry) => entry.id === combatant.id)) {
				this.combatants.push(combatant);
			}
		}
		this.ensureActiveCombatant();

		for (const combatant of loaded) {
			await this.writeToLog(lang === "es"
				? `Combatiente cargado: ${combatant.name} (Iniciativa: ${combatant.initiative}, PV: ${combatant.hp}/${combatant.hpMax})`
				: `Combatant loaded: ${combatant.name} (Initiative: ${combatant.initiative}, HP: ${combatant.hp}/${combatant.hpMax})`);
		}

		this.refresh();
		if (this.combatants.length > 0) this.triggerLogSetup();
	}

	render() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.className = `bt-panel${this.mode === "player" ? " bt-panel-player" : ""}`;

		const lang = this.plugin.settings.language;
		const t = LOCALIZATION[lang];
		const conditionEntries = this.plugin.settings.conditions;
		const alive = this.aliveSorted();
		const dead = this.deadSorted();
		this.ensureActiveCombatant();
		if (this.graveyardXpDraft == null) {
			this.graveyardXpDraft = String(this.getPendingGraveyardXp());
		}
		const activeIndex = this.getCurrentTurnIndex(alive);
		const timerState = this.getTurnTimerState();
		const visibleAlerts = this.getVisibleAlerts();

		const topBar = container.createDiv("bt-topbar");
		topBar.createDiv("bt-round-badge", (el) => el.setText(`${t.round} ${this.round}`));
		if (this.mode === "player") {
			const playerMeta = topBar.createDiv("bt-player-header");
			playerMeta.createDiv("bt-player-title").setText(t.playerViewTitle);
			playerMeta.createDiv("bt-player-subtitle").setText(t.playerViewSubtitle);
		}

		if (timerState) {
			const timerWrap = topBar.createDiv("bt-turn-timer");
			const activeName = this.getCombatant(this.activeCombatantId ?? "")?.name ?? "";
			timerWrap.createDiv("bt-turn-timer-label").setText(
				timerState.expired
					? `${t.graveyardExpiredTurn}${activeName ? ` · ${activeName}` : ""}`
					: `${activeName} · ${Math.ceil(timerState.remainingMs / 1000)}s`,
			);
			const timerBar = timerWrap.createDiv("bt-turn-timer-bar");
			const timerFill = timerBar.createDiv(`bt-turn-timer-fill${timerState.expired ? " expired" : ""}`);
			timerFill.style.width = `${Math.max(0, timerState.progress * 100)}%`;
		}

		const topActions = topBar.createDiv("bt-top-actions");
		const fullBtn = topActions.createEl("button", { cls: "bt-btn" });
		fullBtn.setText(t.fullscreen);
		fullBtn.onclick = () => void this.toggleFullscreen();

		if (this.mode === "gm") {
			const nextBtn = topActions.createEl("button", { cls: "bt-btn bt-btn-primary" });
			nextBtn.innerHTML = t.nextTurn;
			nextBtn.onclick = () => void this.nextTurn();

			const loadBtn = topActions.createEl("button", { cls: "bt-btn" });
			loadBtn.innerHTML = t.load;
			loadBtn.onclick = () => void this.loadFromVault();

			const playerBtn = topActions.createEl("button", { cls: "bt-btn" });
			playerBtn.setText(t.playerView);
			playerBtn.onclick = () => void this.plugin.activatePlayerView();

			if (this.plugin.settings.logEnabled) {
				const logBtn = topActions.createEl("button", {
					cls: `bt-btn${this.activeLogFile ? " bt-btn-primary" : ""}`,
					title: t.logSelectLogFileButton,
				});
				logBtn.innerHTML = `📝 ${this.activeLogFile ? (lang === "es" ? "Registrando" : "Logging") : (lang === "es" ? "Registro" : "Log")}`;
				logBtn.onclick = () => this.triggerLogSetup();
			}

			const resetBtn = topActions.createEl("button", { cls: "bt-btn bt-btn-danger-soft" });
			resetBtn.innerHTML = t.reset;
			resetBtn.onclick = () => {
				if (confirm(t.resetConfirm)) this.resetBattle();
			};
		}

		if (visibleAlerts.length) {
			const alertsWrap = container.createDiv("bt-alerts");
			visibleAlerts.slice().reverse().forEach((alert) => {
				alertsWrap.createDiv(`bt-alert bt-alert-${alert.type}`).setText(alert.message);
			});
		}

		const boardSection = container.createDiv("bt-board-section");
		if (this.mode === "gm") {
			const boardControls = boardSection.createDiv("bt-board-controls");
			boardControls.createEl("span", { cls: "bt-label", text: t.boardTitle });

			const centerBtn = boardControls.createEl("button", { cls: "bt-btn" });
			centerBtn.setText(t.boardCenter);
			centerBtn.onclick = () => this.centerTokens();

			const saveBtn = boardControls.createEl("button", { cls: "bt-btn" });
			saveBtn.setText(t.boardSave);
			saveBtn.onclick = () => this.saveBoardLayout();

			const loadLayoutBtn = boardControls.createEl("button", { cls: "bt-btn" });
			loadLayoutBtn.setText(t.boardLoad);
			loadLayoutBtn.onclick = () => this.loadBoardLayout();

			const clearLayoutBtn = boardControls.createEl("button", { cls: "bt-btn" });
			clearLayoutBtn.setText(t.boardClear);
			clearLayoutBtn.onclick = () => this.clearBoardLayout();

			const backgroundInput = boardControls.createEl("input", {
				cls: "bt-board-background-input",
				type: "text",
				placeholder: t.boardBackground,
			}) as HTMLInputElement;
			backgroundInput.value = this.boardBackground;
			backgroundInput.onchange = () => {
				this.boardBackground = backgroundInput.value.trim();
				this.refresh();
			};
		}

		const board = boardSection.createDiv(`bt-board${this.boardGridEnabled ? " has-grid" : ""}`);
		const backgroundSrc = this.resolveBackgroundSrc(this.boardBackground);
		if (backgroundSrc) {
			board.style.backgroundImage = `url("${backgroundSrc}")`;
		}
		board.style.setProperty("--bt-grid-size", `${this.boardGridSize}px`);

		alive.forEach((combatant, index) => {
			const tokenState = this.ensureTokenState(combatant, index);
			if (this.mode === "player" && tokenState.hidden) return;

			const token = board.createDiv(`bt-token${combatant.id === this.activeCombatantId ? " active" : ""}${tokenState.hidden ? " is-hidden" : ""}${this.selectedTokenIds.includes(combatant.id) ? " is-selected" : ""}`);
			token.style.left = `${tokenState.x}px`;
			token.style.top = `${tokenState.y}px`;
			token.style.transform = `scale(${tokenState.scale})`;
			token.title = combatant.name;

			const avatar = token.createDiv(`bt-token-avatar bt-avatar-${combatant.combatType === "PC" ? "pc" : combatant.combatType === "Enemy" ? "enemy" : "npc"}`);
			this.applyAvatar(avatar, combatant);

			token.createDiv("bt-token-name").setText(combatant.name);

			if (combatant.conditions.length) {
				const conditionList = token.createDiv("bt-token-conditions");
				combatant.conditions.forEach((condition) => {
					const cond = conditionList.createDiv("bt-token-condition");
					cond.setText(this.formatConditionLabel(condition));
				});
			}

			if (this.mode === "gm") {
				token.onmousedown = (evt) => {
					if (evt.button !== 0) return;
					evt.preventDefault();
					this.selectedTokenIds = evt.metaKey || evt.ctrlKey
						? Array.from(new Set([...this.selectedTokenIds, combatant.id]))
						: [combatant.id];
					const boardRect = board.getBoundingClientRect();
					const startX = evt.clientX;
					const startY = evt.clientY;
					const selectedIds = [...this.selectedTokenIds];
					const starts = selectedIds.map((id) => ({
						id,
						x: this.tokenStates[id]?.x ?? 0,
						y: this.tokenStates[id]?.y ?? 0,
					}));

					const move = (moveEvt: MouseEvent) => {
						const dx = moveEvt.clientX - startX;
						const dy = moveEvt.clientY - startY;
						starts.forEach((start) => {
							let nextX = Math.max(0, start.x + dx);
							let nextY = Math.max(0, start.y + dy);
							if (this.boardSnapToGrid) {
								const grid = this.boardGridSize || 64;
								nextX = Math.round(nextX / grid) * grid;
								nextY = Math.round(nextY / grid) * grid;
							}
							this.updateTokenState(start.id, {
								x: Math.min(nextX, Math.max(0, boardRect.width - 80)),
								y: Math.min(nextY, Math.max(0, boardRect.height - 80)),
							});
						});
						this.refresh();
					};

					const up = () => {
						window.removeEventListener("mousemove", move);
						window.removeEventListener("mouseup", up);
					};

					window.addEventListener("mousemove", move);
					window.addEventListener("mouseup", up);
				};

				token.onclick = (evt) => {
					evt.stopPropagation();
					if (evt.metaKey || evt.ctrlKey) {
						this.selectedTokenIds = this.selectedTokenIds.includes(combatant.id)
							? this.selectedTokenIds.filter((id) => id !== combatant.id)
							: [...this.selectedTokenIds, combatant.id];
					} else {
						this.selectedTokenIds = [combatant.id];
					}
					this.refresh();
				};

				const tools = token.createDiv("bt-token-tools");
				const hideBtn = tools.createEl("button", { cls: "bt-token-tool" });
				hideBtn.setText(tokenState.hidden ? t.boardReveal : t.boardHide);
				hideBtn.onclick = (evt) => {
					evt.stopPropagation();
					this.updateTokenState(combatant.id, { hidden: !tokenState.hidden });
					this.refresh();
				};
			}
		});

		if (this.mode === "gm") {
			board.onclick = () => {
				this.selectedTokenIds = [];
				this.refresh();
			};
		}

		if (alive.length) {
			const strip = container.createDiv("bt-init-strip");
			alive.forEach((combatant, index) => {
				const chip = strip.createDiv(`bt-init-chip${index === activeIndex ? " active" : ""}`);
				chip.setText(`${combatant.name} (${combatant.initiative})`);
			});
		}

		if (!this.combatants.length) {
			const empty = container.createDiv("bt-empty");
			empty.createEl("p", { text: t.emptyState });
			return;
		}

		alive.forEach((combatant) => {
			const isActive = combatant.id === this.activeCombatantId;
			const ratio = combatant.hpMax > 0 ? combatant.hp / combatant.hpMax : 0;
			const card = container.createDiv(`bt-card${isActive ? " bt-card-active" : ""}${this.mode === "player" ? " bt-card-player" : ""}`);

			const header = card.createDiv("bt-card-header");
			const avatar = header.createDiv(`bt-avatar bt-avatar-${combatant.combatType === "PC" ? "pc" : combatant.combatType === "Enemy" ? "enemy" : "npc"}`);
			this.applyAvatar(avatar, combatant);

			const nameWrap = header.createDiv("bt-name-wrap");
			const nameEl = nameWrap.createEl("span", { cls: "bt-name", text: combatant.name });
			if (this.mode === "gm") {
				nameEl.style.cursor = "pointer";
				nameEl.title = lang === "es" ? "Abrir nota" : "Open note";
				nameEl.onclick = () => void this.app.workspace.getLeaf(true).openFile(combatant.file);
			}

			const metaRow = nameWrap.createDiv("bt-sub bt-init-edit-row");
			if (this.mode === "gm" && this.editingInitiativeId === combatant.id) {
				const initInput = metaRow.createEl("input", {
					cls: "bt-init-edit-input",
					type: "number",
				}) as HTMLInputElement;
				initInput.value = String(combatant.initiative);
				const commit = () => void this.setInitiative(combatant.id, parseInt(initInput.value) || 0);
				initInput.onblur = commit;
				initInput.onkeydown = (evt) => {
					if (evt.key === "Enter") commit();
					if (evt.key === "Escape") {
						this.editingInitiativeId = null;
						this.refresh();
					}
				};
				setTimeout(() => {
					initInput.focus();
					initInput.select();
				}, 0);
			} else {
				const initText = metaRow.createEl("span", { text: `${t.init} ${combatant.initiative} · ${t.ac} ${combatant.ac}` });
				if (this.mode === "gm") {
					initText.ondblclick = () => {
						this.editingInitiativeId = combatant.id;
						this.refresh();
					};
				}
				if (combatant.shield > 0) {
					metaRow.createEl("span", { cls: "bt-sub-shield", text: `${t.shield} ${combatant.shield}` });
				}
				if (combatant.xp > 0) {
					metaRow.createEl("span", { cls: "bt-sub-shield", text: `${t.xp} ${combatant.xp}` });
				}
			}

			const badge = header.createDiv(`bt-badge bt-badge-${combatant.combatType === "PC" ? "pc" : combatant.combatType === "Enemy" ? "enemy" : "npc"}`);
			badge.setText(combatant.combatType);

			if (this.mode === "gm") {
				const initEditBtn = header.createEl("button", { cls: "bt-btn-icon", title: t.editInitiative });
				initEditBtn.setText("✎");
				initEditBtn.onclick = () => {
					this.editingInitiativeId = combatant.id;
					this.refresh();
				};

				const removeBtn = header.createEl("button", { cls: "bt-btn-icon", title: t.removeTitle });
				removeBtn.setText("✕");
				removeBtn.onclick = () => void this.removeCombatant(combatant.id);
			}

			if (combatant.conditions.length) {
				const condRow = card.createDiv("bt-cond-row");
				combatant.conditions.forEach((condition) => {
					const tag = condRow.createDiv("bt-cond-tag");
					tag.setText(this.formatConditionLabel(condition));
					const entry = conditionEntries.find((item) => item.name === condition.name);
					if (entry?.color) {
						tag.style.color = entry.color;
						tag.style.borderColor = entry.color;
						tag.style.backgroundColor = entry.color + "22";
					}
				});
			}

			const hpWrap = card.createDiv("bt-hp-wrap");
			const hpLabelRow = hpWrap.createDiv("bt-hp-label-row");
			hpLabelRow.createEl("span", { text: t.hp, cls: "bt-label" });
			const hpVisible = this.mode === "gm" || this.plugin.settings.playerViewShowHp;
			hpLabelRow.createEl("span", { cls: "bt-hp-text", text: hpVisible ? `${combatant.hp} / ${combatant.hpMax}` : "•••" });

			const bar = hpWrap.createDiv("bt-bar");
			const fill = bar.createDiv("bt-bar-fill");
			fill.style.width = `${Math.max(0, ratio * 100)}%`;
			fill.className = `bt-bar-fill ${ratio > 0.6 ? "bt-hp-ok" : ratio > 0.3 ? "bt-hp-mid" : "bt-hp-low"}`;

			const extraNames = Object.keys(combatant.extraFields);
			if (this.mode === "gm" && extraNames.length) {
				const extraRow = card.createDiv("bt-extra-row");
				extraNames.forEach((key) => {
					const box = extraRow.createDiv("bt-extra-box");
					box.createEl("span", { cls: "bt-label", text: key.toUpperCase() });
					const valRow = box.createDiv("bt-extra-val-row");
					const minusBtn = valRow.createEl("button", { cls: "bt-btn-mini", text: "−" });
					minusBtn.onclick = () => void this.modExtra(combatant.id, key, -1);
					valRow.createEl("span", { cls: "bt-extra-val", text: String(combatant.extraFields[key]) });
					const plusBtn = valRow.createEl("button", { cls: "bt-btn-mini", text: "+" });
					plusBtn.onclick = () => void this.modExtra(combatant.id, key, 1);
				});
			}

			if (this.mode === "gm" && combatant.notes) {
				card.createEl("p", { cls: "bt-notes", text: combatant.notes });
			}

			if (this.mode === "gm") {
				const actions = card.createDiv("bt-actions");

				const dmgBtn = actions.createEl("button", { cls: "bt-btn bt-btn-danger-soft" });
				dmgBtn.setText(t.damageHeal);
				dmgBtn.onclick = () => new DmgModal(this.app, combatant.name, this.plugin, combatant.shield > 0, (value, heal, useShield) => {
					void this.applyDmg(combatant.id, value, heal, useShield);
				}).open();

				const condBtn = actions.createEl("button", { cls: "bt-btn" });
				condBtn.setText(t.status);
				condBtn.onclick = () => new ConditionModal(this.app, conditionEntries, combatant.conditions, this.plugin, (updated) => {
					void this.updateConditions(combatant.id, updated);
				}).open();

				const noteBtn = actions.createEl("button", { cls: "bt-btn" });
				noteBtn.setText(t.note);
				noteBtn.onclick = () => new NoteModal(this.app, combatant.notes, this.plugin, (text) => {
					combatant.notes = text;
					void this.writeToLog(lang === "es"
						? `${combatant.name} - Nota: ${text || "vaciada"}`
						: `${combatant.name} - Note: ${text || "cleared"}`);
					this.refresh();
				}).open();

				if (isActive && alive.length > 1) {
					const actionBtn = actions.createEl("button", { cls: "bt-btn bt-btn-primary" });
					actionBtn.setText(t.action);
					actionBtn.onclick = () => new ActionModal(
						this.app,
						combatant,
						alive.filter((entry) => entry.id !== combatant.id),
						conditionEntries,
						this.plugin,
						(payload) => void this.applyAction(combatant.id, payload),
					).open();
				}

				const defeatBtn = actions.createEl("button", { cls: "bt-btn bt-btn-ghost" });
				defeatBtn.setText(t.defeat);
				defeatBtn.onclick = async () => {
					await this.markCombatantDefeated(combatant);
					this.refresh();
				};
			}
		});

		if (this.mode === "player") return;

		const graveyard = container.createEl("details", {
			cls: "bt-graveyard",
		}) as HTMLDetailsElement;
		graveyard.open = this.graveyardExpanded;
		graveyard.ontoggle = () => {
			this.graveyardExpanded = graveyard.open;
		};

		const graveyardSummary = graveyard.createEl("summary", { cls: "bt-graveyard-summary" });
		graveyardSummary.setText(`${t.graveyardTitle} (${dead.length})`);

		if (!dead.length) {
			graveyard.createDiv("bt-graveyard-empty").setText(t.graveyardEmpty);
			return;
		}

		const xpPanel = graveyard.createDiv("bt-graveyard-xp-panel");
		xpPanel.createDiv("bt-graveyard-xp-stat").setText(`${t.xp}: ${this.getDefeatedXpTotal()}`);
		xpPanel.createDiv("bt-graveyard-xp-stat").setText(`${t.graveyardPendingXp}: ${this.getPendingGraveyardXp()}`);
		xpPanel.createDiv("bt-graveyard-xp-stat").setText(`${t.graveyardAssignedXp}: ${this.graveyardAssignedXp}`);

		const xpControls = graveyard.createDiv("bt-graveyard-controls");
		const xpInput = xpControls.createEl("input", {
			cls: "bt-graveyard-input",
			type: "number",
			placeholder: t.graveyardXpPlaceholder,
		}) as HTMLInputElement;
		xpInput.min = "0";
		xpInput.value = this.graveyardXpDraft ?? String(this.getPendingGraveyardXp());
		xpInput.onchange = () => {
			this.graveyardXpDraft = xpInput.value;
		};

		const pcs = this.pcCombatants();
		const splitBtn = xpControls.createEl("button", { cls: "bt-btn bt-btn-primary" });
		splitBtn.setText(t.graveyardDistributeAll);
		splitBtn.onclick = () => void this.awardXp(this.getGraveyardAwardAmount(), pcs, true);

		pcs.forEach((pc) => {
			const giveBtn = xpControls.createEl("button", { cls: "bt-btn" });
			giveBtn.setText(`${t.graveyardGiveTo} ${pc.name}`);
			giveBtn.onclick = () => void this.awardXp(this.getGraveyardAwardAmount(), [pc], false);
		});

		dead.forEach((combatant) => {
			const card = graveyard.createDiv("bt-card bt-card-dead bt-graveyard-card");
			const header = card.createDiv("bt-card-header");
			const avatar = header.createDiv(`bt-avatar bt-avatar-${combatant.combatType === "PC" ? "pc" : combatant.combatType === "Enemy" ? "enemy" : "npc"}`);
			this.applyAvatar(avatar, combatant);

			const nameWrap = header.createDiv("bt-name-wrap");
			nameWrap.createEl("span", { cls: "bt-name", text: combatant.name });
			nameWrap.createEl("span", {
				cls: "bt-sub",
				text: `${t.xp} ${combatant.xp} · ${t.init} ${combatant.initiative} · ${t.ac} ${combatant.ac}`,
			});

			const reviveBtn = header.createEl("button", { cls: "bt-btn", title: t.revive });
			reviveBtn.setText(t.revive);
			reviveBtn.onclick = async () => {
				combatant.alive = true;
				combatant.hp = Math.max(1, combatant.hpMax > 0 ? 1 : combatant.hp);
				await this.syncCombatantToNote(combatant);
				await this.writeToLog(lang === "es" ? `${combatant.name} ha resucitado` : `${combatant.name} has been revived`);
				this.graveyardXpDraft = String(this.getPendingGraveyardXp());
				this.ensureActiveCombatant();
				this.refresh();
			};
		});
	}

	async onClose() {
		this.clearTurnTimer();
	}
}
