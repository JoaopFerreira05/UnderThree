import * as THREE from "three";
import { GameState } from "./main.js";

const MAX_HP = 7;
const BOSS_POSITION = new THREE.Vector3(0, 1, -5);
const RECOIL_DISTANCE = 0.5;
const FLASH_DURATION = 0.3;
const RETURN_SPEED = 4;

export function createBoss(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x00ccaa,
    emissive: 0x000000
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.copy(BOSS_POSITION);
  scene.add(mesh);

  let recoilTimer = 0;
  let flashTimer = 0;

  function resetState() {
    GameState.bossHP = MAX_HP;
    recoilTimer = 0;
    flashTimer = 0;
    mesh.position.copy(BOSS_POSITION);
    material.color.setHex(0x00ccaa);
    material.emissive.setHex(0x000000);
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
    if (recoilTimer > 0) {
      recoilTimer = Math.max(0, recoilTimer - delta * RETURN_SPEED);
      const offset = recoilTimer * RECOIL_DISTANCE;
      mesh.position.z = BOSS_POSITION.z - offset;
      if (recoilTimer === 0) {
        mesh.position.copy(BOSS_POSITION);
      }
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
    takeHit,
    update,
    getDialogueAnchor: () => mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0))
  };
}
