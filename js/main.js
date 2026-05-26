import * as THREE from "three";
import { createScene } from "./scene.js";
import { createPlayer } from "./player.js";
import { createBoss } from "./boss.js";
import { createPhase1Controller } from "./phase1.js";
import { createPhase2Controller } from "./phase2.js";
import { createUI } from "./ui.js";
import { preloadAssets } from "./loader.js";

export const GameState = {
  phase: "MENU",
  bossHP: 7,
  playerHP: 4,
  attackBarProgress: 0,
  music: null
};

const INTRO_LINES = [
  "Então queres entrar para a guarda real, huh?",
  "Para isso tens de provar o teu valor!"
];
const VICTORY_LINES = ["GG"];
const TYPEWRITER_MS = 40;
const VICTORY_AUTO_MS = 3000;

const canvas = document.getElementById("game-canvas");
const ui = createUI(document.getElementById("ui-root"));
const keysHeld = {};
const clock = new THREE.Clock();

let sceneBundle = null;
let player = null;
let boss = null;
let phase1 = null;
let phase2 = null;
let assets = null;
let dialogue = null;

async function ensureGameCreated() {
  if (sceneBundle) {
    return;
  }
  sceneBundle = createScene(canvas, assets?.waterfallImage);
  player = createPlayer(sceneBundle.scene);
  boss = createBoss(sceneBundle.scene);
  phase1 = createPhase1Controller(sceneBundle.scene, player, assets?.spearGLTF);
  phase2 = createPhase2Controller(sceneBundle.scene, player, assets?.spearGLTF);
  phase1.prewarm?.();
  phase2.prewarm?.();
  resetRunState();
}

function resetRunState() {
  boss.resetState();
  player.resetState();
  phase1?.clearSpears();
  phase2?.clearSpears();
  phase2?.exit();
  GameState.phase = "MENU";
}

function setPhase(nextPhase) {
  if (GameState.phase === nextPhase) {
    return;
  }

  if (GameState.phase === "PHASE1") {
    phase1.exit();
  }
  if (GameState.phase === "PHASE2") {
    phase2.exit();
  }

  GameState.phase = nextPhase;

  if (nextPhase === "PHASE1") {
    sceneBundle.setCameraMode("PHASE1");
    phase1.enter();
  } else if (nextPhase === "PHASE2") {
    sceneBundle.setCameraMode("PHASE2");
    phase2.enter();
  } else if (nextPhase === "INTRO_DIALOGUE" || nextPhase === "VICTORY_DIALOGUE") {
    sceneBundle.setCameraMode("BOSS");
  }
}

function stopMusic() {
  if (!GameState.music) {
    return;
  }
  GameState.music.pause();
  GameState.music.currentTime = 0;
}

function startMusic() {
  if (!GameState.music) {
    GameState.music = new Audio("./music/truehero.mp3");
    GameState.music.loop = true;
    GameState.music.volume = 0.6;
  }
  GameState.music.currentTime = 0;
  GameState.music.play().catch(() => {});
}

function beginDialogue(lines, onDone, options = {}) {
  dialogue = {
    lines,
    index: 0,
    shownText: "",
    charTimer: 0,
    completed: false,
    onDone,
    autoAfterComplete: options.autoAfterComplete ?? null,
    elapsedAfterComplete: 0
  };
}

function clearDialogue() {
  dialogue = null;
  ui.hideDialogue();
}

function advanceDialogue() {
  if (!dialogue) {
    return;
  }
  const fullLine = dialogue.lines[dialogue.index];
  if (!dialogue.completed) {
    dialogue.shownText = fullLine;
    dialogue.completed = true;
    return;
  }
  dialogue.index += 1;
  if (dialogue.index >= dialogue.lines.length) {
    const done = dialogue.onDone;
    clearDialogue();
    done?.();
    return;
  }
  dialogue.shownText = "";
  dialogue.charTimer = 0;
  dialogue.completed = false;
  dialogue.elapsedAfterComplete = 0;
}

function handleAttack() {
  if (!player.tryAttack()) {
    return;
  }
  boss.takeHit();
  player.healFromAttack();
  if (GameState.bossHP <= 0) {
    phase1.clearSpears();
    phase2.clearSpears();
    stopMusic();
    setPhase("VICTORY_DIALOGUE");
    beginDialogue(VICTORY_LINES, () => {
      GameState.phase = "VICTORY";
      ui.setScreen("victory");
      ui.showOverlay({
        title: "You won!",
        copy: "Parabéns! Entraste para a guarda real.",
        buttons: [
          { label: "Menu", onClick: () => goToMenu() }
        ]
      });
    }, { autoAfterComplete: VICTORY_AUTO_MS / 1000 });
  }
}

function handleDefeat() {
  phase1.clearSpears();
  phase2.clearSpears();
  stopMusic();
  GameState.phase = "DEFEAT";
  ui.setScreen("defeat");
  ui.showOverlay({
    title: "GAME OVER",
    copy: "Parece que não é desta que entras para a guarda real. Tu ainda não podes desistir...",
    buttons: [
      { label: "Jogar de novo", onClick: () => startRun() },
      { label: "Menu", onClick: () => goToMenu() }
    ]
  });
}

function goToMenu() {
  stopMusic();
  clearDialogue();
  phase1?.exit();
  phase2?.exit();
  boss?.resetState();
  player?.resetState();
  GameState.phase = "MENU";
  ui.hideOverlay();
  ui.setScreen("menu");
  sceneBundle?.setCameraMode("PHASE1");
}

async function startRun() {
  ui.hideOverlay();
  ui.setScreen("loading");
  ui.setLoadingProgress(0);
  assets = await preloadAssets((progress) => ui.setLoadingProgress(progress));
  await ensureGameCreated();
  boss.resetState();
  player.resetState();
  sceneBundle.setCameraMode("BOSS");
  setPhase("INTRO_DIALOGUE");
  ui.setScreen("intro");
  beginDialogue(INTRO_LINES, () => {
    startMusic();
    ui.setScreen("phase1");
    setPhase("PHASE1");
  });
}

function updateDialogue(delta) {
  if (!dialogue || !sceneBundle || !boss) {
    ui.hideDialogue();
    return;
  }

  const line = dialogue.lines[dialogue.index];
  if (!dialogue.completed) {
    dialogue.charTimer += delta;
    const charsToShow = Math.floor((dialogue.charTimer * 1000) / TYPEWRITER_MS);
    dialogue.shownText = line.slice(0, charsToShow);
    if (dialogue.shownText.length >= line.length) {
      dialogue.shownText = line;
      dialogue.completed = true;
    }
  } else if (dialogue.autoAfterComplete) {
    dialogue.elapsedAfterComplete += delta;
    if (dialogue.elapsedAfterComplete >= dialogue.autoAfterComplete) {
      advanceDialogue();
      return;
    }
  }

  const anchor = ui.projectWorldToScreen(sceneBundle.camera, boss.getDialogueAnchor());
  ui.showDialogue(dialogue.shownText, anchor);
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  keysHeld[key] = true;

  if (key === " " || event.code === "Space") {
    if (GameState.phase === "PHASE2") {
      player.startJump();
    }
    event.preventDefault();
  }

  if (["arrowup", "arrowleft", "arrowdown", "arrowright"].includes(key) && GameState.phase === "PHASE1") {
    player.setShieldDirection(key);
  }

  if (key === "c") {
    if (dialogue) {
      advanceDialogue();
      return;
    }
    if (GameState.phase === "PHASE1" || GameState.phase === "PHASE2") {
      handleAttack();
    }
  }
}

function handleKeyUp(event) {
  keysHeld[event.key.toLowerCase()] = false;
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

ui.playButton.addEventListener("click", () => {
  startRun().catch((error) => {
    console.error(error);
  });
});

async function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (sceneBundle && player && boss) {
    sceneBundle.update(delta, elapsed);
    boss.update(delta);

    if (GameState.phase === "PHASE1" || GameState.phase === "PHASE2") {
      player.update(keysHeld, delta);
    }

    if (GameState.phase === "PHASE1" && phase1.update(delta, elapsed)) {
      setPhase("PHASE2");
      ui.setScreen("phase2");
    } else if (GameState.phase === "PHASE2" && phase2.update(delta, elapsed)) {
      player.centerPlayer();
      setPhase("PHASE1");
      ui.setScreen("phase1");
    }

    if (GameState.playerHP <= 0 && GameState.phase !== "DEFEAT") {
      handleDefeat();
    }

    ui.updateHUD({
      bossHP: GameState.bossHP,
      bossMax: boss.maxHP,
      playerHP: GameState.playerHP,
      playerMax: player.maxLives,
      attackProgress: GameState.attackBarProgress
    });
  }

  updateDialogue(delta);
  sceneBundle?.render();
}

ui.setScreen("menu");
animate();
