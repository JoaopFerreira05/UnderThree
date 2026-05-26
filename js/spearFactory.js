import * as THREE from "three";

const DEFAULT_SCALE = 0.03;
const MAGIC_ORB_COUNT = 3;
const MAGIC_RING_COUNT = 2;
const ORB_GEOMETRY = new THREE.SphereGeometry(0.05, 6, 6);
const ORB_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xaee6ff,
  transparent: true,
  opacity: 0.82
});
const RING_GEOMETRY = new THREE.TorusGeometry(0.16, 0.012, 6, 16);
const RING_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x7edbff,
  transparent: true,
  opacity: 0.28
});
const FALLBACK_SPEAR_GEOMETRY = new THREE.CylinderGeometry(0.1, 0.15, 2, 8);
const FALLBACK_SPEAR_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x58a6ff,
  emissive: 0x2d7cff,
  emissiveIntensity: 1
});

function tintMaterial(material) {
  const cloned = material.clone();
  if ("color" in cloned) {
    cloned.color = cloned.color.clone();
    cloned.color.lerp(new THREE.Color(0x58a6ff), 0.7);
  }
  if ("emissive" in cloned) {
    cloned.emissive = new THREE.Color(0x2d7cff);
    cloned.emissiveIntensity = 1.1;
  }
  if ("metalness" in cloned) {
    cloned.metalness = 0.4;
  }
  if ("roughness" in cloned) {
    cloned.roughness = 0.28;
  }
  return cloned;
}

function createMagicAura() {
  const aura = new THREE.Group();

  for (let i = 0; i < MAGIC_ORB_COUNT; i += 1) {
    const orb = new THREE.Mesh(ORB_GEOMETRY, ORB_MATERIAL);
    const angle = (i / MAGIC_ORB_COUNT) * Math.PI * 2;
    orb.position.set(Math.cos(angle) * 0.18, -0.45 + i * 0.25, Math.sin(angle) * 0.18);
    orb.userData = {
      base: orb.position.clone(),
      phase: Math.random() * Math.PI * 2
    };
    aura.add(orb);
  }

  for (let i = 0; i < MAGIC_RING_COUNT; i += 1) {
    const ring = new THREE.Mesh(
      RING_GEOMETRY,
      RING_MATERIAL
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.2 + i * 0.45;
    ring.userData = {
      spin: 0.5 + i * 0.2
    };
    aura.add(ring);
  }
  return aura;
}

export function createSpearFactory(gltf) {
  const source = gltf?.scene ?? null;

  function buildBaseModel(orientation) {
    if (!source) {
      const mesh = new THREE.Mesh(
        FALLBACK_SPEAR_GEOMETRY,
        FALLBACK_SPEAR_MATERIAL
      );
      if (orientation === "horizontal") {
        mesh.rotation.z = Math.PI / 2;
      }
      return mesh;
    }

    const model = source.clone(true);
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = tintMaterial(child.material);
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    model.scale.setScalar(DEFAULT_SCALE);
    if (orientation === "horizontal") {
      model.rotation.z = Math.PI / 2;
    } else {
      model.rotation.x = - Math.PI / 2;
      model.rotation.z = 0;
    }
    return model;
  }

  return {
    create({ orientation = "horizontal" } = {}) {
      const group = new THREE.Group();
      const model = buildBaseModel(orientation);
      const aura = createMagicAura();

      group.add(model, aura);
      group.userData.aura = aura;
      group.userData.model = model;
      return group;
    },
    updateMagic(spear, elapsed) {
      const aura = spear.userData.aura;
      if (!aura) {
        return;
      }
      aura.children.forEach((child, index) => {
        if (child.isMesh && child.geometry === ORB_GEOMETRY) {
          const { base, phase } = child.userData;
          child.position.x = base.x + Math.sin(elapsed * 2.4 + phase) * 0.04;
          child.position.z = base.z + Math.cos(elapsed * 2.1 + phase) * 0.04;
          child.position.y = base.y + Math.sin(elapsed * 3 + phase) * 0.03;
        }
        if (child.isMesh && child.geometry === RING_GEOMETRY) {
          child.rotation.z += 0.01 * (child.userData.spin ?? 1);
          child.scale.setScalar(1 + Math.sin(elapsed * 2 + index) * 0.03);
        }
      });
    }
  };
}
