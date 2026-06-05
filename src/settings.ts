import { App, PluginSettingTab, Setting } from "obsidian";
import BattleTrackerPlugin from "./main";
import { BattleTrackerSettings, ConditionEntry } from "./types";
import { LOCALIZATION } from "./localization";

export const DEFAULT_CONDITIONS_ES: ConditionEntry[] = [
	{ name: "Aturdido",       color: "#f59e0b" },
	{ name: "Envenenado",     color: "#22c55e" },
	{ name: "Paralizado",     color: "#a855f7" },
	{ name: "Asustado",       color: "#f97316" },
	{ name: "Invisible",      color: "#94a3b8" },
	{ name: "Concentración",  color: "#3b82f6" },
	{ name: "Maldito",        color: "#9333ea" },
	{ name: "Quemando",       color: "#ef4444" },
	{ name: "Caído",          color: "#78716c" },
	{ name: "Cegado",         color: "#1e293b" },
];

export const DEFAULT_CONDITIONS_EN: ConditionEntry[] = [
	{ name: "Stunned",        color: "#f59e0b" },
	{ name: "Poisoned",       color: "#22c55e" },
	{ name: "Paralyzed",      color: "#a855f7" },
	{ name: "Frightened",     color: "#f97316" },
	{ name: "Invisible",      color: "#94a3b8" },
	{ name: "Concentration",  color: "#3b82f6" },
	{ name: "Cursed",         color: "#9333ea" },
	{ name: "Burning",        color: "#ef4444" },
	{ name: "Prone",          color: "#78716c" },
	{ name: "Blinded",        color: "#1e293b" },
];

export const DEFAULT_SETTINGS: BattleTrackerSettings = {
	language: "es",
	fields: {
		initiative: "initiative",
		hp: "hp",
		hp_max: "hp_max",
		shield: "shield",
		xp: "xp",
		avatar: "avatar",
		icon: "icon",
		ac: "ac",
		type: "type",
		extra_fields: "mp,stamina",
		conditions: "conditions",
	},
	conditions: DEFAULT_CONDITIONS_ES,
	combatantFolder: "",
	realtimeSync: false,
	realtimeSyncMode: "pc",
	shieldAbsorbsDamage: true,
	turnTimerEnabled: false,
	turnTimerSeconds: 60,
	playerViewShowHp: false,
	boardGridEnabled: true,
	boardSnapToGrid: false,
	boardGridSize: 64,
	boardDefaultBackground: "",
	savedBoardLayouts: [],
	logEnabled: true,
	logMode: "ask",
	logHeader: "## Registro de Combate",
	logFileName: "Registro de Combate {date}",
	logFolder: "",
};

export class BattleTrackerSettingTab extends PluginSettingTab {
	plugin: BattleTrackerPlugin;

	constructor(app: App, plugin: BattleTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		this.renderSettings();
	}

	private addHeading(containerEl: HTMLElement, name: string, desc?: string) {
		new Setting(containerEl).setName(name).setHeading();
		if (desc) {
			containerEl.createEl("p", { text: desc, cls: "setting-item-description" });
		}
	}

	private renderSettings() {
		const { containerEl } = this;
		containerEl.empty();

		const lang = this.plugin.settings.language;
		const t = LOCALIZATION[lang];

		this.addHeading(containerEl, t.settingsTitle);

		// Language Setting
		new Setting(containerEl)
			.setName(t.settingsLanguageName)
			.setDesc(t.settingsLanguageDesc)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("es", "Español")
					.addOption("en", "English")
					.setValue(this.plugin.settings.language)
					.onChange(async (value: "es" | "en") => {
						const oldLang = this.plugin.settings.language;
						if (oldLang === value) return;

						// Automatically switch condition defaults if they were unchanged
						const currentNames = this.plugin.settings.conditions.map(c => c.name).join(",");
						const esNames = DEFAULT_CONDITIONS_ES.map(c => c.name).join(",");
						const enNames = DEFAULT_CONDITIONS_EN.map(c => c.name).join(",");

						if (currentNames === esNames || currentNames === enNames) {
							this.plugin.settings.conditions = value === "es" ? [...DEFAULT_CONDITIONS_ES] : [...DEFAULT_CONDITIONS_EN];
						}

						const esHeader = "## Registro de Combate";
						const enHeader = "## Combat Log";
						if (this.plugin.settings.logHeader === esHeader || this.plugin.settings.logHeader === enHeader) {
							this.plugin.settings.logHeader = value === "es" ? esHeader : enHeader;
						}

						const esFile = "Registro de Combate {date}";
						const enFile = "Combat Log {date}";
						if (this.plugin.settings.logFileName === esFile || this.plugin.settings.logFileName === enFile) {
							this.plugin.settings.logFileName = value === "es" ? esFile : enFile;
						}

						this.plugin.settings.language = value;
						await this.plugin.saveSettings();

						// Re-render setting tab
						this.renderSettings();

						this.plugin.refreshViews();
					})
			);

		this.addHeading(containerEl, t.settingsFieldsTitle, t.settingsFieldsDesc);

		const f = this.plugin.settings.fields;

		new Setting(containerEl)
			.setName(t.settingsInitName)
			.setDesc(t.settingsInitDesc)
			.addText((text) => text.setValue(f.initiative).onChange(async (v) => { f.initiative = v; await this.plugin.saveSettings(); }));
			
		new Setting(containerEl)
			.setName(t.settingsHpName)
			.setDesc(t.settingsHpDesc)
			.addText((text) => text.setValue(f.hp).onChange(async (v) => { f.hp = v; await this.plugin.saveSettings(); }));
			
		new Setting(containerEl)
			.setName(t.settingsHpMaxName)
			.setDesc(t.settingsHpMaxDesc)
			.addText((text) => text.setValue(f.hp_max).onChange(async (v) => { f.hp_max = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName(t.settingsShieldName)
			.setDesc(t.settingsShieldDesc)
			.addText((text) => text.setValue(f.shield).onChange(async (v) => { f.shield = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName(t.settingsXpName)
			.setDesc(t.settingsXpDesc)
			.addText((text) => text.setValue(f.xp).onChange(async (v) => { f.xp = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName(t.settingsAvatarName)
			.setDesc(t.settingsAvatarDesc)
			.addText((text) => text.setValue(f.avatar).onChange(async (v) => { f.avatar = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName(t.settingsIconName)
			.setDesc(t.settingsIconDesc)
			.addText((text) => text.setValue(f.icon).onChange(async (v) => { f.icon = v; await this.plugin.saveSettings(); }));
			
		new Setting(containerEl)
			.setName(t.settingsAcName)
			.setDesc(t.settingsAcDesc)
			.addText((text) => text.setValue(f.ac).onChange(async (v) => { f.ac = v; await this.plugin.saveSettings(); }));
			
		new Setting(containerEl)
			.setName(t.settingsTypeName)
			.setDesc(t.settingsTypeDesc)
			.addText((text) => text.setValue(f.type).onChange(async (v) => { f.type = v; await this.plugin.saveSettings(); }));
			
		new Setting(containerEl)
			.setName(t.settingsExtraName)
			.setDesc(t.settingsExtraDesc)
			.addText((text) => text.setValue(f.extra_fields).onChange(async (v) => { f.extra_fields = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName(t.settingsConditionsFieldName)
			.setDesc(t.settingsConditionsFieldDesc)
			.addText((text) => text.setValue(f.conditions).onChange(async (v) => { f.conditions = v; await this.plugin.saveSettings(); }));

		this.addHeading(containerEl, t.settingsRealtimeTitle);
		new Setting(containerEl)
			.setName(t.settingsRealtimeSyncName)
			.setDesc(t.settingsRealtimeSyncDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.realtimeSync)
					.onChange(async (v) => {
						this.plugin.settings.realtimeSync = v;
						await this.plugin.saveSettings();
						this.renderSettings();
					})
			);

		if (this.plugin.settings.realtimeSync) {
			new Setting(containerEl)
				.setName(t.settingsRealtimeModeName)
				.setDesc(t.settingsRealtimeModeDesc)
				.addDropdown((dropdown) =>
					dropdown
						.addOption("pc", t.settingsRealtimeModePc)
						.addOption("all", t.settingsRealtimeModeAll)
						.setValue(this.plugin.settings.realtimeSyncMode)
						.onChange(async (value: "pc" | "all") => {
							this.plugin.settings.realtimeSyncMode = value;
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl)
			.setName(t.settingsShieldAbsorbName)
			.setDesc(t.settingsShieldAbsorbDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.shieldAbsorbsDamage)
					.onChange(async (v) => {
						this.plugin.settings.shieldAbsorbsDamage = v;
						await this.plugin.saveSettings();
					})
			);

		this.addHeading(containerEl, t.settingsTimerTitle);
		new Setting(containerEl)
			.setName(t.settingsTimerEnabledName)
			.setDesc(t.settingsTimerEnabledDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.turnTimerEnabled)
					.onChange(async (v) => {
						this.plugin.settings.turnTimerEnabled = v;
						await this.plugin.saveSettings();
						this.renderSettings();
						this.refreshView();
					})
			);

		if (this.plugin.settings.turnTimerEnabled) {
			new Setting(containerEl)
				.setName(t.settingsTimerSecondsName)
				.setDesc(t.settingsTimerSecondsDesc)
				.addText((text) =>
					text
						.setPlaceholder("60")
						.setValue(String(this.plugin.settings.turnTimerSeconds))
						.onChange(async (v) => {
							const seconds = Math.max(5, Number(v) || 60);
							this.plugin.settings.turnTimerSeconds = seconds;
							await this.plugin.saveSettings();
							this.refreshView();
						})
				);
		}

		new Setting(containerEl)
			.setName(t.settingsPlayerHpName)
			.setDesc(t.settingsPlayerHpDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.playerViewShowHp)
					.onChange(async (v) => {
						this.plugin.settings.playerViewShowHp = v;
						await this.plugin.saveSettings();
						this.refreshView();
					})
			);

		this.addHeading(containerEl, t.settingsBoardTitle);
		new Setting(containerEl)
			.setName(t.settingsBoardGridName)
			.setDesc(t.settingsBoardGridDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.boardGridEnabled)
					.onChange(async (v) => {
						this.plugin.settings.boardGridEnabled = v;
						await this.plugin.saveSettings();
						this.refreshView();
					})
			);

		new Setting(containerEl)
			.setName(t.settingsBoardSnapName)
			.setDesc(t.settingsBoardSnapDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.boardSnapToGrid)
					.onChange(async (v) => {
						this.plugin.settings.boardSnapToGrid = v;
						await this.plugin.saveSettings();
						this.refreshView();
					})
			);

		new Setting(containerEl)
			.setName(t.settingsBoardGridSizeName)
			.setDesc(t.settingsBoardGridSizeDesc)
			.addText((text) =>
				text
					.setPlaceholder("64")
					.setValue(String(this.plugin.settings.boardGridSize))
					.onChange(async (v) => {
						this.plugin.settings.boardGridSize = Math.max(24, Number(v) || 64);
						await this.plugin.saveSettings();
						this.refreshView();
					})
			);

		new Setting(containerEl)
			.setName(t.settingsBoardBackgroundName)
			.setDesc(t.settingsBoardBackgroundDesc)
			.addText((text) =>
				text
					.setPlaceholder("https://... o Assets/mapa.png")
					.setValue(this.plugin.settings.boardDefaultBackground)
					.onChange(async (v) => {
						this.plugin.settings.boardDefaultBackground = v.trim();
						await this.plugin.saveSettings();
						this.refreshView();
					})
			);

		// ── Conditions / States ───────────────────────────────────────────────
		this.addHeading(containerEl, t.settingsCondTitle, t.settingsCondColorDesc);

		const condListEl = containerEl.createDiv("bt-settings-cond-list");
		this.renderConditionRows(condListEl, t);

		this.addHeading(containerEl, t.settingsFolderTitle);
		new Setting(containerEl)
			.setName(t.settingsFolderFieldName)
			.setDesc(t.settingsFolderFieldDesc)
			.addText((text) =>
				text
					.setPlaceholder("Campaña/Criaturas")
					.setValue(this.plugin.settings.combatantFolder)
					.onChange(async (v) => {
						this.plugin.settings.combatantFolder = v;
						await this.plugin.saveSettings();
					})
			);

		// Logging Section in Settings
		this.addHeading(containerEl, t.logTitle);
		
		new Setting(containerEl)
			.setName(t.logEnabledName)
			.setDesc(t.logEnabledDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.logEnabled)
					.onChange(async (v) => {
						this.plugin.settings.logEnabled = v;
						await this.plugin.saveSettings();
						this.renderSettings();
					})
			);
			
		if (this.plugin.settings.logEnabled) {
			new Setting(containerEl)
				.setName(t.logHeaderName)
				.setDesc(t.logHeaderDesc)
				.addText((text) =>
					text
						.setPlaceholder(t.logHeaderPlaceholder)
						.setValue(this.plugin.settings.logHeader)
						.onChange(async (v) => {
							this.plugin.settings.logHeader = v;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName(t.logFileNameName)
				.setDesc(t.logFileNameDesc)
				.addText((text) =>
					text
						.setValue(this.plugin.settings.logFileName)
						.onChange(async (v) => {
							this.plugin.settings.logFileName = v;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName(lang === "es" ? "Carpeta de notas de registro" : "Folder for log notes")
				.setDesc(lang === "es" ? "Ruta de la carpeta donde se crearán las nuevas notas de registro (ej. Logs). Déjalo vacío para el directorio raíz." : "Path of the folder where new log notes will be created (e.g. Logs). Leave empty for root.")
				.addText((text) =>
					text
						.setPlaceholder("Logs")
						.setValue(this.plugin.settings.logFolder)
						.onChange(async (v) => {
							this.plugin.settings.logFolder = v;
							await this.plugin.saveSettings();
						})
				);
		}
	}

	// ── Render condition rows ──────────────────────────────────────────────────

	renderConditionRows(condListEl: HTMLElement, t: typeof LOCALIZATION["es"]) {
		condListEl.empty();

		const conditions = this.plugin.settings.conditions;

		conditions.forEach((entry, idx) => {
			const row = condListEl.createDiv("bt-settings-cond-row");

			// Color preview badge (text + border in that color, semi-transparent bg)
			const preview = row.createDiv("bt-settings-cond-preview");
			this.applyCondPreviewStyle(preview, entry.color);
			preview.setText(entry.name.slice(0, 2).toUpperCase() || "??");

			// Name input
			const nameInput = row.createEl("input", {
				cls: "bt-settings-cond-name",
				type: "text",
			});
			nameInput.value = entry.name;
			nameInput.placeholder = t.settingsCondNamePlaceholder;
			nameInput.addEventListener("change", () => {
				void (async () => {
					conditions[idx].name = nameInput.value.trim();
					preview.setText(conditions[idx].name.slice(0, 2).toUpperCase() || "??");
					await this.plugin.saveSettings();
					this.refreshView();
				})();
			});

			// Color label
			row.createEl("span", { cls: "bt-settings-color-label", text: t.settingsCondColorLabel });

			// Color picker
			const colorInput = row.createEl("input", {
				cls: "bt-settings-color-input",
				type: "color",
			});
			colorInput.value = entry.color || "#888888";
			colorInput.addEventListener("input", () => {
				void (async () => {
					conditions[idx].color = colorInput.value;
					this.applyCondPreviewStyle(preview, colorInput.value);
					await this.plugin.saveSettings();
					this.refreshView();
				})();
			});

			// Delete button
			const delBtn = row.createEl("button", {
				cls: "bt-settings-cond-del",
				text: t.settingsCondDeleteBtn,
			});
			delBtn.onclick = () => {
				void (async () => {
					conditions.splice(idx, 1);
					await this.plugin.saveSettings();
					this.renderConditionRows(condListEl, t);
					this.refreshView();
				})();
			};
		});

		// Add condition button
		const addBtn = condListEl.createEl("button", {
			cls: "bt-settings-cond-add",
			text: t.settingsCondAddBtn,
		});
		addBtn.onclick = () => {
			void (async () => {
				conditions.push({ name: "", color: "#888888" });
				await this.plugin.saveSettings();
				this.renderConditionRows(condListEl, t);
				const rows = condListEl.querySelectorAll(".bt-settings-cond-name");
				const lastRow = rows[rows.length - 1];
				if (lastRow?.instanceOf(HTMLInputElement)) lastRow.focus();
			})();
		};
	}

	applyCondPreviewStyle(el: HTMLElement, color: string) {
		const c = color || "var(--text-accent)";
		el.setCssProps({
			"color": c,
			"border-color": c,
			"background-color": color ? color + "22" : "transparent",
		});
	}

	refreshView() {
		this.plugin.refreshViews();
	}
}
