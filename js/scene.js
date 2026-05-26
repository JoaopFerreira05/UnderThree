import * as THREE from "three";

const PHASE1_CAMERA = new THREE.Vector3(0, 9, 8);
const PHASE2_CAMERA = new THREE.Vector3(0, 14, 14);
const BOSS_CAMERA = new THREE.Vector3(0, 5.5, 6);
const CAMERA_LERP_SPEED = 3;
const PLAY_AREA_LIMIT = 3.5;
const GRID_COLS = 9;
const GRID_ROWS = 9;
const TILE_SIZE = 2;
const PARTICLE_COUNT = 90;
const ENABLE_DECOR_LIGHTS = false;

const COLORS = {
  waterDeep: 0x001830,
  waterMid: 0x003a6e,
  waterGlow: 0x00aaff,
  waterEmissive: 0x0077cc,
  stone: 0x0a0e1c,
  stoneDark: 0x060810,
  stoneMoss: 0x0d1a14,
  rockDark: 0x07091a,
  echoFlower: 0x00eeff,
  echoCore: 0xaaffff,
  mushroomCap: 0x00ccee,
  mushroomStem: 0x002233,
  glowCyan: 0x00ddff,
  glowBlue: 0x0066ff,
  lilyPad: 0x011a0f,
  cattail: 0x001a0a,
  fogColor: 0x010c18
};

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function addPointLight(scene, color, intensity, distance, x, y, z) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  scene.add(light);
  return light;
}

function makeStoneTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rand = seededRandom(11);

  ctx.fillStyle = "#07091a";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(0,30,60,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.moveTo(rand() * size, rand() * size);
    ctx.lineTo(rand() * size, rand() * size);
    ctx.stroke();
  }

  for (let i = 0; i < 1800; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const lum = Math.floor(rand() * 18);
    ctx.fillStyle = `rgba(${lum},${lum + 5},${lum + 20},0.35)`;
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.strokeStyle = "rgba(0,120,200,0.12)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(rand() * size, rand() * size);
    for (let step = 0; step < 4; step += 1) {
      ctx.lineTo(rand() * size, rand() * size);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function makeWaterTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rand = seededRandom(22);

  const bg = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
  bg.addColorStop(0, "#004080");
  bg.addColorStop(1, "#001028");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 7; i += 1) {
    const rx = rand() * size;
    const ry = rand() * size;
    const radius = 10 + rand() * 40;
    const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, radius);
    grad.addColorStop(0, "rgba(0,180,255,0.18)");
    grad.addColorStop(0.5, "rgba(0,120,200,0.08)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(100,220,255,0.15)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i += 1) {
    const y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + (rand() - 0.5) * 20, size * 0.7, y + (rand() - 0.5) * 20, size, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function buildTileMap(cols, rows) {
  const map = [];
  for (let row = 0; row < rows; row += 1) {
    map[row] = [];
    for (let col = 0; col < cols; col += 1) {
      const isBorder = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;
      const isNearBorder = row === 1 || row === rows - 2 || col === 1 || col === cols - 2;
      if (isBorder) {
        map[row][col] = "water";
      } else if (isNearBorder) {
        map[row][col] = "moss";
      } else {
        map[row][col] = "stone";
      }
    }
  }
  return map;
}

function buildEchoFlower(scene, x, z, rand) {
  const group = new THREE.Group();
  const stemHeight = 0.6 + rand() * 0.4;

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, stemHeight, 6),
    new THREE.MeshStandardMaterial({ color: COLORS.cattail, roughness: 0.9 })
  );
  stem.position.y = stemHeight / 2;
  group.add(stem);

  const petalCount = 5 + Math.floor(rand() * 3);
  const petalMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.echoFlower,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide
  });
  for (let i = 0; i < petalCount; i += 1) {
    const angle = (i / petalCount) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.28), petalMaterial);
    petal.position.set(Math.cos(angle) * 0.14, stemHeight + 0.04, Math.sin(angle) * 0.14);
    petal.rotation.y = angle;
    petal.rotation.z = Math.PI / 5;
    group.add(petal);
  }

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshBasicMaterial({ color: COLORS.echoCore })
  );
  core.position.y = stemHeight + 0.07;
  group.add(core);

  const light = ENABLE_DECOR_LIGHTS ? new THREE.PointLight(COLORS.glowCyan, 0.35, 2.8) : null;
  if (light) {
    light.position.y = stemHeight + 0.1;
    group.add(light);
  }

  group.position.set(x, 0, z);
  group.rotation.y = rand() * Math.PI * 2;
  scene.add(group);
  return { group, light, baseIntensity: 0.5, core };
}

function buildMushroom(scene, x, z, rand) {
  const group = new THREE.Group();
  const stemHeight = 0.18 + rand() * 0.15;

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.055, stemHeight, 7),
    new THREE.MeshStandardMaterial({ color: COLORS.mushroomStem, roughness: 0.9 })
  );
  stem.position.y = stemHeight / 2;
  group.add(stem);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.13 + rand() * 0.06, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: COLORS.mushroomCap, transparent: true, opacity: 0.85 })
  );
  cap.position.y = stemHeight;
  group.add(cap);

  const light = ENABLE_DECOR_LIGHTS ? new THREE.PointLight(COLORS.glowCyan, 0.2, 2) : null;
  if (light) {
    light.position.y = stemHeight + 0.1;
    group.add(light);
  }

  group.position.set(x, 0, z);
  scene.add(group);
  return { group, light, cap };
}

function buildCattail(scene, x, z, rand) {
  const height = 0.55 + rand() * 0.35;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, height, 5),
    new THREE.MeshStandardMaterial({ color: COLORS.cattail, roughness: 0.95 })
  );
  stem.position.set(x, height / 2, z);
  scene.add(stem);

  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6),
    new THREE.MeshStandardMaterial({ color: 0x002211 })
  );
  head.position.set(x, height + 0.05, z);
  scene.add(head);
}

function buildLilyPad(scene, x, z, rand) {
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.18 + rand() * 0.1, 10),
    new THREE.MeshStandardMaterial({ color: COLORS.lilyPad, roughness: 0.9 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(x, -0.01, z);
  scene.add(pad);
}

function buildRock(scene, x, z, rand) {
  const size = 0.12 + rand() * 0.22;
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const positions = geo.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    positions.setX(i, positions.getX(i) + (rand() - 0.5) * size * 0.35);
    positions.setY(i, positions.getY(i) + (rand() - 0.5) * size * 0.25);
    positions.setZ(i, positions.getZ(i) + (rand() - 0.5) * size * 0.35);
  }
  geo.computeVertexNormals();

  const rock = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: COLORS.rockDark, roughness: 0.95 })
  );
  rock.position.set(x, size * 0.25, z);
  rock.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
  scene.add(rock);
}

function buildWaterfall(scene, gridWidth, gridDepth) {
  const waterfallGroup = new THREE.Group();

  const cliff = new THREE.Mesh(
    new THREE.BoxGeometry(gridWidth * 0.6, 4, 0.4),
    new THREE.MeshStandardMaterial({ color: COLORS.stoneDark, roughness: 0.97 })
  );
  cliff.position.set(0, 1.5, -gridDepth / 2 - 0.2);
  waterfallGroup.add(cliff);

  for (let layer = 0; layer < 5; layer += 1) {
    const planeGeo = new THREE.PlaneGeometry(gridWidth * 0.18, 3.8, 4, 18);
    const vertices = planeGeo.attributes.position;
    for (let i = 0; i < vertices.count; i += 1) {
      vertices.setX(i, vertices.getX(i) + (Math.random() - 0.5) * 0.08);
    }
    planeGeo.computeVertexNormals();

    const stream = new THREE.Mesh(
      planeGeo,
      new THREE.MeshBasicMaterial({
        color: layer < 2 ? 0xaaeeff : 0x55ccff,
        transparent: true,
        opacity: 0.06 + layer * 0.04,
        side: THREE.DoubleSide
      })
    );
    stream.position.set((layer - 2) * 0.05, 1, -gridDepth / 2 - 0.05 + layer * 0.02);
    stream.userData.waterfallLayer = layer;
    waterfallGroup.add(stream);
  }

  const baseLight = new THREE.PointLight(COLORS.glowCyan, 3.5, gridWidth * 0.9);
  baseLight.position.set(0, 0.5, -gridDepth / 2 + 0.5);
  waterfallGroup.add(baseLight);

  const topLight = new THREE.PointLight(0x40e0ff, 2, gridWidth * 0.6);
  topLight.position.set(0, 3.5, -gridDepth / 2 - 0.1);
  waterfallGroup.add(topLight);

  scene.add(waterfallGroup);
  return { waterfallGroup, baseLight, topLight };
}

function buildParticles(scene, gridWidth, gridDepth, count = PARTICLE_COUNT) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const rand = seededRandom(99);

  let index = 0;
  while (index < count) {
    const x = (rand() - 0.5) * gridWidth * 1.2;
    const y = 0.6 + rand() * 2.8;
    const z = (rand() - 0.5) * gridDepth * 1.2;
    const fromCenter = Math.sqrt(x * x + z * z);
    const arenaRadius = Math.min(gridWidth, gridDepth) * 0.28;
    if (fromCenter < arenaRadius) {
      continue;
    }

    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
    phases[index] = rand() * Math.PI * 2;
    index += 1;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.userData.phases = phases;

  const material = new THREE.PointsMaterial({
    color: 0xaaffff,
    size: 0.045,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return { points, material, basePositions: positions, phases };
}

function buildArenaBorder(scene) {
  const border = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x325070,
    transparent: true,
    opacity: 0.55
  });
  const longWall = new THREE.BoxGeometry(7.2, 0.3, 0.15);
  const shortWall = new THREE.BoxGeometry(0.15, 0.3, 7.2);

  [
    { geo: longWall, pos: [0, 0.15, -3.6] },
    { geo: longWall, pos: [0, 0.15, 3.6] },
    { geo: shortWall, pos: [-3.6, 0.15, 0] },
    { geo: shortWall, pos: [3.6, 0.15, 0] }
  ].forEach(({ geo, pos }) => {
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(...pos);
    border.add(mesh);
  });

  const grid = new THREE.GridHelper(7, 7, 0x5d85aa, 0x29445f);
  grid.position.y = 0.01;
  border.add(grid);
  scene.add(border);
}

function createWaterfallEnvironment(scene) {
  const gridWidth = GRID_COLS * TILE_SIZE;
  const gridDepth = GRID_ROWS * TILE_SIZE;
  const halfWidth = gridWidth / 2;
  const halfDepth = gridDepth / 2;

  scene.background = new THREE.Color(0x050b14);
  scene.fog = new THREE.FogExp2(COLORS.fogColor, 0.038);
  scene.add(new THREE.AmbientLight(0x0a1a2e, 2.2));

  const rimLight = new THREE.DirectionalLight(0x003355, 0.4);
  rimLight.position.set(-10, 14, 8);
  scene.add(rimLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  const centerLight = addPointLight(scene, COLORS.waterGlow, 2.8, gridWidth * 1.1, 0, 0.4, 0);

  const stoneTexture = makeStoneTexture(256);
  const waterTexture = makeWaterTexture(256);
  stoneTexture.repeat.set(1, 1);
  waterTexture.repeat.set(1, 1);

  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTexture,
    color: COLORS.stone,
    roughness: 0.92,
    metalness: 0.05
  });
  const mossMat = new THREE.MeshStandardMaterial({
    map: stoneTexture,
    color: COLORS.stoneMoss,
    roughness: 0.95,
    emissive: 0x001a0a,
    emissiveIntensity: 0.3
  });
  const waterMat = new THREE.MeshStandardMaterial({
    map: waterTexture,
    color: COLORS.waterMid,
    emissive: COLORS.waterEmissive,
    emissiveIntensity: 0.55,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88
  });

  const tileMap = buildTileMap(GRID_COLS, GRID_ROWS);
  const tileGeo = new THREE.BoxGeometry(TILE_SIZE, 0.18, TILE_SIZE);
  const decorRand = seededRandom(42);
  const echoFlowers = [];
  const mushrooms = [];

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const type = tileMap[row][col];
      const material = type === "water" ? waterMat : type === "moss" ? mossMat : stoneMat;

      const tile = new THREE.Mesh(tileGeo, material);
      tile.position.set(
        col * TILE_SIZE - halfWidth + TILE_SIZE / 2,
        -0.09,
        row * TILE_SIZE - halfDepth + TILE_SIZE / 2
      );
      tile.receiveShadow = true;
      scene.add(tile);

      if (type === "water") {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(TILE_SIZE * 0.96, 0.02, TILE_SIZE * 0.96),
          new THREE.MeshBasicMaterial({
            color: COLORS.glowCyan,
            transparent: true,
            opacity: 0.18
          })
        );
        edge.position.copy(tile.position);
        edge.position.y = 0.01;
        scene.add(edge);
      }

      const tx = tile.position.x;
      const tz = tile.position.z;
      if (type === "water" || type === "moss") {
        const roll = decorRand();
        if (roll < 0.28 && type === "moss") {
          echoFlowers.push(
            buildEchoFlower(
              scene,
              tx + (decorRand() - 0.5) * TILE_SIZE * 0.55,
              tz + (decorRand() - 0.5) * TILE_SIZE * 0.55,
              decorRand
            )
          );
        } else if (roll < 0.52 && type === "moss") {
          mushrooms.push(
            buildMushroom(
              scene,
              tx + (decorRand() - 0.5) * TILE_SIZE * 0.5,
              tz + (decorRand() - 0.5) * TILE_SIZE * 0.5,
              decorRand
            )
          );
        } else if (roll < 0.68 && type === "water") {
          buildLilyPad(
            scene,
            tx + (decorRand() - 0.5) * TILE_SIZE * 0.6,
            tz + (decorRand() - 0.5) * TILE_SIZE * 0.6,
            decorRand
          );
        } else if (roll < 0.82 && type === "water") {
          buildCattail(
            scene,
            tx + (decorRand() - 0.5) * TILE_SIZE * 0.45,
            tz + (decorRand() - 0.5) * TILE_SIZE * 0.45,
            decorRand
          );
        } else if (roll < 0.94) {
          buildRock(
            scene,
            tx + (decorRand() - 0.5) * TILE_SIZE * 0.5,
            tz + (decorRand() - 0.5) * TILE_SIZE * 0.5,
            decorRand
          );
        }
      }
    }
  }

  const { waterfallGroup, baseLight, topLight } = buildWaterfall(scene, gridWidth, gridDepth);
  const particles = buildParticles(scene, gridWidth, gridDepth);

  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(gridWidth * 4, gridDepth * 4),
    new THREE.MeshStandardMaterial({
      color: COLORS.waterDeep,
      emissive: 0x001122,
      emissiveIntensity: 0.3,
      roughness: 0.1
    })
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.22;
  scene.add(outer);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x020408, roughness: 1 });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(gridWidth * 3, 8), wallMaterial);
  backWall.position.set(0, 3, -halfDepth - 2);
  scene.add(backWall);

  [-halfWidth - 1.5, halfWidth + 1.5].forEach((x, index) => {
    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(gridDepth * 2, 8), wallMaterial);
    sideWall.rotation.y = index === 0 ? Math.PI / 2 : -Math.PI / 2;
    sideWall.position.set(x, 3, 0);
    scene.add(sideWall);
  });

  buildArenaBorder(scene);

  return {
    update(elapsed) {
      waterMat.emissiveIntensity = 0.42 + Math.sin(elapsed * 0.9) * 0.14;
      centerLight.intensity = 2.4 + Math.sin(elapsed * 1.1) * 0.5;
      baseLight.intensity = 3.2 + Math.sin(elapsed * 2.3) * 0.7;
      topLight.intensity = 1.8 + Math.sin(elapsed * 1.7 + 1) * 0.4;

      waterfallGroup.children.forEach((child) => {
        if (child.userData.waterfallLayer !== undefined) {
          child.material.opacity =
            0.06 +
            child.userData.waterfallLayer * 0.04 +
            Math.sin(elapsed * 1.5 + child.userData.waterfallLayer) * 0.02;
        }
      });

      echoFlowers.forEach((flower, index) => {
        if (flower.light) {
          flower.light.intensity = flower.baseIntensity * (0.6 + Math.sin(elapsed * 0.9 + index * 1.3) * 0.4);
        }
        flower.core.scale.setScalar(0.92 + Math.sin(elapsed * 0.9 + index * 1.3) * 0.08);
      });

      mushrooms.forEach((mushroom, index) => {
        if (mushroom.light) {
          mushroom.light.intensity = 0.2 + Math.sin(elapsed * 0.7 + index * 0.9) * 0.1;
        }
        mushroom.cap.material.opacity = 0.72 + Math.sin(elapsed * 0.7 + index * 0.9) * 0.08;
      });

      const positions = particles.points.geometry.attributes.position;
      for (let i = 0; i < positions.count; i += 1) {
        positions.array[i * 3 + 1] =
          particles.basePositions[i * 3 + 1] + Math.sin(elapsed * 0.4 + particles.phases[i]) * 0.12;
      }
      positions.needsUpdate = true;
      particles.material.opacity = 0.65 + Math.sin(elapsed * 0.6) * 0.2;
    }
  };
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.copy(PHASE1_CAMERA);
  camera.lookAt(0, 0, 0);

  const environment = createWaterfallEnvironment(scene);
  const cameraTarget = new THREE.Vector3(0, 0.8, 0);
  const cameraGoal = PHASE1_CAMERA.clone();

  function setCameraMode(mode) {
    if (mode === "PHASE2") {
      cameraGoal.copy(PHASE2_CAMERA);
      cameraTarget.set(0, 0.7, 0);
      return;
    }
    if (mode === "BOSS") {
      cameraGoal.copy(BOSS_CAMERA);
      cameraTarget.set(0, 1.5, -5);
      return;
    }
    cameraGoal.copy(PHASE1_CAMERA);
    cameraTarget.set(0, 0.8, 0);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", resize);

  function update(delta, elapsed) {
    camera.position.lerp(cameraGoal, Math.min(delta * CAMERA_LERP_SPEED, 1));
    camera.lookAt(cameraTarget);
    environment.update(elapsed);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return {
    renderer,
    scene,
    camera,
    playAreaLimit: PLAY_AREA_LIMIT,
    setCameraMode,
    update,
    render
  };
}
