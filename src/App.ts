import * as THREE from 'three';
import { SkyEnvironment, type Mood } from './render/SkyEnvironment';
import { Atmosphere } from './render/Atmosphere';
import { PostProcessing } from './render/PostProcessing';
import { loadGraphicsQuality, profileFor, type GraphicsQuality } from './render/GraphicsQuality';
import { Terrain } from './world/Terrain';
import { TerrainMesh } from './world/TerrainMesh';
import { populateDemoTerrain, populateDemoProps } from './world/DemoWorld';
import { PropWorld } from './world/PropWorld';
import { GltfCache } from './assets/GltfCache';
import { InstancedPropRenderer } from './assets/InstancedPropRenderer';
import { AnimationLibrary } from './assets/AnimationLibrary';
import { CameraController } from './camera/CameraController';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera';
import { PropPlacer } from './interaction/PropPlacer';
import { PropToolbar } from './ui/PropToolbar';
import { MapStore } from './maps/MapStore';
import { MapManager } from './maps/MapManager';
import { MapBar } from './ui/MapBar';
import { RapierWorld } from './physics/RapierWorld';
import { TerrainCollider } from './physics/TerrainCollider';
import { PropCollider } from './physics/PropCollider';
import { CHAR_HEIGHT, CharacterController } from './physics/CharacterController';
import { AvatarManager } from './character/AvatarManager';
import { ClassPicker } from './ui/ClassPicker';
import { ensureIdentity, saveIdentity, randomId, type LocalIdentity } from './character/LocalIdentity';
import { FogOfWar } from './fog/FogOfWar';
import { FogRenderer } from './fog/FogRenderer';
import { FogPlacer } from './fog/FogPlacer';
import { ViewToggle } from './fog/ViewToggle';
import { IdentityBadge } from './ui/IdentityBadge';
import { KeybindingsHelp } from './ui/KeybindingsHelp';

/**
 * Fase 4-App: alt fra før + Rapier + KayKit-karakterer + tredjeperson.
 * Tab = toggle orbit ↔ tredjeperson (krever avatar).
 */
export class App {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  readonly sky: SkyEnvironment;
  readonly atmosphere: Atmosphere;
  private post!: PostProcessing;

  readonly terrain: Terrain;
  readonly terrainMesh: TerrainMesh;

  readonly propWorld: PropWorld;
  readonly gltfCache: GltfCache;
  readonly propRenderer: InstancedPropRenderer;
  readonly anims: AnimationLibrary;
  readonly cameraController: CameraController;
  readonly thirdPerson: ThirdPersonCamera;

  readonly propPlacer: PropPlacer;
  readonly propToolbar: PropToolbar;

  readonly mapStore: MapStore;
  readonly mapManager: MapManager;
  readonly mapBar: MapBar;

  readonly rapier: RapierWorld;
  terrainCollider: TerrainCollider | null = null;
  propCollider: PropCollider | null = null;
  controller: CharacterController | null = null;

  readonly avatars: AvatarManager;
  readonly classPicker: ClassPicker;
  identity: LocalIdentity;
  private ownAvatarId: string | null = null;

  readonly fog: FogOfWar;
  readonly fogRenderer: FogRenderer;
  readonly fogPlacer: FogPlacer;
  readonly viewToggle: ViewToggle;
  readonly identityBadge: IdentityBadge;
  readonly keybindingsHelp: KeybindingsHelp;

  private cameraMode: 'orbit' | 'thirdPerson' = 'orbit';
  private modeIndicator: HTMLDivElement | null = null;

  private readonly clock = new THREE.Clock();
  private running = false;
  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      6000,
    );
    this.camera.position.set(15, 25, 35);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.sky = new SkyEnvironment(this.scene, this.renderer);

    const quality: GraphicsQuality = loadGraphicsQuality();
    this.sky.applyShadowMapSize(quality);

    this.post = new PostProcessing(this.renderer, this.scene, this.camera, quality);
    this.sky.onMoodChange((mood) => this.post.setMood(mood));
    this.post.setMood(this.sky.getMood());

    this.atmosphere = new Atmosphere();
    this.atmosphere.setCapacity(profileFor(quality).particles);
    this.scene.add(this.atmosphere.points);

    const applyAtmosphereMood = (mood: Mood): void => {
      const cfg: Record<Mood, { intensity: number; color: number }> = {
        day:   { intensity: 0.55, color: 0xfff8e8 },
        dawn:  { intensity: 0.85, color: 0xffcc99 },
        dusk:  { intensity: 1.0,  color: 0xff9966 },
        night: { intensity: 0.30, color: 0x8899cc },
      };
      const { intensity, color } = cfg[mood];
      this.atmosphere.setIntensity(intensity);
      this.atmosphere.setColor(color);
    };
    this.sky.onMoodChange(applyAtmosphereMood);
    applyAtmosphereMood(this.sky.getMood());

    this.terrain = new Terrain();
    populateDemoTerrain(this.terrain);
    this.terrainMesh = new TerrainMesh(this.terrain);
    this.scene.add(this.terrainMesh.group);

    this.propWorld = new PropWorld();
    this.gltfCache = new GltfCache();
    this.propRenderer = new InstancedPropRenderer(this.gltfCache);
    this.scene.add(this.propRenderer.root);

    this.anims = new AnimationLibrary(this.gltfCache);

    this.cameraController = new CameraController(this.camera, canvas);
    this.cameraController.controls.maxDistance = 600;
    this.cameraController.controls.target.set(0, 0, 0);

    this.thirdPerson = new ThirdPersonCamera(this.camera, canvas);

    this.propWorld.onAdded(async (p) => {
      const ok = await this.propRenderer.ensureLoaded(p.assetKey);
      if (ok) this.propRenderer.addProp(p);
    });
    this.propWorld.onUpdated((p) => this.propRenderer.updateProp(p));
    this.propWorld.onRemoved((id, key) => this.propRenderer.removeProp(id, key));

    populateDemoProps(this.propWorld, this.terrain);

    const uiMount = document.getElementById('ui') ?? document.body;

    this.propPlacer = new PropPlacer(
      this.scene,
      this.camera,
      canvas,
      this.terrainMesh.mesh,
      this.propRenderer,
      this.propWorld,
      this.gltfCache,
    );

    this.propToolbar = new PropToolbar(uiMount);
    this.propToolbar.onChange((key) => {
      this.propPlacer.active = key !== null;
      void this.propPlacer.selectAsset(key);
      this.cameraController.controls.enabled = key === null && this.cameraMode === 'orbit';
    });

    this.mapStore = new MapStore();
    this.mapManager = new MapManager(this.terrain, this.propWorld, this.mapStore);
    this.mapBar = new MapBar(
      uiMount,
      this.mapManager,
      this.mapStore,
      (m) => this.showToast(m),
      () => this.rebuildTerrain(),
    );

    this.identity = ensureIdentity();
    this.avatars = new AvatarManager(this.gltfCache, this.anims);
    this.scene.add(this.avatars.root);

    this.classPicker = new ClassPicker(uiMount, this.identity.classKey);
    this.classPicker.onChange((classKey) => {
      this.identity = { ...this.identity, classKey };
      saveIdentity(this.identity);
      void this.respawnOwnAvatar();
    });

    this.fog = new FogOfWar();
    this.fogRenderer = new FogRenderer(this.fog, this.terrain);
    this.scene.add(this.fogRenderer.root);
    this.fogPlacer = new FogPlacer(this.camera, canvas, this.fog, this.terrainMesh.mesh);
    this.viewToggle = new ViewToggle(uiMount, this.fogRenderer);

    this.identityBadge = new IdentityBadge(uiMount, this.identity, (isDm) => {
      this.identity = { ...this.identity, isDM: isDm };
      saveIdentity(this.identity);
      this.applyDmRole();
    });

    this.keybindingsHelp = new KeybindingsHelp(uiMount);
    this.applyDmRole();

    this.rapier = new RapierWorld();
    void this.initPhysics();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('click', this.onCanvasClick);

    this.updateModeIndicator();

    (window as unknown as { app: App }).app = this;
  }

  private async initPhysics(): Promise<void> {
    await this.rapier.init();
    await this.anims.load();

    this.terrainCollider = new TerrainCollider(this.rapier, this.terrain);
    this.terrainCollider.build();

    this.propCollider = new PropCollider(this.rapier, this.gltfCache, this.propWorld);
    this.propCollider.attach();

    this.controller = new CharacterController(this.rapier);
    this.showToast('Physics klar — Tab for tredjeperson');
  }

  private async respawnOwnAvatar(): Promise<void> {
    if (this.ownAvatarId) {
      this.avatars.remove(this.ownAvatarId);
      this.ownAvatarId = null;
    }
    const spawn = this.pickSpawnPoint();
    const id = 'avatar_' + randomId();
    await this.avatars.spawn({
      id,
      ownerUid: this.identity.uid,
      classKey: this.identity.classKey,
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      yaw: 0,
    });
    this.ownAvatarId = id;
    this.controller?.setPosition(spawn.x, spawn.y + 0.1, spawn.z);
  }

  private pickSpawnPoint(): { x: number; y: number; z: number } {
    const x = 0;
    const z = 10;
    const y = this.terrain.sampleHeight(x, z) + CHAR_HEIGHT / 2 + 0.5;
    return { x, y, z };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(this.tick);
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  private readonly tick = (): void => {
    const dt = Math.min(0.05, this.clock.getDelta());

    this.sky.tick();
    this.atmosphere.tick(this.clock.elapsedTime, this.camera.position);

    this.rapier.step(dt);

    // Fog-mode aktiv kun når DM + R-modus er valgt.
    // (håndteres i onKeyDown via toggle.)
    if (this.cameraMode === 'thirdPerson' && this.controller && this.ownAvatarId) {
      this.controller.setYaw(this.thirdPerson.yaw);
      this.controller.update(dt);
      const avatar = this.avatars.get(this.ownAvatarId);
      if (avatar) {
        const footY = this.controller.position.y - CHAR_HEIGHT / 2;
        avatar.setPose(
          this.controller.position.x,
          footY,
          this.controller.position.z,
          this.thirdPerson.yaw,
        );
        const moving = this.controller.isMoving();
        const running = moving && !!this.controller['input']?.run;
        avatar.setGait(moving ? (running ? 'run' : 'walk') : 'idle');
        this.thirdPerson.setRunningHint(running);
        this.thirdPerson.update({ x: avatar.root.position.x, y: avatar.root.position.y, z: avatar.root.position.z }, dt);
      }
    } else {
      this.cameraController.update();
    }

    this.avatars.tick(dt);
    this.terrainMesh.tick(this.clock.elapsedTime);
    this.post.render(dt);
  };

  private readonly onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h);
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key.toLowerCase();
    if (e.key === 'Tab') {
      e.preventDefault();
      void this.toggleCameraMode();
      return;
    }
    if (e.key === 'Escape') {
      if (this.cameraMode === 'thirdPerson') this.thirdPerson.exitPointerLock();
    }
    if (key === 'r' && this.identity.isDM && this.cameraMode === 'orbit') {
      this.toggleFogMode();
    }
    if (this.cameraMode === 'thirdPerson' && this.controller) {
      if (key === 'w') this.controller.setInput({ forward: true });
      else if (key === 's') this.controller.setInput({ back: true });
      else if (key === 'a') this.controller.setInput({ left: true });
      else if (key === 'd') this.controller.setInput({ right: true });
      else if (key === ' ') this.controller.setInput({ jump: true });
      else if (key === 'shift') this.controller.setInput({ run: true });
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (this.cameraMode !== 'thirdPerson' || !this.controller) return;
    const key = e.key.toLowerCase();
    if (key === 'w') this.controller.setInput({ forward: false });
    else if (key === 's') this.controller.setInput({ back: false });
    else if (key === 'a') this.controller.setInput({ left: false });
    else if (key === 'd') this.controller.setInput({ right: false });
    else if (key === ' ') this.controller.setInput({ jump: false });
    else if (key === 'shift') this.controller.setInput({ run: false });
  };

  private readonly onCanvasClick = (): void => {
    if (this.cameraMode === 'thirdPerson') this.thirdPerson.requestPointerLock();
  };

  private async toggleCameraMode(): Promise<void> {
    if (!this.controller || !this.rapier.isReady()) {
      this.showToast('Physics lastes fortsatt…');
      return;
    }
    if (this.cameraMode === 'orbit') {
      if (!this.ownAvatarId) {
        await this.respawnOwnAvatar();
      }
      this.cameraMode = 'thirdPerson';
      this.thirdPerson.enabled = true;
      this.cameraController.controls.enabled = false;
      this.propPlacer.active = false;
      this.propToolbar.setSelected(null);
      this.showToast('Tredjeperson — WASD, Shift=løp, Space=hopp, Esc/Tab=orbit');
    } else {
      this.cameraMode = 'orbit';
      this.thirdPerson.enabled = false;
      this.thirdPerson.exitPointerLock();
      this.controller.resetInput();
      this.cameraController.controls.enabled = true;
      // Plasser orbit-kameraet i nærheten av avataren.
      const avatar = this.ownAvatarId ? this.avatars.get(this.ownAvatarId) : null;
      if (avatar) {
        const p = avatar.root.position;
        this.cameraController.controls.target.set(p.x, p.y + CHAR_HEIGHT / 2, p.z);
        this.camera.position.set(p.x + 12, p.y + 16, p.z + 16);
        this.cameraController.controls.update();
      }
    }
    this.updateModeIndicator();
  }

  private updateModeIndicator(): void {
    if (!this.modeIndicator) {
      const el = document.createElement('div');
      el.className = 'camera-mode-indicator';
      (document.getElementById('ui') ?? document.body).appendChild(el);
      this.modeIndicator = el;
    }
    const chip = this.cameraMode === 'thirdPerson' ? 'Tredjeperson' : 'Orbit';
    this.modeIndicator.innerHTML = `<strong>${chip}</strong><span class="hint">Tab</span>`;
    this.modeIndicator.classList.toggle('active', this.cameraMode === 'thirdPerson');
  }

  rebuildTerrain(): void {
    this.terrainMesh.rebuild();
    this.terrainCollider?.build();
    this.fogRenderer.rebuildGeometryForTerrainChange();
  }

  private applyDmRole(): void {
    const isDm = this.identity.isDM;
    this.viewToggle.setDmMode(isDm);
    if (!isDm && this.fogPlacer.active) {
      this.fogPlacer.active = false;
      this.cameraController.controls.enabled = true;
    }
  }

  private toggleFogMode(): void {
    this.fogPlacer.active = !this.fogPlacer.active;
    if (this.fogPlacer.active) {
      this.propPlacer.active = false;
      this.propToolbar.setSelected(null);
      this.cameraController.controls.enabled = false;
      this.showToast('Fog-modus: klikk = toggle, Shift+klikk = 3×3');
    } else {
      this.cameraController.controls.enabled = true;
      this.showToast('Fog-modus av');
    }
  }

  private showToast(message: string): void {
    const el = document.createElement('div');
    el.className = 'app-toast';
    el.textContent = message;
    (document.getElementById('ui') ?? document.body).appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 2200);
  }
}
