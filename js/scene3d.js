// Scène 3D de l'arène de combat, construite avec Three.js et des modèles CC0
// de Kenney (voir assets/*/LICENSE.txt) : sol/décor de "Mini Arena", monstres
// et pierres tombales de "Graveyard Kit", orc de "Mini Dungeon".
//
// Tous les personnages Kenney utilisés ici partagent le même jeu d'animations
// nommées (idle, attack-melee-right, die, ...), qu'on rejoue via AnimationMixer.
//
// Ce module ne connaît rien du quizz : game.js l'appelle juste pour positionner
// les personnages et jouer une animation (attaque, coup reçu, défaite).
//
// Important : le chargement des fichiers .glb passe par fetch(), ce que les
// navigateurs bloquent pour une page ouverte en double-clic (file://). Il faut
// donc servir le dossier via un petit serveur local — voir README.md.

const Scene3D = (() => {
  const PACKS = {
    arena: 'assets/kenney-mini-arena/',
    graveyard: 'assets/kenney-graveyard-kit/',
    dungeon: 'assets/kenney-mini-dungeon/'
  };

  let renderer, scene, camera;
  let container = null;
  let tileSize = 2;
  let charTargetHeight = 1.7; // recalculé une fois la taille réelle des tuiles connue (voir buildArena)
  let heroRig = null;
  let enemyRig = null;
  let ready = false;
  let lastTick = 0;

  const cache = new Map(); // "pack/file" -> { scene, animations } (jamais modifié, seulement cloné)
  const loader = (typeof THREE !== 'undefined' && THREE.GLTFLoader) ? new THREE.GLTFLoader() : null;

  function loadModel(pack, file) {
    const key = pack + '/' + file;
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    return new Promise((resolve, reject) => {
      loader.load(PACKS[pack] + file, (gltf) => {
        const entry = { scene: gltf.scene, animations: gltf.animations || [] };
        cache.set(key, entry);
        resolve(entry);
      }, undefined, reject);
    });
  }

  function cloneSource(source) {
    // .clone() casse les meshes skinnés (character-soldier.glb, character-orc.glb ont un rig) :
    // leurs os restent liés au squelette d'origine, jamais mis à jour car détaché de la scène.
    // SkeletonUtils.clone() re-lie correctement le squelette cloné (et gère aussi les objets
    // sans squelette sans problème, donc on l'utilise partout).
    return THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(source) : source.clone(true);
  }

  function cloneTinted(source, color) {
    const clone = cloneSource(source);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if (color != null) child.material.color.set(color);
        child.material.transparent = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }

  function boxSize(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }

  // Chaque pack Kenney a sa propre échelle interne. On normalise chaque prop
  // par rapport à tileSize (dérivé du sol) pour que tout s'assemble à une
  // échelle cohérente, quel que soit le pack d'origine.
  function cloneScaledToHeight(source, color, targetHeight) {
    const model = cloneTinted(source, color);
    const h = boxSize(model).y || targetHeight;
    model.scale.setScalar(targetHeight / h);
    return model;
  }

  async function buildArena() {
    const models = await Promise.all([
      loadModel('arena', 'floor.glb'),
      loadModel('graveyard', 'iron-fence.glb'),
      loadModel('graveyard', 'iron-fence-border-column.glb'),
      loadModel('graveyard', 'gravestone-cross.glb'),
      loadModel('graveyard', 'gravestone-round.glb'),
      loadModel('graveyard', 'lantern-candle.glb'),
      loadModel('graveyard', 'pillar-small.glb'),
      loadModel('arena', 'banner.glb'),
      loadModel('arena', 'trophy.glb')
    ]);
    const [floor, fence, fenceColumn, gravestoneCross, gravestoneRound, lantern, pillar, banner, trophy] =
      models.map((m) => m.scene);

    const floorSize = boxSize(floor);
    tileSize = Math.max(floorSize.x, floorSize.z) || 2;
    charTargetHeight = tileSize * 0.8;

    const grid = 5;
    const half = (grid - 1) / 2;
    for (let x = 0; x < grid; x++) {
      for (let z = 0; z < grid; z++) {
        const tile = cloneTinted(floor, 0x8a8a9a);
        tile.position.set((x - half) * tileSize, 0, (z - half) * tileSize);
        scene.add(tile);
      }
    }

    const edge = (half + 0.5) * tileSize;

    [-edge, edge].forEach((x) => {
      for (let i = 0; i < grid; i++) {
        const seg = cloneScaledToHeight(fence, null, tileSize * 0.5);
        seg.position.set(x, 0, (i - half) * tileSize);
        seg.rotation.y = Math.PI / 2;
        scene.add(seg);
      }
    });
    for (let i = 0; i < grid; i++) {
      const seg = cloneScaledToHeight(fence, null, tileSize * 0.5);
      seg.position.set((i - half) * tileSize, 0, -edge);
      scene.add(seg);
    }

    [[-edge, -edge], [edge, -edge], [-edge, edge], [edge, edge]].forEach(([x, z]) => {
      const col = cloneScaledToHeight(fenceColumn, 0x5c5c66, tileSize * 0.7);
      col.position.set(x, 0, z);
      scene.add(col);
    });

    [[-edge + tileSize * 0.35, edge - tileSize * 0.3, gravestoneCross],
     [edge - tileSize * 0.35, edge - tileSize * 0.3, gravestoneRound]]
      .forEach(([x, z, model]) => {
        const g = cloneScaledToHeight(model, 0xd6d6d6, tileSize * 0.45);
        g.rotation.y = Math.random() * 0.4 - 0.2;
        g.position.set(x, 0, z);
        scene.add(g);
      });

    [[-edge + tileSize * 0.15, -edge + tileSize * 0.4], [edge - tileSize * 0.15, -edge + tileSize * 0.4]].forEach(([x, z]) => {
      const lp = cloneScaledToHeight(lantern, 0xffd54f, tileSize * 0.5);
      lp.position.set(x, 0, z);
      scene.add(lp);
    });

    [[-edge + tileSize * 0.55, -edge + tileSize * 0.1], [edge - tileSize * 0.55, -edge + tileSize * 0.1]].forEach(([x, z]) => {
      const p = cloneScaledToHeight(pillar, 0x6b6b78, tileSize * 0.9);
      p.position.set(x, 0, z);
      scene.add(p);
    });

    const bannerModel = cloneScaledToHeight(banner, 0x3d2a52, tileSize * 1.3);
    bannerModel.position.set(0, 0, -edge + tileSize * 0.1);
    scene.add(bannerModel);

    const trophyModel = cloneScaledToHeight(trophy, 0xffd54f, tileSize * 0.35);
    trophyModel.position.set(edge - tileSize * 0.25, 0, edge - tileSize * 0.25);
    scene.add(trophyModel);
  }

  const ANIM_NAMES = ['idle', 'attack-melee-right', 'die'];

  function makeRig(sourceEntry, { color, scaleMul = 1 } = {}) {
    const model = cloneScaledToHeight(sourceEntry.scene, color, charTargetHeight * scaleMul);
    const inner = new THREE.Group();
    inner.add(model);
    const group = new THREE.Group();
    group.add(inner);
    scene.add(group);

    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    ANIM_NAMES.forEach((name) => {
      const clip = sourceEntry.animations.find((c) => c.name === name);
      if (clip) actions[name] = mixer.clipAction(clip);
    });

    const rig = {
      group, inner, model, mixer, actions, currentAction: null,
      baseX: 0, baseZ: 0, phase: Math.random() * Math.PI * 2, anim: null
    };
    playAction(rig, 'idle');
    return rig;
  }

  function playAction(rig, name, { loop = true, clampWhenFinished = false } = {}) {
    const action = rig.actions[name];
    if (!action) return;
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = clampWhenFinished;
    if (rig.currentAction && rig.currentAction !== action) {
      action.crossFadeFrom(rig.currentAction, 0.15, false);
    }
    action.play();
    rig.currentAction = action;
  }

  function resetRig(rig) {
    rig.anim = null;
    rig.group.rotation.z = 0;
    rig.model.traverse((c) => { if (c.isMesh) c.material.opacity = 1; });
    playAction(rig, 'idle');
  }

  function startAnim(rig, type, duration, extra = {}) {
    if (!rig) return;
    rig.anim = { type, start: performance.now(), duration, ...extra };
  }

  function updateRig(rig) {
    if (!rig) return;
    let offsetX = 0, offsetZ = 0, opacity = 1;

    if (rig.anim) {
      const p = Math.min((performance.now() - rig.anim.start) / rig.anim.duration, 1);
      if (rig.anim.type === 'lunge') {
        const k = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5;
        offsetZ = k * rig.anim.dir * tileSize * 0.35;
      } else if (rig.anim.type === 'shake') {
        offsetX = Math.sin(p * Math.PI * 6) * (1 - p) * tileSize * 0.08;
      } else if (rig.anim.type === 'defeat') {
        opacity = 1 - p;
      }
      if (p >= 1 && rig.anim.type !== 'defeat') rig.anim = null;
    }

    rig.group.position.set(rig.baseX + offsetX, 0, rig.baseZ + offsetZ);
    if (opacity !== 1) rig.model.traverse((c) => { if (c.isMesh) c.material.opacity = opacity; });
  }

  function tick() {
    const now = performance.now();
    const delta = lastTick ? Math.min((now - lastTick) / 1000, 0.1) : 0;
    lastTick = now;

    if (heroRig) heroRig.mixer.update(delta);
    if (enemyRig) enemyRig.mixer.update(delta);
    updateRig(heroRig);
    updateRig(enemyRig);
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!renderer || !container) return;
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  return {
    isAvailable: () => !!loader,

    async init(el) {
      if (!loader) return false;
      container = el;
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(50, container.clientWidth / (container.clientHeight || 1), 0.1, 1000);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0x8fa6ff, 0x1b1230, 0.9));
      const moon = new THREE.DirectionalLight(0xaebeff, 1.0);
      moon.castShadow = true;
      moon.shadow.mapSize.set(1024, 1024);
      scene.add(moon);

      window.addEventListener('resize', onResize);

      try {
        await buildArena();
        camera.position.set(0, tileSize * 2.1, tileSize * 4.4);
        camera.lookAt(0, tileSize * 0.4, 0);
        scene.fog = new THREE.Fog(0x150c26, tileSize * 4, tileSize * 11);

        moon.position.set(tileSize * 2, tileSize * 4.5, tileSize * 2.5);
        const shadowExtent = tileSize * 2.5;
        moon.shadow.camera.left = -shadowExtent;
        moon.shadow.camera.right = shadowExtent;
        moon.shadow.camera.top = shadowExtent;
        moon.shadow.camera.bottom = -shadowExtent;
        moon.shadow.camera.updateProjectionMatrix();

        const soldier = await loadModel('arena', 'character-soldier.glb');
        heroRig = makeRig(soldier, { color: 0x4fd1c5 });
        heroRig.group.rotation.y = Math.PI;
      } catch (err) {
        console.error('Scene3D: échec du chargement des modèles', err);
        return false;
      }

      ready = true;
      renderer.setAnimationLoop(tick);
      return true;
    },

    isReady: () => ready,

    async setupBattle(enemyDef) {
      if (!ready) return;
      const baseZ = tileSize * 1.3;

      resetRig(heroRig);
      heroRig.baseX = 0;
      heroRig.baseZ = baseZ;

      if (enemyRig) {
        scene.remove(enemyRig.group);
        enemyRig = null;
      }
      const { pack, file, color, scaleMul } = enemyDef.model;
      const source = await loadModel(pack, file);
      enemyRig = makeRig(source, { color, scaleMul });
      enemyRig.baseX = 0;
      enemyRig.baseZ = -baseZ;
    },

    attack(who) {
      if (!ready) return;
      const attacker = who === 'hero' ? heroRig : enemyRig;
      const defender = who === 'hero' ? enemyRig : heroRig;
      startAnim(attacker, 'lunge', 350, { dir: who === 'hero' ? -1 : 1 });
      playAction(attacker, 'attack-melee-right', { loop: false });
      setTimeout(() => startAnim(defender, 'shake', 300), 180);
      setTimeout(() => playAction(attacker, 'idle'), 550);
    },

    defeat(who) {
      if (!ready) return;
      const rig = who === 'hero' ? heroRig : enemyRig;
      startAnim(rig, 'defeat', 900, { dir: who === 'hero' ? 1 : -1 });
      playAction(rig, 'die', { loop: false, clampWhenFinished: true });
    },

    show() { if (container) container.style.display = 'block'; onResize(); },
    hide() { if (container) container.style.display = 'none'; }
  };
})();
