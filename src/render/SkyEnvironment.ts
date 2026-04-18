import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export class SkyEnvironment {
  readonly sky: Sky;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private readonly sunVec = new THREE.Vector3();

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.sky = new Sky();
    this.sky.scale.setScalar(4500);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 4.0;
    u.rayleigh.value = 1.2;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.75;
    scene.add(this.sky);

    this.hemi = new THREE.HemisphereLight(0xcfe0ff, 0xa89878, 0.35);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 400;
    const s = 140;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.5;
    scene.add(this.sun);
    scene.add(this.sun.target);

    scene.background = new THREE.Color(0xbcd3e8);
    scene.fog = new THREE.Fog(0xbcd3e8, 200, 700);

    this.setSunElevation(42, 145);

    // Miljøkart fra Sky → gir MeshStandardMaterial indirekte sky-lys.
    // Uten dette blir PBR-materialer i skygge nesten svarte.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const envSky = this.sky.clone() as Sky;
    envSky.material = this.sky.material; // del uniforms så oppdatert sol reflekteres
    envScene.add(envSky);
    const envTarget = pmrem.fromScene(envScene);
    scene.environment = envTarget.texture;
    // Demp miljøkart-bidrag — PMREM fra Sky er veldig lyst.
    scene.environmentIntensity = 0.4;
    pmrem.dispose();
  }

  setSunElevation(elevationDeg: number, azimuthDeg: number): void {
    const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
    const theta = THREE.MathUtils.degToRad(azimuthDeg);
    this.sunVec.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms.sunPosition.value.copy(this.sunVec);
    this.sun.position.copy(this.sunVec).multiplyScalar(200);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();
  }
}
