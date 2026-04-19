import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Tynnt wrapper rundt rapier3d-compat. Kaller RAPIER.init() én gang og
 * eksponerer World + integrationParameters. Alle andre physics-klasser
 * tar imot en instans av denne.
 */
export class RapierWorld {
  world!: RAPIER.World;
  private ready = false;

  async init(gravity: RAPIER.Vector3 = { x: 0, y: -24, z: 0 }): Promise<void> {
    if (this.ready) return;
    await RAPIER.init();
    this.world = new RAPIER.World(gravity);
    this.world.integrationParameters.dt = 1 / 60;
    this.ready = true;
  }

  step(dt: number): void {
    if (!this.ready) return;
    // Rapier foretrekker fixed timestep. Vi begrenser dt for å unngå hopp.
    const clamped = Math.min(dt, 1 / 30);
    this.world.integrationParameters.dt = clamped;
    this.world.step();
  }

  isReady(): boolean {
    return this.ready;
  }
}

export { RAPIER };
