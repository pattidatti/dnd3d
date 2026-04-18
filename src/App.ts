import * as THREE from 'three';
import { VoxelWorld } from './world/VoxelWorld';
import { VoxelRenderer } from './world/VoxelRenderer';
import { GridOverlay } from './world/GridOverlay';
import { populateDemoWorld } from './world/DemoWorld';
import { SkyEnvironment } from './render/SkyEnvironment';
import { CameraController } from './camera/CameraController';
import { Minimap } from './camera/Minimap';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera';
import { VoxelCollider } from './physics/VoxelCollider';
import { CharacterController, CHAR_HEIGHT } from './physics/CharacterController';
import { BlockPlacer } from './interaction/BlockPlacer';
import { AvatarSpawner } from './interaction/AvatarSpawner';
import { BlockPaletteToolbar } from './ui/BlockPaletteToolbar';
import { ToolModeToggle, type ToolMode } from './ui/ToolModeToggle';
import { IdentityBadge } from './ui/IdentityBadge';
import { ensureIdentity, openIdentityModal } from './ui/IdentityModal';
import { AvatarManager } from './character/AvatarManager';
import type { LocalIdentity } from './character/LocalIdentity';
import { saveIdentity } from './character/LocalIdentity';
import { FogOfWar } from './fog/FogOfWar';
import { FogRenderer } from './fog/FogRenderer';
import { FogPlacer } from './fog/FogPlacer';
import { ViewToggle } from './fog/ViewToggle';

export class App {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  readonly world: VoxelWorld;
  readonly voxelRenderer: VoxelRenderer;
  readonly gridOverlay: GridOverlay;
  readonly sky: SkyEnvironment;
  readonly cameraController: CameraController;
  readonly blockPlacer: BlockPlacer;
  readonly toolbar: BlockPaletteToolbar;
  readonly minimap: Minimap;
  readonly toolMode: ToolModeToggle;

  readonly avatars: AvatarManager;
  readonly avatarSpawner: AvatarSpawner;

  readonly collider: VoxelCollider;
  readonly controller: CharacterController;
  readonly thirdPerson: ThirdPersonCamera;
  private cameraMode: 'orbit' | 'thirdPerson' = 'orbit';
  private readonly savedOrbitPos = new THREE.Vector3();
  private readonly savedOrbitTarget = new THREE.Vector3();
  private savedOrbitFov = 60;
  private hasSavedOrbit = false;
  private modeIndicator?: HTMLDivElement;
  private shownTpHint = false;

  readonly fog: FogOfWar;
  readonly fogRenderer: FogRenderer;
  readonly fogPlacer: FogPlacer;
  readonly viewToggle: ViewToggle;

  private identity!: LocalIdentity;
  private identityBadge!: IdentityBadge;

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
    this.camera.position.set(0, 140, 110);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;

    this.sky = new SkyEnvironment(this.scene, this.renderer);

    this.world = new VoxelWorld();
    this.voxelRenderer = new VoxelRenderer(this.world);
    this.scene.add(this.voxelRenderer.root);
    populateDemoWorld(this.world);

    this.gridOverlay = new GridOverlay();
    this.scene.add(this.gridOverlay.object);

    this.cameraController = new CameraController(this.camera, canvas);

    this.avatars = new AvatarManager();
    this.scene.add(this.avatars.root);

    this.collider = new VoxelCollider(this.world);
    this.controller = new CharacterController(this.collider);
    this.thirdPerson = new ThirdPersonCamera(this.camera, canvas, this.collider);

    this.blockPlacer = new BlockPlacer(this.camera, canvas, this.world, this.voxelRenderer);
    this.avatarSpawner = new AvatarSpawner(
      this.camera,
      canvas,
      this.world,
      this.voxelRenderer,
      this.avatars,
      () => this.identity,
    );

    this.fog = new FogOfWar();
    this.fogRenderer = new FogRenderer(this.fog);
    this.scene.add(this.fogRenderer.root);
    this.fogPlacer = new FogPlacer(this.camera, canvas, this.fog);

    const uiMount = document.getElementById('ui') ?? document.body;

    this.toolMode = new ToolModeToggle(uiMount);
    this.toolbar = new BlockPaletteToolbar(uiMount);
    this.toolbar.onChange((t) => {
      this.blockPlacer.selectedType = t;
      this.toolMode.setMode('blocks');
    });
    this.blockPlacer.selectedType = this.toolbar.getSelected();

    this.toolMode.onChange((mode) => this.applyToolMode(mode));
    this.applyToolMode(this.toolMode.getMode());

    this.viewToggle = new ViewToggle(uiMount, this.fogRenderer);

    this.minimap = new Minimap(uiMount, this.scene, this.camera, this.cameraController);

    // F-fokus: valgt avatar, eller egen avatar.
    this.cameraController.setTokenFocusResolver(() => {
      const selectedId = this.avatars.getSelectedId();
      const avatar =
        (selectedId && this.avatars.get(selectedId)) ||
        this.avatars.getByOwner(this.identity?.uid ?? '');
      if (!avatar) return null;
      return new THREE.Vector3(avatar.x, avatar.y + 3, avatar.z);
    });

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('click', this.onCanvasClick);

    void this.initIdentity(uiMount);

    this.updateModeIndicator();

    (window as unknown as { app: App }).app = this;
  }

  private async initIdentity(uiMount: HTMLElement): Promise<void> {
    this.identity = await ensureIdentity();
    this.identityBadge = new IdentityBadge(uiMount, this.identity, () => this.editIdentity());
    this.applyDmRole();
  }

  private async editIdentity(): Promise<void> {
    const updated = await openIdentityModal(this.identity);
    // Bevar uid slik at eksisterende avatar peker til samme eier.
    const preservedUid = this.identity.uid;
    this.identity = { ...updated, uid: preservedUid };
    saveIdentity(this.identity);
    this.identityBadge.update(this.identity);
    this.applyDmRole();

    const own = this.avatars.getByOwner(this.identity.uid);
    if (own) {
      this.avatars.update({
        ...own,
        name: this.identity.name,
        color: this.identity.color,
        initial: this.identity.initial,
      });
    }
  }

  private applyToolMode(mode: ToolMode): void {
    this.blockPlacer.active = mode === 'blocks';
    this.avatarSpawner.active = mode === 'tokens';
    this.fogPlacer.active = mode === 'fog-reveal';
  }

  private applyDmRole(): void {
    const isDm = this.identity?.isDM ?? false;
    this.toolMode.setDmMode(isDm);
    this.viewToggle.setDmMode(isDm);
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

    if (this.cameraMode === 'thirdPerson') {
      this.controller.setYaw(this.thirdPerson.yaw);
      this.controller.update(dt);

      const movingFast =
        this.controller.input.run &&
        (this.controller.input.forward ||
          this.controller.input.back ||
          this.controller.input.left ||
          this.controller.input.right);
      this.thirdPerson.setRunningHint(movingFast);

      const own = this.identity && this.avatars.getByOwner(this.identity.uid);
      if (own) {
        this.avatars.update({
          ...own,
          x: this.controller.position.x,
          y: this.controller.position.y,
          z: this.controller.position.z,
          yaw: this.thirdPerson.yaw,
        });
      }
      this.thirdPerson.update(this.controller.position, dt);
    } else {
      this.cameraController.update();
    }

    this.renderer.render(this.scene, this.camera);
    this.minimap.render();
  };

  private readonly onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key.toLowerCase();
    if (key === 'g') {
      this.gridOverlay.setVisible(!this.gridOverlay.visible);
    }
    if (e.key === 'Escape') {
      if (this.cameraMode === 'thirdPerson') this.thirdPerson.exitPointerLock();
      this.avatars.select(null);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      this.toggleCameraMode();
      return;
    }
    if (this.cameraMode === 'thirdPerson') {
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
    if (this.cameraMode !== 'thirdPerson') return;
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

  private toggleCameraMode(): void {
    if (this.cameraMode === 'orbit') {
      const own = this.identity && this.avatars.getByOwner(this.identity.uid);
      if (!own) {
        console.warn('Ingen egen avatar — spawn en f\u00f8rst via ToolMode=N.');
        return;
      }
      // Lagre orbit-kamera slik at retur gjenoppretter eksakt samme pose.
      this.savedOrbitPos.copy(this.camera.position);
      this.savedOrbitTarget.copy(this.cameraController.controls.target);
      this.savedOrbitFov = this.camera.fov;
      this.hasSavedOrbit = true;

      this.cameraMode = 'thirdPerson';
      this.thirdPerson.enabled = true;
      this.thirdPerson.yaw = own.yaw ?? 0;
      this.controller.setPosition(own.x, own.y, own.z);
      this.cameraController.controls.enabled = false;
      this.avatarSpawner.active = false;
      this.blockPlacer.active = false;
      this.fogPlacer.active = false;
      this.updateModeIndicator();
      if (!this.shownTpHint) {
        this.showTpHint();
        this.shownTpHint = true;
      }
    } else {
      this.cameraMode = 'orbit';
      this.thirdPerson.enabled = false;
      this.thirdPerson.exitPointerLock();
      this.cameraController.controls.enabled = true;

      if (this.hasSavedOrbit) {
        this.camera.position.copy(this.savedOrbitPos);
        this.cameraController.controls.target.copy(this.savedOrbitTarget);
        this.camera.fov = this.savedOrbitFov;
        this.camera.updateProjectionMatrix();
      } else {
        const own = this.identity && this.avatars.getByOwner(this.identity.uid);
        if (own) {
          this.cameraController.controls.target.set(own.x, own.y + CHAR_HEIGHT / 2, own.z);
          this.camera.position.set(own.x + 12, own.y + 18, own.z + 18);
        }
      }
      this.cameraController.controls.update();
      this.applyToolMode(this.toolMode.getMode());
      this.updateModeIndicator();
    }
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

  private showTpHint(): void {
    const hint = document.createElement('div');
    hint.className = 'tp-hint';
    hint.innerHTML =
      '<div><strong>Klikk</strong> for musestyring · <strong>WASD</strong> g\u00e5 · <strong>Mellomrom</strong> hopp · <strong>Shift</strong> l\u00f8p · <strong>Esc</strong>/<strong>Tab</strong> tilbake</div>';
    (document.getElementById('ui') ?? document.body).appendChild(hint);
    setTimeout(() => {
      hint.classList.add('fade');
      setTimeout(() => hint.remove(), 800);
    }, 4500);
  }
}
