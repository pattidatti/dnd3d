import * as THREE from 'three';
import { VoxelWorld } from './world/VoxelWorld';
import { VoxelRenderer } from './world/VoxelRenderer';
import { GridOverlay } from './world/GridOverlay';
import { TorchLightPool } from './world/TorchLightPool';
import { CameraController } from './camera/CameraController';
import { Minimap } from './camera/Minimap';
import { BlockPlacer } from './interaction/BlockPlacer';
import { TokenPlacer } from './interaction/TokenPlacer';
import { Toolbar } from './ui/Toolbar';
import { ToolModeToggle, type ToolMode } from './ui/ToolModeToggle';
import { IdentityBadge } from './ui/IdentityBadge';
import { ensureIdentity, openIdentityModal } from './ui/IdentityModal';
import { TokenManager } from './tokens/TokenManager';
import { TokenRenderer } from './tokens/TokenRenderer';
import type { LocalIdentity } from './tokens/LocalIdentity';
import { saveIdentity } from './tokens/LocalIdentity';
import { MapGenerator } from './world/MapGenerator';
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
  readonly torchLights: TorchLightPool;
  readonly cameraController: CameraController;
  readonly blockPlacer: BlockPlacer;
  readonly toolbar: Toolbar;
  readonly minimap: Minimap;
  readonly toolMode: ToolModeToggle;

  readonly tokenManager: TokenManager;
  readonly tokenRenderer: TokenRenderer;
  readonly tokenPlacer: TokenPlacer;

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
    this.scene.background = new THREE.Color(0x0b0d12);
    this.scene.fog = new THREE.Fog(0x0b0d12, 150, 500);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 140, 110);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambient = new THREE.AmbientLight(0xb4c2ff, 0.28);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xfff1cc, 0.65);
    directional.position.set(60, 120, 40);
    this.scene.add(directional);

    this.world = new VoxelWorld();
    this.voxelRenderer = new VoxelRenderer(this.world);
    this.scene.add(this.voxelRenderer.root);

    MapGenerator.fromImage(this.world, '/map.png').catch(console.error);

    this.gridOverlay = new GridOverlay();
    this.scene.add(this.gridOverlay.object);

    this.torchLights = new TorchLightPool(this.scene, this.camera, this.world);

    this.cameraController = new CameraController(this.camera, canvas);

    this.tokenManager = new TokenManager();
    this.tokenRenderer = new TokenRenderer(this.tokenManager);
    this.scene.add(this.tokenRenderer.root);

    this.blockPlacer = new BlockPlacer(this.camera, canvas, this.world, this.voxelRenderer);
    this.tokenPlacer = new TokenPlacer(
      this.camera,
      canvas,
      this.world,
      this.voxelRenderer,
      this.tokenManager,
      this.tokenRenderer,
      () => this.identity,
    );

    this.fog = new FogOfWar();
    this.fogRenderer = new FogRenderer(this.fog);
    this.scene.add(this.fogRenderer.root);
    this.fogPlacer = new FogPlacer(this.camera, canvas, this.fog);

    const uiMount = document.getElementById('ui') ?? document.body;

    this.toolMode = new ToolModeToggle(uiMount);
    this.toolbar = new Toolbar(uiMount);
    this.toolbar.onChange((t) => {
      this.blockPlacer.selectedType = t;
      this.toolMode.setMode('blocks');
    });
    this.blockPlacer.selectedType = this.toolbar.getSelected();

    this.toolMode.onChange((mode) => this.applyToolMode(mode));
    this.applyToolMode(this.toolMode.getMode());

    this.viewToggle = new ViewToggle(uiMount, this.fogRenderer);

    this.minimap = new Minimap(uiMount, this.scene, this.camera, this.cameraController);

    // F-fokus: finn "selected" token, eller egen token hvis ingen valgt.
    this.cameraController.setTokenFocusResolver(() => {
      const selectedId = this.tokenManager.getSelectedId();
      const token =
        (selectedId && this.tokenManager.get(selectedId)) ||
        this.tokenManager.getByOwner(this.identity?.uid ?? '');
      if (!token) return null;
      return new THREE.Vector3(token.x, token.y, token.z);
    });

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);

    // Start identitets-flyt: vis modal hvis nødvendig, ellers bruk lagret.
    void this.initIdentity(uiMount);

    // Eksponer for debug / manuell QA
    (window as unknown as { app: App }).app = this;
  }

  private async initIdentity(uiMount: HTMLElement): Promise<void> {
    this.identity = await ensureIdentity();
    this.identityBadge = new IdentityBadge(uiMount, this.identity, () => this.editIdentity());
    this.applyDmRole();
  }

  private async editIdentity(): Promise<void> {
    const updated = await openIdentityModal(this.identity);
    // openIdentityModal lager ny identitet med ny uid. Vi vil beholde samme uid
    // slik at eksisterende token peker til samme eier — overstyr uid.
    const preservedUid = this.identity.uid;
    this.identity = { ...updated, uid: preservedUid };
    saveIdentity(this.identity);
    this.identityBadge.update(this.identity);
    this.applyDmRole();

    // Oppdater egen token med nytt navn/farge/initial
    const own = this.tokenManager.getByOwner(this.identity.uid);
    if (own) {
      this.tokenManager.update({
        ...own,
        name: this.identity.name,
        color: this.identity.color,
        initial: this.identity.initial,
      });
    }
  }

  private applyToolMode(mode: ToolMode): void {
    this.blockPlacer.active = mode === 'blocks';
    this.tokenPlacer.active = mode === 'tokens';
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
    this.cameraController.update();
    this.torchLights.update(performance.now());
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
    if (e.key.toLowerCase() === 'g') {
      this.gridOverlay.setVisible(!this.gridOverlay.visible);
    }
    if (e.key === 'Escape') {
      this.tokenManager.select(null);
    }
  };
}
