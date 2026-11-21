const MM_PER_INCH = 25.4;
const EXPORT_DPI = 300;

const papers = {
  a4: { label: "A4 普通纸", w: 210, h: 297 },
  l: { label: "L判 照片纸", w: 89, h: 127 },
  "2l": { label: "2L 照片纸", w: 127, h: 178 },
  postcard: { label: "明信片", w: 100, h: 148 },
};

const templates = {
  stack2: {
    title: "上下两张横图",
    hint: "上传两张照片后自动放入上下框。",
  },
  idGrid: {
    title: "证件照网格",
    hint: "上传一张照片后按证件照尺寸自动铺满。",
  },
  postcardFree: {
    title: "明信片白板",
    hint: "照片可自由拖拽和拉伸，不限制尺寸。",
  },
};

const state = {
  paperKey: "a4",
  orientation: "portrait",
  template: "stack2",
  idSize: { w: 35, h: 45 },
  items: [],
  images: [],
  selectedId: null,
  showGuides: true,
  showMargins: true,
  scale: 3,
  dragging: null,
};

const els = {
  paperSelect: document.getElementById("paperSelect"),
  portraitBtn: document.getElementById("portraitBtn"),
  landscapeBtn: document.getElementById("landscapeBtn"),
  templateSelect: document.getElementById("templateSelect"),
  idSizeSelect: document.getElementById("idSizeSelect"),
  idControls: document.getElementById("idControls"),
  imageInput: document.getElementById("imageInput"),
  addLocationBtn: document.getElementById("addLocationBtn"),
  refreshLocationBtn: document.getElementById("refreshLocationBtn"),
  locationStatus: document.getElementById("locationStatus"),
  selectedControls: document.getElementById("selectedControls"),
  locationControls: document.getElementById("locationControls"),
  locationTextInput: document.getElementById("locationTextInput"),
  fitBtn: document.getElementById("fitBtn"),
  coverBtn: document.getElementById("coverBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  guideToggle: document.getElementById("guideToggle"),
  marginToggle: document.getElementById("marginToggle"),
  resetBtn: document.getElementById("resetBtn"),
  exportBtn: document.getElementById("exportBtn"),
  paperReadout: document.getElementById("paperReadout"),
  templateTitle: document.getElementById("templateTitle"),
  templateHint: document.getElementById("templateHint"),
  selectionReadout: document.getElementById("selectionReadout"),
  stageWrap: document.getElementById("stageWrap"),
  canvas: document.getElementById("stage"),
};

const ctx = els.canvas.getContext("2d");

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function paperSize() {
  const p = papers[state.paperKey];
  if (state.orientation === "landscape") {
    return { w: p.h, h: p.w };
  }
  return { w: p.w, h: p.h };
}

function selectedItem() {
  return state.items.find((item) => item.id === state.selectedId) || null;
}

function selectedLocationItem() {
  const item = selectedItem();
  return item?.type === "location" ? item : null;
}

function populatePaperSelect() {
  Object.entries(papers).forEach(([key, paper]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${paper.label} (${paper.w} x ${paper.h} mm)`;
    els.paperSelect.appendChild(option);
  });
}

function updateUi() {
  els.paperSelect.value = state.paperKey;
  els.templateSelect.value = state.template;
  els.idControls.classList.toggle("hidden", state.template !== "idGrid");
  const item = selectedItem();
  const locationItem = selectedLocationItem();
  els.selectedControls.classList.toggle("hidden", !item);
  els.locationControls.classList.toggle("hidden", !locationItem);
  els.fitBtn.disabled = item?.type === "location";
  els.coverBtn.disabled = item?.type === "location";
  els.portraitBtn.classList.toggle("active", state.orientation === "portrait");
  els.landscapeBtn.classList.toggle("active", state.orientation === "landscape");
  els.guideToggle.checked = state.showGuides;
  els.marginToggle.checked = state.showMargins;
  if (locationItem && els.locationTextInput.value !== locationItem.text) {
    els.locationTextInput.value = locationItem.text;
  }

  const size = paperSize();
  els.paperReadout.textContent = `${papers[state.paperKey].label}: ${size.w} x ${size.h} mm`;
  els.templateTitle.textContent = templates[state.template].title;
  els.templateHint.textContent = templates[state.template].hint;

  els.selectionReadout.textContent = item
    ? `${item.type === "location" ? "定位" : item.label || "照片"}: ${round(item.w)} x ${round(
        item.h,
      )} mm`
    : "未选中照片";
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function fitCanvasToScreen() {
  const size = paperSize();
  const maxW = Math.max(180, els.stageWrap.clientWidth - 52);
  const maxH = Math.max(320, els.stageWrap.clientHeight - 52);
  state.scale = Math.min(maxW / size.w, maxH / size.h, 5.2);
  els.canvas.width = Math.round(size.w * state.scale);
  els.canvas.height = Math.round(size.h * state.scale);
}

function mmToPx(value) {
  return value * state.scale;
}

function pxToMm(value) {
  return value / state.scale;
}

function draw() {
  fitCanvasToScreen();
  render(ctx, state.scale, { forExport: false });
  updateUi();
}

function render(targetCtx, scale, options = {}) {
  const size = paperSize();
  const w = size.w * scale;
  const h = size.h * scale;

  targetCtx.save();
  targetCtx.clearRect(0, 0, w, h);
  targetCtx.fillStyle = "#fffdf8";
  targetCtx.fillRect(0, 0, w, h);

  if (state.showMargins && !options.forExport) {
    drawSafeMargin(targetCtx, scale, size);
  }

  state.items.forEach((item) => drawItem(targetCtx, item, scale, options));

  if (state.showGuides) {
    drawGuides(targetCtx, scale, size);
  }

  if (!options.forExport) {
    drawPlaceholders(targetCtx, scale);
  }

  targetCtx.restore();
}

function drawSafeMargin(targetCtx, scale, size) {
  const margin = safeMargin();
  targetCtx.save();
  targetCtx.strokeStyle = "#93a4b7";
  targetCtx.setLineDash([6, 5]);
  targetCtx.lineWidth = 1;
  targetCtx.strokeRect(
    margin * scale,
    margin * scale,
    (size.w - margin * 2) * scale,
    (size.h - margin * 2) * scale,
  );
  targetCtx.restore();
}

function drawGuides(targetCtx, scale, size) {
  targetCtx.save();
  targetCtx.strokeStyle = "rgba(15, 118, 110, 0.48)";
  targetCtx.lineWidth = 1;
  state.items.filter((item) => item.type !== "location").forEach((item) => {
    targetCtx.strokeRect(item.x * scale, item.y * scale, item.w * scale, item.h * scale);
  });
  targetCtx.strokeStyle = "rgba(29, 36, 48, 0.22)";
  targetCtx.strokeRect(0.5, 0.5, size.w * scale - 1, size.h * scale - 1);
  targetCtx.restore();
}

function drawPlaceholders(targetCtx, scale) {
  state.items.forEach((item) => {
    if (item.type === "location" || item.image) return;
    const x = item.x * scale;
    const y = item.y * scale;
    const w = item.w * scale;
    const h = item.h * scale;
    targetCtx.save();
    targetCtx.fillStyle = "#f1f5f9";
    targetCtx.fillRect(x, y, w, h);
    targetCtx.strokeStyle = "#b9c2cf";
    targetCtx.setLineDash([7, 5]);
    targetCtx.strokeRect(x, y, w, h);
    targetCtx.fillStyle = "#667085";
    targetCtx.font = `${Math.max(12, Math.min(16, w / 13))}px sans-serif`;
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.fillText(item.label || "照片", x + w / 2, y + h / 2);
    targetCtx.restore();
  });
}

function drawItem(targetCtx, item, scale, options = {}) {
  const x = item.x * scale;
  const y = item.y * scale;
  const w = item.w * scale;
  const h = item.h * scale;

  targetCtx.save();
  if (item.type === "location") {
    drawLocationItem(targetCtx, item, scale);
  } else if (item.image) {
    drawImageInRect(targetCtx, item.image, x, y, w, h, item.fit || "cover");
  }
  if (!options.forExport && state.selectedId === item.id) {
    targetCtx.strokeStyle = "#0f766e";
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(x, y, w, h);
    targetCtx.fillStyle = "#0f766e";
    targetCtx.fillRect(x + w - 12, y + h - 12, 12, 12);
  }
  targetCtx.restore();
}

function drawLocationItem(targetCtx, item, scale) {
  const x = item.x * scale;
  const y = item.y * scale;
  const w = item.w * scale;
  const h = item.h * scale;
  const radius = Math.min(8 * scale, h / 2);
  const pad = Math.max(3 * scale, 8);
  const iconSize = Math.min(h - pad * 2, 7 * scale);
  const fontSize = clamp(item.fontSize * scale, 8, 24);
  const textX = x + pad * 2 + iconSize;
  const maxTextW = Math.max(12, w - (textX - x) - pad);

  targetCtx.save();
  roundedRect(targetCtx, x, y, w, h, radius);
  targetCtx.fillStyle = "rgba(255, 255, 255, 0.88)";
  targetCtx.fill();
  targetCtx.strokeStyle = "rgba(29, 36, 48, 0.24)";
  targetCtx.lineWidth = Math.max(0.35 * scale, 1);
  targetCtx.stroke();

  drawPinIcon(targetCtx, x + pad + iconSize / 2, y + h / 2, iconSize, item.color);

  targetCtx.fillStyle = item.textColor;
  targetCtx.font = `${fontSize}px sans-serif`;
  targetCtx.textAlign = "left";
  targetCtx.textBaseline = "middle";
  drawWrappedText(targetCtx, item.text, textX, y + h / 2, maxTextW, fontSize * 1.22, h - pad * 1.4);
  targetCtx.restore();
}

function roundedRect(targetCtx, x, y, w, h, r) {
  targetCtx.beginPath();
  targetCtx.moveTo(x + r, y);
  targetCtx.lineTo(x + w - r, y);
  targetCtx.quadraticCurveTo(x + w, y, x + w, y + r);
  targetCtx.lineTo(x + w, y + h - r);
  targetCtx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  targetCtx.lineTo(x + r, y + h);
  targetCtx.quadraticCurveTo(x, y + h, x, y + h - r);
  targetCtx.lineTo(x, y + r);
  targetCtx.quadraticCurveTo(x, y, x + r, y);
  targetCtx.closePath();
}

function drawPinIcon(targetCtx, cx, cy, size, color) {
  const r = size * 0.36;
  targetCtx.save();
  targetCtx.fillStyle = color;
  targetCtx.beginPath();
  targetCtx.arc(cx, cy - r * 0.35, r, Math.PI * 0.78, Math.PI * 2.22);
  targetCtx.lineTo(cx, cy + size * 0.52);
  targetCtx.closePath();
  targetCtx.fill();
  targetCtx.fillStyle = "#fff";
  targetCtx.beginPath();
  targetCtx.arc(cx, cy - r * 0.35, r * 0.38, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.restore();
}

function drawWrappedText(targetCtx, text, x, centerY, maxWidth, lineHeight, maxHeight) {
  const rawLines = String(text || "").split("\n");
  const lines = [];
  rawLines.forEach((rawLine) => {
    const words = rawLine.split(/(\s+)/).filter(Boolean);
    let line = "";
    words.forEach((word) => {
      const test = line + word;
      if (targetCtx.measureText(test).width <= maxWidth || !line) {
        line = test;
      } else {
        lines.push(line.trimEnd());
        line = word.trimStart();
      }
    });
    lines.push(line || "");
  });

  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    visible[visible.length - 1] = `${visible[visible.length - 1].replace(/\s+$/, "")}...`;
  }
  const totalH = (visible.length - 1) * lineHeight;
  visible.forEach((line, index) => {
    targetCtx.fillText(line, x, centerY - totalH / 2 + index * lineHeight);
  });
}

function drawImageInRect(targetCtx, img, x, y, w, h, fit) {
  const imageRatio = img.naturalWidth / img.naturalHeight;
  const rectRatio = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;

  if (fit === "contain") {
    if (imageRatio > rectRatio) {
      dh = w / imageRatio;
      dy = y + (h - dh) / 2;
    } else {
      dw = h * imageRatio;
      dx = x + (w - dw) / 2;
    }
    targetCtx.fillStyle = "#fff";
    targetCtx.fillRect(x, y, w, h);
  } else if (imageRatio > rectRatio) {
    dw = h * imageRatio;
    dx = x + (w - dw) / 2;
  } else {
    dh = w / imageRatio;
    dy = y + (h - dh) / 2;
  }

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.rect(x, y, w, h);
  targetCtx.clip();
  targetCtx.drawImage(img, dx, dy, dw, dh);
  targetCtx.restore();
}

function safeMargin() {
  return state.paperKey === "a4" ? 6 : 2;
}

function locationDefaults(text = "正在取得当前位置...") {
  const size = paperSize();
  const w = Math.min(76, size.w - safeMargin() * 2);
  const h = 18;
  return {
    id: uid(),
    type: "location",
    x: clamp(size.w - w - safeMargin(), 0, size.w - w),
    y: clamp(size.h - h - safeMargin(), 0, size.h - h),
    w,
    h,
    text,
    color: "#e11d48",
    textColor: "#1d2430",
    fontSize: 4.2,
  };
}

function formatCoords(position) {
  const { latitude, longitude } = position.coords;
  return `Lat ${latitude.toFixed(6)}\nLon ${longitude.toFixed(6)}`;
}

function addLocationElement() {
  const item = locationDefaults();
  state.items.push(item);
  state.selectedId = item.id;
  draw();
  requestCurrentLocation(item);
}

function updateSelectedLocationFromCurrent() {
  const item = selectedLocationItem() || state.items.find((candidate) => candidate.type === "location");
  if (item) {
    state.selectedId = item.id;
    requestCurrentLocation(item);
  } else {
    addLocationElement();
  }
}

function requestCurrentLocation(item) {
  if (!navigator.geolocation) {
    item.text = "Lat --\nLon --\n地址文字";
    els.locationStatus.textContent = "这个浏览器没有提供定位功能，可以手动编辑文字。";
    draw();
    return;
  }

  els.locationStatus.textContent = "正在读取当前位置...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      item.text = formatCoords(position);
      els.locationStatus.textContent = "已更新为当前位置经纬度。";
      draw();
    },
    () => {
      item.text = "Lat --\nLon --\n地址文字";
      els.locationStatus.textContent = "无法读取定位，可以手动编辑文字。";
      draw();
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
  );
}

function resetTemplate() {
  const existingImages = state.images.slice();
  const existingLocations = state.items.filter((item) => item.type === "location");
  const selectedLocation = selectedLocationItem();
  state.items = [];
  state.selectedId = null;

  if (state.template === "stack2") {
    createStackTemplate(existingImages);
  } else if (state.template === "idGrid") {
    createIdGrid(existingImages[0] || null);
  }
  restoreLocationItems(existingLocations);
  if (selectedLocation) state.selectedId = selectedLocation.id;
  draw();
}

function restoreLocationItems(items) {
  const size = paperSize();
  items.forEach((item) => {
    item.w = Math.min(item.w, size.w);
    item.h = Math.min(item.h, size.h);
    item.x = clamp(item.x, 0, size.w - item.w);
    item.y = clamp(item.y, 0, size.h - item.h);
    state.items.push(item);
  });
}

function createStackTemplate(images) {
  const size = paperSize();
  const margin = state.paperKey === "a4" ? 12 : 4;
  const gap = state.paperKey === "a4" ? 10 : 4;
  const frameW = size.w - margin * 2;
  const frameH = (size.h - margin * 2 - gap) / 2;
  const rects = [
    { x: margin, y: margin, w: frameW, h: frameH, label: "上图" },
    { x: margin, y: margin + frameH + gap, w: frameW, h: frameH, label: "下图" },
  ];
  rects.forEach((rect, index) => {
    state.items.push({
      id: uid(),
      ...rect,
      image: images[index]?.image || null,
      fit: "cover",
    });
  });
}

function createIdGrid(imageEntry) {
  const size = paperSize();
  const margin = state.paperKey === "a4" ? 8 : 3;
  const gap = state.paperKey === "a4" ? 4 : 2;
  const cols = Math.max(1, Math.floor((size.w - margin * 2 + gap) / (state.idSize.w + gap)));
  const rows = Math.max(1, Math.floor((size.h - margin * 2 + gap) / (state.idSize.h + gap)));
  const gridW = cols * state.idSize.w + (cols - 1) * gap;
  const gridH = rows * state.idSize.h + (rows - 1) * gap;
  const startX = (size.w - gridW) / 2;
  const startY = (size.h - gridH) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      state.items.push({
        id: uid(),
        x: startX + col * (state.idSize.w + gap),
        y: startY + row * (state.idSize.h + gap),
        w: state.idSize.w,
        h: state.idSize.h,
        label: `${state.idSize.w}x${state.idSize.h}`,
        image: imageEntry?.image || null,
        fit: "cover",
        locked: true,
      });
    }
  }
}

function addFreeImage(imageEntry) {
  const size = paperSize();
  const imageRatio = imageEntry.image.naturalWidth / imageEntry.image.naturalHeight;
  const maxW = size.w * 0.62;
  const maxH = size.h * 0.62;
  let w = Math.min(maxW, 70);
  let h = w / imageRatio;
  if (h > maxH) {
    h = maxH;
    w = h * imageRatio;
  }
  const item = {
    id: uid(),
    x: (size.w - w) / 2,
    y: (size.h - h) / 2,
    w,
    h,
    image: imageEntry.image,
    label: imageEntry.name,
    fit: "contain",
  };
  state.items.push(item);
  state.selectedId = item.id;
}

function applyImagesToTemplate(newEntries) {
  if (state.template === "postcardFree") {
    newEntries.forEach(addFreeImage);
    draw();
    return;
  }

  if (state.template === "stack2") {
    state.items.filter((item) => item.type !== "location").forEach((item, index) => {
      const entry = state.images[index];
      if (entry) item.image = entry.image;
    });
    draw();
    return;
  }

  if (state.template === "idGrid") {
    const first = state.images[0] || newEntries[0] || null;
    state.items.filter((item) => item.type !== "location").forEach((item) => {
      item.image = first?.image || null;
    });
    draw();
  }
}

function handleFiles(files) {
  const readers = Array.from(files).map(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const image = new Image();
          image.onload = () => resolve({ image, name: file.name });
          image.onerror = reject;
          image.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }),
  );

  Promise.all(readers).then((entries) => {
    state.images.push(...entries);
    applyImagesToTemplate(entries);
  });
}

function pointerPosition(event) {
  const rect = els.canvas.getBoundingClientRect();
  return {
    x: pxToMm(event.clientX - rect.left),
    y: pxToMm(event.clientY - rect.top),
  };
}

function hitTest(point) {
  for (let i = state.items.length - 1; i >= 0; i -= 1) {
    const item = state.items[i];
    if (
      point.x >= item.x &&
      point.x <= item.x + item.w &&
      point.y >= item.y &&
      point.y <= item.y + item.h
    ) {
      const nearHandle = point.x > item.x + item.w - 5 && point.y > item.y + item.h - 5;
      return { item, mode: nearHandle ? "resize" : "move" };
    }
  }
  return null;
}

function onPointerDown(event) {
  const point = pointerPosition(event);
  const hit = hitTest(point);
  if (!hit) {
    state.selectedId = null;
    state.dragging = null;
    draw();
    return;
  }

  state.selectedId = hit.item.id;
  const editable = hit.item.type === "location" || state.template === "postcardFree";
  state.dragging = editable
    ? {
        mode: hit.mode,
        id: hit.item.id,
        start: point,
        item: { ...hit.item },
      }
    : null;
  els.canvas.setPointerCapture(event.pointerId);
  draw();
}

function onPointerMove(event) {
  if (!state.dragging) return;
  const item = selectedItem();
  if (!item) return;
  const size = paperSize();
  const point = pointerPosition(event);
  const dx = point.x - state.dragging.start.x;
  const dy = point.y - state.dragging.start.y;

  if (state.dragging.mode === "move") {
    item.x = clamp(state.dragging.item.x + dx, 0, size.w - item.w);
    item.y = clamp(state.dragging.item.y + dy, 0, size.h - item.h);
  } else {
    item.w = clamp(state.dragging.item.w + dx, 8, size.w - item.x);
    item.h = clamp(state.dragging.item.h + dy, 8, size.h - item.y);
  }
  draw();
}

function onPointerUp(event) {
  state.dragging = null;
  if (els.canvas.hasPointerCapture(event.pointerId)) {
    els.canvas.releasePointerCapture(event.pointerId);
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function exportPdf() {
  const size = paperSize();
  const exportScale = EXPORT_DPI / MM_PER_INCH;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = Math.round(size.w * exportScale);
  exportCanvas.height = Math.round(size.h * exportScale);
  const exportCtx = exportCanvas.getContext("2d");
  render(exportCtx, exportScale, { forExport: true });
  const jpeg = exportCanvas.toDataURL("image/jpeg", 0.94);
  const pdfBytes = makePdfWithJpeg(jpeg, size, exportCanvas.width, exportCanvas.height);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const paperName = papers[state.paperKey].label.replace(/\s+/g, "-");
  link.href = url;
  link.download = `konbini-print-${paperName}-${Date.now()}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function makePdfWithJpeg(dataUrl, sizeMm, imageW, imageH) {
  const pageW = (sizeMm.w * 72) / MM_PER_INCH;
  const pageH = (sizeMm.h * 72) / MM_PER_INCH;
  const binary = atob(dataUrl.split(",")[1]);
  const imageBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) imageBytes[i] = binary.charCodeAt(i);

  const encoder = new TextEncoder();
  const parts = [];
  const offsets = [0];
  let length = 0;

  function addText(text) {
    const bytes = encoder.encode(text);
    parts.push(bytes);
    length += bytes.length;
  }

  function addBytes(bytes) {
    parts.push(bytes);
    length += bytes.length;
  }

  function obj(id, body) {
    offsets[id] = length;
    addText(`${id} 0 obj\n${body}\nendobj\n`);
  }

  addText("%PDF-1.4\n%\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(3)} ${pageH.toFixed(
      3,
    )}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );

  offsets[4] = length;
  addText(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageW} /Height ${imageH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
  );
  addBytes(imageBytes);
  addText("\nendstream\nendobj\n");

  const content = `q\n${pageW.toFixed(3)} 0 0 ${pageH.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}endstream`);

  const xref = length;
  addText("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i += 1) {
    addText(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  addText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  const output = new Uint8Array(length);
  let cursor = 0;
  parts.forEach((part) => {
    output.set(part, cursor);
    cursor += part.length;
  });
  return output;
}

function bindEvents() {
  els.paperSelect.addEventListener("change", () => {
    state.paperKey = els.paperSelect.value;
    if (state.paperKey === "postcard") state.template = "postcardFree";
    resetTemplate();
  });

  els.portraitBtn.addEventListener("click", () => {
    state.orientation = "portrait";
    resetTemplate();
  });

  els.landscapeBtn.addEventListener("click", () => {
    state.orientation = "landscape";
    resetTemplate();
  });

  els.templateSelect.addEventListener("change", () => {
    state.template = els.templateSelect.value;
    resetTemplate();
  });

  els.idSizeSelect.addEventListener("change", () => {
    const [w, h] = els.idSizeSelect.value.split("x").map(Number);
    state.idSize = { w, h };
    resetTemplate();
  });

  els.imageInput.addEventListener("change", (event) => {
    if (event.target.files?.length) handleFiles(event.target.files);
    els.imageInput.value = "";
  });

  els.addLocationBtn.addEventListener("click", addLocationElement);
  els.refreshLocationBtn.addEventListener("click", updateSelectedLocationFromCurrent);

  els.locationTextInput.addEventListener("input", () => {
    const item = selectedLocationItem();
    if (!item) return;
    item.text = els.locationTextInput.value;
    draw();
  });

  els.fitBtn.addEventListener("click", () => {
    const item = selectedItem();
    if (item) item.fit = "contain";
    draw();
  });

  els.coverBtn.addEventListener("click", () => {
    const item = selectedItem();
    if (item) item.fit = "cover";
    draw();
  });

  els.deleteBtn.addEventListener("click", () => {
    state.items = state.items.filter((item) => item.id !== state.selectedId);
    state.selectedId = null;
    draw();
  });

  els.guideToggle.addEventListener("change", () => {
    state.showGuides = els.guideToggle.checked;
    draw();
  });

  els.marginToggle.addEventListener("change", () => {
    state.showMargins = els.marginToggle.checked;
    draw();
  });

  els.resetBtn.addEventListener("click", resetTemplate);
  els.exportBtn.addEventListener("click", exportPdf);

  els.canvas.addEventListener("pointerdown", onPointerDown);
  els.canvas.addEventListener("pointermove", onPointerMove);
  els.canvas.addEventListener("pointerup", onPointerUp);
  els.canvas.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", draw);
}

function init() {
  populatePaperSelect();
  bindEvents();
  resetTemplate();
}

init();
