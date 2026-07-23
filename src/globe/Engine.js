import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  pass, uniform, screenCoordinate, screenSize, time, vec2, vec3, mul
} from 'three/tsl'
import { PointsNodeMaterial } from 'three/webgpu'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { smaa } from 'three/examples/jsm/tsl/display/SMAANode.js'
import { chromaticAberration } from 'three/examples/jsm/tsl/display/ChromaticAberrationNode.js'
import { film } from 'three/examples/jsm/tsl/display/FilmNode.js'
import GUI from 'lil-gui'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { CONSTANTS, CINEMATIC_LOCATIONS } from './constants.js'
import { createEarth } from './createEarth.js'
import { createMoon, updateMoon } from './createMoon.js'
import {
  createMoonExploreState,
  pickMoon,
  startMoonDive,
  exitMoonDive,
  updateMoonDive,
  projectMoonLabel
} from './moonExplore.js'
import {
  lensflareWgsl, ccWgsl, anamorphicWgsl, updateLensFlare
} from './lensFlare.js'
import { colorGradeWgsl, vignetteWgsl } from './postFx.js'
import { buildGui } from './buildGui.js'
import { BackgroundStars } from './BackgroundStars.js'

export class Engine {
  constructor(canvas) {
    this.animationId = 0;
    this.satellitePoints = null;
    this.satelliteData = null;
    this.backgroundStars = null;
    this.earthGroup = null;
    this.locationAnchors = /* @__PURE__ */ new Map();
    this.onLocationsUpdate = null;
    this.onMoonChange = null;
    this.focusTargetAnchorId = null;
    this.isDisposed = false;
    this.moonExplore = createMoonExploreState();
    this.handleResize = () => {
      if (!this.canvas.parentElement || !this.renderer) return;
      const width = this.canvas.parentElement.clientWidth;
      const height = this.canvas.parentElement.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      const scale = this.renderSettings ? this.renderSettings.resolutionScale : 1;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * scale);
      this.renderer.setSize(width, height);
      if (this.backgroundStars) {
        const pPU = height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
        this.backgroundStars.setPixelsPerUnit(pPU);
      }
    };
    this.animate = () => {
      this.animationId = requestAnimationFrame(this.animate);
      const moonBusy = updateMoonDive(
        this.moonExplore,
        this.camera,
        this.controls,
        this.moonMesh,
        (phase, meta) => this.onMoonChange?.(phase, meta)
      );
      if (!moonBusy && this.focusTargetAnchorId) {
        const anchor = this.locationAnchors.get(this.focusTargetAnchorId);
        if (anchor) {
          const tempV = new THREE.Vector3();
          anchor.getWorldPosition(tempV);
          const dirToAnchor = tempV.clone().normalize();
          const currentDistance = this.camera.position.length();
          const targetDistance = Math.max(CONSTANTS.EARTH_RADIUS * 1.5, Math.min(currentDistance, CONSTANTS.EARTH_RADIUS * 2.5));
          const targetPos = dirToAnchor.multiplyScalar(targetDistance);
          this.camera.position.lerp(targetPos, 0.08);
          if (this.camera.position.distanceTo(targetPos) < 0.05) {
            this.camera.position.copy(targetPos);
            this.focusTargetAnchorId = null;
          }
        }
      }
      if (!this.moonExplore.dive) {
        this.controls.update();
      }
      if (this.sunSettings.autoRotate) {
        this.sunSettings.angle += 0.01 * this.sunSettings.speed;
        if (this.sunSettings.angle > Math.PI * 2)
          this.sunSettings.angle -= Math.PI * 2;
      }
      const sunDist = 200;
      const sa = this.sunSettings.angle;
      const si = this.sunSettings.inclination;
      this.directionalLight.position.set(
        Math.cos(sa) * sunDist,
        Math.sin(si) * sunDist,
        Math.sin(sa) * sunDist
      );
      this.sunMesh.position.copy(this.directionalLight.position);
      this.sunDirUniform.value.copy(this.directionalLight.position).normalize();
      if (!this.moonExplore.inside) {
        this.root.rotation.y += this.earthSettings.rotationSpeed;
        this.root.rotation.z = this.earthSettings.trueInclination ? 23.44 * (Math.PI / 180) : 0;
        this.root.traverse((child) => {
          if (child.name === "clouds") {
            child.rotation.y += this.earthSettings.rotationSpeed * 0.2;
          }
        });
      }
      if (this.moonSettings.enabled) {
        const speedScale = this.moonExplore.inside ? 0.15 : 1;
        this.moonSettings.angle += this.moonSettings.speed * speedScale;
      }
      if (this.moonMesh && this.sunMesh) {
        updateMoon(this.moonMesh, this.sunMesh, this.camera, this.moonSettings);
        this.moonPosUniform.value.copy(this.moonMesh.position);
      }
      if (this.satelliteSettings.enabled && this.satellitePoints && this.satelliteData) {
        const count = this.satelliteSettings.count;
        const posAttr = this.satellitePoints.geometry.attributes.position;
        const positions = posAttr.array;
        const { radii, inclinations, ascendingNodes, angularVelocities, phases } = this.satelliteData;
        const speedScale = this.satelliteSettings.speedScale;
        for (let i = 0; i < count; i++) {
          phases[i] += angularVelocities[i] * speedScale;
          if (phases[i] > Math.PI * 2) phases[i] -= Math.PI * 2;
          const r = radii[i];
          const theta = phases[i];
          const inc = inclinations[i];
          const node = ascendingNodes[i];
          const x0 = r * Math.cos(theta);
          const z0 = r * Math.sin(theta);
          const x1 = x0 * Math.cos(inc);
          const y1 = x0 * Math.sin(inc);
          const z1 = z0;
          const x2 = x1 * Math.cos(node) + z1 * Math.sin(node);
          const y2 = y1;
          const z2 = -x1 * Math.sin(node) + z1 * Math.cos(node);
          const i3 = i * 3;
          positions[i3] = x2;
          positions[i3 + 1] = y2;
          positions[i3 + 2] = z2;
        }
        posAttr.needsUpdate = true;
      }
      this.anamorphicSizeUniform.value = this.anamorphicSettings.size;
      this.anamorphicThicknessUniform.value = this.anamorphicSettings.thickness;
      this.anamorphicColorUniform.value.setHex(this.anamorphicSettings.color);
      updateLensFlare(
        this.sunMesh,
        this.camera,
        this.flarePosUniform,
        this.flareIntensityUniform,
        this.flareSettings,
        this.moonMesh,
        this.moonSettings,
        this.anamorphicIntensityUniform,
        this.anamorphicSettings
      );
      this.updateProjectedLocations();
      if (this.renderer && this.renderPipeline) {
        this.renderPipeline.render();
      }
      if (this.stats) {
        this.stats.update();
      }
    };
    this.canvas = canvas;
  }
  async #createRenderer(forceWebGL) {
    const { WebGPURenderer } = await import("three/webgpu");
    const renderer = new WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      forceWebGL
    });
    await renderer.init();
    return renderer;
  }
  async init(onProgress) {
    if (onProgress) onProgress("Initializing WebGPU Renderer");
    if (this.isDisposed) return;
    const preferWebGL = CONSTANTS.RENDER_TYPE === "webgl";
    try {
      this.renderer = await this.#createRenderer(preferWebGL);
    } catch (err) {
      if (preferWebGL) throw err;
      console.warn("WebGPU init failed, falling back to WebGL:", err);
      this.renderer = await this.#createRenderer(true);
    }
    if (this.isDisposed) return;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = false;
    if (onProgress) onProgress("Setting up Scene & Camera");
    this.camera = new THREE.PerspectiveCamera(
      CONSTANTS.GUI.CAMERA.FOV,
      1,
      0.1,
      1e3
    );
    this.camera.position.set(
      CONSTANTS.GUI.CAMERA.POSITION.x,
      CONSTANTS.GUI.CAMERA.POSITION.y,
      CONSTANTS.GUI.CAMERA.POSITION.z
    );
    this.scene = new THREE.Scene();
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = true;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    this.controls.minDistance = CONSTANTS.EARTH_RADIUS * 1.2;
    this.controls.maxDistance = CONSTANTS.EARTH_RADIUS * 10;
    this.controls.autoRotate = CONSTANTS.GUI.CAMERA.AUTO_ROTATE;
    this.controls.autoRotateSpeed = CONSTANTS.GUI.CAMERA.AUTO_ROTATE_SPEED;
    this.controls.target.set(
      CONSTANTS.GUI.CAMERA.TARGET.x,
      CONSTANTS.GUI.CAMERA.TARGET.y,
      CONSTANTS.GUI.CAMERA.TARGET.z
    );
    this.controls.update();
    this.controls.saveState();
    this.controls.addEventListener("start", () => {
      this.focusTargetAnchorId = null;
    });
    this.textureLoader = new THREE.TextureLoader();
    this.stats = new Stats();
    this.stats.dom.style.position = "absolute";
    this.stats.dom.style.top = "0px";
    this.stats.dom.style.left = "0px";
    this.stats.dom.style.display = CONSTANTS.GUI.DEBUG.STATS ? "block" : "none";
    if (this.canvas.parentElement) {
      this.canvas.parentElement.appendChild(this.stats.dom);
    }
    if (onProgress) onProgress("Loading Celestial Objects");
    this.directionalLight = new THREE.DirectionalLight(
      CONSTANTS.GUI.SUN.COLOR,
      CONSTANTS.GUI.SUN.INTENSITY
    );
    this.directionalLight.position.set(10, 5, 10);
    this.scene.add(this.directionalLight);
    const sunGeom = new THREE.SphereGeometry(6, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(CONSTANTS.GUI.SUN.COLOR).multiplyScalar(2)
    });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.sunMesh.position.copy(
      this.directionalLight.position.clone().normalize().multiplyScalar(200)
    );
    this.scene.add(this.sunMesh);
    this.sunDirUniform = uniform(
      this.directionalLight.position.clone().normalize()
    );
    this.sunColorUniform = uniform(this.directionalLight.color);
    this.moonPosUniform = uniform(new THREE.Vector3());
    this.sunSettings = {
      autoRotate: CONSTANTS.GUI.SUN.AUTO_ROTATE,
      speed: CONSTANTS.GUI.SUN.SPEED,
      inclination: CONSTANTS.GUI.SUN.INCLINATION,
      intensity: CONSTANTS.GUI.SUN.INTENSITY,
      angle: 0
    };
    const maxAnisotropy = this.renderer.getMaxAnisotropy();
    this.moonSettings = {
      enabled: CONSTANTS.GUI.MOON.ENABLED,
      speed: CONSTANTS.GUI.MOON.SPEED,
      distance: CONSTANTS.GUI.MOON.DISTANCE,
      inclination: CONSTANTS.GUI.MOON.INCLINATION,
      displacementScale: CONSTANTS.GUI.MOON.DISPLACEMENT_SCALE,
      illumination: CONSTANTS.GUI.MOON.ILLUMINATION,
      angle: Math.PI
    };
    this.moonMesh = await createMoon(this.textureLoader, maxAnisotropy);
    if (this.isDisposed) return;
    this.scene.add(this.moonMesh);
    this.moonMesh.position.set(0, 0, -100);
    if (onProgress) onProgress("Loading Environment Map (PNG)");
    const starsTexture = await this.textureLoader.loadAsync(
      CONSTANTS.TEXTURES.STARS
    );
    if (this.isDisposed) return;
    starsTexture.mapping = THREE.EquirectangularReflectionMapping;
    starsTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = starsTexture;
    this.scene.backgroundRotation.order = "YXZ";
    this.scene.backgroundIntensity = CONSTANTS.GUI.ENVIRONMENT.SKYBOX_INTENSITY;
    this.scene.backgroundRotation.y = CONSTANTS.GUI.ENVIRONMENT.SKYBOX_AZIMUTH;
    this.scene.backgroundRotation.x = CONSTANTS.GUI.ENVIRONMENT.SKYBOX_PITCH;
    this.scene.backgroundRotation.z = CONSTANTS.GUI.ENVIRONMENT.SKYBOX_ROLL;
    if (onProgress) onProgress("Loading Earth Textures (8K)");
    const earth = await createEarth(
      this.textureLoader,
      this.sunDirUniform,
      this.moonPosUniform,
      maxAnisotropy
    );
    if (this.isDisposed) return;
    this.root.add(earth);
    this.earthGroup = earth;
    this.initLocations();
    if (onProgress) onProgress("Building Render Pipeline");
    const { RenderPipeline } = await import("three/webgpu");
    if (this.isDisposed) return;
    this.renderPipeline = new RenderPipeline(this.renderer);
    const scenePass = pass(this.scene, this.camera);
    this.bloomSettings = {
      enabled: CONSTANTS.GUI.BLOOM.ENABLED,
      strength: CONSTANTS.GUI.BLOOM.STRENGTH,
      radius: CONSTANTS.GUI.BLOOM.RADIUS,
      threshold: CONSTANTS.GUI.BLOOM.THRESHOLD
    };
    const bloomPass = bloom(
      scenePass,
      this.bloomSettings.enabled ? this.bloomSettings.strength : 0,
      this.bloomSettings.radius,
      this.bloomSettings.threshold
    );
    this.flarePosUniform = uniform(new THREE.Vector2(-99, -99));
    this.flareIntensityUniform = uniform(CONSTANTS.GUI.LENS_FLARE.INTENSITY);
    const baseUv = screenCoordinate.div(screenSize).sub(vec2(0.5));
    const aspect = screenSize.x.div(screenSize.y);
    const flareUv = vec2(baseUv.x.mul(aspect), baseUv.y);
    this.anamorphicSettings = {
      enabled: CONSTANTS.GUI.ANAMORPHIC.ENABLED,
      intensity: CONSTANTS.GUI.ANAMORPHIC.INTENSITY,
      thickness: CONSTANTS.GUI.ANAMORPHIC.THICKNESS,
      size: CONSTANTS.GUI.ANAMORPHIC.SIZE,
      color: CONSTANTS.GUI.ANAMORPHIC.COLOR,
      innerFade: CONSTANTS.GUI.ANAMORPHIC.INNER_FADE,
      outerFade: CONSTANTS.GUI.ANAMORPHIC.OUTER_FADE
    };
    this.anamorphicIntensityUniform = uniform(0);
    this.anamorphicSizeUniform = uniform(this.anamorphicSettings.size);
    this.anamorphicThicknessUniform = uniform(
      this.anamorphicSettings.thickness
    );
    this.anamorphicColorUniform = uniform(
      new THREE.Color(this.anamorphicSettings.color)
    );
    const lF = lensflareWgsl({
      uv: flareUv,
      pos: this.flarePosUniform,
      iTime: time
    });
    const flareColorModified = this.sunColorUniform.mul(vec3(1.2, 1.2, 1.2)).mul(lF);
    const colorFlare = mul(
      ccWgsl({
        color: flareColorModified,
        factor: 0.5,
        factor2: 0.1
      }),
      this.flareIntensityUniform
    );
    const aF = anamorphicWgsl({
      uv: flareUv,
      pos: this.flarePosUniform,
      size: this.anamorphicSizeUniform,
      thickness: this.anamorphicThicknessUniform
    });
    const colorAnamorphic = mul(
      this.anamorphicColorUniform.mul(aF),
      this.anamorphicIntensityUniform
    );
    const preColorGrade = scenePass.add(bloomPass).add(colorFlare).add(colorAnamorphic);
    const cgSettings = {
      contrast: CONSTANTS.GUI.COLOR_GRADING.CONTRAST,
      saturation: CONSTANTS.GUI.COLOR_GRADING.SATURATION,
      blackLevel: CONSTANTS.GUI.COLOR_GRADING.BLACK_LEVEL,
      blueGreenBoost: CONSTANTS.GUI.COLOR_GRADING.BLUE_GREEN_BOOST
    };
    const cgContrastUniform = uniform(cgSettings.contrast);
    const cgSaturationUniform = uniform(cgSettings.saturation);
    const cgBlackLevelUniform = uniform(cgSettings.blackLevel);
    const cgBlueGreenBoostUniform = uniform(cgSettings.blueGreenBoost);
    const hdrColorGraded = colorGradeWgsl({
      color: preColorGrade,
      contrast: cgContrastUniform,
      saturation: cgSaturationUniform,
      blackLevel: cgBlackLevelUniform,
      blueGreenBoost: cgBlueGreenBoostUniform
    });
    const sdrToneMapped = hdrColorGraded.toneMapping(
      THREE.ACESFilmicToneMapping
    );
    this.caSettings = {
      enabled: CONSTANTS.GUI.CHROMATIC_ABERRATION.ENABLED,
      strength: CONSTANTS.GUI.CHROMATIC_ABERRATION.STRENGTH,
      scale: CONSTANTS.GUI.CHROMATIC_ABERRATION.SCALE
    };
    this.filmSettings = {
      enabled: CONSTANTS.GUI.FILM_GRAIN.ENABLED,
      intensity: CONSTANTS.GUI.FILM_GRAIN.INTENSITY
    };
    this.vignetteSettings = {
      enabled: CONSTANTS.GUI.VIGNETTE.ENABLED,
      darkness: CONSTANTS.GUI.VIGNETTE.DARKNESS,
      offset: CONSTANTS.GUI.VIGNETTE.OFFSET
    };
    const caStrengthUniform = uniform(
      this.caSettings.enabled ? this.caSettings.strength : 0
    );
    const caScaleUniform = uniform(this.caSettings.scale);
    const filmIntensityUniform = uniform(
      this.filmSettings.enabled ? this.filmSettings.intensity : 0
    );
    const vignetteDarknessUniform = uniform(
      this.vignetteSettings.enabled ? this.vignetteSettings.darkness : 0
    );
    const vignetteOffsetUniform = uniform(this.vignetteSettings.offset);
    let finalNode = sdrToneMapped;
    finalNode = vignetteWgsl({
      color: finalNode,
      uv: screenCoordinate.div(screenSize),
      darkness: vignetteDarknessUniform,
      offset: vignetteOffsetUniform
    });
    finalNode = chromaticAberration(
      finalNode,
      caStrengthUniform,
      vec2(0.5, 0.5),
      caScaleUniform
    );
    finalNode = film(finalNode, filmIntensityUniform);
    this.renderPipeline.outputNode = smaa(finalNode);
    this.flareSettings = {
      enabled: CONSTANTS.GUI.LENS_FLARE.ENABLED,
      intensity: CONSTANTS.GUI.LENS_FLARE.INTENSITY
    };
    this.earthSettings = {
      trueInclination: CONSTANTS.GUI.EARTH.TRUE_INCLINATION || false,
      rotationSpeed: CONSTANTS.GUI.EARTH.ROTATION_SPEED || 5e-4
    };
    this.renderSettings = {
      resolutionScale: CONSTANTS.GUI.DEBUG.RESOLUTION_SCALE || 1
    };
    this.satelliteSettings = {
      enabled: CONSTANTS.GUI.SATELLITES.ENABLED,
      count: CONSTANTS.GUI.SATELLITES.COUNT,
      size: CONSTANTS.GUI.SATELLITES.SIZE,
      color: CONSTANTS.GUI.SATELLITES.COLOR,
      speedScale: CONSTANTS.GUI.SATELLITES.SPEED_SCALE
    };
    this.initSatellites();
    this.backgroundStarsSettings = {
      enabled: CONSTANTS.GUI.BACKGROUND_STARS.ENABLED,
      count: CONSTANTS.GUI.BACKGROUND_STARS.COUNT,
      radius: CONSTANTS.GUI.BACKGROUND_STARS.RADIUS,
      seed: CONSTANTS.GUI.BACKGROUND_STARS.SEED,
      coolColor: CONSTANTS.GUI.BACKGROUND_STARS.COOL_COLOR,
      warmColor: CONSTANTS.GUI.BACKGROUND_STARS.WARM_COLOR
    };
    this.backgroundStars = new BackgroundStars({
      count: this.backgroundStarsSettings.count,
      radius: this.backgroundStarsSettings.radius,
      seed: this.backgroundStarsSettings.seed,
      coolColor: this.backgroundStarsSettings.coolColor,
      warmColor: this.backgroundStarsSettings.warmColor
    });
    this.backgroundStars.mesh.visible = this.backgroundStarsSettings.enabled;
    this.scene.add(this.backgroundStars.mesh);
    this.citiesSettings = {
      enabled: CONSTANTS.GUI.CITIES?.ENABLED !== void 0 ? CONSTANTS.GUI.CITIES.ENABLED : false
    };
    this.gui = new GUI({ title: "Engine Settings" });
    if (!CONSTANTS.GUI.SHOW) {
      this.gui.hide();
    }
    const debugSettings = { stats: CONSTANTS.GUI.DEBUG.STATS };
    this.stats.dom.style.display = debugSettings.stats ? "block" : "none";
    buildGui(this.gui, {
      cgSettings,
      cgUniforms: {
        contrast: cgContrastUniform,
        saturation: cgSaturationUniform,
        blackLevel: cgBlackLevelUniform,
        blueGreenBoost: cgBlueGreenBoostUniform
      },
      moonSettings: this.moonSettings,
      moonMesh: this.moonMesh,
      flareSettings: this.flareSettings,
      anamorphicSettings: this.anamorphicSettings,
      bloomSettings: this.bloomSettings,
      bloomPass,
      caSettings: this.caSettings,
      caUniforms: {
        strength: caStrengthUniform,
        scale: caScaleUniform
      },
      filmSettings: this.filmSettings,
      filmUniforms: {
        intensity: filmIntensityUniform
      },
      vignetteSettings: this.vignetteSettings,
      vignetteUniforms: {
        darkness: vignetteDarknessUniform,
        offset: vignetteOffsetUniform
      },
      earth,
      controls: this.controls,
      camera: this.camera,
      scene: this.scene,
      directionalLight: this.directionalLight,
      sunMaterial: this.sunMesh.material,
      sunSettings: this.sunSettings,
      debugSettings,
      statsDom: this.stats.dom,
      earthSettings: this.earthSettings,
      renderSettings: this.renderSettings,
      onResize: this.handleResize,
      renderer: this.renderer,
      canvas: this.canvas,
      renderPipeline: this.renderPipeline,
      satelliteSettings: this.satelliteSettings,
      satellitePoints: this.satellitePoints,
      backgroundStarsSettings: this.backgroundStarsSettings,
      backgroundStars: this.backgroundStars,
      citiesSettings: this.citiesSettings
    });
    this.handleResize();
    window.addEventListener("resize", this.handleResize);
    if (onProgress) onProgress("Compiling Shaders (Warmup)");
    if (this.renderer && !this.isDisposed) {
      await this.renderer.compileAsync(this.scene, this.camera);
    }
    if (!this.isDisposed) {
      this.start();
    }
  }
  initSatellites() {
    const count = this.satelliteSettings.count;
    const radii = new Float32Array(count);
    const inclinations = new Float32Array(count);
    const ascendingNodes = new Float32Array(count);
    const angularVelocities = new Float32Array(count);
    const phases = new Float32Array(count);
    let idx = 0;
    const leoCount = Math.floor(count * 0.65);
    const shells = [
      { r: 10.6, inc: 53 * (Math.PI / 180), planes: 12 },
      { r: 10.9, inc: 70 * (Math.PI / 180), planes: 8 },
      { r: 11.3, inc: 97.6 * (Math.PI / 180), planes: 10 },
      { r: 11.7, inc: 53 * (Math.PI / 180), planes: 8 }
    ];
    let shellIdx = 0;
    while (idx < leoCount && idx < count) {
      const shell = shells[shellIdx % shells.length];
      shellIdx++;
      const satsInShell = Math.floor(leoCount / shells.length);
      const satsPerPlane = Math.floor(satsInShell / shell.planes);
      for (let p = 0; p < shell.planes; p++) {
        const node = p / shell.planes * Math.PI * 2 + Math.random() * 0.02;
        for (let s = 0; s < satsPerPlane; s++) {
          if (idx >= count) break;
          radii[idx] = shell.r;
          inclinations[idx] = shell.inc;
          ascendingNodes[idx] = node;
          angularVelocities[idx] = 3e-3 * Math.pow(10.6 / shell.r, 1.5);
          phases[idx] = s / satsPerPlane * Math.PI * 2 + Math.random() * 0.05;
          idx++;
        }
      }
    }
    const meoCount = Math.floor(count * 0.15);
    const meoTarget = idx + meoCount;
    const meoPlanes = 6;
    const meoSatsPerPlane = Math.floor(meoCount / meoPlanes);
    const meoRadius = 16.5;
    const meoInc = 55 * (Math.PI / 180);
    for (let p = 0; p < meoPlanes; p++) {
      const node = p / meoPlanes * Math.PI * 2;
      for (let s = 0; s < meoSatsPerPlane; s++) {
        if (idx >= count || idx >= meoTarget) break;
        radii[idx] = meoRadius + (Math.random() * 0.4 - 0.2);
        inclinations[idx] = meoInc + (Math.random() * 0.02 - 0.01);
        ascendingNodes[idx] = node;
        angularVelocities[idx] = 3e-3 * Math.pow(10.6 / meoRadius, 1.5);
        phases[idx] = s / meoSatsPerPlane * Math.PI * 2;
        idx++;
      }
    }
    const geoCount = Math.floor(count * 0.1);
    const geoTarget = idx + geoCount;
    const geoRadius = 24;
    for (let i = 0; idx < geoTarget && idx < count; i++) {
      radii[idx] = geoRadius + (Math.random() * 0.2 - 0.1);
      inclinations[idx] = 0 + (Math.random() * 0.01 - 5e-3);
      ascendingNodes[idx] = Math.random() * Math.PI * 2;
      angularVelocities[idx] = 3e-3 * Math.pow(10.6 / geoRadius, 1.5);
      phases[idx] = Math.random() * Math.PI * 2;
      idx++;
    }
    while (idx < count) {
      const r = 10.5 + Math.random() * 18;
      radii[idx] = r;
      inclinations[idx] = Math.random() * Math.PI;
      ascendingNodes[idx] = Math.random() * Math.PI * 2;
      angularVelocities[idx] = 3e-3 * Math.pow(10.6 / r, 1.5);
      phases[idx] = Math.random() * Math.PI * 2;
      idx++;
    }
    this.satelliteData = { radii, inclinations, ascendingNodes, angularVelocities, phases };
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radii[i];
      const theta = phases[i];
      const inc = inclinations[i];
      const node = ascendingNodes[i];
      const x0 = r * Math.cos(theta);
      const z0 = r * Math.sin(theta);
      const x1 = x0 * Math.cos(inc);
      const y1 = x0 * Math.sin(inc);
      const z1 = z0;
      const x2 = x1 * Math.cos(node) + z1 * Math.sin(node);
      const y2 = y1;
      const z2 = -x1 * Math.sin(node) + z1 * Math.cos(node);
      const i3 = i * 3;
      positions[i3] = x2;
      positions[i3 + 1] = y2;
      positions[i3 + 2] = z2;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.satSizeUniform = uniform(this.satelliteSettings.size);
    this.satColorUniform = uniform(new THREE.Color(this.satelliteSettings.color));
    const material = new PointsNodeMaterial({
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    material.sizeNode = this.satSizeUniform;
    material.colorNode = this.satColorUniform;
    this.satellitePoints = new THREE.Points(geometry, material);
    this.satellitePoints.visible = this.satelliteSettings.enabled;
    this.satellitePoints.userData = {
      sizeUniform: this.satSizeUniform,
      colorUniform: this.satColorUniform
    };
    this.root.add(this.satellitePoints);
  }
  start() {
    this._onMoonClick = (e) => {
      if (this.moonExplore.inside || this.moonExplore.dive) return;
      if (pickMoon(this.moonExplore, this.canvas, this.camera, this.moonMesh, e.clientX, e.clientY)) {
        this.enterMoon();
      }
    };
    this.canvas.addEventListener("click", this._onMoonClick);
    this.animate();
  }
  enterMoon() {
    startMoonDive(
      this.moonExplore,
      this.camera,
      this.controls,
      this.moonMesh,
      (phase, meta) => this.onMoonChange?.(phase, meta)
    );
  }
  exitMoon(instant = false) {
    exitMoonDive(
      this.moonExplore,
      this.camera,
      this.controls,
      (phase, meta) => this.onMoonChange?.(phase, meta),
      instant
    );
  }
  dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener("resize", this.handleResize);
    this.canvas.removeEventListener("click", this._onMoonClick);
    if (this.gui) {
      this.gui.destroy();
    }
    if (this.stats && this.stats.dom && this.stats.dom.parentElement) {
      this.stats.dom.parentElement.removeChild(this.stats.dom);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.backgroundStars) {
      this.backgroundStars.dispose();
    }
  }
  initLocations() {
    if (!this.earthGroup) return;
    const radius = CONSTANTS.EARTH_RADIUS + 0.1;
    for (const loc of CINEMATIC_LOCATIONS) {
      const phi = (90 - loc.lat) * (Math.PI / 180);
      const theta = (loc.lng + 180) * (Math.PI / 180);
      const x = -radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(theta) * Math.sin(phi);
      const anchor = new THREE.Object3D();
      anchor.position.set(x, y, z);
      this.earthGroup.add(anchor);
      this.locationAnchors.set(loc.id, anchor);
    }
  }
  updateProjectedLocations() {
    if (!this.onLocationsUpdate) return;
    if (this.moonExplore.inside || this.moonExplore.dive?.kind === "enter") {
      this.onLocationsUpdate([]);
      return;
    }
    const projected = [];
    const moonLabel = projectMoonLabel(this.canvas, this.camera, this.moonMesh);
    if (moonLabel) projected.push(moonLabel);
    if (this.citiesSettings && this.citiesSettings.enabled && this.locationAnchors.size > 0) {
      const tempV = new THREE.Vector3();
      const earthCenter = new THREE.Vector3(0, 0, 0);
      const width = this.canvas.parentElement ? this.canvas.parentElement.clientWidth : window.innerWidth;
      const height = this.canvas.parentElement ? this.canvas.parentElement.clientHeight : window.innerHeight;
      const dirToCamera = this.camera.position.clone().sub(earthCenter).normalize();
      for (const [id, anchor] of this.locationAnchors.entries()) {
        anchor.getWorldPosition(tempV);
        const distanceToCamera = this.camera.position.distanceTo(tempV);
        const dirToAnchor = tempV.clone().sub(earthCenter).normalize();
        const dot2 = dirToAnchor.dot(dirToCamera);
        const visible = dot2 > -0.05;
        let opacity = 0;
        if (dot2 > 0) {
          opacity = Math.min(1, dot2 / 0.2);
        }
        tempV.project(this.camera);
        const x = (tempV.x * 0.5 + 0.5) * width;
        const y = (tempV.y * -0.5 + 0.5) * height;
        const info = CINEMATIC_LOCATIONS.find((l) => l.id === id);
        if (info) {
          projected.push({
            id,
            name: info.name,
            lat: info.lat,
            lng: info.lng,
            x,
            y,
            visible,
            opacity,
            distanceToCamera,
            kind: "city",
            clickable: false
          });
        }
      }
    }
    this.onLocationsUpdate(projected);
  }
  focusOnLocation(id) {
    this.focusTargetAnchorId = id;
  }
};