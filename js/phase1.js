import * as THREE from "three";
import { GameState } from "./main.js";
import { PHASE1_PATTERNS, PHASE_TRANSITION } from "./patterns/battlePatterns.js";
import { createSpearFactory } from "./spearFactory.js";

const SPEAR_SPEED = 8;
const SPEAR_TRAVEL_LIMIT = 25;

const ORIGINS = {
  1: { position: new THREE.Vector3(0, 0.5, 10), velocity: new THREE.Vector3(0, 0, -1), rotation: new THREE.Euler(0, Math.PI, 0) },
  2: { position: new THREE.Vector3(-10, 0.5, 0), velocity: new THREE.Vector3(1, 0, 0), rotation: new THREE.Euler(0, Math.PI / 2, 0) },
  3: { position: new THREE.Vector3(0, 0.5, -10), velocity: new THREE.Vector3(0, 0, 1), rotation: new THREE.Euler(0, 0, 0) },
  4: { position: new THREE.Vector3(10, 0.5, 0), velocity: new THREE.Vector3(-1, 0, 0), rotation: new THREE.Euler(0, -Math.PI / 2, 0) }
};

function createShotPattern({ interval, sequence }) {
  let idx = 0;
  return {
    interval,
    getNext() {
      const val = sequence[idx % sequence.length];
      idx += 1;
      return val;
    },
    reset() {
      idx = 0;
    },
    getIndex() {
      return idx;
    },
    getLength() {
      return sequence.length;
    }
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

export function createPhase1Controller(scene, player, spearAsset) {
  const spears = [];
  const spearBox = new THREE.Box3();
  const spearFactory = createSpearFactory(spearAsset);
  let prewarmed = false;

  let currentBracket = null;
  let pattern = null;
  let spawnTimer = 0;
  let completedLoops = 0;
  let active = false;

  function clearSpears() {
    while (spears.length) {
      const spear = spears.pop();
      scene.remove(spear.mesh);
    }
  }

  function setPatternForCurrentHP() {
    const bracket = getBracketKey();
    if (currentBracket === bracket && pattern) {
      return;
    }
    currentBracket = bracket;
    pattern = createShotPattern(PHASE1_PATTERNS[bracket]);
    spawnTimer = pattern.interval;
    completedLoops = 0;
  }

  function resetCycle() {
    pattern = createShotPattern(PHASE1_PATTERNS[getBracketKey()]);
    currentBracket = getBracketKey();
    spawnTimer = pattern.interval;
    completedLoops = 0;
  }

  function spawnSpear(directionId) {
    if (directionId === 0 || !ORIGINS[directionId]) {
      return;
    }
    const origin = ORIGINS[directionId];
    const mesh = spearFactory.create({ orientation: "horizontal" });
    mesh.position.copy(origin.position);
    mesh.rotation.copy(origin.rotation);
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });
    scene.add(mesh);
    spears.push({
      mesh,
      velocity: origin.velocity.clone(),
      origin: origin.position.clone()
    });
  }

  function prewarm() {
    if (prewarmed) {
      return;
    }
    prewarmed = true;

    const warmupSpears = [1, 2, 3, 4].map((directionId) => {
      const origin = ORIGINS[directionId];
      const mesh = spearFactory.create({ orientation: "horizontal" });
      mesh.position.copy(origin.position);
      mesh.rotation.copy(origin.rotation);
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    });

    for (const mesh of warmupSpears) {
      scene.remove(mesh);
    }
  }

  function enter() {
    active = true;
    player.showShield(true);
    player.centerPlayer();
    resetCycle();
  }

  function exit() {
    active = false;
    clearSpears();
  }

  function update(delta, elapsed) {
    if (!active) {
      return false;
    }

    setPatternForCurrentHP();
    spawnTimer -= delta;
    if (spawnTimer <= 0) {
      const next = pattern.getNext();
      spawnSpear(next);
      spawnTimer += pattern.interval;

      if (pattern.getIndex() % pattern.getLength() === 0) {
        completedLoops += 1;
      }
    }

    const shieldBox = player.getShieldBox();
    const playerBox = player.getPlayerBox();

    for (let i = spears.length - 1; i >= 0; i -= 1) {
      const spear = spears[i];
      spear.mesh.position.addScaledVector(spear.velocity, SPEAR_SPEED * delta);
      spearFactory.updateMagic(spear.mesh, elapsed + i * 0.17);
      spearBox.setFromObject(spear.mesh);

      if (player.shield.visible && spearBox.intersectsBox(shieldBox)) {
        player.flashShield();
        scene.remove(spear.mesh);
        spears.splice(i, 1);
        continue;
      }

      if (spearBox.intersectsBox(playerBox)) {
        player.applyDamage();
        scene.remove(spear.mesh);
        spears.splice(i, 1);
        continue;
      }

      if (spear.mesh.position.distanceTo(spear.origin) > SPEAR_TRAVEL_LIMIT) {
        scene.remove(spear.mesh);
        spears.splice(i, 1);
      }
    }

    return completedLoops >= PHASE_TRANSITION.phase1LoopsBeforePhase2;
  }

  return {
    prewarm,
    enter,
    exit,
    update,
    clearSpears
  };
}
