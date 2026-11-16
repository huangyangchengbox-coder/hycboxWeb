# Saltline（3D 游戏）代码技法借鉴分析

> 分析对象：`D:/codes/network/saltline-fable-5.2/index.html`
> 对照项目：hycBox Web（`/home` 地球 · `/cosmos` 宇宙 · `/wildlife` 动物世界）
> 文档版本：v1.0 · 2026-11-12
> 关联文档：`3D渲染优化建议.md`、`星云与动物建模优化.md`、`程序化3D动物合集-分析.md`

---

## 0. 结论

Saltline 是一款「一次提示生成」的单文件 3D FPS：1.4MB 的 `index.html` 内联打包 three.js，**模型、贴图、音效、天空全部代码生成，零外部资源**。它有 7 项技法可以迁移到我们的三个沉浸世界：

| # | 技法 | 迁移目标 | 收益 | 成本 |
|---|---|---|---|---|
| 1 | 顶点 shader 群体动画（整群 1 draw call） | wildlife 鸟群/鱼群 | 性能 + 生命力 | 1~2 天 |
| 2 | 按材质合并静态几何 + 三角形预算 | wildlife 生境 | draw call 降一个量级 | 2 天 |
| 3 | FBM 程序化噪声（值噪声 + 域扭曲 + ridged） | 星云、树皮、皮毛 | 视觉档次拉开 | 2~3 天 |
| 4 | 后处理最小子集（bloom + 颗粒 + dither） | cosmos（当前无后处理） | 画质白送 | 1 天 |
| 5 | 程序化天空穹顶（fbm 云 + 自阴影 + 闪电） | wildlife 天空 | 氛围质变 | 1~2 天 |
| 6 | 全 GPU 雨（涟漪 + 湿面反光） | wildlife 天气/湿地 | 一个 uniform 开关 | 1 天 |
| 7 | 程序化音频合成 + 空间化 | wildlife 声景 | 零音频文件 | 1 天 |

一句话：它真正值钱的不是玩法，而是「零资产纪律」——所有视听都从代码长出来。这跟我们「全参数化生成」的路线完全同路，等于把优化文档里的方向（GPU 化、合并、程序纹理、后处理）提前实现了一遍。

---

## 1. 前提：哪些模块能直接用

| 场景 | 渲染器 | 能否用本文 shader 写法 |
|---|---|---|
| `src/globe/SpaceScene.js`（太空/星云） | `WebGLRenderer` | ✅ |
| `src/cosmos/CosmosScene.js`（太阳系） | `WebGLRenderer` | ✅ |
| `src/wildlife/WildlifeScene.js`（动物世界） | `WebGLRenderer` | ✅ |
| `src/globe/Engine.js`（地球主页） | `WebGPURenderer` + TSL | ❌ 需改写为 TSL NodeMaterial，不在本文范围 |

---

## 2. 技法一：顶点 shader 群体动画

### 它的做法

一群海鸥**不是每只一个 Mesh**，而是整群烘焙成一个几何体。每只鸟 6 个顶点（两片三角翼），每顶点挂两组属性：

- `aOrbit`（vec4）：轨道中心 xyz + 半径 w
- `aPar`（vec4）：带符号角速度、相位、拍翅频率、翼尖权重

`onBeforeCompile` 注入 `#include <begin_vertex>`，约 10 行完成绕圈 + 拍翅 + 滑翔相位：

```glsl
float ga = aPar.y + uTime * aPar.x;
float gdir = sign(aPar.x);
vec3 gfw = vec3(-sin(ga), 0.0, cos(ga)) * gdir;      // 前进方向
vec3 grt = vec3(gfw.z, 0.0, -gfw.x);                 // 右方向

float glide = smoothstep(-0.2, 0.5, sin(uTime * 0.31 + aPar.y * 3.0));
float gflap = sin(uTime * aPar.z + aPar.y * 7.0) * mix(0.12, 0.55, glide) + 0.18;
gl.y += aPar.w * gflap * abs(gl.z);                  // 翼尖振幅 ∝ 翼展
gl.z *= mix(1.0, 0.86, aPar.w * abs(gflap));

vec3 gc = aOrbit.xyz
  + vec3(cos(ga), 0.0, sin(ga)) * aOrbit.w
  + vec3(0.0, sin(ga * 0.7 + aPar.y) * 2.2 + sin(uTime * 0.23 + aPar.y) * 1.5, 0.0);

vec3 transformed = gc + gfw * gl.x + grt * gl.z + vec3(0.0, gl.y, 0.0);
```

两个值得学的细节：

1. `glide` 用低频正弦在「滑翔 / 拍翅」之间插值，振幅 0.12~0.55——真实鸟类滑翔时翅膀几乎不动，这一行让群体不像机械扇动；
2. 同一个 `aPar.y`（相位）同时驱动轨道、拍翅、上下浮动，个体自然错开，CPU 零排序。

### 我们的用法

`/wildlife` 现在天上和水里都是空的。加一群鸟/鱼的完整实现见 `程序化3D动物合集-分析.md` 同期的 `flocks.js` 方案，核心结构：

```js
// src/wildlife/flocks.js
import * as THREE from 'three'

const BIRD_VERTS = [
  [-0.15, 0, 0], [0.15, 0, 0], [-0.24, 0.80, 1],
  [0.15, 0, 0], [-0.13, 0, 0], [-0.24, -0.80, 1]
]

export function createFlock({ count = 24, center, radius = [7, 18], speed = 0.16, color = 0x2a2f38 }) {
  const pos = new Float32Array(count * 6 * 3)
  const orbit = new Float32Array(count * 6 * 4)
  const par = new Float32Array(count * 6 * 4)

  for (let i = 0; i < count; i++) {
    const r = THREE.MathUtils.lerp(radius[0], radius[1], Math.random())
    const cy = center.y + (Math.random() - 0.5) * 4
    const dir = Math.random() > 0.5 ? 1 : -1
    const spd = speed * (0.75 + Math.random() * 0.5) * dir
    const phase = Math.random() * Math.PI * 2
    const flapSpd = 6 + Math.random() * 3
    const scale = 0.8 + Math.random() * 0.5

    for (let v = 0; v < 6; v++) {
      const [vx, vz, wing] = BIRD_VERTS[v]
      const o3 = (i * 6 + v) * 3
      pos[o3] = vx * scale; pos[o3 + 1] = 0; pos[o3 + 2] = vz * scale
      const o4 = (i * 6 + v) * 4
      orbit[o4] = center.x; orbit[o4 + 1] = cy; orbit[o4 + 2] = center.z; orbit[o4 + 3] = r
      par[o4] = spd; par[o4 + 1] = phase; par[o4 + 2] = flapSpd; par[o4 + 3] = wing * scale
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aOrbit', new THREE.BufferAttribute(orbit, 4))
  geo.setAttribute('aPar', new THREE.BufferAttribute(par, 4))

  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: true })
  const uTime = { value: 0 }

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime
    shader.vertexShader = `
      attribute vec4 aOrbit;
      attribute vec4 aPar;
      uniform float uTime;
    ` + shader.vertexShader.replace('#include <begin_vertex>', `
      float ga = aPar.y + uTime * aPar.x;
      float gdir = sign(aPar.x);
      vec3 gfw = vec3(-sin(ga), 0.0, cos(ga)) * gdir;
      vec3 grt = vec3(gfw.z, 0.0, -gfw.x);
      vec3 gl = position;

      float glide = smoothstep(-0.2, 0.5, sin(uTime * 0.31 + aPar.y * 3.0));
      float gflap = sin(uTime * aPar.z + aPar.y * 7.0) * mix(0.12, 0.55, glide) + 0.18;
      gl.y += aPar.w * gflap * abs(gl.z);

      vec3 gc = aOrbit.xyz
        + vec3(cos(ga), 0.0, sin(ga)) * aOrbit.w
        + vec3(0.0, sin(ga * 0.7 + aPar.y) * 2.2 + sin(uTime * 0.23 + aPar.y) * 1.5, 0.0);

      vec3 transformed = gc + gfw * gl.x + grt * gl.z + vec3(0.0, gl.y, 0.0);
    `)
  }
  mat.customProgramCacheKey = () => 'hyc-flock'   // 必须与 onBeforeCompile 成对

  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false    // 顶点在 GPU 位移，CPU 包围球不可信
  mesh.castShadow = mesh.receiveShadow = false

  return { mesh, update(t) { uTime.value = t } }
}
```

**三个坑**：

1. **雾**：`WildlifeScene` 是 `Fog(0x07140f, 12, 28)`，线性雾只覆盖 12~28。鸟群半径超过 28 会被雾吃掉，要么半径 ≤ 18，要么 `fog: false`。
2. `frustumCulled = false` 的组永远参与绘制，群数要克制。
3. 不写 `customProgramCacheKey` 会和其它 `MeshBasicMaterial` 共用 program，出现「关掉鸟群地面也变色」这类问题。

---

## 3. 技法二：按材质合并 + 三角形预算

### 它的做法

世界构建器提供两个原语：`c(geometry, material)` 往「材质桶」里塞一件，`t.build()` 结束时**按材质 `mergeGeometries` 合并成每材质一个 Mesh**，统一设 `castShadow/receiveShadow`，并返回 `{ root, tris }` —— 内置三角形计数器做美术预算。

关键设计是**构建期只记账、结束期一次合并**。

### 我们的用法

```js
// src/wildlife/mergeStatic.js
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function mergeByMaterial(parts, { castShadow = false, receiveShadow = true } = {}) {
  const buckets = new Map()
  for (const { geometry, material, matrix } of parts) {
    const g = geometry.clone()
    if (matrix) g.applyMatrix4(matrix)
    g.deleteAttribute('uv1')        // 属性不同构时 merge 会静默返回 null
    if (!buckets.has(material)) buckets.set(material, [])
    buckets.get(material).push(g)
  }

  const group = new THREE.Group()
  for (const [material, geos] of buckets) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false)
    if (!merged) {                  // 兜底：退化为独立 Mesh，不能静默丢东西
      geos.forEach((g) => group.add(new THREE.Mesh(g, material)))
      continue
    }
    const mesh = new THREE.Mesh(merged, material)
    mesh.castShadow = castShadow
    mesh.receiveShadow = receiveShadow
    group.add(mesh)
    geos.forEach((g) => g !== merged && g.dispose())
  }
  return group
}

export function countTriangles(root) {
  let tris = 0
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return
    const g = o.geometry
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3
  })
  return tris
}
```

生境构建改为「两阶段」：先返回 `parts` 清单（每件带几何 + 材质 + 已 compose 的矩阵），再一次性合并。

**收益**：单生境静态件 draw call 从几十~上百降到「材质种数」（通常 4~6）。

**坑**：合并后无法单独 frustum cull，整个生境永远参与绘制——展示型站点可接受，但别把整个世界合进一个 Mesh。

---

## 4. 技法三：FBM 程序化噪声

### 它的做法

启动时 xorshift 生成一张 256×256 的 `DataTexture`，shader 里手动做双线性插值得到值噪声，再叠 FBM：

```glsl
uniform sampler2D tNoise;
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return texture2D(tNoise, (i + f + 0.5) / 256.0).r;
}
float fbm5(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * n2(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.3;
    a *= 0.5;
  }
  return s / 0.96875;
}
```

**为什么是 `mat2(1.6, 1.2, -1.2, 1.6)`**：带旋转的 2 倍缩放（长度 ≈ 2，旋转 ≈ 36.87°）。直接乘 2 会让各八度网格对齐，出现方格 artifacts；带旋转就散开。这是这套噪声「不像程序生成」的核心。

在它之上叠三层：

1. **域扭曲**：先用低频 fbm 得偏移向量，再拿它扰动采样坐标 → 团块变丝状；
2. **ridged**：`1.0 - abs(2.0 * fbm3(...) - 1.0)` → 尖脊，做云底/尘埃纤维；
3. **自阴影**：朝太阳方向再采样一次密度，两值相减当明暗 → 体积感的关键。

### 我们的用法（星云）

`nebulae.js` 现在是 Canvas 2D 手绘 360px 插画；换成 fbm shader 才是「发光气体」。

```js
// src/globe/noiseTex.js —— 全站共用一张噪声贴图
import * as THREE from 'three'

let cached = null

export function getNoiseTexture(size = 256) {
  if (cached) return cached
  const data = new Uint8Array(size * size * 4)
  let s = 2654435769
  const rnd = () => {
    s ^= s << 13; s >>>= 0
    s ^= s >>> 17
    s ^= s << 5;  s >>>= 0
    return s / 4294967296
  }
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = rnd() * 256
    data[i * 4 + 1] = rnd() * 256
    data[i * 4 + 2] = rnd() * 256
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = tex.minFilter = THREE.NearestFilter   // 必须 Nearest，插值由 n2 手做
  tex.generateMipmaps = false
  // 不要设 SRGBColorSpace，噪声必须线性
  tex.needsUpdate = true
  cached = tex
  return tex
}

export const NOISE_GLSL = /* glsl */`
uniform sampler2D tNoise;
uniform float uNoiseSize;
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return texture2D(tNoise, (i + f + 0.5) / uNoiseSize).r;
}
float fbm3(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * n2(p); p = mat2(1.6,1.2,-1.2,1.6) * p + 17.3; a *= 0.5; }
  return s / 0.875;
}
float fbm5(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * n2(p); p = mat2(1.6,1.2,-1.2,1.6) * p + 17.3; a *= 0.5; }
  return s / 0.96875;
}
float ridged(vec2 p) { return 1.0 - abs(2.0 * fbm3(p) - 1.0); }
`
```

星云材质（替换现在的 Sprite）：`Sprite` 不支持自定义 shader，所以用 `PlaneGeometry` + 手写 billboard：

```glsl
// 顶点：手动 billboard
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toCam = normalize(cameraPosition - center);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 up = cross(toCam, right);
  vec3 wp = center + (right * position.x + up * position.y) * uSize;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
```

```glsl
// 片元：域扭曲 + ridged + 自阴影
float main_dens(vec2 wq) { return fbm5(wq) * 0.82 + (ridged(wq * 3.3) - 0.5) * 0.22; }

vec2 p = vUv - 0.5;
float r = length(p) * 2.0;
vec2 q = vUv * 3.2 + uSeed;
vec2 warp = vec2(fbm5(q + vec2(uTime * 0.010, 0.0)),
                 fbm5(q * 1.7 + 8.4 - vec2(0.0, uTime * 0.008))) - 0.5;
vec2 wq = q + warp * 2.2;

float dens = main_dens(wq);
float core = uCore * exp(-r * r * 2.6);
dens += core * 0.55;
dens *= smoothstep(1.0, 0.35, r);

vec2 toCore = -normalize(p + 1e-5);
float lit = clamp((dens - fbm5(wq + toCore * 0.25)) * 3.5 + 0.55, 0.0, 1.0);

vec3 col = mix(uDust, uCool, smoothstep(0.10, 0.45, dens));
col = mix(col, uHot, pow(core, 0.8) * 0.9 + lit * 0.25);
float alpha = smoothstep(0.06, 0.42, dens);
gl_FragColor = vec4(col * (1.0 + core * 1.4), alpha);
```

材质参数：`transparent: true, depthWrite: false, blending: NormalBlending`（含暗柱的星云不能用 Additive，暗部会被吃掉）。

**性能**：`fbm5 × 3 + fbm3 × 1` ≈ 每像素 18 次噪声采样，1080p 下 15 个满屏星云偏贵。降级：低画质把 `fbm5` 换 `fbm3`；或半分辨率 RT 再放大（体积感反而更柔）。

**同一技法的另外落点**：树皮/地面（CPU 烘焙 `CanvasTexture`，一次烘焙多次复用）；动物皮毛（替代 `furTexture` 的 900 次 stroke）。

---

## 5. 技法四：后处理最小子集

### 它的做法

自研迷你 composer：全屏大三角（省顶点）+ 正交相机，通道链为
深度 → 半分辨率 SSAO → 体积光轴 → 合成 → 运动矢量/TAA → bloom 金字塔 + 变形拉丝 → 自动曝光 → 分级（色差/暗角/AGX）→ 锐化 + 亮度加权胶片颗粒 + dither。

**不必抄全套**。最小子集「bloom + 暗角 + 颗粒 + dither」收益最大，尤其 dither 那一行专门防天空渐变色带，对星云/大气几乎是白送。

### 我们的用法

`/cosmos` 目前没有任何后处理，可以直接上 `EffectComposer`：

```js
// src/cosmos/postfx.js
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.035 }, uVignette: { value: 0.35 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime, uGrain, uVignette;
    varying vec2 vUv;
    float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      vec2 p = vUv - 0.5;
      col *= 1.0 - uVignette * dot(p, p) * 1.6;
      vec2 seed = gl_FragCoord.xy + fract(uTime * vec2(7.31, 3.17)) * vec2(311.7, 173.3);
      float g = hash12(seed) + hash12(seed + 57.3) - 1.0;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col += g * uGrain * mix(1.0, 0.30, smoothstep(0.25, 0.9, l)) * (0.35 + 0.65 * smoothstep(0.0, 0.08, l));
      col += (hash12(gl_FragCoord.xy * 1.37 + 11.0) + hash12(gl_FragCoord.xy * 0.71 + 3.0) - 1.0) / 255.0;
      gl_FragColor = vec4(col, 1.0);
    }`
}

export function createPostFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.5, 0.85)
  composer.addPass(bloom)

  composer.addPass(new OutputPass())                      // 色调映射 + sRGB 转换
  const finish = new ShaderPass(FinishShader)
  composer.addPass(finish)                                // 颗粒/dither 放在转换之后

  return { composer, finish }
}
```

**顺序很关键**：颗粒必须在 `OutputPass` 之后，才是「显示空间里的胶片颗粒」；放在之前会被色调映射压掉。而自定义 `ShaderPass` 不会做色彩空间转换，所以必须显式加 `OutputPass`，否则整体发灰。

**成本**：1080p 中端 GPU 约 2~3ms。bloom 的 `threshold` 要调高（0.85），只让星点和辉光溢光，否则行星也被糊成一片。

---

## 6. 技法五：程序化天空穹顶

### 它的做法

天空球用「深度钉在远平面」的技巧，shader 里做：日落色温渐变、太阳 Mie 光晕（四层 `pow(s, 8/64/600/6000)` 叠加）、云层 ridged 起伏、**朝太阳方向采样密度差实现云底自阴影**、地平线处大气透视消锯齿、`uFlash` uniform 触发云层内闪电。

### 我们的用法

`/wildlife` 现在只有 `scene.background` 纯色 + `Fog`。加一个穹顶即可：

```glsl
// 顶点：钉在远平面
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w;   // ndc z = 1，永远在最后
}
```

```glsl
// 片元：渐变 + fbm 云 + 自阴影 + 闪电
vec3 d = normalize(vDir);
float h = max(d.y, 0.0);
float mu = dot(d, uSunDir);
float s = max(mu, 0.0);

vec3 sky = mix(uHorizon, uZenith, pow(h, 0.55));
sky += uSunCol * (pow(s, 8.0) * 0.12 + pow(s, 128.0) * 0.9);   // Mie 光晕

vec2 cuv = d.xz / (h + 0.12) * vec2(0.62, 0.95);               // 投影到云层平面
vec2 q = cuv + uTime * vec2(-0.012, 0.004);                    // 风
float warp = fbm3(q * 0.45 + 7.1);
float dens = fbm5(q + (warp - 0.5) * 1.3);
dens = dens * 0.86 + (ridged(q * 3.1 + 5.0) - 0.6) * 0.16;
float cov = smoothstep(0.34, 0.52, dens) * smoothstep(0.02, 0.16, h);

vec2 sd = normalize(uSunDir.xz + 1e-4);
float densS = fbm5(q + sd * 0.22 + (warp - 0.5) * 1.3);
float relief = clamp((dens - densS) * 4.5 + 0.5, 0.0, 1.0);     // 云底自阴影

vec3 cloud = mix(vec3(0.10, 0.12, 0.15), vec3(0.55, 0.50, 0.48), relief);
cloud += uSunCol * pow(s, 6.0) * 0.5 * relief;
cloud += vec3(0.5, 0.62, 0.95) * uFlash * (0.4 + 2.2 * dens * dens);

vec3 col = mix(sky, cloud, cov * 0.96);
gl_FragColor = vec4(col, 1.0);
```

**两个必须处理的冲突**：

1. 材质必须 `fog: false`，否则被 `Fog(12, 28)` 整片吃掉；
2. 地平线颜色要手动对齐 `habitat.fog`，否则天空和雾之间会有一条明显的接缝。

`uFlash` 可以直接接进现有天气系统：雷雨生境里随机触发 0.1s 的闪光 + 延迟 0.4~1.2s 的雷声（见技法七）。

---

## 7. 技法六：全 GPU 雨

### 它的做法

雨没有 CPU 粒子。地面 shader 按 cell 哈希生成**涟漪环**（`uRain` 控制密度），朝上面做湿面拉丝反光，朝下面不反光：

```glsl
vec2 gp = worldPos.xz * 1.6;
vec2 cell = floor(gp);
vec2 f = fract(gp) - 0.5;
float rnd = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
float t = fract(uTime * 0.9 + rnd);
float ring = smoothstep(0.06, 0.0, abs(length(f) - t * 0.45)) * (1.0 - t) * uRain;
normal = normalize(normal + vec3(f.x, 0.0, f.y) * ring * 2.5);
```

同时按 `puddle` 把 roughness 从 0.74 一路插到 0.055，得到「干 → 潮 → 湿 → 积水」的连续过渡。

### 我们的用法

`/wildlife` 的湿地/水塘生境，给地面材质 `onBeforeCompile` 注入即可。需要先补一个世界坐标 varying：

```js
mat.onBeforeCompile = (shader) => {
  shader.uniforms.uRain = uRain
  shader.uniforms.uTime = uTime

  shader.vertexShader = 'varying vec3 vWorldPos;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`
  )

  shader.fragmentShader = 'uniform float uTime; uniform float uRain; varying vec3 vWorldPos;\n'
    + shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       vec2 gp = vWorldPos.xz * 1.6;
       vec2 cell = floor(gp);
       vec2 f = fract(gp) - 0.5;
       float rnd = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
       float t = fract(uTime * 0.9 + rnd);
       float ring = smoothstep(0.06, 0.0, abs(length(f) - t * 0.45)) * (1.0 - t) * uRain;
       normal = normalize(normal + vec3(f.x, 0.0, f.y) * ring * 2.5);`
    )
}
mat.customProgramCacheKey = () => 'hyc-wetground'
```

**成本**：一个 uniform，无任何 CPU 粒子。下雨/停雨只需把 `uRain` 从 0 插到 1。

---

## 8. 技法七：程序化音频

### 它的做法

全部音效（鸟叫、犬吠、雨、雷、雾号）用 `OscillatorNode + BiquadFilter + Gain` 合成，不加载任何音频文件；带 `setPos / setGain / setPitch` 的位置音更新，并有卷积混响（室外 / 棚内两套 IR，也是程序生成的）。

### 我们的用法

`/wildlife` 的 sounds 区块现在是合成 beep（140Hz 锯齿）。升级为「声景」：

```js
// src/wildlife/soundscape.js
let ctx = null

export function ensureAudio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function noiseBuffer(ac, seconds = 2, seed = 1) {
  const len = Math.floor(ac.sampleRate * seconds)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  let s = seed >>> 0 || 1
  for (let i = 0; i < len; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    d[i] = (s / 4294967296) * 2 - 1
  }
  return buf
}

const PRESETS = {
  rain: { type: 'lowpass', freq: 5200, q: 0.6, gain: 1.0 },
  wind: { type: 'bandpass', freq: 480, q: 0.8, gain: 0.7 },
  surf: { type: 'lowpass', freq: 900, q: 0.4, gain: 0.9 }
}

export function playAmbience(kind = 'rain', { gain = 0.25 } = {}) {
  const ac = ensureAudio()
  const p = PRESETS[kind] || PRESETS.rain

  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac, 2, kind.length * 7)
  src.loop = true

  const filter = ac.createBiquadFilter()
  filter.type = p.type
  filter.frequency.value = p.freq
  filter.Q.value = p.q

  const g = ac.createGain()
  g.gain.value = gain * p.gain

  src.connect(filter).connect(g).connect(ac.destination)
  src.start()

  // 极低频 LFO 让音量缓慢起伏，避免「白噪」死板
  const lfo = ac.createOscillator()
  const lfoGain = ac.createGain()
  lfo.frequency.value = 0.08
  lfoGain.gain.value = gain * 0.25
  lfo.connect(lfoGain).connect(g.gain)
  lfo.start()

  return () => { try { src.stop(); lfo.stop() } catch { /* 已停止 */ } }
}

export function chirp({ base = 2400, gain = 0.06, dur = 0.12 } = {}) {
  const ac = ensureAudio()
  const t0 = ac.currentTime
  const osc = ac.createOscillator()
  const g = ac.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(base, t0)
  osc.frequency.exponentialRampToValueAtTime(base * 1.9, t0 + dur * 0.35)
  osc.frequency.exponentialRampToValueAtTime(base * 0.75, t0 + dur)

  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}
```

**注意**：`AudioContext` 必须在用户手势里创建或 resume，否则被浏览器静音。首次进入生境时绑一次点击即可。

---

## 9. 不建议照抄的部分

| 它的做法 | 为什么不抄 |
|---|---|
| 单文件混淆打包（1.4MB） | 我们用 Vite 多 chunk + 路由懒加载，拆包对首屏更有利 |
| 全套 composer（SSAO / TAA / 运动矢量 / 自动曝光） | 展示型站点的收益/成本比低，摘 bloom + 颗粒 + dither 就够 |
| 3 万三角形硬预算 | 那是 FPS 帧率约束，展示场景可以放到 10 万+ |
| `!0 / !1`、单字母变量 | 可读性灾难，难以维护 |
| shader 里依赖 `uEnv / uDamage / uLowHealth` 等游戏态 uniform | 直接搬会缺依赖，必须裁剪到只剩视觉参数 |

---

## 10. 风险清单

1. **`onBeforeCompile` 必须配 `customProgramCacheKey`**，否则多实例共用 program，uniform 串味；
2. **首帧 shader 编译卡顿**：用 `requestIdleCallback` + `renderer.compile(scene, camera)` 预热（和时间轴文档里的做法一致）；
3. **fog 与天空球冲突**：天空材质 `fog: false`，地平线色手动对齐；
4. **移动端 fbm 成本**：`fbm5` 连续三层在中端机偏贵，画质降档时换 `fbm3` 或半分辨率；
5. **EffectComposer 的 HalfFloat RT** 在 iOS 上显存翻倍，切换场景要 `composer.dispose()`；
6. **`frustumCulled = false`** 的群体/天空球永远参与绘制，数量要克制。

---

## 11. 分期建议

| 阶段 | 内容 | 人日 |
|---|---|---|
| P0 | 确定性随机工具（`prng.js`）+ `countTriangles` 预算日志 | 0.5 |
| P1 | 鸟群/鱼群（技法一） | 1.5 |
| P2 | 生境静态合并（技法二） | 2 |
| P3 | 星云 fbm shader（技法三） | 3 |
| P4 | cosmos 后处理子集（技法四） | 1 |
| P5 | 天空穹顶 + 闪电（技法五） | 2 |
| P6 | 雨涟漪（技法六） | 1 |
| P7 | 声景（技法七） | 1 |

合计约 12 人日。若只能挑两项，选 **P3（星云 fbm）** 和 **P1（鸟群）**——一个拉视觉上限，一个补「世界是活的」。

---

## 12. 一句话总结

这个游戏最厉害的不是玩法，而是**「零资产纪律」**：所有视觉和听觉都从代码长出来。它相当于把我们优化文档里的方向（GPU 化、合并、程序纹理、后处理）全部提前实现了一遍，是可以照着抄作业的参考实现。
