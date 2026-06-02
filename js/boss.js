import * as THREE from "three";
import { GameState } from "./main.js";

const MAX_HP = 7;
const BOSS_STAGE_POSITION = new THREE.Vector3(0, 1, -5);
const BOSS_WATERFALL_POSITION = new THREE.Vector3(0, 3.2, -8.6);
const RECOIL_DISTANCE = 0.5;
const FLASH_DURATION = 0.3;
const RETURN_SPEED = 4;
const MOVE_LERP_SPEED = 2.8;

export function createBoss(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ccaa,
    emissive: 0x000000
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.copy(BOSS_STAGE_POSITION);
  scene.add(mesh);

  let recoilTimer = 0;
  let flashTimer = 0;
  const targetPosition = BOSS_STAGE_POSITION.clone();

  function resetState() {
    GameState.bossHP = MAX_HP;
    recoilTimer = 0;
    flashTimer = 0;
    targetPosition.copy(BOSS_STAGE_POSITION);
    mesh.position.copy(BOSS_STAGE_POSITION);
    material.color.setHex(0x00ccaa);
    material.emissive.setHex(0x000000);
  }

  function moveToWaterfall() {
    targetPosition.copy(BOSS_WATERFALL_POSITION);
  }

  function moveToStage() {
    targetPosition.copy(BOSS_STAGE_POSITION);
  }

  function takeHit() {
    if (GameState.bossHP <= 0) {
      return;
    }
    GameState.bossHP = Math.max(0, GameState.bossHP - 1);
    recoilTimer = 1;
    flashTimer = FLASH_DURATION;
    material.color.setHex(0xff00cc);
    material.emissive.setHex(0x550022);
  }

  function update(delta) {
    mesh.position.lerp(targetPosition, Math.min(delta * MOVE_LERP_SPEED, 1));

    if (recoilTimer > 0) {
      recoilTimer = Math.max(0, recoilTimer - delta * RETURN_SPEED);
      const offset = recoilTimer * RECOIL_DISTANCE;
      mesh.position.z = targetPosition.z - offset;
    }

    if (flashTimer > 0) {
      flashTimer = Math.max(0, flashTimer - delta);
      if (flashTimer === 0) {
        material.color.setHex(0x00ccaa);
        material.emissive.setHex(0x000000);
      }
    }
  }

  return {
    mesh,
    maxHP: MAX_HP,
    resetState,
    moveToWaterfall,
    moveToStage,
    takeHit,
    update,
    getDialogueAnchor: () => mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0))
  };
}
