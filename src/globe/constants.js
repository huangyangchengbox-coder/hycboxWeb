/**
 * WebGPU 地球引擎常量（参考 dsp-studio CodePen）。
 * 默认 2K 贴图，降低管理端首屏体积；URL ?hd=1 启用 8K。
 */

function isMobileOrTablet() {
  if (typeof window === 'undefined') return false
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
  return isMobile || window.innerWidth < 1024
}

function getInitialResolutionScale() {
  if (typeof document === 'undefined') return 1
  if (isMobileOrTablet()) return 0.5
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (!gl) return 0.5
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return 0.5
    const renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase()
    const isNvidia =
      renderer.includes('nvidia') || renderer.includes('rtx') || renderer.includes('gtx')
    const isAmdDedicated =
      renderer.includes('radeon') && (renderer.includes('rx ') || renderer.includes('pro '))
    const isAppleM = renderer.includes('apple')
    if (isNvidia || isAmdDedicated || isAppleM) return 1
    return 0.5
  } catch {
    return 0.5
  }
}

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
/** 默认 2K；?hd=1 用 8K */
const use2k = !(params && params.get('hd') === '1')

export const CONSTANTS = {
  // 仅作能力探测参考；实际渲染由 canUseWebGPU() 决定（HTTP 下通常无 WebGPU）
  RENDER_TYPE: typeof navigator !== 'undefined' && navigator.gpu ? 'webgpu' : 'webgl',
  EARTH_RADIUS: 10,
  ATMOSPHERE_RADIUS: 10.2,
  SEGMENTS: use2k ? 64 : 256,
  TEXTURES: {
    ALBEDO: use2k
      ? 'https://www.dsp-studio.ro/globe/2k_earth_daymap.jpg'
      : 'https://www.dsp-studio.ro/globe/8k_earth_daymap.jpg',
    NIGHT: use2k
      ? 'https://www.dsp-studio.ro/globe/2k_earth_nightmap.jpg'
      : 'https://www.dsp-studio.ro/globe/8k_earth_nightmap.jpg',
    SPECULAR: use2k
      ? 'https://www.dsp-studio.ro/globe/2k_earth_specular_map.jpg'
      : 'https://www.dsp-studio.ro/globe/8k_earth_specular_map.jpg',
    NORMAL: 'https://www.dsp-studio.ro/globe/8k_earth_normal_map.jpg',
    CLOUDS: use2k
      ? 'https://www.dsp-studio.ro/globe/2k_earth_clouds.jpg'
      : 'https://www.dsp-studio.ro/globe/8k_earth_clouds.jpg',
    STARS: use2k
      ? 'https://www.dsp-studio.ro/globe/starmap_2k.jpg'
      : 'https://www.dsp-studio.ro/globe/starmap_8k.jpg',
    MOON_ALBEDO: use2k
      ? 'https://www.dsp-studio.ro/globe/2k_moon.jpg'
      : 'https://www.dsp-studio.ro/globe/8k_moon.jpg',
    MOON_DISPLACEMENT: 'https://www.dsp-studio.ro/globe/ldem_4.png'
  },
  GUI: {
    // 主页默认隐藏调参面板；?settings=true 显示
    SHOW: params ? params.get('settings') === 'true' : false,
    BLOOM: { ENABLED: true, STRENGTH: 0.1, RADIUS: 0.3, THRESHOLD: 0.9 },
    COLOR_GRADING: {
      CONTRAST: 1,
      SATURATION: 1.5,
      BLACK_LEVEL: 0.015,
      BLUE_GREEN_BOOST: 0
    },
    MOON: {
      ENABLED: true,
      SPEED: 2e-4,
      DISTANCE: 50,
      INCLINATION: 0,
      DISPLACEMENT_SCALE: 0,
      ILLUMINATION: 0.02
    },
    LENS_FLARE: { ENABLED: true, INTENSITY: 0.15 },
    ANAMORPHIC: {
      ENABLED: false,
      INTENSITY: 0.5,
      THICKNESS: 2,
      SIZE: 0.2,
      COLOR: 16777215,
      INNER_FADE: 0.08,
      OUTER_FADE: 0.08
    },
    VIGNETTE: { ENABLED: true, DARKNESS: 1, OFFSET: 0.5 },
    CHROMATIC_ABERRATION: { ENABLED: true, STRENGTH: 0.25, SCALE: 0.5 },
    FILM_GRAIN: { ENABLED: false, INTENSITY: 0.25 },
    ATMOSPHERE: {
      MODE: 'Scattering',
      DENSITY: 20,
      RAYLEIGH_INTENSITY: 1,
      RAYLEIGH_COLOR: 3373055,
      MIE_COLOR: 866122,
      TWILIGHT_COLOR: 16733491,
      AIRGLOW_COLOR: 4521813
    },
    CLOUD_SHADOWS: { DISTANCE: 1.2, INTENSITY: 0.8, COLOR: 3358809 },
    OCEAN: { ROUGHNESS: 0.4, METALNESS: 0.05 },
    EARTH: {
      ROTATION_SPEED: 1e-4,
      BUMP_SCALE: 5,
      TERRAIN_SHADOW_INTENSITY: 1,
      TERRAIN_SHADOW_OFFSET: 2e-3,
      TRUE_INCLINATION: false
    },
    CAMERA: {
      FOV: 45,
      POSITION: { x: 0, y: 0, z: 50 },
      TARGET: { x: 0, y: 0, z: 0 },
      AUTO_ROTATE: false,
      AUTO_ROTATE_SPEED: 0.5
    },
    ENVIRONMENT: {
      SKYBOX_INTENSITY: 0.5,
      SKYBOX_AZIMUTH: 1.75,
      SKYBOX_PITCH: 0,
      SKYBOX_ROLL: 0,
      DARK_SIDE_BRIGHTNESS: 0.055,
      CITY_LIGHTS: 2
    },
    DEBUG: {
      STATS: false,
      RESOLUTION_SCALE: getInitialResolutionScale()
    },
    SUN: {
      INTENSITY: 2.5,
      COLOR: 16777215,
      AUTO_ROTATE: true,
      SPEED: 0.05,
      INCLINATION: 0.076
    },
    SATELLITES: {
      ENABLED: false,
      COUNT: 2e4,
      SIZE: 0.05,
      COLOR: 6084351,
      SPEED_SCALE: 1
    },
    BACKGROUND_STARS: {
      ENABLED: false,
      COUNT: 4e3,
      RADIUS: 140,
      SEED: 0,
      COOL_COLOR: '#9db6ff',
      WARM_COLOR: '#ffd9b0'
    },
    CITIES: { ENABLED: true }
  }
}

/** 城市信标（HUD） */
export const CINEMATIC_LOCATIONS = [
  { id: 'bucharest', name: 'Bucharest, Romania', lat: 44.4268, lng: 26.1025 },
  { id: 'london', name: 'London, United Kingdom', lat: 51.5074, lng: -0.1278 },
  { id: 'paris', name: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  { id: 'berlin', name: 'Berlin, Germany', lat: 52.52, lng: 13.405 },
  { id: 'rome', name: 'Rome, Italy', lat: 41.9028, lng: 12.4964 },
  { id: 'madrid', name: 'Madrid, Spain', lat: 40.4168, lng: -3.7038 },
  { id: 'new_york', name: 'New York, USA', lat: 40.7128, lng: -74.006 },
  { id: 'los_angeles', name: 'Los Angeles, USA', lat: 34.0522, lng: -118.2437 },
  { id: 'chicago', name: 'Chicago, USA', lat: 41.8781, lng: -87.6298 },
  { id: 'tokyo', name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { id: 'sydney', name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
  { id: 'shanghai', name: 'Shanghai, China', lat: 31.2304, lng: 121.4737 },
  { id: 'dubai', name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708 },
  { id: 'vienna', name: 'Vienna, Austria', lat: 48.2082, lng: 16.3738 },
  { id: 'athens', name: 'Athens, Greece', lat: 37.9838, lng: 23.7275 },
  { id: 'amsterdam', name: 'Amsterdam, Netherlands', lat: 52.3676, lng: 4.9041 }
]

export const MESSAGE_PROGRESS = {
  'Initializing WebGPU Renderer': 10,
  'Setting up Scene & Camera': 20,
  'Loading Celestial Objects': 30,
  'Loading Environment Map (PNG)': 50,
  'Loading Earth Textures (8K)': 70,
  'Building Render Pipeline': 85,
  'Compiling Shaders (Warmup)': 95,
  'Loading Complete': 100
}
