import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GameState } from "./main.js";

const PLAYER_COLOR = 0x00cc66;
const SHIELD_COLOR = 0x4488ff;
const STICKMAN_MODEL_PATH = "./stickman/source/Simple_Character.fbx";
const STICKMAN_TEXTURE_PATH = "./stickman/textures/Texture.0.1.png";
const STICKMAN_TARGET_HEIGHT = 1.35;
const STICKMAN_Y_OFFSET = -0.5;
const STICKMAN_FORWARD_OFFSET = Math.PI;
const RUN_BOB_SPEED = 12;
const RUN_BOB_HEIGHT = 0.08;
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
  const modelBox = new THREE.Box3();
  let currentShieldAngle = Math.PI;
  let targetShieldAngle = Math.PI;
  let activeShieldKey = "w";
  let jumpTime = 0;
  let isJumping = false;
  let invincibleTimer = 0;
  let hitFlashTimer = 0;
  let stickmanRoot = null;
  let stickmanModel = null;
  let stickmanMixer = null;
  let idleAction = null;
  let runningAction = null;
  let currentAction = null;
  let runAnimTime = 0;
  let modelBaseY = STICKMAN_Y_OFFSET;
  const originalModelMaterials = [];

  function syncStickmanTransform() {
    if (!stickmanRoot) {
      return;
    }
    stickmanRoot.position.set(mesh.position.x, mesh.position.y + modelBaseY, mesh.position.z);
  }

  function switchAction(nextAction) {
    if (!nextAction || nextAction === currentAction) {
      return;
    }
    if (currentAction) {
      currentAction.fadeOut(0.15);
    }
    nextAction.reset().fadeIn(0.15).play();
    currentAction = nextAction;
  }

  function setStickmanDirection(move) {
    if (!stickmanRoot || move.lengthSq() === 0) {
      return;
    }
    const targetRotation = Math.atan2(move.x, move.z) + STICKMAN_FORWARD_OFFSET;
    let diff = targetRotation - stickmanRoot.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    stickmanRoot.rotation.y += diff * 0.35;
  }

  function updateProceduralRun(isMoving, delta) {
    if (!stickmanRoot) {
      return;
    }

    if (isMoving) {
      runAnimTime += delta * RUN_BOB_SPEED;
      stickmanRoot.position.y = mesh.position.y + modelBaseY + Math.sin(runAnimTime) * RUN_BOB_HEIGHT;
      stickmanRoot.rotation.z = Math.sin(runAnimTime) * 0.06;
    } else {
      stickmanRoot.position.y = THREE.MathUtils.lerp(stickmanRoot.position.y, mesh.position.y + modelBaseY, Math.min(delta * 10, 1));
      stickmanRoot.rotation.z = THREE.MathUtils.lerp(stickmanRoot.rotation.z, 0, Math.min(delta * 10, 1));
    }
  }

  function setupStickmanAnimations(animations) {
    if (!animations.length || !stickmanModel) {
      return;
    }

    stickmanMixer = new THREE.AnimationMixer(stickmanModel);
    const byName = (name) => animations.find((clip) => clip.name.toLowerCase().includes(name));
    const idleClip = byName("idle") ?? animations[0];
    const runClip = byName("run") ?? byName("walk") ?? byName("running");

    idleAction = stickmanMixer.clipAction(idleClip);
    idleAction.setLoop(THREE.LoopRepeat);
    idleAction.play();
    currentAction = idleAction;

    if (runClip && runClip !== idleClip) {
      runningAction = stickmanMixer.clipAction(runClip);
      runningAction.setLoop(THREE.LoopRepeat);
    }
  }

  function normalizeStickmanModel(model) {
    modelBox.setFromObject(model);
    const size = new THREE.Vector3();
    modelBox.getSize(size);
    if (size.y > 0) {
      model.scale.multiplyScalar(STICKMAN_TARGET_HEIGHT / size.y);
    }

    modelBox.setFromObject(model);
    model.position.y -= modelBox.min.y;
    model.rotation.y = STICKMAN_FORWARD_OFFSET;
  }

  function loadStickmanModel() {
    const texture = new THREE.TextureLoader().load(STICKMAN_TEXTURE_PATH);
    texture.flipY = true;

    const loader = new FBXLoader();
    loader.load(
      STICKMAN_MODEL_PATH,
      (object) => {
        stickmanRoot = new THREE.Group();
        stickmanModel = object;
        normalizeStickmanModel(stickmanModel);

        stickmanModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((mat) => {
                mat.map = mat.map ?? texture;
                mat.needsUpdate = true;
                originalModelMaterials.push({
                  material: mat,
                  color: mat.color?.clone(),
                  emissive: mat.emissive?.clone()
                });
              });
            }
          }
        });

        stickmanRoot.add(stickmanModel);
        scene.add(stickmanRoot);
        mesh.visible = false;
        setupStickmanAnimations(object.animations ?? []);
        syncStickmanTransform();
      },
      undefined,
      (error) => {
        console.warn("Could not load stickman model, keeping cube player.", error);
      }
    );
  }

  loadStickmanModel();

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
    if (idleAction) {
      switchAction(idleAction);
    }
    syncStickmanTransform();
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
    originalModelMaterials.forEach(({ material: mat }) => {
      if (mat.color) mat.color.setHex(0xff5555);
      if (mat.emissive) mat.emissive.setHex(0x550000);
    });
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
    return move;
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
    let move = new THREE.Vector3();
    let isMoving = false;

    if (GameState.phase === "PHASE2") {
      move = updateMovement(keysHeld, delta);
      isMoving = move.lengthSq() > 0;
      setStickmanDirection(move);
      updateJump(delta);
    } else {
      mesh.position.y = 0.5;
      shadow.scale.setScalar(1);
    }

    if (stickmanMixer) {
      switchAction(isMoving && runningAction ? runningAction : idleAction);
    }
    syncStickmanTransform();
    updateProceduralRun(isMoving && !runningAction, delta);
    updateShieldTransform(delta);

    if (invincibleTimer > 0) {
      invincibleTimer = Math.max(0, invincibleTimer - delta);
    }
    if (hitFlashTimer > 0) {
      hitFlashTimer = Math.max(0, hitFlashTimer - delta);
      if (hitFlashTimer === 0) {
        material.emissive.setHex(0x000000);
        originalModelMaterials.forEach(({ material: mat, color, emissive }) => {
          if (color && mat.color) mat.color.copy(color);
          if (emissive && mat.emissive) mat.emissive.copy(emissive);
        });
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
    syncStickmanTransform();
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
    getMixer: () => stickmanMixer,
    isAirborne: () => isJumping,
    getPosition: () => mesh.position
  };
}
