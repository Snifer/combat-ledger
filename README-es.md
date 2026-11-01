# Combat Ledger

[![Obsidian](https://img.shields.io/badge/Obsidian-Plugin-7C3AED?logo=obsidian)](https://obsidian.md/plugins)
[![version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/snifer/combat-ledger/releases)
[![license](https://img.shields.io/badge/license-0--MIT-green.svg)](LICENSE)
![GitHub Downloads](https://img.shields.io/github/downloads/Snifer/combat-ledger/total?logo)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Buy%20me%20a%20coffee-ff5f5f?logo=ko-fi&logoColor=white)](https://ko-fi.com/bastiondeldino)
![Combat Ledger ](./assets/simpletracker.png)

> 📖 **For the English version, please read [README.md](README.md).**

Un rastreador de iniciativa y combate simple y ligero para juegos de rol de mesa (como D&D, Pathfinder, Dragonbane, etc.) directamente dentro de Obsidian.

---

## ¿Por qué este plugin?
Este plugin nació de una necesidad personal: **necesitaba tener algo simple sin complicarme para trackear mis sesiones de RPG y de ahí nació esto.** No quería sistemas pesados ni paneles saturados. Solo buscaba algo que leyera mis notas, me permitiera gestionar los turnos de combate y llevara un registro (log) de las acciones. Así nació **Combat Ledger**.

---

## Características Principales

1. **Integración con Frontmatter YAML**: Lee la iniciativa, puntos de vida actuales (PV), PV máximos, defensa (CA) y tipo de criatura directamente desde el bloque frontmatter de tus notas en Obsidian.
2. **Gestión de Turnos y Rondas**: Ordena automáticamente a los combatientes por iniciativa, destacando al combatiente activo y avanzando las rondas de combate.
3. **Registro de Combate Interactivo (Log)**: Registra cada evento del encuentro (daño, curación, condiciones, turnos, notas rápidas) en una nota Markdown:
   * **Nueva Nota**: Creada automáticamente con marca de tiempo.
   * **Nota Existente**: Añadiendo el registro cronológicamente debajo de un encabezado específico (ej. `## Registro de Combate`).
4. **Soporte para Idioma Dual (EN/ES)**: Selector en los ajustes que traduce toda la interfaz y adapta las condiciones iniciales y formatos de log por defecto.
5. **Campos Extra Personalizables**: Permite hacer un seguimiento de valores numéricos adicionales como Maná (MP), Energía (Stamina), Estrés o Foco usando botones rápidos de `+` y `-`.
6. **Seguimiento de Condiciones/Estados**: Activa o desactiva estados (ej. Aturdido, Envenenado) y visualízalos como etiquetas interactivas en la tarjeta del combatiente.

---

## Instalación

1. Copia los archivos del plugin (`main.js`, `manifest.json` y `styles.css`) en la carpeta de plugins de tu vault de Obsidian: `<vault>/.obsidian/plugins/combat-ledger/`.
2. Ve a los ajustes de Obsidian, sección **Community Plugins** (Plugins de la Comunidad), y activa **Combat Ledger**.

---

## Cómo Funciona

### 1. Preparar las Notas de Combatientes
Crea una nota Markdown para cada personaje o monstruo. El plugin leerá sus propiedades desde el bloque frontmatter YAML superior. Por defecto espera lo siguiente:

```yaml
---
type: PC            # Tipo: PC (Jugador), Enemy (Enemigo), o NPC (No Jugador)
initiative: 12
hp: 35
hp_max: 35
ac: 15
mp: 20              # Campo extra
stamina: 3          # Campo extra
---
```

### 2. Cargar Combatientes
* Abre el panel del tracker pulsando el **icono de la espada** en la cinta lateral de Obsidian, o ejecuta el comando `Abrir Combat Ledger`.
- Haz clic en **＋ Carga por defecto** en la barra superior.
  - Si has definido una **Carpeta de combatientes predeterminada** en los ajustes, se cargarán automáticamente todos los archivos que contenga.
- Haz clic en **＋ Cargar** en la barra superior.
  - Se abrirá una ventana que te permitirá buscar y seleccionar manualmente una o varias notas.
  - Si has definido una **Carpeta raíz de combatientes** en los ajustes, solo se mostrarán los archivos de esa carpeta y de sus subcarpetas.

### 3. Configurar el Registro (Log) de Combate
Cuando comience el encuentro o realices la primera acción de combate, el plugin abrirá un diálogo (si el registro está habilitado) para decidir dónde guardar el log:
* **Crear nueva nota**: Genera una nota Markdown nueva con la fecha y hora actual en el nombre del archivo.
* **Usar nota existente**: Abre un buscador para elegir una nota que ya tengas en tu bóveda. Las acciones se escribirán al final del encabezado configurado.
* **No registrar**: Ejecuta el combate únicamente en la memoria de la interfaz sin escribir en ninguna nota.

### 4. Ejecutar el Combate
* **Avanzar Turno**: Haz clic en **▶ Siguiente turno** para avanzar al siguiente combatiente vivo. El indicador de ronda se incrementará al completar un ciclo.
* **Daño/Curación**: Pulsa **⚔ Daño / Curar** en la tarjeta de cualquier combatiente para sumar o restar PV.
* **Condiciones/Estados**: Pulsa **◈ Estado** para seleccionar condiciones activas. Puedes quitar una condición rápidamente pulsando sobre su etiqueta (ej. `Aturdido ×`) directamente en la tarjeta.
* **Notas rápidas**: Guarda apuntes breves (ej. *"volando a 3 metros"*) usando el botón **✎ Nota**.
* **Derrotar y Revivir**: Los personajes derrotados (0 PV) se muestran opacados y el orden de iniciativa los salta automáticamente.

---

## Configuración

En la sección de ajustes del plugin puedes configurar:
* **Idioma**: Español o Inglés.
* **Mapeo de Campos**: Cambia los nombres de las propiedades que el plugin lee de tus notas (ej. si usas `vida` en vez de `hp`).
* **Lista de condiciones**: Escribe los estados que usas en tu mesa separados por comas.
* **Carpeta de combatientes**: Ruta automática para cargar notas.
* **Ajustes de Registro (Log)**: Habilita el log, especifica el nombre de la cabecera de la nota (ej. `## Registro de Combate`) y la carpeta de destino de nuevos logs.
