import * as THREE from "three";

const VIDEO_URL = "VIDEO_URL_PLACEHOLDER";
const HEART_FULL = "♥";
const HEART_EMPTY = "♡";

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function createUI(root) {
  root.innerHTML = "";

  const menuScreen = createElement("section", "screen menu-screen");
  const menuPanel = createElement("div", "menu-panel");
  const title = createElement("h1", "title", "UnderThree");
  const subtitle = createElement("p", "menu-subtitle", "Para todos os aspirantes à guarda real");
  const buttonStack = createElement("div", "button-stack");
  const playButton = createElement("button", "game-button", "Jogar");
  const instructionsButton = createElement("button", "game-button", "Instruções");
  const videoButton = createElement("button", "game-button", "Video Demo");
  buttonStack.append(playButton, instructionsButton, videoButton);

  const instructionsPanel = createElement("div", "instructions-panel hidden");
  const tabs = createElement("div", "tabs");
  const shieldTab = createElement("button", "tab-button active", "Com Escudo");
  const dodgeTab = createElement("button", "tab-button", "Fugir");
  tabs.append(shieldTab, dodgeTab);
  const table = createElement("table", "instructions-table");
  const note = createElement(
    "p",
    "instructions-note",
    "O ataque só pode ser usado quando a barra de ataque estiver carregada. Caso contrário, o ataque não será efetuado."
  );
  instructionsPanel.append(tabs, table, note);

  const githubLink = document.createElement("a");
  githubLink.className = "github-link";
  githubLink.href = "https://github.com/JoaopFerreira05/UnderThree";
  githubLink.target = "_blank";
  githubLink.rel = "noreferrer";
  githubLink.setAttribute("aria-label", "GitHub");
  githubLink.innerHTML = `
    <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38
      0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
      -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2
      -3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65
      7.65 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82
      2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8
      8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path>
    </svg>`;

  menuPanel.append(title, subtitle, buttonStack, instructionsPanel);
  menuScreen.append(menuPanel, githubLink);

  const loadingScreen = createElement("section", "screen loading-screen hidden");
  const loadingCard = createElement("div", "loading-card");
  const loadingTitle = createElement("h2", "overlay-title", "A preparar a batalha");
  const loadingText = createElement("p", "overlay-copy", "A carregar recursos...");
  const loadingBar = createElement("div", "loading-bar");
  const loadingFill = createElement("div", "loading-fill");
  const loadingPercent = createElement("p", "overlay-copy", "0%");
  loadingBar.append(loadingFill);
  loadingCard.append(loadingTitle, loadingText, loadingBar, loadingPercent);
  loadingScreen.append(loadingCard);

  const hud = createElement("section", "hud hidden");
  const hudTop = createElement("div", "hud-top");
  const hudBottom = createElement("div", "hud-bottom");
  const bossCard = createElement("div", "hud-card");
  const playerCard = createElement("div", "hud-card");
  const bossLine = createElement("div", "boss-line");
  const bossLabel = createElement("span", "label", "UNDYNE");
  const bossHearts = createElement("span", "hearts");
  const bossCount = createElement("span", "status-text");
  bossLine.append(bossLabel, bossHearts, bossCount);
  const bossBarShell = createElement("div", "bar-shell");
  const bossBarFill = createElement("div", "bar-fill boss");
  bossBarShell.append(bossBarFill);
  bossCard.append(bossLine, bossBarShell);

  const hpLine = createElement("div", "player-line");
  const hpLabel = createElement("span", "label", "HP");
  const hpHearts = createElement("span", "hearts");
  const hpCount = createElement("span", "status-text");
  hpLine.append(hpLabel, hpHearts, hpCount);

  const atkLine = createElement("div", "player-line");
  const atkLabel = createElement("span", "label", "ATK");
  const atkShell = createElement("div", "bar-shell");
  const atkFill = createElement("div", "bar-fill attack");
  const atkState = createElement("span", "status-text", "charging...");
  atkShell.append(atkFill);
  atkLine.append(atkLabel, atkShell, atkState);
  playerCard.append(hpLine, atkLine);
  hudTop.append(bossCard);
  hudBottom.append(playerCard);
  hud.append(hudTop, hudBottom);

  const dialogueLayer = createElement("section", "dialogue-layer hidden");
  const dialogueBalloon = createElement("div", "dialogue-balloon hidden");
  const dialogueText = createElement("div", "dialogue-text");
  const dialogueHint = createElement("div", "dialogue-hint", "Pressiona C");
  dialogueBalloon.append(dialogueText, dialogueHint);
  dialogueLayer.append(dialogueBalloon);

  const overlay = createElement("section", "screen overlay-screen hidden");
  const overlayCard = createElement("div", "overlay-card");
  const overlayTitle = createElement("h2", "overlay-title");
  const overlayCopy = createElement("p", "overlay-copy");
  const overlayActions = createElement("div", "overlay-actions");
  overlayCard.append(overlayTitle, overlayCopy, overlayActions);
  overlay.append(overlayCard);

  root.append(menuScreen, loadingScreen, hud, dialogueLayer, overlay);

  const instructionData = {
    shield: [
      ["↑", "Proteger à frente"],
      ["←", "Proteger à esquerda"],
      ["↓", "Proteger atrás"],
      ["→", "Proteger à direita"],
      ["C", "Ataque"]
    ],
    dodge: [
      ["↑", "Andar para a frente"],
      ["←", "Andar para a esquerda"],
      ["↓", "Andar para trás"],
      ["→", "Andar para a direita"],
      ["C", "Ataque / Interagir"],
      ["Space", "Saltar"]
    ]
  };

  function renderInstructions(mode) {
    const data = mode === "shield" ? instructionData.shield : instructionData.dodge;
    table.innerHTML = `
      <thead><tr><th>Tecla</th><th>Ação</th></tr></thead>
      <tbody>${data.map(([key, action]) => `<tr><td>${key}</td><td>${action}</td></tr>`).join("")}</tbody>
    `;
    shieldTab.classList.toggle("active", mode === "shield");
    dodgeTab.classList.toggle("active", mode === "dodge");
  }

  renderInstructions("shield");
  shieldTab.addEventListener("click", () => renderInstructions("shield"));
  dodgeTab.addEventListener("click", () => renderInstructions("dodge"));
  instructionsButton.addEventListener("click", () => instructionsPanel.classList.toggle("hidden"));
  videoButton.addEventListener("click", () => window.open(VIDEO_URL, "_blank"));

  let overlayHandlers = [];
  function clearOverlayButtons() {
    overlayHandlers.forEach(({ button, handler }) => button.removeEventListener("click", handler));
    overlayHandlers = [];
    overlayActions.innerHTML = "";
  }

  function setScreen(name) {
    menuScreen.classList.toggle("hidden", name !== "menu");
    loadingScreen.classList.toggle("hidden", name !== "loading");
    hud.classList.toggle("hidden", !["intro", "phase1", "phase2", "victory-dialogue", "defeat"].includes(name));
    overlay.classList.toggle("hidden", !["victory", "defeat"].includes(name));
  }

  function setLoadingProgress(progress) {
    const pct = Math.round(progress * 100);
    loadingFill.style.width = `${pct}%`;
    loadingPercent.textContent = `${pct}%`;
  }

  function updateHUD({ bossHP, bossMax, playerHP, playerMax, attackProgress }) {
    bossHearts.textContent = `${HEART_FULL.repeat(bossHP)}${HEART_EMPTY.repeat(Math.max(0, bossMax - bossHP))}`;
    bossCount.textContent = `${bossHP}/${bossMax}`;
    bossBarFill.style.width = `${(bossHP / bossMax) * 100}%`;

    hpHearts.textContent = `${HEART_FULL.repeat(playerHP)}${HEART_EMPTY.repeat(Math.max(0, playerMax - playerHP))}`;
    hpCount.textContent = `${playerHP}/${playerMax}`;
    atkFill.style.width = `${attackProgress * 100}%`;
    const ready = attackProgress >= 1;
    atkFill.classList.toggle("ready", ready);
    atkState.textContent = ready ? "READY!" : "charging...";
  }

  function showDialogue(text, position) {
    dialogueLayer.classList.remove("hidden");
    dialogueBalloon.classList.remove("hidden");
    dialogueText.textContent = text;
    dialogueBalloon.style.left = `${position.x}px`;
    dialogueBalloon.style.top = `${position.y}px`;
  }

  function hideDialogue() {
    dialogueLayer.classList.add("hidden");
    dialogueBalloon.classList.add("hidden");
  }

  function showOverlay({ title: cardTitle, copy, buttons }) {
    clearOverlayButtons();
    overlayTitle.textContent = cardTitle;
    overlayCopy.textContent = copy;
    for (const config of buttons) {
      const button = createElement("button", "game-button", config.label);
      const handler = () => config.onClick();
      overlayHandlers.push({ button, handler });
      button.addEventListener("click", handler);
      overlayActions.append(button);
    }
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    clearOverlayButtons();
    overlay.classList.add("hidden");
  }

  function projectWorldToScreen(camera, worldPosition) {
    const projected = worldPosition.clone().project(camera);
    return new THREE.Vector2(
      ((projected.x + 1) / 2) * window.innerWidth,
      ((-projected.y + 1) / 2) * window.innerHeight - 22
    );
  }

  return {
    playButton,
    setScreen,
    setLoadingProgress,
    updateHUD,
    showDialogue,
    hideDialogue,
    showOverlay,
    hideOverlay,
    projectWorldToScreen
  };
}
