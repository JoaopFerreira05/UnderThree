import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MIN_LOADING_MS = 500;

function loadImageAsset(src, onProgress) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      onProgress?.();
      resolve(image);
    };
    image.onerror = reject;
    image.src = src;
  });
}

async function decodeAudioAsset(src, onProgress) {
  const response = await fetch(src);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    onProgress?.();
    return decoded;
  } finally {
    await audioContext.close();
  }
}

function loadGLTFAsset(src, onProgress) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        onProgress?.();
        resolve(gltf);
      },
      undefined,
      reject
    );
  });
}

export async function preloadAssets(onProgress = () => {}) {
  const assets = [
    () => loadImageAsset("./images/menu.png", onProgress),
    () => decodeAudioAsset("./music/truehero.mp3", onProgress),
    () => loadGLTFAsset("./spear.glb", onProgress)
  ];

  const startedAt = performance.now();
  const total = assets.length;
  let loaded = 0;

  const update = () => {
    loaded += 1;
    onProgress(Math.min(loaded / total, 1));
  };

  const results = await Promise.all(
    assets.map(async (load) => load(update))
  );

  const elapsed = performance.now() - startedAt;
  if (elapsed < MIN_LOADING_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS - elapsed));
  }

  return {
    menuImage: results[0],
    decodedMusic: results[1],
    spearGLTF: results[2]
  };
}
