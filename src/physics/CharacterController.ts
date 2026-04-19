import RAPIER from '@dimforge/rapier3d-compat';
import type { RapierWorld } from './RapierWorld';

export const CHAR_HEIGHT = 1.4;
const RADIUS = 0.3;
const HALF_HEIGHT = CHAR_HEIGHT / 2 - RADIUS;
const MAX_SLOPE = Math.PI / 4; // 45°
const STEP_HEIGHT = 0.2;
const JUMP_SPEED = 6;
const WALK_SPEED = 3;
const RUN_SPEED = 6;
const GRAVITY = 18;

export interface CharInput {
  forward?: boolean;
  back?: boolean;
  left?: boolean;
  right?: boolean;
  jump?: boolean;
  run?: boolean;
}

/**
 * Wrapper rundt Rapier's KinematicCharacterController. Eier en kinematic-
 * position-based rigid body + kapsel-collider + yaw-drevet bevegelse.
 * Brukes av tredjeperson-kamera: kall setYaw + setInput, så update(dt).
 */
export class CharacterController {
  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private kcc: RAPIER.KinematicCharacterController;
  private yaw = 0;
  private verticalVelocity = 0;
  private onGround = false;
  private input: CharInput = {};
  readonly position = { x: 0, y: 0, z: 0 };

  constructor(rw: RapierWorld) {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
    this.body = rw.world.createRigidBody(bodyDesc);
    const colDesc = RAPIER.ColliderDesc.capsule(HALF_HEIGHT, RADIUS);
    this.collider = rw.world.createCollider(colDesc, this.body);

    this.kcc = rw.world.createCharacterController(0.02);
    this.kcc.setUp({ x: 0, y: 1, z: 0 });
    this.kcc.setMaxSlopeClimbAngle(MAX_SLOPE);
    this.kcc.setMinSlopeSlideAngle(Math.PI / 6);
    this.kcc.enableAutostep(STEP_HEIGHT, 0.3, true);
    this.kcc.enableSnapToGround(0.3);
  }

  setInput(partial: Partial<CharInput>): void {
    this.input = { ...this.input, ...partial };
  }

  resetInput(): void {
    this.input = {};
  }

  setYaw(y: number): void {
    this.yaw = y;
  }

  setPosition(x: number, y: number, z: number): void {
    this.body.setTranslation({ x, y, z }, true);
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    this.verticalVelocity = 0;
  }

  update(dt: number): void {
    let mx = 0;
    let mz = 0;
    const speed = this.input.run ? RUN_SPEED : WALK_SPEED;
    if (this.input.forward) mz -= 1;
    if (this.input.back) mz += 1;
    if (this.input.left) mx -= 1;
    if (this.input.right) mx += 1;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len;
      mz /= len;
    }
    // Roter input med yaw (kamera-relativ bevegelse).
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const worldX = (mx * cosY + mz * sinY) * speed;
    const worldZ = (-mx * sinY + mz * cosY) * speed;

    // Vertikal: gravitasjon + hopp.
    if (this.input.jump && this.onGround) {
      this.verticalVelocity = JUMP_SPEED;
    }
    this.verticalVelocity -= GRAVITY * dt;
    const vy = this.verticalVelocity * dt;

    const desired = { x: worldX * dt, y: vy, z: worldZ * dt };
    this.kcc.computeColliderMovement(this.collider, desired);
    const movement = this.kcc.computedMovement();
    const t = this.body.translation();
    const next = { x: t.x + movement.x, y: t.y + movement.y, z: t.z + movement.z };
    this.body.setNextKinematicTranslation(next);
    this.position.x = next.x;
    this.position.y = next.y;
    this.position.z = next.z;
    this.onGround = this.kcc.computedGrounded();
    if (this.onGround && this.verticalVelocity < 0) this.verticalVelocity = 0;
  }

  isMoving(): boolean {
    return Boolean(
      this.input.forward || this.input.back || this.input.left || this.input.right,
    );
  }
}
