import "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

const boundViewers = new WeakSet();

function initializeModelControls(viewer) {
  const container = viewer.parentElement;
  const buttons = [...container.querySelectorAll("[data-assembly-toggle]")];
  const reset = container.querySelector("[data-model-reset]");
  const slider = container.querySelector("[data-explode]");
  const output = container.querySelector("[data-explode-value]");
  const status = container.querySelector("[data-model-status]");
  if (!buttons.length || boundViewers.has(viewer)) return;
  boundViewers.add(viewer);
  let groups = new Map();
  let canExplode = false;
  let cameraChanged = false;
  const initialCamera = {
    orbit: viewer.cameraOrbit,
    target: viewer.cameraTarget,
    fieldOfView: viewer.fieldOfView,
  };

  function updateReset() {
    if (reset) reset.hidden = ![...groups.values()].some(group => !group.visible)
      && !(canExplode && Number(slider.value) > 0) && !cameraChanged;
  }

  function updateStatus() {
    if (!status) return;
    const anyVisible = [...groups.values()].some(group => group.visible);
    status.textContent = anyVisible ? "" : "All parts are hidden. Choose a part or select Reset.";
    status.hidden = anyVisible;
  }

  function updateButton(button, visible) {
    button.setAttribute("aria-pressed", String(visible));
    button.classList.toggle("md-button--primary", visible);
    button.querySelector("[data-visibility-slash]")?.setAttribute("display", visible ? "none" : "inline");
    button.title = `${visible ? "Hide" : "Show"} ${button.textContent.trim()}`;
  }

  function setVisible(key, visible) {
    const group = groups.get(key);
    if (!group) return;
    for (const {material, color, alphaMode, alphaCutoff} of group.materials) {
      // Each assembly has its own materials, even when the CAD colors match.
      // MASK discards hidden surfaces and their highlights completely.
      material.setAlphaMode(visible ? alphaMode : "MASK");
      material.setAlphaCutoff(visible ? alphaCutoff : 0.5);
      material.pbrMetallicRoughness.setBaseColorFactor(
        visible ? color : [color[0], color[1], color[2], 0],
      );
    }
    group.visible = visible;
    updateButton(group.button, visible);
    updateStatus();
    updateReset();
  }

  function setExplodedView() {
    if (!canExplode) return;
    const amount = Number(slider.value);
    // Re-arm LoopOnce before scrubbing backwards from its clamped last frame.
    // Pausing immediately keeps the slider in sole control of the animation.
    viewer.play({repetitions: 1});
    viewer.pause();
    viewer.currentTime = viewer.duration * amount / 100;
    if (output) output.value = `${amount}%`;
    slider.setAttribute("aria-valuetext", amount === 0 ? "Assembled" : `${amount}% exploded`);
    updateReset();
  }

  function modelLoaded() {
    groups = new Map();
    for (const button of buttons) {
      const key = button.dataset.assemblyToggle;
      // Prepared by scripts/prepare_case_model.py, including PCB artwork.
      const materials = viewer.model.materials
        .filter(material => material.name.startsWith(`H7/${key} | `))
        .map(material => ({
          material,
          color: [...material.pbrMetallicRoughness.baseColorFactor],
          alphaMode: material.getAlphaMode(),
          alphaCutoff: material.getAlphaCutoff(),
        }));
      button.disabled = materials.length === 0;
      updateButton(button, true);
      if (materials.length) groups.set(key, {button, materials, visible: true});
    }
    if (reset) reset.disabled = groups.size === 0;
    canExplode = !!slider && viewer.availableAnimations.includes("Explode");
    if (slider) {
      slider.value = "0";
      slider.disabled = !canExplode;
      slider.setAttribute("aria-valuetext", "Assembled");
      if (output) output.value = "0%";
      setExplodedView();
    }
    updateStatus();
    updateReset();
    if (status && groups.size !== buttons.length) {
      status.hidden = false;
      status.textContent = "Some part controls are unavailable for this model.";
    }
  }

  viewer.addEventListener("load", modelLoaded);
  viewer.addEventListener("camera-change", event => {
    if (event.detail.source !== "user-interaction") return;
    cameraChanged = true;
    updateReset();
  });
  viewer.addEventListener("error", () => {
    for (const button of buttons) button.disabled = true;
    if (reset) {
      reset.disabled = true;
      reset.hidden = true;
    }
    if (slider) slider.disabled = true;
    canExplode = false;
    if (status) {
      status.hidden = false;
      status.textContent = "The 3D model could not load. Refresh the page to try again.";
    }
  });
  if (viewer.loaded) modelLoaded();

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const key = button.dataset.assemblyToggle;
      const group = groups.get(key);
      if (group) setVisible(key, !group.visible);
    });
  }
  reset?.addEventListener("click", () => {
    for (const key of groups.keys()) setVisible(key, true);
    if (slider) slider.value = "0";
    setExplodedView();
    viewer.cameraOrbit = initialCamera.orbit;
    viewer.cameraTarget = initialCamera.target;
    viewer.fieldOfView = initialCamera.fieldOfView;
    viewer.jumpCameraToGoal();
    cameraChanged = false;
    updateReset();
  });
  slider?.addEventListener("input", setExplodedView);
}

async function initializeModels() {
  for (const viewer of document.querySelectorAll("model-viewer[src]")) {
    // Instant navigation normalizes src properties before custom elements have
    // upgraded. That can preserve an undefined src which overrides the HTML
    // attribute during the viewer's first update. Restore it after that update.
    await viewer.updateComplete;
    const source = viewer.getAttribute("src");
    if (source && viewer.isConnected) {
      initializeModelControls(viewer);
      viewer.src = new URL(source, document.baseURI).href;
    }
  }
}

if (typeof document$ !== "undefined") {
  document$.subscribe(initializeModels);
} else {
  initializeModels();
}
