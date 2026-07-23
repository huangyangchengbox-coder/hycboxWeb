import { CINEMATIC_LOCATIONS, MESSAGE_PROGRESS } from './constants.js'
import { Engine } from './Engine.js'

function getTimezoneOffset(id) {
  switch (id) {
    case "london":
      return 0;
    case "paris":
    case "berlin":
    case "rome":
    case "madrid":
    case "vienna":
    case "amsterdam":
      return 1;
    case "bucharest":
    case "athens":
      return 2;
    case "dubai":
      return 4;
    case "new_york":
      return -5;
    case "chicago":
      return -6;
    case "los_angeles":
      return -8;
    case "shanghai":
      return 8;
    case "tokyo":
      return 9;
    case "sydney":
      return 10;
    default:
      return 0;
  }
}
function formatLatLong(lat, lng) {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}\xB0 ${latDir}, ${Math.abs(lng).toFixed(2)}\xB0 ${lngDir}`;
}
export function mountGlobeApp({ canvas, hudContainer, loaderEl, progressValEl, messageValEl, progressBarEl }) {
  if (!canvas) {
    throw new Error('Globe canvas element is required.')
  }
  if (hudContainer) {
    hudContainer.innerHTML = "";
    for (const loc of CINEMATIC_LOCATIONS) {
      const beaconEl = document.createElement("div");
      beaconEl.id = `beacon-${loc.id}`;
      beaconEl.className = "beacon-point";
      beaconEl.innerHTML = `
        <div class="beacon-core"></div>
        <div class="beacon-ping"></div>
        <div class="beacon-ring"></div>
      `;
      hudContainer.appendChild(beaconEl);
      const labelEl = document.createElement("div");
      labelEl.id = `label-${loc.id}`;
      labelEl.className = "label-box";
      labelEl.innerHTML = `
        <div id="label-align-${loc.id}" class="label-align label-align-start">
          <div class="label-title">${loc.name.split(",")[0]}</div>
          <div class="label-sub">
            <span>${formatLatLong(loc.lat, loc.lng)}</span>
            <span class="label-dot">\u2022</span>
            <span id="time-${loc.id}">00:00:00</span>
          </div>
        </div>
      `;
      hudContainer.appendChild(labelEl);
    }
  }
  let currentProgress = 0;
  let targetProgress = 10;
  const updateTimes = () => {
    const d = /* @__PURE__ */ new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 6e4;
    for (const loc of CINEMATIC_LOCATIONS) {
      const offset = getTimezoneOffset(loc.id);
      const local = new Date(utc + 36e5 * offset);
      const timeStr = local.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      const el = document.getElementById(`time-${loc.id}`);
      if (el) {
        el.textContent = timeStr;
      }
    }
  };
  updateTimes();
  const updateProgressUI = (val) => {
    const rounded = Math.floor(val);
    if (progressValEl) progressValEl.textContent = String(rounded);
    if (progressBarEl) progressBarEl.style.width = `${rounded}%`;
  };
  const tickInterval = setInterval(() => {
    if (currentProgress < targetProgress + 15 && currentProgress < 95) {
      currentProgress += Math.random() * 2;
      updateProgressUI(currentProgress);
    }
  }, 150);
  const onProgress = (msg) => {
    if (messageValEl) messageValEl.textContent = msg;
    if (MESSAGE_PROGRESS[msg] !== void 0) {
      targetProgress = MESSAGE_PROGRESS[msg];
      if (targetProgress > currentProgress) {
        currentProgress = targetProgress;
        updateProgressUI(currentProgress);
      }
    }
  };
  const onLoad = () => {
    clearInterval(tickInterval);
    targetProgress = 100;
    currentProgress = 100;
    updateProgressUI(100);
    if (messageValEl) messageValEl.textContent = "Loading Complete";
    setTimeout(() => {
      if (loaderEl) {
        loaderEl.style.opacity = "0";
        loaderEl.style.filter = "blur(10px)";
        loaderEl.style.pointerEvents = "none";
        setTimeout(() => {
          loaderEl.style.display = "none";
        }, 1200);
      }
    }, 200);
  };
  const handleLocationsUpdate = (locations) => {
    const width = window.innerWidth;
    for (const loc of locations) {
      const beaconEl = document.getElementById(`beacon-${loc.id}`);
      const labelEl = document.getElementById(`label-${loc.id}`);
      if (beaconEl) {
        if (loc.visible && loc.opacity >= 0.05) {
          beaconEl.style.transform = `translate3d(${loc.x}px, ${loc.y}px, 0) translate(-50%, -50%)`;
          beaconEl.style.opacity = String(loc.opacity);
          beaconEl.style.display = "flex";
        } else {
          beaconEl.style.display = "none";
        }
      }
      if (labelEl) {
        if (loc.visible && loc.opacity >= 0.05) {
          const isLeft = loc.x < width / 2;
          labelEl.style.transform = `translate3d(${loc.x}px, ${loc.y}px, 0) ${isLeft ? "translate(calc(-100% - 16px), -50%)" : "translate(16px, -50%)"}`;
          labelEl.style.opacity = String(loc.opacity);
          labelEl.style.display = "block";
          const alignEl = document.getElementById(`label-align-${loc.id}`);
          if (alignEl) {
            if (isLeft) {
              alignEl.className = "label-align label-align-end";
            } else {
              alignEl.className = "label-align label-align-start";
            }
          }
        } else {
          labelEl.style.display = "none";
        }
      }
    }
    const activeIds = new Set(locations.map((l) => l.id));
    for (const loc of CINEMATIC_LOCATIONS) {
      if (!activeIds.has(loc.id)) {
        const beaconEl = document.getElementById(`beacon-${loc.id}`);
        const labelEl = document.getElementById(`label-${loc.id}`);
        if (beaconEl) beaconEl.style.display = "none";
        if (labelEl) labelEl.style.display = "none";
      }
    }
  };
  const intervals = []
  intervals.push(setInterval(updateTimes, 1000))
  intervals.push(tickInterval)

  const engine = new Engine(canvas)
  engine.onLocationsUpdate = handleLocationsUpdate

  const startEngine = async () => {
    try {
      await engine.init(onProgress)
      onLoad()
    } catch (err) {
      console.error('Engine init error:', err)
      onLoad()
    }
  }

  startEngine()

  const dispose = () => {
    intervals.forEach((id) => clearInterval(id))
    engine.dispose()
  }

  return { engine, dispose }
}