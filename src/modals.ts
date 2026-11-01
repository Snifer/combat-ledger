import { App, Modal, Notice, TFile } from "obsidian";
import BattleTrackerPlugin from "./main";
import { BattleTrackerView } from "./view";
import { LOCALIZATION } from "./localization";
import { ActiveCondition, Combatant, ConditionEntry } from "./types";

export class DmgModal extends Modal {
	name: string;
	plugin: BattleTrackerPlugin;
	hasShield: boolean;
	onConfirm: (val: number, heal: boolean, useShield: boolean) => void;

	constructor(app: App, name: string, plugin: BattleTrackerPlugin, hasShield: boolean, onConfirm: (val: number, heal: boolean, useShield: boolean) => void) {
		super(app);
		this.name = name;
		this.plugin = plugin;
		this.hasShield = hasShield;
		this.onConfirm = onConfirm;
	}

	handleHealing(value: number) {
		this.onConfirm(value, true, false);
		this.close();
	}

	handleDamage(value: number, useShield: boolean) {
		this.onConfirm(value, false, this.hasShield && useShield);
		this.close();
	}

	onOpen() {
		const { contentEl } = this;
		const lang = this.plugin.settings.language;
		const t = LOCALIZATION[lang];

		contentEl.createEl("h3", { text: `${t.dmgModalTitle} — ${this.name}` });
		const wrap = contentEl.createDiv("bt-modal-content");
		const input = wrap.createEl("input", { type: "number", placeholder: t.dmgModalQty });
		input.min = "0";

		const shieldRow = wrap.createDiv("bt-modal-checkbox-row");
		const shieldToggle = shieldRow.createEl("input", { type: "checkbox" });
		shieldToggle.checked = this.hasShield && this.plugin.settings.shieldAbsorbsDamage;
		shieldToggle.disabled = !this.hasShield;
		shieldRow.createEl("label", {
			text: this.hasShield ? t.dmgModalUseShield : t.dmgModalNoShield,
		});

		const row = wrap.createDiv("bt-modal-actions");
		const healBtn = row.createEl("button", { cls: "bt-btn", text: t.dmgModalHeal });
		healBtn.onclick = () => {
			this.handleHealing(parseInt(input.value) || 0);
		};

		const dmgBtn = row.createEl("button", { cls: "bt-btn bt-btn-danger-soft", text: t.dmgModalDmg });
		dmgBtn.onclick = () => {
			this.handleDamage(parseInt(input.value) || 0, shieldToggle.checked)
		};

    contentEl.addEventListener("keydown", (event: KeyboardEvent) => {
			if ((event.key === "Enter") || (event.key === "d")) {
				event.preventDefault();
				this.handleDamage(parseInt(input.value) || 0, shieldToggle.checked)
			} else if (event.key === "h") {
				event.preventDefault();
				this.handleHealing(parseInt(input.value) || 0);
			}
    });

		window.setTimeout(() => input.focus(), 50);
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class ConditionModal extends Modal {
	grid: HTMLDivElement;
	allConditions: ConditionEntry[];
	current: ActiveCondition[];
	plugin: BattleTrackerPlugin;
	onConfirm: (updated: ActiveCondition[]) => void;

	constructor(app: App, all: ConditionEntry[], current: ActiveCondition[], plugin: BattleTrackerPlugin, onConfirm: (u: ActiveCondition[]) => void) {
		super(app);
		this.allConditions = all;
		this.current = current.map((entry) => ({ ...entry }));
		this.plugin = plugin;
		this.onConfirm = onConfirm;
	}

	handleConfirm() {
		const updated: ActiveCondition[] = [];
		const rows = Array.from(this.grid.querySelectorAll(".bt-cond-edit-row"));
			rows.forEach((rowEl, idx) => {
				const checkNode = rowEl.querySelector("input[type='checkbox']");
				const durationNode = rowEl.querySelector(".bt-cond-duration-input");
				const check = checkNode?.instanceOf(HTMLInputElement) ? checkNode : null;
				const durationInput = durationNode?.instanceOf(HTMLInputElement) ? durationNode : null;
				const condition = this.allConditions[idx];
				if (!check?.checked || !condition) return;
				const parsedDuration = Number(durationInput?.value);
			updated.push({
				name: condition.name,
				duration: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null,
			});
		});
		this.onConfirm(updated);
		this.close();
	}

	onOpen() {
		const { contentEl } = this;
		const lang = this.plugin.settings.language;
		const t = LOCALIZATION[lang];

		contentEl.createEl("h3", { text: t.condModalTitle });
		this.grid = contentEl.createDiv("bt-cond-edit-grid");
		const selected = new Map(this.current.map((entry) => [entry.name, entry.duration]));

		this.allConditions.forEach((entry) => {
			const row = this.grid.createDiv("bt-cond-edit-row");
			const left = row.createDiv("bt-cond-edit-main");
			const check = left.createEl("input", { type: "checkbox" });
			check.checked = selected.has(entry.name);

			const btn = left.createEl("button", {
				cls: `bt-cond-toggle${check.checked ? " selected" : ""}`,
				text: entry.name,
			});

			const durationInput = row.createEl("input", {
				cls: "bt-cond-duration-input",
				type: "number",
				placeholder: t.condModalDurationPlaceholder,
			});
			durationInput.min = "1";
			const currentDuration = selected.get(entry.name);
			durationInput.value = currentDuration ? String(currentDuration) : "";
			durationInput.disabled = !check.checked;

			if (entry.color) {
				btn.setCssProps({
					"--bt-cond-toggle-color": check.checked ? "#fff" : entry.color,
					"--bt-cond-toggle-border": entry.color,
					"--bt-cond-toggle-background": check.checked ? entry.color : `${entry.color}22`,
				});
				btn.addClass("bt-cond-toggle-custom");
			}

			const updateVisual = () => {
				btn.classList.toggle("selected", check.checked);
				durationInput.disabled = !check.checked;
				if (!check.checked) durationInput.value = "";
				if (entry.color) {
					btn.setCssProps({
						"--bt-cond-toggle-color": check.checked ? "#fff" : entry.color,
						"--bt-cond-toggle-background": check.checked ? entry.color : `${entry.color}22`,
					});
				}
			};

			btn.onclick = () => {
				check.checked = !check.checked;
				updateVisual();
			};

			check.onchange = updateVisual;
		});

		const row = contentEl.createDiv("bt-modal-actions");
		const ok = row.createEl("button", { cls: "bt-btn bt-btn-primary", text: t.condModalApply });
		ok.onclick = () => {
			this.handleConfirm();
		};

    contentEl.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Enter") {
				event.preventDefault();
				this.handleConfirm();
			}
    });
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class NoteModal extends Modal {
	current: string;
	plugin: BattleTrackerPlugin;
	onConfirm: (txt: string) => void;

	constructor(app: App, current: string, plugin: BattleTrackerPlugin, onConfirm: (txt: string) => void) {
		super(app);
		this.current = current;
		this.plugin = plugin;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		const lang = this.plugin.settings.language;
		const t = LOCALIZATION[lang];

		contentEl.createEl("h3", { text: t.noteModalTitle });
		const wrap = contentEl.createDiv("bt-modal-content");
		const ta = wrap.createEl("textarea", { placeholder: t.noteModalPlaceholder });
		ta.value = this.current;
		const row = wrap.createDiv("bt-modal-actions");
		const ok = row.createEl("button", { cls: "bt-btn bt-btn-primary", text: t.noteModalSave });
		ok.onclick = () => {
			this.onConfirm(ta.value);
			this.close();
		};
		window.setTimeout(() => ta.focus(), 50);

    contentEl.addEventListener("keydown", (event: KeyboardEvent) => {
			if ((event.key === "Enter") && event.ctrlKey) {
				event.preventDefault();
				this.onConfirm(ta.value);
				this.close();
			}
    });
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class ActionModal extends Modal {
	attacker: Combatant;
	targets: Combatant[];
	conditions: ConditionEntry[];
	plugin: BattleTrackerPlugin;
	onConfirm: (payload: {
		targetId: string;
		damage: number;
		useShield: boolean;
		conditionName: string;
		conditionDuration: number | null;
		note: string;
	}) => void;

	constructor(app: App, attacker: Combatant, targets: Combatant[], conditions: ConditionEntry[], plugin: BattleTrackerPlugin, onConfirm: (payload: {
		targetId: string;
		damage: number;
		useShield: boolean;
		conditionName: string;
		conditionDuration: number | null;
		note: string;
	}) => void) {
		super(app);
		this.attacker = attacker;
		this.targets = targets;
		this.conditions = conditions;
		this.plugin = plugin;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		const lang = this.plugin.settings.language;
		const t = LOCALIZATION[lang];

		contentEl.createEl("h3", { text: `${t.actionModalTitle} — ${this.attacker.name}` });
		const wrap = contentEl.createDiv("bt-modal-content");

		const targetSelect = wrap.createEl("select");
		this.targets.forEach((target) => {
			targetSelect.createEl("option", {
				value: target.id,
				text: `${target.name} (${t.hp} ${target.hp}/${target.hpMax})`,
			});
		});

		const damageInput = wrap.createEl("input", {
			type: "number",
			placeholder: t.actionModalDamagePlaceholder,
		});
		damageInput.min = "0";

		const shieldRow = wrap.createDiv("bt-modal-checkbox-row");
		const shieldToggle = shieldRow.createEl("input", { type: "checkbox" });
		shieldToggle.checked = this.plugin.settings.shieldAbsorbsDamage;
		shieldRow.createEl("label", { text: t.actionModalShieldLabel });

		const conditionSelect = wrap.createEl("select");
		conditionSelect.createEl("option", { value: "", text: t.actionModalNoCondition });
		this.conditions.forEach((entry) => {
			conditionSelect.createEl("option", { value: entry.name, text: entry.name });
		});

		const durationInput = wrap.createEl("input", {
			type: "number",
			placeholder: t.condModalDurationPlaceholder,
		});
		durationInput.min = "1";

		const noteInput = wrap.createEl("textarea", {
			placeholder: t.actionModalNotePlaceholder,
		});

		const row = wrap.createDiv("bt-modal-actions");
		const ok = row.createEl("button", { cls: "bt-btn bt-btn-primary", text: t.actionModalApply });
		ok.onclick = () => {
			const parsedDuration = Number(durationInput.value);
			this.onConfirm({
				targetId: targetSelect.value,
				damage: parseInt(damageInput.value) || 0,
				useShield: shieldToggle.checked,
				conditionName: conditionSelect.value,
				conditionDuration: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null,
				note: noteInput.value.trim(),
			});
			this.close();
		};

    contentEl.addEventListener("keydown", (event: KeyboardEvent) => {
			if ((event.key === "Enter") && event.ctrlKey) {
				event.preventDefault();
				const parsedDuration = Number(durationInput.value);
				this.onConfirm({
					targetId: targetSelect.value,
					damage: parseInt(damageInput.value) || 0,
					useShield: shieldToggle.checked,
					conditionName: conditionSelect.value,
					conditionDuration: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null,
					note: noteInput.value.trim(),
				});
				this.close();
			}
    });

		window.setTimeout(() => targetSelect.focus(), 50);
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class PickCombatantsModal extends Modal {
	plugin: BattleTrackerPlugin;
	onConfirm: (files: TFile[]) => void;
	files: TFile[];
	selected: Set<string> = new Set();

	constructor(app: App, plugin: BattleTrackerPlugin, onConfirm: (files: TFile[]) => void) {
		super(app);
		this.plugin = plugin;
		this.onConfirm = onConfirm;
	}

	handleConfirm() {
		const picked = this.files.filter((f) => this.selected.has(f.path));
		if (!picked.length) {
			new Notice(LOCALIZATION[this.plugin.settings.language].pickModalSelectMin);
			return;
		}
		this.onConfirm(picked);
		this.close();
	}

	onOpen() {
		const { contentEl } = this;
		const lang = this.plugin.settings.language;
		const t = LOCALIZATION[lang];

		contentEl.createEl("h3", { text: t.pickModalTitle });

		const searchInput = contentEl.createEl("input", {
			type: "text",
			placeholder: t.pickModalSearch,
			cls: "bt-modal-content",
		});
		searchInput.addClass("bt-modal-search-input");

		const list = contentEl.createDiv("bt-pick-list");

		this.files = this.app.vault.getMarkdownFiles().sort((a, b) => a.basename.localeCompare(b.basename));

		const renderList = (filter: string) => {
			list.empty();
			this.files
				.filter((f) => !filter || f.basename.toLowerCase().includes(filter.toLowerCase()))
				.forEach((file) => {
					const item = list.createDiv("bt-pick-item");
					const cb = item.createEl("input", { type: "checkbox" });
					cb.checked = this.selected.has(file.path);
					cb.onchange = () => {
						if (cb.checked) this.selected.add(file.path);
						else this.selected.delete(file.path);
					};
					const lbl = item.createEl("label", { text: file.basename });
					lbl.onclick = () => {
						cb.checked = !cb.checked;
						cb.dispatchEvent(new Event("change"));
					};
				});
		};

		renderList("");
		searchInput.oninput = () => renderList(searchInput.value);

		const row = contentEl.createDiv("bt-modal-actions");
		const cancel = row.createEl("button", { cls: "bt-btn", text: t.pickModalCancel });
		cancel.onclick = () => this.close();
		const ok = row.createEl("button", { cls: "bt-btn bt-btn-primary", text: t.pickModalLoad });
		ok.onclick = () => {
			this.handleConfirm();
		};

    contentEl.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Enter") {
				event.preventDefault();
				this.handleConfirm();
			}
    });

		window.setTimeout(() => searchInput.focus(), 50);
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class LogSetupModal extends Modal {
	plugin: BattleTrackerPlugin;
	view: BattleTrackerView;
	onChoose: (file: TFile | null) => void;

	constructor(app: App, plugin: BattleTrackerPlugin, view: BattleTrackerView, onChoose: (file: TFile | null) => void) {
		super(app);
		this.plugin = plugin;
		this.view = view;
		this.onChoose = onChoose;
	}

	onOpen() {
		const { contentEl } = this;
		const lang = this.plugin.settings.language;
		const t = LOCALIZATION[lang];

		contentEl.createEl("h3", { text: t.logConfigureTitle });
		contentEl.createEl("p", { text: t.logHeadingDesc, cls: "setting-item-description" });

		const container = contentEl.createDiv("bt-modal-content");

		const newFileBtn = container.createEl("button", { cls: "bt-btn bt-btn-primary", text: `📝 ${t.logCreateNewFile}` });
		newFileBtn.addClass("bt-log-new-file-btn");
		newFileBtn.onclick = () => {
			void (async () => {
				try {
					const file = await this.view.createNewLogFile();
					new Notice(`${t.logActiveLogFile}: ${file.name}`);
					this.onChoose(file);
					this.close();
				} catch (e) {
					new Notice(lang === "es" ? "Error al crear la nota de registro." : "Error creating log note.");
					console.error(e);
				}
			})();
		};

		const divider = container.createDiv("bt-log-divider");
		divider.setText("─── " + (lang === "es" ? "O SELECCIONAR EXISTENTE" : "OR SELECT EXISTING") + " ───");

		const searchInput = container.createEl("input", {
			type: "text",
			placeholder: t.pickModalSearch,
		});
		searchInput.addClass("bt-modal-search-input");

		const list = container.createDiv("bt-pick-list");
		list.addClass("bt-log-pick-list");

		const files = this.app.vault.getMarkdownFiles().sort((a, b) => a.basename.localeCompare(b.basename));

		const renderList = (filter: string) => {
			list.empty();
			files
				.filter((f) => !filter || f.basename.toLowerCase().includes(filter.toLowerCase()))
				.slice(0, 50)
				.forEach((file) => {
					const item = list.createDiv("bt-pick-item");
						item.addClass("bt-log-pick-item");
						item.setText(file.path);
					item.onclick = () => {
						new Notice(`${t.logActiveLogFile}: ${file.name}`);
						this.onChoose(file);
						this.close();
					};
				});
		};

		renderList("");
		searchInput.oninput = () => renderList(searchInput.value);

		const row = contentEl.createDiv("bt-modal-actions");
		row.addClass("bt-log-footer-actions");

		const cancelBtn = row.createEl("button", { cls: "bt-btn", text: t.logButtonNoLog });
		cancelBtn.onclick = () => {
			this.onChoose(null);
			this.close();
		};
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class ConfirmModal extends Modal {
	title: string;
	message: string;
	confirmText: string;
	onConfirm: () => void;

	constructor(app: App, title: string, message: string, confirmText: string, onConfirm: () => void) {
		super(app);
		this.title = title;
		this.message = message;
		this.confirmText = confirmText;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: this.title });
		contentEl.createEl("p", { text: this.message });
		const row = contentEl.createDiv("bt-modal-actions");
		const cancelBtn = row.createEl("button", { cls: "bt-btn", text: "Cancel" });
		cancelBtn.onclick = () => this.close();
		const confirmBtn = row.createEl("button", { cls: "bt-btn bt-btn-danger-soft", text: this.confirmText });
		confirmBtn.onclick = () => {
			this.onConfirm();
			this.close();
		};
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class TextPromptModal extends Modal {
	title: string;
	placeholder: string;
	initialValue: string;
	onConfirm: (value: string) => void;

	constructor(app: App, title: string, placeholder: string, initialValue: string, onConfirm: (value: string) => void) {
		super(app);
		this.title = title;
		this.placeholder = placeholder;
		this.initialValue = initialValue;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: this.title });
		const input = contentEl.createEl("input", {
			type: "text",
			placeholder: this.placeholder,
		});
		input.value = this.initialValue;
		const row = contentEl.createDiv("bt-modal-actions");
		const cancelBtn = row.createEl("button", { cls: "bt-btn", text: "Cancel" });
		cancelBtn.onclick = () => this.close();
		const confirmBtn = row.createEl("button", { cls: "bt-btn bt-btn-primary", text: "OK" });
		confirmBtn.onclick = () => {
			this.onConfirm(input.value);
			this.close();
		};

    contentEl.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Enter") {
				event.preventDefault();
				this.onConfirm(input.value);
				this.close();
			}
    });

		window.setTimeout(() => input.focus(), 50);
	}

	onClose() {
		this.contentEl.empty();
	}
}
