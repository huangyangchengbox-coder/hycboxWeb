import * as THREE from 'three'
import { SpriteNodeMaterial } from 'three/webgpu'
import {
  PI2, cameraPosition, color, cos, float, hash, instanceIndex, mix, sin, sqrt, uniform, uv, vec3, vec4
} from 'three/tsl'

var spriteGlow = () => {
  const d = uv().sub(0.5).length();
  return float(0.07).div(d.add(0.02)).sub(0.13).clamp(0, 2);
};
export class BackgroundStars {
  /**
   * @param {BackgroundStarsOptions} [options]
   */
  constructor({
    count = 4e3,
    radius = 140,
    seed = 0,
    pixelsPerUnit = 1e3,
    coolColor = "#9db6ff",
    warmColor = "#ffd9b0"
  } = {}) {
    this.count = count;
    this.radius = radius;
    this.uniforms = {
      seed: uniform(seed, "uint"),
      pixelsPerUnit: uniform(pixelsPerUnit)
    };
    this.mesh = this.#build(coolColor, warmColor);
    this.mesh.count = this.count;
  }
  /** Per-instance pseudo-random in [0,1). Salts spaced so hash windows don't overlap. */
  #rand(salt) {
    return hash(instanceIndex.add(this.uniforms.seed).add(salt * 1e6));
  }
  /**
   * Screen-space size clamp: when a star's projected size drops below ~1.5 px
   * it starts falling between pixel samples and twinkles as the camera moves.
   * Hold at minimum size and dim by the covered-area ratio to keep total light constant.
   */
  #stabilize(position, scale) {
    const dist = position.sub(cameraPosition).length();
    const pxSize = scale.mul(this.uniforms.pixelsPerUnit).div(dist).max(1e-5);
    const boost = float(1.5).div(pxSize).max(1);
    return {
      scale: scale.mul(boost),
      fade: float(1).div(boost.mul(boost))
    };
  }
  #build(coolColor, warmColor) {
    const material = new SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const rand = (salt) => this.#rand(salt);
    const theta = rand(50).mul(PI2);
    const cosPhi = rand(51).mul(2).sub(1);
    const sinPhi = sqrt(cosPhi.mul(cosPhi).oneMinus().max(0));
    const position = vec3(
      sinPhi.mul(cos(theta)),
      cosPhi,
      sinPhi.mul(sin(theta))
    ).mul(this.radius).toVar();
    material.positionNode = position;
    const baseScale = rand(52).pow(2).mul(0.5).add(0.15);
    const { scale, fade } = this.#stabilize(position, baseScale);
    const starColor = mix(color(coolColor), color(warmColor), rand(53));
    const brightness = rand(54).pow(3).mul(0.7).add(0.15).mul(fade);
    material.colorNode = vec4(starColor.mul(brightness), spriteGlow());
    material.scaleNode = scale;
    return new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, 2e4);
  }
  /** Update from canvas height + camera FOV (call on resize). */
  setPixelsPerUnit(value) {
    this.uniforms.pixelsPerUnit.value = value;
  }
  /** Update active star count. */
  setCount(value) {
    this.count = value;
    this.mesh.count = value;
  }
  /** Reroll star positions, sizes, and colors. */
  setSeed(seed) {
    this.uniforms.seed.value = seed;
  }
  dispose() {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((mat) => mat.dispose());
    } else if (this.mesh.material) {
      this.mesh.material.dispose();
    }
  }
};