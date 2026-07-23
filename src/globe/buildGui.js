import { CONSTANTS } from './constants.js'

export function buildGui(gui, options) {
  const {
    cgSettings,
    cgUniforms,
    caSettings,
    caUniforms,
    filmSettings,
    filmUniforms,
    vignetteSettings,
    vignetteUniforms,
    moonSettings,
    moonMesh,
    flareSettings,
    anamorphicSettings,
    bloomPass,
    bloomSettings,
    earth,
    controls,
    camera,
    scene,
    directionalLight,
    sunMaterial,
    sunSettings,
    debugSettings,
    statsDom,
    earthSettings,
    satelliteSettings,
    satellitePoints,
    canvas,
    renderer,
    renderPipeline,
    backgroundStarsSettings,
    backgroundStars,
    citiesSettings
  } = options;
  const envGroup = gui.addFolder("Environment Settings");
  const sunFolder = envGroup.addFolder("Sun & Lighting");
  const sunVisualSettings = {
    color: directionalLight.color.getHex()
  };
  sunFolder.add(sunSettings, "intensity", 0, 10).name("Intensity").onChange((v) => {
    directionalLight.intensity = v;
  });
  sunFolder.addColor(sunVisualSettings, "color").name("Color").onChange((c) => {
    directionalLight.color.setHex(c);
    sunMaterial.color.setHex(c);
    sunMaterial.color.multiplyScalar(2);
  });
  sunFolder.add(sunSettings, "autoRotate").name("Auto Rotate");
  sunFolder.add(sunSettings, "speed", 0, 5).name("Speed");
  sunFolder.add(sunSettings, "inclination", -1, 1).name("Inclination");
  sunFolder.add(sunSettings, "angle", 0, Math.PI * 2).name("Manual Angle").listen();
  const moonFolder = envGroup.addFolder("Moon");
  moonFolder.add(moonSettings, "enabled").name("Show Moon").onChange((v) => {
    moonMesh.visible = v;
  });
  moonFolder.add(moonSettings, "speed", 0, 0.01).name("Speed");
  moonFolder.add(moonSettings, "distance", 20, 150).name("Distance");
  moonFolder.add(moonSettings, "inclination", -1.5, 1.5).name("Inclination");
  moonFolder.add(moonSettings, "displacementScale", 0, 0.2).name("Displacement").onChange((v) => {
    const target = moonMesh;
    if (target.material && target.material.displacementScale !== void 0) {
      target.material.displacementScale = v;
    } else {
      target.traverse((child) => {
        if (child.material && child.material.displacementScale !== void 0) {
          child.material.displacementScale = v;
        }
      });
    }
  });
  moonFolder.add(moonSettings, "illumination", 0, 1).name("Illumination").onChange((v) => {
    const target = moonMesh;
    if (target.material && target.material.emissiveIntensity !== void 0) {
      target.material.emissiveIntensity = v;
    } else {
      target.traverse((child) => {
        if (child.material && child.material.emissiveIntensity !== void 0) {
          child.material.emissiveIntensity = v;
        }
      });
    }
  });
  const skyFolder = envGroup.addFolder("Background");
  skyFolder.add(scene, "backgroundIntensity", 0, 5).name("Skybox Intensity");
  skyFolder.add(scene.backgroundRotation, "y", 0, Math.PI * 2).step(0.01).name("Yaw / Longitude (Y)");
  skyFolder.add(scene.backgroundRotation, "x", 0, Math.PI * 2).step(0.01).name("Pitch / Latitude (X)");
  skyFolder.add(scene.backgroundRotation, "z", 0, Math.PI * 2).step(0.01).name("Roll (Z)");
  if (backgroundStarsSettings && backgroundStars) {
    skyFolder.add(backgroundStarsSettings, "enabled").name("Show Generated Stars").onChange((v) => {
      backgroundStars.mesh.visible = v;
    });
    skyFolder.add(backgroundStarsSettings, "count", 0, 2e4, 100).name("Generated Stars Count").onChange((v) => {
      backgroundStars.setCount(v);
    });
  }
  const earthGroup = gui.addFolder("Earth Settings");
  if (citiesSettings) {
    earthGroup.add(citiesSettings, "enabled").name("Show Cities");
  }
  earthGroup.add(earthSettings, "trueInclination").name("True Inclination");
  earthGroup.add(earthSettings, "rotationSpeed", 0, 0.01).name("Rotation Speed").step(1e-4);
  const atmosFolder = earthGroup.addFolder("Atmosphere");
  const atmosConfig = {
    mode: CONSTANTS.GUI.ATMOSPHERE.MODE
  };
  atmosFolder.add(atmosConfig, "mode", ["Scattering", "Airglow"]).name("Mode").onChange((m) => {
    earth.userData.atmosMode.value = m === "Scattering" ? 0 : 1;
  });
  const atmosColors = {
    rayleigh: earth.userData.rayleighColor.value.getHex(),
    mie: earth.userData.mieColor.value.getHex(),
    twilight: earth.userData.twilightColor.value.getHex(),
    airglow: earth.userData.airglowColor.value.getHex()
  };
  atmosFolder.addColor(atmosColors, "rayleigh").name("Rayleigh Color").onChange((c) => {
    earth.userData.rayleighColor.value.setHex(c);
  });
  atmosFolder.addColor(atmosColors, "mie").name("Mie Color").onChange((c) => {
    earth.userData.mieColor.value.setHex(c);
  });
  atmosFolder.addColor(atmosColors, "twilight").name("Twilight Color").onChange((c) => {
    earth.userData.twilightColor.value.setHex(c);
  });
  atmosFolder.addColor(atmosColors, "airglow").name("Airglow Color").onChange((c) => {
    earth.userData.airglowColor.value.setHex(c);
  });
  atmosFolder.add(earth.userData.atmosDensity, "value", 0.1, 100).name("Density");
  atmosFolder.add(earth.userData.rayleighIntensity, "value", 0, 5).step(0.1).name("Rayleigh Intensity");
  atmosFolder.add(earth.userData.darkSideBrightness, "value", 0, 0.5).step(1e-3).name("Overall Dark Side");
  atmosFolder.add(earth.userData.cityLights, "value", 0, 20).step(0.1).name("City Lights");
  const shadowFolder = earthGroup.addFolder("Cloud Shadows");
  const shadowSettings = {
    color: earth.userData.shadowColor.value.getHex()
  };
  shadowFolder.add(earth.userData.shadowDist, "value", 0, 5).name("Distance");
  shadowFolder.add(earth.userData.shadowIntensity, "value", 0, 1).name("Intensity");
  shadowFolder.addColor(shadowSettings, "color").name("Color").onChange((c) => {
    earth.userData.shadowColor.value.setHex(c);
  });
  const oceanFolder = earthGroup.addFolder("Ocean Settings");
  oceanFolder.add(earth.userData.waterRoughness, "value", 0, 1).name("Water Roughness");
  oceanFolder.add(earth.userData.waterMetalness, "value", 0, 1).name("Water Metalness");
  const terrainFolder = earthGroup.addFolder("Terrain Settings");
  const terrainSettings = {
    bumpScale: CONSTANTS.GUI.EARTH.BUMP_SCALE
  };
  terrainFolder.add(terrainSettings, "bumpScale", 0, 10).name("Bump Map Scale").onChange((v) => {
    earth.userData.bumpScale.value.set(v, v);
  });
  terrainFolder.add(earth.userData.terrainShadowIntensity, "value", 0, 5).name("Self-Shadow Intensity");
  terrainFolder.add(earth.userData.terrainShadowOffset, "value", 1e-4, 0.01).name("Self-Shadow Offset");
  if (satelliteSettings) {
    const satGroup = earthGroup.addFolder("Satellites");
    satGroup.add(satelliteSettings, "enabled").name("Show Satellites").onChange((val) => {
      if (satellitePoints) {
        satellitePoints.visible = val;
      }
    });
    const satColorObj = { color: satelliteSettings.color };
    satGroup.addColor(satColorObj, "color").name("Color").onChange((val) => {
      if (satellitePoints && satellitePoints.userData.colorUniform) {
        satellitePoints.userData.colorUniform.value.setHex(val);
      }
    });
    satGroup.add(satelliteSettings, "speedScale", 0, 5).step(0.1).name("Orbit Speed");
  }
  const postGroup = gui.addFolder("Post Processing");
  const ccFolder = postGroup.addFolder("Color Grading");
  ccFolder.add(cgSettings, "contrast", 0.5, 2).name("Contrast").onChange((v) => {
    cgUniforms.contrast.value = v;
  });
  ccFolder.add(cgSettings, "saturation", 0, 2).name("Saturation").onChange((v) => {
    cgUniforms.saturation.value = v;
  });
  ccFolder.add(cgSettings, "blackLevel", 0, 0.5).name("Black Level").onChange((v) => {
    cgUniforms.blackLevel.value = v;
  });
  ccFolder.add(cgSettings, "blueGreenBoost", 0, 1).name("Blue/Green Boost").onChange((v) => {
    cgUniforms.blueGreenBoost.value = v;
  });
  const flareFolder = postGroup.addFolder("Lens Flare");
  flareFolder.add(flareSettings, "enabled").name("Enabled");
  flareFolder.add(flareSettings, "intensity", 0, 1).name("Intensity");
  const anaFolder = postGroup.addFolder("Anamorphic Eclipse Flare");
  anaFolder.add(anamorphicSettings, "enabled").name("Enabled");
  anaFolder.add(anamorphicSettings, "intensity", 0, 2).name("Intensity");
  anaFolder.add(anamorphicSettings, "thickness", 0.1, 2).name("Thickness");
  anaFolder.add(anamorphicSettings, "size", 0.1, 5).name("Size");
  anaFolder.add(anamorphicSettings, "innerFade", 1e-3, 1).name("Inner Fade").step(1e-3);
  anaFolder.add(anamorphicSettings, "outerFade", 0.01, 1).name("Outer Fade").step(0.01);
  const aColor = { hex: anamorphicSettings.color };
  anaFolder.addColor(aColor, "hex").name("Color").onChange((c) => {
    anamorphicSettings.color = c;
  });
  const caFolder = postGroup.addFolder("Chromatic Aberration");
  caFolder.add(caSettings, "enabled").name("Enabled").onChange((v) => {
    caUniforms.strength.value = v ? caSettings.strength : 0;
  });
  caFolder.add(caSettings, "strength", 0, 5).name("Strength").onChange((v) => {
    if (caSettings.enabled) caUniforms.strength.value = v;
  });
  caFolder.add(caSettings, "scale", 0.5, 2).name("Scale").onChange((v) => {
    caUniforms.scale.value = v;
  });
  const filmFolder = postGroup.addFolder("Film Grain");
  filmFolder.add(filmSettings, "enabled").name("Enabled").onChange((v) => {
    filmUniforms.intensity.value = v ? filmSettings.intensity : 0;
  });
  filmFolder.add(filmSettings, "intensity", 0, 1).name("Intensity").onChange((v) => {
    if (filmSettings.enabled) filmUniforms.intensity.value = v;
  });
  const vignetteFolder = postGroup.addFolder("Vignette");
  vignetteFolder.add(vignetteSettings, "enabled").name("Enabled").onChange((v) => {
    vignetteUniforms.darkness.value = v ? vignetteSettings.darkness : 0;
  });
  vignetteFolder.add(vignetteSettings, "darkness", 0, 5).step(0.1).name("Darkness").onChange((v) => {
    if (vignetteSettings.enabled) vignetteUniforms.darkness.value = v;
  });
  vignetteFolder.add(vignetteSettings, "offset", 0, 2).step(0.01).name("Offset").onChange((v) => {
    vignetteUniforms.offset.value = v;
  });
  const bloomFolder = postGroup.addFolder("Bloom");
  bloomFolder.add(bloomSettings, "enabled").name("Enabled").onChange((v) => {
    bloomPass.strength.value = v ? bloomSettings.strength : 0;
  });
  bloomFolder.add(bloomSettings, "strength", 0, 5).name("Strength").onChange((v) => {
    if (bloomSettings.enabled) bloomPass.strength.value = v;
  });
  bloomFolder.add(bloomPass.radius, "value", 0, 1).name("Radius");
  bloomFolder.add(bloomPass.threshold, "value", 0, 1).name("Threshold");
  const cameraFolder = gui.addFolder("Camera");
  cameraFolder.add(camera, "fov", 5, 120, 1).name("Field of View").listen().onChange(() => {
    camera.updateProjectionMatrix();
  });
  cameraFolder.add(controls, "autoRotate").name("Auto Rotate");
  cameraFolder.add(controls, "autoRotateSpeed", 0.1, 5).name("Rotate Speed");
  const posFolder = cameraFolder.addFolder("Position (Current)");
  posFolder.add(camera.position, "x").name("X").decimals(2).listen().disable();
  posFolder.add(camera.position, "y").name("Y").decimals(2).listen().disable();
  posFolder.add(camera.position, "z").name("Z").decimals(2).listen().disable();
  const targetFolder = cameraFolder.addFolder("Target (Current)");
  targetFolder.add(controls.target, "x").name("X").decimals(2).listen().disable();
  targetFolder.add(controls.target, "y").name("Y").decimals(2).listen().disable();
  targetFolder.add(controls.target, "z").name("Z").decimals(2).listen().disable();
  const camActions = {
    reset: () => {
      options.controls.reset();
      options.camera.fov = CONSTANTS.GUI.CAMERA.FOV;
      options.camera.updateProjectionMatrix();
    }
  };
  cameraFolder.add(camActions, "reset").name("Reset View");
  const debugFolder = gui.addFolder("Display & Debug");
  debugFolder.add(debugSettings, "stats").name("Show Stats").onChange((v) => {
    statsDom.style.display = v ? "block" : "none";
  });
  debugFolder.add(options.renderSettings, "resolutionScale", 0.1, 2).step(0.01).name("Resolution Scale").onChange(() => options.onResize());
  const debugActions = {
    exportConstants: () => {
      const exported = {
        SHOW: true,
        COLOR_GRADING: {
          CONTRAST: cgSettings.contrast,
          SATURATION: cgSettings.saturation,
          BLACK_LEVEL: cgSettings.blackLevel,
          BLUE_GREEN_BOOST: cgSettings.blueGreenBoost
        },
        MOON: {
          ENABLED: moonSettings.enabled,
          SPEED: moonSettings.speed,
          DISTANCE: moonSettings.distance,
          INCLINATION: moonSettings.inclination
        },
        LENS_FLARE: {
          ENABLED: flareSettings.enabled,
          INTENSITY: flareSettings.intensity
        },
        ANAMORPHIC: {
          ENABLED: anamorphicSettings.enabled,
          INTENSITY: anamorphicSettings.intensity,
          THICKNESS: anamorphicSettings.thickness,
          SIZE: anamorphicSettings.size,
          COLOR: anamorphicSettings.color,
          INNER_FADE: anamorphicSettings.innerFade,
          OUTER_FADE: anamorphicSettings.outerFade
        },
        BLOOM: {
          ENABLED: bloomSettings.enabled,
          STRENGTH: bloomSettings.strength,
          RADIUS: bloomPass.radius.value,
          THRESHOLD: bloomPass.threshold.value
        },
        VIGNETTE: {
          ENABLED: vignetteSettings.enabled,
          DARKNESS: vignetteSettings.darkness,
          OFFSET: vignetteSettings.offset
        },
        CHROMATIC_ABERRATION: {
          ENABLED: caSettings.enabled,
          STRENGTH: caSettings.strength,
          SCALE: caSettings.scale
        },
        FILM_GRAIN: {
          ENABLED: filmSettings.enabled,
          INTENSITY: filmSettings.intensity
        },
        ATMOSPHERE: {
          MODE: earth.userData.atmosMode.value === 0 ? "Scattering" : "Airglow",
          DENSITY: earth.userData.atmosDensity.value,
          RAYLEIGH_COLOR: earth.userData.rayleighColor.value.getHex(),
          MIE_COLOR: earth.userData.mieColor.value.getHex(),
          TWILIGHT_COLOR: earth.userData.twilightColor.value.getHex(),
          AIRGLOW_COLOR: earth.userData.airglowColor.value.getHex()
        },
        CLOUD_SHADOWS: {
          DISTANCE: earth.userData.shadowDist.value,
          INTENSITY: earth.userData.shadowIntensity.value,
          COLOR: earth.userData.shadowColor.value.getHex()
        },
        OCEAN: {
          ROUGHNESS: earth.userData.waterRoughness.value,
          METALNESS: earth.userData.waterMetalness.value
        },
        EARTH: {
          ROTATION_SPEED: earthSettings.rotationSpeed,
          BUMP_SCALE: terrainSettings.bumpScale,
          TERRAIN_SHADOW_INTENSITY: earth.userData.terrainShadowIntensity.value,
          TERRAIN_SHADOW_OFFSET: earth.userData.terrainShadowOffset.value,
          TRUE_INCLINATION: earthSettings.trueInclination
        },
        CAMERA: {
          FOV: camera.fov,
          POSITION: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
          },
          TARGET: {
            x: controls.target.x,
            y: controls.target.y,
            z: controls.target.z
          },
          AUTO_ROTATE: controls.autoRotate,
          AUTO_ROTATE_SPEED: controls.autoRotateSpeed
        },
        ENVIRONMENT: {
          SKYBOX_INTENSITY: scene.backgroundIntensity,
          SKYBOX_AZIMUTH: scene.backgroundRotation.y,
          SKYBOX_PITCH: scene.backgroundRotation.x,
          SKYBOX_ROLL: scene.backgroundRotation.z,
          DARK_SIDE_BRIGHTNESS: earth.userData.darkSideBrightness.value,
          CITY_LIGHTS: earth.userData.cityLights.value
        },
        DEBUG: {
          STATS: debugSettings.stats,
          RESOLUTION_SCALE: options.renderSettings.resolutionScale
        },
        SUN: {
          INTENSITY: sunSettings.intensity,
          COLOR: directionalLight.color.getHex(),
          AUTO_ROTATE: sunSettings.autoRotate,
          SPEED: sunSettings.speed,
          INCLINATION: sunSettings.inclination
        }
      };
      const formatHex = (key, val) => {
        if (typeof val === "number" && key.includes("COLOR")) {
          return `0x${val.toString(16).padStart(6, "0")}`;
        }
        return val;
      };
      let jsonStr = "GUI: " + JSON.stringify(exported, formatHex, 4);
      jsonStr = jsonStr.replace(/"(0x[0-9a-fA-F]+)"/g, "$1");
      navigator.clipboard.writeText(jsonStr).then(() => {
        console.log("Exported CONSTANTS.GUI:\n", jsonStr);
      }).catch((err) => {
        console.error("Clipboard copy failed:", err);
        console.log("Exported CONSTANTS.GUI:\n", jsonStr);
      });
    },
    takeScreenshot: () => {
      if (!canvas || !renderer || !renderPipeline) {
        console.warn("Screenshot components not fully initialized.");
        return;
      }
      const oldScale = options.renderSettings.resolutionScale;
      const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : canvas.width;
      const dpr = window.devicePixelRatio || 1;
      const currentWidthWithDpr = parentWidth * Math.min(dpr, 2);
      const scaleFactor = Math.min(6, Math.max(2, 3840 / currentWidthWithDpr));
      options.renderSettings.resolutionScale = scaleFactor;
      options.onResize();
      renderPipeline.render();
      const dataUrl = canvas.toDataURL("image/png");
      options.renderSettings.resolutionScale = oldScale;
      options.onResize();
      const link = document.createElement("a");
      const finalWidth = Math.round(parentWidth * Math.min(dpr, 2) * scaleFactor);
      const finalHeight = Math.round(canvas.height);
      link.download = `earth_atmosphere_screenshot_${finalWidth}x${finalHeight}.png`;
      link.href = dataUrl;
      link.click();
    }
  };
  debugFolder.add(debugActions, "exportConstants").name("Copy GUI Constants");
  debugFolder.add(debugActions, "takeScreenshot").name("Take 4K Screenshot");
  const closeAll = (f) => {
    if (typeof f.close === "function") {
      f.close();
    }
    if (Array.isArray(f.folders)) {
      f.folders.forEach((sub2) => closeAll(sub2));
    }
  };
  closeAll(gui);
}