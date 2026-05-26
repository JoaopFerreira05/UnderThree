import * as THREE from "three";
import { GameState } from "./main.js";

const PLAYER_COLOR = 0x00cc66;
const SHIELD_COLOR = 0x4488ff;
const MAX_LIVES = 4;
const ATTACK_CHARGE_TIME = 20;
const MOVE_SPEED = 5;
const JUMP_DURATION = 0.6;
const JUMP_HEIGHT = 1;
const ARENA_MIN = -3;
const ARENA_MAX = 3;
const SHIELD_DISTANCE = 0.8;
const INVINCIBILITY_DURATION = 1.5;
const HIT_FLASH_MS = 250;

const SHIELD_DIRECTIONS = {
  arrowup: { offset: new THREE.Vector3(0, 0, -SHIELD_DISTANCE), angle: Math.PI },
  arrowleft: { offset: new THREE.Vector3(-SHIELD_DISTANCE, 0, 0), angle: Math.PI / 2 },
  arrowdown: { offset: new THREE.Vector3(0, 0, SHIELD_DISTANCE), angle: 0 },
  arrowright: { offset: new THREE.Vector3(SHIELD_DISTANCE, 0, 0), angle: -Math.PI / 2 }
};

export function createPlayer(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: PLAYER_COLOR,
    emissive: 0x000000
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(0, 0.5, 0);

  const shieldMat = new THREE.MeshStandardMaterial({
    color: SHIELD_COLOR,
    transparent: true,
    opacity: 0.75,
    emissive: 0x112244
  });
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.2), shieldMat);
  shield.castShadow = true;
  shield.position.set(0, 0.5, -SHIELD_DISTANCE);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.02, 0);

  scene.add(mesh, shield, shadow);

  const playerBox = new THREE.Box3();
  const shieldBox = new THREE.Box3();
  let currentShieldAngle = Math.PI;
  let targetShieldAngle = Math.PI;
  let activeShieldKey = "w";
  let jumpTime = 0;
  let isJumping = false;
  let invincibleTimer = 0;
  let hitFlashTimer = 0;

  function resetState() {
    GameState.playerHP = MAX_LIVES;
    GameState.attackBarProgress = 0;
    mesh.position.set(0, 0.5, 0);
    shadow.position.set(0, 0.02, 0);
    shadow.scale.setScalar(1);
    shield.visible = true;
    isJumping = false;
    jumpTime = 0;
    invincibleTimer = 0;
    hitFlashTimer = 0;
    material.emissive.setHex(0x000000);
    setShieldDirection("arrowup");
  }

  function setShieldDirection(key) {
    if (!SHIELD_DIRECTIONS[key]) {
      return;
    }
    activeShieldKey = key;
    targetShieldAngle = SHIELD_DIRECTIONS[key].angle;
  }

  function showShield(visible) {
    shield.visible = visible;
  }

  function clampToArena() {
    mesh.position.x = THREE.MathUtils.clamp(mesh.position.x, ARENA_MIN, ARENA_MAX);
    mesh.position.z = THREE.MathUtils.clamp(mesh.position.z, ARENA_MIN, ARENA_MAX);
  }

  function tryAttack() {
    if (GameState.attackBarProgress < 1) {
      return false;
    }
    GameState.attackBarProgress = 0;
    return true;
  }

  function startJump() {
    if (isJumping) {
      return false;
    }
    isJumping = true;
    jumpTime = 0;
    return true;
  }

  function applyDamage() {
    if (invincibleTimer > 0) {
      return false;
    }
    GameState.playerHP = Math.max(0, GameState.playerHP - 1);
    invincibleTimer = INVINCIBILITY_DURATION;
    hitFlashTimer = HIT_FLASH_MS / 1000;
    material.emissive.setHex(0xff0000);
    return true;
  }

  function healFromAttack() {
    GameState.playerHP = Math.min(MAX_LIVES, GameState.playerHP + 1);
  }

  function updateShieldTransform(delta) {
    let diff = targetShieldAngle - currentShieldAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentShieldAngle += diff * Math.min(delta * 10, 1);
    shield.rotation.y = currentShieldAngle;

    const targetOffset = SHIELD_DIRECTIONS[activeShieldKey].offset;
    shield.position.x = THREE.MathUtils.lerp(shield.position.x, mesh.position.x + targetOffset.x, Math.min(delta * 12, 1));
    shield.position.y = THREE.MathUtils.lerp(shield.position.y, mesh.position.y, Math.min(delta * 12, 1));
    shield.position.z = THREE.MathUtils.lerp(shield.position.z, mesh.position.z + targetOffset.z, Math.min(delta * 12, 1));
  }

  function updateMovement(keysHeld, delta) {
    const move = new THREE.Vector3();
    if (keysHeld.arrowup) move.z -= 1;
    if (keysHeld.arrowdown) move.z += 1;
    if (keysHeld.arrowleft) move.x -= 1;
    if (keysHeld.arrowright) move.x += 1;
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(MOVE_SPEED * delta);
      mesh.position.x += move.x;
      mesh.position.z += move.z;
      shadow.position.x = mesh.position.x;
      shadow.position.z = mesh.position.z;
      clampToArena();
    }
  }

  function updateJump(delta) {
    if (!isJumping) {
      mesh.position.y = 0.5;
      shadow.scale.setScalar(1);
      return;
    }
    jumpTime += delta;
    const progress = Math.min(jumpTime / JUMP_DURATION, 1);
    const arc = 4 * progress * (1 - progress);
    mesh.position.y = 0.5 + arc * JUMP_HEIGHT;
    shadow.scale.setScalar(1 - arc * 0.35);
    if (progress >= 1) {
      isJumping = false;
      mesh.position.y = 0.5;
      shadow.scale.setScalar(1);
    }
  }

  function updateAttackCharge(delta) {
    GameState.attackBarProgress = Math.min(1, GameState.attackBarProgress + delta / ATTACK_CHARGE_TIME);
  }

  function update(keysHeld, delta) {
    updateAttackCharge(delta);
    if (GameState.phase === "PHASE2") {
      updateMovement(keysHeld, delta);
      updateJump(delta);
    } else {
      mesh.position.y = 0.5;
      shadow.scale.setScalar(1);
    }

    updateShieldTransform(delta);

    if (invincibleTimer > 0) {
      invincibleTimer = Math.max(0, invincibleTimer - delta);
    }
    if (hitFlashTimer > 0) {
      hitFlashTimer = Math.max(0, hitFlashTimer - delta);
      if (hitFlashTimer === 0) {
        material.emissive.setHex(0x000000);
      }
    }
  }

  function flashShield() {
    shieldMat.color.setHex(0xffffff);
    window.setTimeout(() => {
      shieldMat.color.setHex(SHIELD_COLOR);
    }, 120);
  }

  function centerPlayer() {
    mesh.position.set(0, 0.5, 0);
    shadow.position.set(0, 0.02, 0);
  }

  function getPlayerBox() {
    return playerBox.setFromObject(mesh);
  }

  function getShieldBox() {
    return shieldBox.setFromObject(shield);
  }

  return {
    mesh,
    shadow,
    shield,
    maxLives: MAX_LIVES,
    resetState,
    setShieldDirection,
    showShield,
    tryAttack,
    startJump,
    update,
    applyDamage,
    healFromAttack,
    flashShield,
    centerPlayer,
    getPlayerBox,
    getShieldBox,
    isAirborne: () => isJumping,
    getPosition: () => mesh.position
  };
}
