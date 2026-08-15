/* global window, document, navigator */
(function startGameClient(global) {
  "use strict";

  const AOK = global.AOK;
  if (!AOK?.CONFIG || !AOK?.Simulation || !AOK?.Renderer || !AOK?.InputController) {
    throw new Error("Aeon of Kingdoms runtime scripts are missing or out of order.");
  }

  const CONFIG = AOK.CONFIG;
  const Simulation = AOK.Simulation;
  const HUMAN_PLAYER_ID = 0;
  const CAMPAIGN_SEED = 0x0ae0f17;
  const SKIRMISH_SEED = 0x0ae02026;
  const ROLES = Object.freeze([
    CONFIG.ROLE.VANGUARD,
    CONFIG.ROLE.RANGER,
    CONFIG.ROLE.BULWARK,
    CONFIG.ROLE.BREAKER,
    CONFIG.ROLE.SUPPORT,
    CONFIG.ROLE.ASCENDANT,
  ]);
  const ROLE_LABELS = Object.freeze({
    [CONFIG.ROLE.VANGUARD]: "Front line",
    [CONFIG.ROLE.RANGER]: "Ranged pressure",
    [CONFIG.ROLE.BULWARK]: "Defender",
    [CONFIG.ROLE.BREAKER]: "Siege breaker",
    [CONFIG.ROLE.SUPPORT]: "Battlefield support",
    [CONFIG.ROLE.ASCENDANT]: "Signature unit",
  });

  const element = (id) => document.getElementById(id);
  const dom = {
    canvas: element("game-canvas"),
    startScreen: element("start-screen"),
    setup: element("skirmish-setup"),
    faction: element("faction-select"),
    campaign: element("start-campaign"),
    hud: element("game-hud"),
    aether: element("resource-aether"),
    population: element("population"),
    battleTime: element("battle-time"),
    objectivePanel: element("objective-panel"),
    objectiveStatus: element("objective-status"),
    objectiveProgress: element("objective-progress"),
    rivalObjective: element("rival-objective"),
    selectionPanel: element("selection-panel"),
    selectionRole: element("selection-role"),
    selectionName: element("selection-name"),
    selectionCount: element("selection-count"),
    selectionMeta: element("selection-meta"),
    selectionHealth: element("selection-health"),
    selectionHealthValue: element("selection-health-value"),
    recruitDock: element("recruit-dock"),
    commandHelp: element("command-help"),
    cameraControls: element("camera-controls"),
    pauseButton: element("pause-button"),
    pauseDialog: element("pause-dialog"),
    resumeButton: element("resume-game"),
    restartButton: element("restart-game"),
    pauseMenuButton: element("pause-main-menu"),
    endDialog: element("end-dialog"),
    endTitle: element("end-title"),
    endSummary: element("end-summary"),
    rematchButton: element("rematch-game"),
    endMenuButton: element("end-main-menu"),
    liveStatus: element("live-status"),
    bootError: element("boot-error"),
    zoomIn: element("zoom-in"),
    zoomOut: element("zoom-out"),
    cameraHome: element("camera-home"),
    selectArmy: element("select-army"),
  };

  if (Object.values(dom).some((node) => !node)) {
    throw new Error("The game shell is incomplete.");
  }

  const renderer = new AOK.Renderer(dom.canvas);
  let match = null;
  let phase = "menu";
  let accumulator = 0;
  let lastFrameTime = global.performance.now();
  let lastRenderTime = 0;
  let lastHudTick = -1;
  let lastOptions = null;
  let recruitSourceId = null;
  let hoveredId = null;
  let selectionBox = null;
  let selectedIds = new Set();
  let lastAnnouncement = "";

  const input = new AOK.InputController(dom.canvas, renderer, {
    onPrimary: handlePrimary,
    onCommand: issuePositionCommand,
    onBoxSelect: handleBoxSelect,
    onSelectionBox(rectangle) {
      selectionBox = rectangle;
    },
    onHover({ screen }) {
      if (!match) return;
      const unit = renderer.hitTestUnit(match, screen.x, screen.y);
      hoveredId = unit?.id ?? null;
    },
    onEscape() {
      if (selectedIds.size > 0) {
        clearSelection();
      } else {
        pauseGame();
      }
    },
    onRecruitShortcut(index) {
      dom.recruitDock.querySelectorAll("[data-role]")[index]?.click();
    },
    onFocusSelection: focusSelection,
    onSelectArmy: selectArmy,
    onCommandAtFocus: commandAtViewCenter,
  });

  function announce(message) {
    if (!message || message === lastAnnouncement) return;
    lastAnnouncement = message;
    dom.liveStatus.textContent = "";
    global.requestAnimationFrame(() => {
      dom.liveStatus.textContent = message;
    });
  }

  function roleLabel(role) {
    return ROLE_LABELS[role] || "Battlefield unit";
  }

  function setPhase(nextPhase) {
    phase = nextPhase;
    lastRenderTime = 0;
    document.body.dataset.gameState = nextPhase;
    input.setEnabled(nextPhase === "playing");
    const inMatch = nextPhase !== "menu";
    dom.startScreen.hidden = inMatch;
    dom.hud.hidden = !inMatch;
    dom.objectivePanel.hidden = !inMatch;
    dom.selectionPanel.hidden = !inMatch;
    dom.recruitDock.hidden = !inMatch;
    dom.commandHelp.hidden = !inMatch;
    dom.cameraControls.hidden = !inMatch;
  }

  function selectedFormValue(name, fallback) {
    return dom.setup.elements[name]?.value || fallback;
  }

  function createPlayers(playerCount, humanFactionId, campaign) {
    const factionIds = CONFIG.FACTION_IDS;
    const enemyFaction = factionIds.find((id) => id !== humanFactionId) || humanFactionId;
    const players = [{ name: "You", factionId: humanFactionId, ai: false }];
    for (let index = 1; index < playerCount; index += 1) {
      const factionId = index % 2 === 1 ? enemyFaction : humanFactionId;
      const faction = CONFIG.FACTIONS[factionId];
      players.push({
        name: campaign && index === 1 ? "The Pale Regent" : `${faction.shortName} ${index + 1}`,
        factionId,
        ai: true,
        difficulty: campaign ? "hard" : playerCount >= 6 ? "easy" : "normal",
      });
    }
    return players;
  }

  function beginMatch(options) {
    closeDialog(dom.pauseDialog);
    closeDialog(dom.endDialog);
    lastOptions = Object.assign({}, options);
    const players = createPlayers(options.playerCount, options.factionId, options.campaign);
    match = Simulation.create({
      playerCount: options.playerCount,
      mode: options.mode,
      seed: options.seed,
      players,
      ai: true,
    });
    accumulator = 0;
    lastHudTick = -1;
    lastFrameTime = global.performance.now();
    recruitSourceId = Simulation.getHeadquarters(match, HUMAN_PLAYER_ID)?.id ?? null;
    hoveredId = null;
    selectedIds = new Set(
      match.units.filter((unit) => unit.playerId === HUMAN_PLAYER_ID).map((unit) => String(unit.id)),
    );
    setPhase("playing");
    focusHome();
    configureRecruitDock();
    projectHud(true);
    dom.canvas.focus({ preventScroll: true });
    const modeName = modeLabel(options.mode);
    announce(`${options.campaign ? "Campaign" : "Skirmish"} started. ${modeName}. ${options.playerCount} factions.`);
  }

  function startSkirmish(event) {
    event.preventDefault();
    const playerCount = Number(selectedFormValue("player-count", "2"));
    const mode = selectedFormValue("battle-mode", CONFIG.MODE.CONQUEST);
    const factionId = dom.faction.value;
    beginMatch({ playerCount, mode, factionId, seed: SKIRMISH_SEED, campaign: false });
  }

  function startCampaign() {
    beginMatch({
      playerCount: 2,
      mode: CONFIG.MODE.CONQUEST,
      factionId: "concord",
      seed: CAMPAIGN_SEED,
      campaign: true,
    });
  }

  function handlePrimary(intent) {
    if (!match || phase !== "playing") return;
    const ownUnit = renderer.hitTestUnit(match, intent.screen.x, intent.screen.y, { playerId: HUMAN_PLAYER_ID });
    if (ownUnit) {
      const id = String(ownUnit.id);
      if (!intent.additive) selectedIds.clear();
      if (intent.additive && selectedIds.has(id)) selectedIds.delete(id);
      else selectedIds.add(id);
      recruitSourceId = null;
      projectSelection();
      return;
    }

    const site = renderer.hitTestSite(match, intent.screen.x, intent.screen.y);
    if (site && entityOwner(site) === HUMAN_PLAYER_ID && isRecruitSource(site)) {
      selectedIds.clear();
      recruitSourceId = site.id;
      projectSelection();
      announce(`Recruitment source selected: ${site.name || renderer.siteLabel(String(site.kind || site.type))}.`);
      return;
    }

    if (intent.source === "touch" && selectedIds.size > 0) {
      issuePositionCommand(intent);
      return;
    }

    if (!intent.additive) clearSelection();
  }

  function handleBoxSelect({ rectangle, additive }) {
    if (!match || phase !== "playing") return;
    const units = renderer.unitsInScreenRect(match, rectangle, HUMAN_PLAYER_ID);
    if (!additive) selectedIds.clear();
    for (const unit of units) selectedIds.add(String(unit.id));
    recruitSourceId = null;
    projectSelection();
    announce(`${selectedIds.size} unit${selectedIds.size === 1 ? "" : "s"} selected.`);
  }

  function issuePositionCommand(intent) {
    if (!match || phase !== "playing" || selectedIds.size === 0) return;
    const ids = currentSelectedUnits().map((unit) => unit.id);
    if (ids.length === 0) return;
    const targetUnit = renderer.hitTestUnit(match, intent.screen.x, intent.screen.y);
    const targetSite = renderer.hitTestSite(match, intent.screen.x, intent.screen.y);
    const enemyTarget = (targetUnit && entityOwner(targetUnit) !== HUMAN_PLAYER_ID)
      || (targetSite && entityOwner(targetSite) != null && entityOwner(targetSite) !== HUMAN_PLAYER_ID);
    const command = enemyTarget
      ? Simulation.attackMove(match, HUMAN_PLAYER_ID, ids, intent.world.x, intent.world.y)
      : Simulation.move(match, HUMAN_PLAYER_ID, ids, intent.world.x, intent.world.y);
    if (command) {
      announce(`${enemyTarget ? "Attack" : "Move"} order issued to ${ids.length} unit${ids.length === 1 ? "" : "s"}.`);
    }
  }

  function currentSelectedUnits() {
    if (!match) return [];
    const active = [];
    for (const unit of match.units) {
      const id = String(unit.id);
      if (!unit.dead && unit.playerId === HUMAN_PLAYER_ID && selectedIds.has(id)) active.push(unit);
      else if (unit.dead) selectedIds.delete(id);
    }
    return active;
  }

  function clearSelection() {
    selectedIds.clear();
    recruitSourceId = null;
    projectSelection();
  }

  function selectArmy() {
    if (!match || phase !== "playing") return;
    selectedIds = new Set(
      match.units
        .filter((unit) => !unit.dead && unit.playerId === HUMAN_PLAYER_ID)
        .map((unit) => String(unit.id)),
    );
    recruitSourceId = null;
    projectSelection();
    announce(`${selectedIds.size} active unit${selectedIds.size === 1 ? "" : "s"} selected.`);
  }

  function commandAtViewCenter() {
    if (!match || phase !== "playing" || selectedIds.size === 0) return;
    const screen = { x: renderer.width * 0.5, y: renderer.height * 0.5 };
    issuePositionCommand({
      screen,
      world: renderer.screenToWorld(screen.x, screen.y),
      source: "keyboard",
    });
  }

  function entityOwner(entity) {
    return entity.ownerId == null ? entity.playerId : entity.ownerId;
  }

  function isRecruitSource(entity) {
    return entity?.kind === "hq" || entity?.kind === CONFIG.SITE_KIND.RECRUITMENT;
  }

  function availableRecruitSources() {
    if (!match) return [];
    const sources = match.structures.filter(
      (structure) => structure.kind === "hq" && !structure.dead && structure.playerId === HUMAN_PLAYER_ID,
    );
    for (const site of match.sites) {
      if (site.kind === CONFIG.SITE_KIND.RECRUITMENT && site.ownerId === HUMAN_PLAYER_ID) sources.push(site);
    }
    return sources;
  }

  function chooseRecruitSource() {
    const sources = availableRecruitSources();
    const selected = sources.find((source) => String(source.id) === String(recruitSourceId));
    if (selected && selected.recruitCooldown <= 0) return selected;
    const ready = sources.filter((source) => source.recruitCooldown <= 0);
    const candidates = ready.length > 0 ? ready : sources;
    candidates.sort((first, second) => {
      const firstDistance = Math.hypot(first.x - renderer.camera.x, first.y - renderer.camera.y);
      const secondDistance = Math.hypot(second.x - renderer.camera.x, second.y - renderer.camera.y);
      return firstDistance - secondDistance || String(first.id).localeCompare(String(second.id));
    });
    return candidates[0] || null;
  }

  function configureRecruitDock() {
    const player = match?.players[HUMAN_PLAYER_ID];
    if (!player) return;
    const faction = CONFIG.FACTIONS[player.factionId];
    for (const button of dom.recruitDock.querySelectorAll("[data-role]")) {
      const role = button.dataset.role;
      const unit = faction.units[role];
      if (!unit) {
        button.hidden = true;
        continue;
      }
      button.hidden = false;
      button.querySelector(".recruit-name").textContent = unit.name;
      button.querySelector(".unit-role").textContent = roleLabel(role);
      button.querySelector(".recruit-cost").textContent = `${unit.cost} · ${unit.population} pop`;
      button.title = `${unit.name}: ${unit.cost} Aether, ${unit.population} population`;
      button.setAttribute("aria-label", `Recruit ${unit.name}, ${unit.cost} Aether, ${unit.population} population`);
    }
  }

  function recruit(role) {
    if (!match || phase !== "playing") return;
    const player = match.players[HUMAN_PLAYER_ID];
    const unitType = Simulation.getUnitType(player.factionId, role);
    const source = chooseRecruitSource();
    if (!unitType || !source) {
      announce("Capture a Relay Forge or protect your Nexus to recruit.");
      return;
    }
    if (source.recruitCooldown > 0) {
      announce("Recruitment source is recalibrating.");
      return;
    }
    if (player.credits < unitType.cost) {
      announce(`You need ${unitType.cost - player.credits} more Aether.`);
      return;
    }
    if (player.population + unitType.population > player.populationCap) {
      announce("Population cap reached. Capture territory to expand it.");
      return;
    }
    recruitSourceId = source.id;
    if (Simulation.recruit(match, HUMAN_PLAYER_ID, source.id, role)) {
      announce(`${unitType.name} recruitment queued.`);
    }
  }

  function projectHud(force) {
    if (!match) return;
    if (!force && match.tick === lastHudTick) return;
    lastHudTick = match.tick;
    const player = match.players[HUMAN_PLAYER_ID];
    dom.aether.textContent = String(player.credits);
    dom.population.textContent = `${player.population} / ${player.populationCap}`;
    dom.battleTime.textContent = formatDuration(match.tick / CONFIG.SIMULATION_HZ);
    projectObjective(player);
    projectSelection();
    projectRecruitButtons(player);
  }

  function projectObjective(player) {
    const mode = match.settings.mode;
    let value = 0;
    let maximum = 1;
    let text = "Destroy every rival Nexus";
    if (mode === CONFIG.MODE.CONQUEST) {
      value = player.score;
      maximum = CONFIG.VICTORY.conquestPoints;
      text = `Conquest · ${player.score} / ${maximum}`;
    } else if (mode === CONFIG.MODE.KING_OF_THE_HILL) {
      value = player.hillTicks;
      maximum = CONFIG.VICTORY.hillHoldTicks;
      const crown = match.sites.find((site) => site.objective === "hill");
      text = crown?.ownerId === HUMAN_PLAYER_ID
        ? `Holding the Aeon Core · ${Math.floor((value / maximum) * 100)}%`
        : "Take and hold the Aeon Core";
    } else if (mode === CONFIG.MODE.DOMINATION) {
      value = player.dominationTicks;
      maximum = CONFIG.VICTORY.dominationHoldTicks;
      text = value > 0
        ? `Total control · ${Math.floor((value / maximum) * 100)}%`
        : "Control the Core and all three Seals";
    }
    dom.objectiveStatus.textContent = text;
    dom.objectiveProgress.max = Math.max(1, maximum);
    dom.objectiveProgress.value = Math.max(0, Math.min(maximum, value));
    projectRivalObjective(mode, maximum);
  }

  function projectRivalObjective(mode, maximum) {
    if (mode === CONFIG.MODE.TOTAL_DOMINATION) {
      dom.rivalObjective.hidden = true;
      dom.rivalObjective.textContent = "";
      dom.rivalObjective.removeAttribute("data-alert");
      return;
    }

    const progressKey = mode === CONFIG.MODE.CONQUEST
      ? "score"
      : mode === CONFIG.MODE.KING_OF_THE_HILL ? "hillTicks" : "dominationTicks";
    let leader = null;
    let leaderProgress = -1;
    for (const rival of match.players) {
      if (rival.id === HUMAN_PLAYER_ID || rival.eliminated) continue;
      const progress = Math.max(0, Number(rival[progressKey]) || 0);
      if (progress > leaderProgress || (progress === leaderProgress && rival.id < leader.id)) {
        leader = rival;
        leaderProgress = progress;
      }
    }

    if (!leader) {
      dom.rivalObjective.hidden = true;
      dom.rivalObjective.textContent = "";
      dom.rivalObjective.removeAttribute("data-alert");
      return;
    }

    const cappedProgress = Math.min(maximum, leaderProgress);
    const percentage = Math.floor((cappedProgress / Math.max(1, maximum)) * 100);
    let text = `Rival lead · ${leader.name} · ${cappedProgress} / ${maximum}`;
    let activeAlert = mode === CONFIG.MODE.CONQUEST && percentage >= 75;
    if (activeAlert) {
      text = `Rival warning · ${leader.name} · ${cappedProgress} / ${maximum}`;
    } else if (mode === CONFIG.MODE.KING_OF_THE_HILL) {
      activeAlert = leaderProgress > 0;
      text = activeAlert
        ? `Rival warning · ${leader.name} holds the Core · ${percentage}%`
        : `Rival lead · ${leader.name} · 0%`;
    } else if (mode === CONFIG.MODE.DOMINATION) {
      activeAlert = leaderProgress > 0;
      text = activeAlert
        ? `Rival warning · ${leader.name} has total control · ${percentage}%`
        : `Rival lead · ${leader.name} · 0%`;
    }

    dom.rivalObjective.hidden = false;
    dom.rivalObjective.textContent = text;
    if (activeAlert) dom.rivalObjective.setAttribute("data-alert", "true");
    else dom.rivalObjective.removeAttribute("data-alert");
  }

  function projectSelection() {
    if (!match) return;
    const units = currentSelectedUnits();
    if (units.length > 0) {
      const first = units[0];
      const sameType = units.every((unit) => unit.typeId === first.typeId);
      const totalHealth = units.reduce((sum, unit) => sum + unit.hp, 0);
      const totalMaxHealth = units.reduce((sum, unit) => sum + unit.maxHp, 0);
      const averagePercent = Math.round((totalHealth / Math.max(1, totalMaxHealth)) * 100);
      dom.selectionRole.textContent = sameType ? roleLabel(first.role) : "Mixed roles";
      dom.selectionName.textContent = sameType ? first.name : "Mixed detachment";
      dom.selectionCount.textContent = units.length === 1 ? "" : `×${units.length}`;
      dom.selectionMeta.textContent = units.length === 1
        ? `${first.range > 70 ? "Ranged" : "Melee"} · ${first.large ? "Large footprint" : "Mobile formation"}`
        : `${units.length} units · ${new Set(units.map((unit) => unit.role)).size} battlefield roles`;
      dom.selectionHealth.max = 100;
      dom.selectionHealth.value = averagePercent;
      dom.selectionHealthValue.textContent = `${averagePercent}%`;
      return;
    }

    const source = availableRecruitSources().find((candidate) => String(candidate.id) === String(recruitSourceId));
    if (source) {
      const current = source.hp ?? source.maxHp ?? 1;
      const maximum = source.maxHp ?? current;
      const health = Math.round((current / Math.max(1, maximum)) * 100);
      dom.selectionRole.textContent = source.kind === "hq" ? "headquarters" : "recruitment";
      dom.selectionName.textContent = source.name || (source.kind === "hq" ? "Faction Nexus" : "Relay Forge");
      dom.selectionCount.textContent = "";
      dom.selectionMeta.textContent = source.recruitCooldown > 0 ? "Recruitment recalibrating" : "Ready to recruit";
      dom.selectionHealth.max = 100;
      dom.selectionHealth.value = health;
      dom.selectionHealthValue.textContent = source.kind === "hq" ? `${Math.round(current)} HP` : "Owned";
      return;
    }

    dom.selectionRole.textContent = "selection";
    dom.selectionName.textContent = "No units selected";
    dom.selectionCount.textContent = "";
    dom.selectionMeta.textContent = "Select a unit or drag across a formation";
    dom.selectionHealth.max = 100;
    dom.selectionHealth.value = 0;
    dom.selectionHealthValue.textContent = "—";
  }

  function projectRecruitButtons(player) {
    const source = chooseRecruitSource();
    for (const button of dom.recruitDock.querySelectorAll("[data-role]")) {
      const unitType = Simulation.getUnitType(player.factionId, button.dataset.role);
      const blocked = !unitType || !source || source.recruitCooldown > 0
        || player.credits < unitType.cost
        || player.population + unitType.population > player.populationCap;
      button.disabled = blocked;
    }
  }

  function processEvents(events) {
    if (!Array.isArray(events)) return;
    for (const event of events) {
      if (event.type === "site-captured") {
        const owner = match.players[event.playerId];
        if (event.playerId === HUMAN_PLAYER_ID) announce("Strategic site captured.");
        else if (owner) announce(`${owner.name} captured a strategic site.`);
      } else if (event.type === "recruit-rejected" && event.playerId === HUMAN_PLAYER_ID) {
        announce("Recruitment could not complete. Check Aether, population, and source control.");
      } else if (event.type === "player-eliminated") {
        announce(`${match.players[event.playerId]?.name || "A faction"} was eliminated.`);
      }
    }
  }

  function modeLabel(mode) {
    if (mode === CONFIG.MODE.CONQUEST) return "Conquest";
    if (mode === CONFIG.MODE.KING_OF_THE_HILL) return "King of the Hill";
    if (mode === CONFIG.MODE.DOMINATION) return "Domination";
    return "Total Domination";
  }

  function formatDuration(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(whole / 60);
    return `${String(minutes).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  }

  function focusSelection() {
    const units = currentSelectedUnits();
    if (units.length === 0) {
      focusHome();
      return;
    }
    const center = units.reduce((point, unit) => ({ x: point.x + unit.x, y: point.y + unit.y }), { x: 0, y: 0 });
    renderer.focus(center.x / units.length, center.y / units.length, Math.max(renderer.camera.zoom, 1));
  }

  function focusHome() {
    if (!match) return;
    const hq = Simulation.getHeadquarters(match, HUMAN_PLAYER_ID);
    if (hq) renderer.focus(hq.x, hq.y, global.innerWidth < 700 ? 0.82 : 1.08);
  }

  function pauseGame() {
    if (!match || phase !== "playing") return;
    setPhase("paused");
    accumulator = 0;
    showDialog(dom.pauseDialog);
    announce("Game paused.");
  }

  function resumeGame() {
    if (!match || phase !== "paused") return;
    closeDialog(dom.pauseDialog);
    lastFrameTime = global.performance.now();
    setPhase("playing");
    dom.canvas.focus({ preventScroll: true });
    announce("Game resumed.");
  }

  function restartMatch() {
    if (lastOptions) beginMatch(lastOptions);
  }

  function returnToMenu() {
    closeDialog(dom.pauseDialog);
    closeDialog(dom.endDialog);
    match = null;
    selectedIds.clear();
    recruitSourceId = null;
    hoveredId = null;
    accumulator = 0;
    setPhase("menu");
    renderer.fitWorld(70);
    dom.startScreen.scrollTop = 0;
    dom.startScreen.focus({ preventScroll: true });
    announce("Returned to the command screen.");
  }

  function finishMatch() {
    if (!match || phase === "ended") return;
    setPhase("ended");
    const winner = match.players.find((player) => player.id === match.winnerId);
    const humanWon = match.winnerId === HUMAN_PLAYER_ID;
    dom.endTitle.textContent = humanWon ? "The aeon is yours" : "The line has fallen";
    const reason = String(match.victoryReason || "elimination").replaceAll("-", " ");
    dom.endSummary.textContent = winner
      ? `${winner.name} secured ${reason}. The battlefield reached tick ${match.tick}.`
      : `No faction survived the ${reason} engagement.`;
    showDialog(dom.endDialog);
    announce(`${humanWon ? "Victory" : "Defeat"}. ${dom.endSummary.textContent}`);
  }

  function showDialog(dialog) {
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog.open) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function frame(time) {
    const elapsed = Math.min(250, Math.max(0, time - lastFrameTime));
    lastFrameTime = time;
    if (phase === "playing" && match) {
      input.update(elapsed / 1000);
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= CONFIG.TICK_MS && steps < CONFIG.MAX_CATCH_UP_TICKS && match.status === "running") {
        Simulation.step(match, 1);
        processEvents(match.events);
        accumulator -= CONFIG.TICK_MS;
        steps += 1;
      }
      if (steps === CONFIG.MAX_CATCH_UP_TICKS && accumulator >= CONFIG.TICK_MS) accumulator = 0;
      projectHud(false);
      if (match.status !== "running") finishMatch();
    }

    const activePresentation = phase === "playing" || (phase === "menu" && !renderer.reducedMotion);
    if (activePresentation || time - lastRenderTime >= 500) {
      renderer.render(match, { selectedIds, hoveredId, selectionBox, time });
      lastRenderTime = time;
    }
    global.requestAnimationFrame(frame);
  }

  dom.setup.addEventListener("submit", startSkirmish);
  dom.campaign.addEventListener("click", startCampaign);
  dom.pauseButton.addEventListener("click", pauseGame);
  dom.resumeButton.addEventListener("click", resumeGame);
  dom.restartButton.addEventListener("click", restartMatch);
  dom.pauseMenuButton.addEventListener("click", returnToMenu);
  dom.rematchButton.addEventListener("click", restartMatch);
  dom.endMenuButton.addEventListener("click", returnToMenu);
  dom.pauseDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    resumeGame();
  });
  dom.endDialog.addEventListener("cancel", (event) => event.preventDefault());
  dom.recruitDock.addEventListener("click", (event) => {
    const button = event.target.closest("[data-role]");
    if (button) recruit(button.dataset.role);
  });
  dom.zoomIn.addEventListener("click", () => renderer.zoomAt(renderer.width * 0.5, renderer.height * 0.5, 1.22));
  dom.zoomOut.addEventListener("click", () => renderer.zoomAt(renderer.width * 0.5, renderer.height * 0.5, 1 / 1.22));
  dom.cameraHome.addEventListener("click", focusHome);
  dom.selectArmy.addEventListener("click", selectArmy);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && phase === "playing") pauseGame();
  });

  for (const role of ROLES) {
    const button = dom.recruitDock.querySelector(`[data-role="${role}"]`);
    if (button) button.dataset.role = role;
  }

  setPhase("menu");
  renderer.fitWorld(70);
  global.requestAnimationFrame(frame);

  if ("serviceWorker" in navigator && /^https?:$/.test(global.location.protocol)) {
    global.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {
        // Offline installation is optional; failure never blocks local play.
      });
    }, { once: true });
  }
})(window);
