// Supplerende typer for three/examples/jsm-moduler som @types/three mangler.
declare module 'three/examples/jsm/utils/SkeletonUtils.js' {
  import type { AnimationClip, Object3D } from 'three';
  export function clone(source: Object3D): Object3D;
  export function retarget(target: Object3D, source: Object3D, options?: object): void;
  export function retargetClip(
    target: Object3D,
    source: Object3D,
    clip: AnimationClip,
    options?: object,
  ): AnimationClip;
}
