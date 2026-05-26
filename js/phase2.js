import * as THREE from "three";
import { GameState } from "./main.js";
import { PHASE2_PATTERNS, PHASE_TRANSITION } from "./patterns/battlePatterns.js";
import { createSpearFactory } from "./spearFactory.js";

const TILE_SIZE = 1;
const TILE_COUNT = 49;
const WARNING_COLOR = 0x5599ff;
const SPEAR_UP_Y = 0.5;
const SPEAR_DOWN_Y = -1;
const SPEAR_HITBOX_SIZE = new THREE.Vector3(0.55, 2.2, 0.55);

function tileToWorld(tileNumber) {
  const idx = tileNumber - 1;
  const col = idx % 7;
  const row = Math.floor(idx / 7);
  return {
    x: col - 3,
    z: row - 3
  };
}

function getBracketKey() {
  if (GameState.bossHP >= 6) return "hp7";
  if (GameState.bossHP >= 5) return "hp6";
  if (GameState.bossHP >= 4) return "hp5";
  if (GameState.bossHP >= 3) return "hp4";
  if (GameState.bossHP >= 2) return "hp3";
  if (GameState.bossHP >= 1) return "hp2";
  return "hp1";
}

export function createPhase2Controller(scene, player, spearAsset) {
  const warningPool = new Map();
  const spearPool = [];
  const activeSpears = [];
  const warningMat = new THREE.MeshBasicMaterial({
    color: WARNING_COLOR,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide
  });
  const spearBox = new THREE.Box3();
  const spearFactory = createSpearFactory(spearAsset);

  let currentBracket = null;
  let waves = [];
  let waveIndex = 0;
  let state = "idle";
  let stateTimer = 0;
  let active = false;
  let currentWave = null;
  let finishedCycle = false;

  function getWaveTiming(wave) {
    return {
      interval: wave?.interval ?? 0,
      warningDuration: wave?.warningDuration ?? PHASE_TRANSITION.phase2WarningDuration,
      holdDuration: wave?.holdDuration ?? PHASE_TRANSITION.phase2HoldDuration,
      riseDuration: wave?.riseDuration ?? PHASE_TRANSITION.phase2RiseDuration,
      retractDuration: wave?.retractDuration ?? PHASE_TRANSITION.phase2RetractDuration
    };
  }

  function initWarningPool() {
    if (warningPool.size > 0) {
      return;
    }
    for (let tile = 1; tile <= TILE_COUNT; tile += 1) {
      const marker = new THREE.Mesh(new THREE.PlaneGeometry(TILE_SIZE * 0.92, TILE_SIZE * 0.92), warningMat);
      const { x, z } = tileToWorld(tile);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(x, 0.03, z);
      marker.visible = false;
      scene.add(marker);
      warningPool.set(tile, { marker });
    }
  }

  function initSpearPool() {
    if (spearPool.length > 0) {
      return;
    }
    for (let i = 0; i < TILE_COUNT; i += 1) {
      const mesh = spearFactory.create({ orientation: "vertical" });
      mesh.visible = false;
      mesh.position.y = SPEAR_DOWN_Y;
      scene.add(mesh);
      spearPool.push(mesh);
    }
  }

  function showWarning(tile) {
    const warning = warningPool.get(tile);
    if (!warning) {
      return;
    }
    warning.marker.visible = true;
  }

  function hideWarning(tile) {
    const warning = warningPool.get(tile);
    if (!warning) {
      return;
    }
    warning.marker.visible = false;
  }

  function cleanupActiveWave() {
    clearWarnings();
    clearSpears();
    currentWave = null;
  }

  function clearWarnings() {
    for (const { marker } of warningPool.values()) {
      marker.visible = false;
    }
  }

  function clearSpears() {
    activeSpears.length = 0;
    for (const spear of spearPool) {
      spear.visible = false;
      spear.position.y = SPEAR_DOWN_Y;
    }
  }

  function setPatternForCurrentHP() {
    const bracket = getBracketKey();
    if (currentBracket === bracket && waves.length) {
      return;
    }
    cleanupActiveWave();
    currentBracket = bracket;
    waves = PHASE2_PATTERNS[bracket];
    waveIndex = 0;
    state = "idle";
    stateTimer = getWaveTiming(waves[waveIndex]).interval;
    finishedCycle = false;
  }

  function resetCycle() {
    currentBracket = getBracketKey();
    waves = PHASE2_PATTERNS[currentBracket];
    waveIndex = 0;
    state = "idle";
    stateTimer = getWaveTiming(waves[waveIndex]).interval;
    currentWave = null;
    finishedCycle = false;
  }

  function prepareWave() {
    currentWave = waves[waveIndex];
    const timing = getWaveTiming(currentWave);
    state = "warning";
    stateTimer = timing.warningDuration;
    for (const tile of currentWave.spears) {
      showWarning(tile);
    }
  }

  function raiseSpears() {
    clearSpears();
    const timing = getWaveTiming(currentWave);
    currentWave.spears.forEach((tile, index) => {
      const { x, z } = tileToWorld(tile);
      const mesh = spearPool[index];
      mesh.position.set(x, SPEAR_DOWN_Y, z);
      mesh.visible = true;
      activeSpears.push({ mesh, tile });
    });
    state = "rising";
    stateTimer = timing.riseDuration;
  }

  function updateSpearHeights(progress) {
    const y = THREE.MathUtils.lerp(SPEAR_DOWN_Y, SPEAR_UP_Y, progress);
    for (const spear of activeSpears) {
      spear.mesh.position.y = y;
    }
  }

  function checkDamage() {
    if (player.isAirborne()) {
      return;
    }
    const playerBox = player.getPlayerBox();
    for (const spear of activeSpears) {
      spearBox.setFromCenterAndSize(spear.mesh.position, SPEAR_HITBOX_SIZE);
      if (spearBox.intersectsBox(playerBox)) {
        player.applyDamage();
        return;
      }
    }
  }

  function advanceWave() {
    if (currentWave) {
      for (const tile of currentWave.spears) {
        hideWarning(tile);
      }
    }
    waveIndex += 1;
    if (waveIndex >= waves.length) {
      finishedCycle = true;
      waveIndex = 0;
    }
    state = "idle";
    stateTimer = finishedCycle ? 0 : getWaveTiming(waves[waveIndex]).interval;
    currentWave = null;
  }

  function enter() {
    prewarm();
    active = true;
    player.showShield(false);
    player.centerPlayer();
    resetCycle();
  }

  function prewarm() {
    initWarningPool();
    initSpearPool();
  }

  function exit() {
    active = false;
    cleanupActiveWave();
    state = "idle";
    stateTimer = 0;
    finishedCycle = false;
  }

  function update(delta, elapsed) {
    if (!active) {
      return false;
    }

    stateTimer -= delta;

    if (state === "idle" && stateTimer <= 0) {
      prepareWave();
    } else if (state === "warning" && stateTimer <= 0) {
      raiseSpears();
    } else if (state === "rising") {
      const timing = getWaveTiming(currentWave);
      const progress = 1 - Math.max(stateTimer, 0) / timing.riseDuration;
      updateSpearHeights(progress);
      if (stateTimer <= 0) {
        updateSpearHeights(1);
        state = "hold";
        stateTimer = timing.holdDuration;
        checkDamage();
      }
    } else if (state === "hold") {
      checkDamage();
      if (stateTimer <= 0) {
        state = "retract";
        stateTimer = getWaveTiming(currentWave).retractDuration;
      }
    } else if (state === "retract") {
      const timing = getWaveTiming(currentWave);
      const progress = Math.max(stateTimer, 0) / timing.retractDuration;
      updateSpearHeights(progress);
      if (stateTimer <= 0) {
        clearSpears();
        advanceWave();
      }
    }

    for (let i = 0; i < activeSpears.length; i += 1) {
      if (i < 8) {
        spearFactory.updateMagic(activeSpears[i].mesh, elapsed + i * 0.23);
      }
    }

    return finishedCycle && state === "idle";
  }

  return {
    prewarm,
    enter,
    exit,
    update,
    clearSpears,
    tileToWorld
  };
}
