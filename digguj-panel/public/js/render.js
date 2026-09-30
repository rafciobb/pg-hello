// Silnik rysujący slajdy na <canvas>.
// Funkcje NIE czytają niczego z DOM – dostają:
//   cfg    – ustawienia posta (te same klucze co pola formularza, patrz DEFAULTS),
//   assets – { coverImg, logoImg, diggujImg } (obiekty Image albo null),
//   slide  – { text, imgObj, panX, panY }.

export const W = 1080;

export const DEFAULTS = {
  postMode: 'album',
  postFormat: 'carousel',
  coverDuration: '3',
  slideDuration: '4',
  transType: 'flip',
  coverBlurAmt: '15',
  coverDimAmt: '50',
  szArtist: '42',
  colArtist: '#f0e040',
  szTitle: '90',
  colTitle: '#ffffff',
  szYear: '26',
  colYear: '#a6a6a6',
  szSlideHeader: '106',
  colSlideArtist: '#f0e040',
  colSlideTitle: '#ffffff',
  albumArtist: '',
  albumTitle: '',
  albumYear: '',
  albumLabel: '',
  calDate: '',
  calEvents: '',
  // Slajd końcowy z wezwaniem do akcji (CTA)
  ctaEnabled: '1',
  ctaLabel: 'JEŚLI PODOBA CI SIĘ TO, CO ROBIMY',
  ctaTitle: 'UDOSTĘPNIJ I ZREPOSTUJ',
  ctaText: 'Każde udostępnienie pomaga nam dotrzeć do kolejnych fanów muzyki. Dzięki, że jesteś z nami!',
  ctaHandle: '',
};

/** Pola CTA – można je zapisać jako domyślne dla nowych postów. */
export const CTA_FIELDS = ['ctaEnabled', 'ctaLabel', 'ctaTitle', 'ctaText', 'ctaHandle'];

const int = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const isTallFormat = (format) => format === 'reel' || format === 'video';

/** Slajdy, które faktycznie trafią do posta (mają tekst albo zdjęcie). */
export function getActiveSlides(slides) {
  return slides
    .map((s, index) => ({ ...s, index, text: (s.text || '').trim() }))
    .filter((s) => s.text !== '' || s.imgObj);
}

function countContentSlides(mode, slides) {
  const active = getActiveSlides(slides).length;
  return mode === 'album' ? active + 1 : active;
}

/** Czy na końcu posta dokleić slajd CTA (nie dotyczy kalendarium). */
export function hasCtaSlide(cfg, slides) {
  return cfg.postMode !== 'calendar' && cfg.ctaEnabled === '1' && countContentSlides(cfg.postMode, slides) > 0;
}

/** Liczba canvasów w podglądzie (okładka + ciekawostki + ewentualnie CTA). */
export function countCanvases(cfg, slides) {
  if (cfg.postMode === 'calendar') return 1;
  return countContentSlides(cfg.postMode, slides) + (hasCtaSlide(cfg, slides) ? 1 : 0);
}

/** Indeks slajdu (w tablicy slides) dla danego canvasa podglądu albo -1 (okładka / kalendarium). */
export function slideIndexForCanvas(mode, slides, canvasIndex) {
  if (mode === 'calendar') return -1;
  const active = getActiveSlides(slides);
  const sIndex = mode === 'album' ? canvasIndex - 1 : canvasIndex;
  return sIndex >= 0 && active[sIndex] ? active[sIndex].index : -1;
}

export function recommendedSlideSeconds(slides) {
  let maxWords = 0;
  for (const s of slides) {
    const text = (s.text || '').trim();
    if (text) maxWords = Math.max(maxWords, text.split(/\s+/).length);
  }
  return maxWords > 0 ? Math.max(3, Math.ceil(maxWords / 3) + 2) : 4;
}

function prepareCanvas(canvas, H, scale) {
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(scale, scale);
  return ctx;
}

export function drawImageProp(ctx, img, x, y, w, h, panX = 0, panY = 0) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let renderW, renderH, offsetX = 0, offsetY = 0;
  if (imgRatio > boxRatio) {
    renderH = h; renderW = h * imgRatio; offsetX = (w - renderW) / 2 + panX;
  } else {
    renderW = w; renderH = w / imgRatio; offsetY = (h - renderH) / 2 + panY;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.clip();
  ctx.drawImage(img, x + offsetX - 1, y + offsetY - 1, renderW + 2, renderH + 2);
  ctx.restore();
}

/** Maksymalne przesunięcie kadru zdjęcia w ramce 980×640 (w pikselach 1080p). */
export function maxPan(img) {
  const boxW = W - 100, boxH = 640;
  const imgRatio = img.width / img.height;
  let renderW, renderH;
  if (imgRatio > boxW / boxH) { renderH = boxH; renderW = boxH * imgRatio; } else { renderW = boxW; renderH = boxW / imgRatio; }
  return { x: Math.abs(boxW - renderW) / 2, y: Math.abs(boxH - renderH) / 2 };
}

export function getLines(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const testLine = line + (line === '' ? '' : ' ') + word;
    if (ctx.measureText(testLine).width > maxW && line !== '') {
      lines.push(line);
      line = word;
    } else line = testLine;
  }
  if (line !== '') lines.push(line);
  return lines;
}

function logoElements(assets) {
  const elements = [];
  if (assets.logoImg) elements.push({ img: assets.logoImg, w: 55, h: 55 });
  if (assets.diggujImg && assets.diggujImg.width > 0) {
    const w = 150;
    elements.push({ img: assets.diggujImg, w, h: assets.diggujImg.height * (w / assets.diggujImg.width) });
  }
  return elements;
}

function drawBlurredBackground(ctx, img, H, cfg) {
  const blurPx = int(cfg.coverBlurAmt, 15);
  const dimAlpha = int(cfg.coverDimAmt, 50) / 100;
  if (img) {
    ctx.save();
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight) * 1.1;
    ctx.filter = `blur(${blurPx}px) saturate(110%)`;
    ctx.drawImage(img, (W - img.naturalWidth * scale) / 2, (H - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
    ctx.restore();
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#222');
    grad.addColorStop(1, '#050505');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = `rgba(0,0,0,${dimAlpha})`;
  ctx.fillRect(0, 0, W, H);
}

/** Logotypy w prawym górnym rogu. W wideo timerProgress < 1 "odlicza" czas slajdu wycinkiem koła. */
export function drawLogosTopRight(ctx, assets, format, offsetY = 0, timerProgress = 1) {
  const logoMarginTop = 35 + offsetY;
  const elements = logoElements(assets);
  if (elements.length === 0) return;

  const totalW = elements.reduce((sum, el, idx) => sum + el.w + (idx < elements.length - 1 ? 20 : 0), 0);
  const startX = W - 35 - totalW;
  const maxH = Math.max(...elements.map((e) => e.h));

  ctx.save();
  if (isTallFormat(format) && timerProgress < 1) {
    if (timerProgress <= 0) { ctx.restore(); return; }
    const cx = startX + totalW / 2;
    const cy = logoMarginTop + maxH / 2;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle - timerProgress * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, totalW, startAngle, endAngle, true);
    ctx.closePath();
    ctx.clip();
  }
  let drawX = startX;
  elements.forEach((el) => {
    ctx.drawImage(el.img, drawX, logoMarginTop + (maxH - el.h) / 2, el.w, el.h);
    drawX += el.w + 20;
  });
  ctx.restore();
}

function hexToRgb(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return [240, 224, 64];
  return [1, 3, 5].map((i) => parseInt(hex.substring(i, i + 2), 16));
}

// ─────────────────────────────── KALENDARIUM ───────────────────────────────
export function drawCalendarSlide(canvas, cfg, assets, renderScale = 2, hideLogo = false) {
  const H = 1920;
  const ctx = prepareCanvas(canvas, H, renderScale);

  // 1. Tło
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1c1c1c');
  grad.addColorStop(1, '#050505');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. Poświata w kolorze akcentu
  const accentColor = cfg.colSlideArtist || '#f0e040';
  const [r, g, b] = hexToRgb(accentColor);
  const radGrad = ctx.createRadialGradient(W / 2, H / 2 - 100, 50, W / 2, H / 2 - 100, 900);
  radGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.12)`);
  radGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, W, H);

  // 3. Logotypy wyśrodkowane
  const elements = logoElements(assets);
  let topSectionY = 140;
  if (elements.length > 0 && !hideLogo) {
    const totalW = elements.reduce((sum, el, idx) => sum + el.w + (idx < elements.length - 1 ? 20 : 0), 0);
    const maxH = Math.max(...elements.map((e) => e.h));
    let startX = (W - totalW) / 2;
    elements.forEach((el) => {
      ctx.drawImage(el.img, startX, topSectionY + (maxH - el.h) / 2, el.w, el.h);
      startX += el.w + 20;
    });
    topSectionY += maxH + 80;
  } else {
    topSectionY += 100;
  }

  // 4. Nagłówek i data
  const dateTxt = (cfg.calDate || '').trim();
  const eventsTxt = (cfg.calEvents || '').trim();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = accentColor;
  ctx.font = '800 36px "Montserrat"';
  ctx.fillText('TEGO DNIA W MUZYCE', W / 2, topSectionY);
  topSectionY += 60;

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 120px "Montserrat"';
  ctx.fillText(dateTxt, W / 2, topSectionY);
  topSectionY += 180;

  // 5. Wydarzenia – dopasowanie wielkości fontu do dostępnego miejsca
  const margin = 100;
  const maxTextW = W - margin * 2;
  const eventLines = eventsTxt.split('\n').filter((l) => l.trim() !== '');
  const availableH = H - topSectionY - 100;
  let fontSize = 44;
  let computedEvents = [];
  let totalH = 0;

  for (;;) {
    ctx.font = `500 ${fontSize}px "DM Sans"`;
    const lineHeight = Math.round(fontSize * 1.4);
    const paddingY = Math.round(fontSize * 0.8);
    const spaceBetween = Math.round(fontSize * 0.9);
    totalH = 0;
    computedEvents = eventLines.map((ev) => {
      const lines = getLines(ctx, ev, maxTextW - 80);
      const boxH = lines.length * lineHeight + paddingY * 2;
      totalH += boxH + spaceBetween;
      return { lines, boxH, lineHeight, paddingY, spaceBetween };
    });
    if (computedEvents.length > 0) totalH -= spaceBetween;
    if (totalH <= availableH || fontSize <= 18) break;
    fontSize -= 2;
  }

  let currentY = topSectionY + (totalH < availableH ? (availableH - totalH) / 2 : 0);

  // 6. Kafelki wydarzeń
  ctx.textAlign = 'left';
  computedEvents.forEach((ev) => {
    ctx.fillStyle = 'rgba(20, 20, 20, 0.6)';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.fillRect(margin - 50, currentY, maxTextW + 100, ev.boxH);

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = accentColor;
    ctx.fillRect(margin - 50, currentY, 10, ev.boxH);

    let lineY = currentY + ev.paddingY;
    ev.lines.forEach((line, lineIdx) => {
      // Pierwsza linia: rok ("1991:", "1991 -", "1991") jako biała plakietka
      const match = lineIdx === 0 ? line.match(/^(\d{4}[.:-]?)\s+(.*)/) : null;
      if (match) {
        const [, yearPart, restPart] = match;
        ctx.font = `800 ${fontSize}px "DM Sans"`;
        const padX = 12, padY = 6;
        const badgeW = ctx.measureText(yearPart).width + padX * 2;
        const badgeH = fontSize + padY * 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(margin, lineY - padY, badgeW, badgeH, 6);
        else ctx.rect(margin, lineY - padY, badgeW, badgeH);
        ctx.fill();

        ctx.fillStyle = '#0a0a0a';
        ctx.fillText(yearPart, margin + padX, lineY);

        ctx.fillStyle = '#ffffff';
        ctx.font = `500 ${fontSize}px "DM Sans"`;
        ctx.fillText(restPart, margin + badgeW + 16, lineY);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = `500 ${fontSize}px "DM Sans"`;
        ctx.fillText(line, margin, lineY);
      }
      lineY += ev.lineHeight;
    });
    currentY += ev.boxH + ev.spaceBetween;
  });
}

// ─────────────────────────────── OKŁADKA ALBUMU ───────────────────────────────
function fitLines(ctx, text, weight, startSize, minSize, step, maxW) {
  let size = startSize;
  ctx.font = `${weight} ${size}px "Montserrat"`;
  let lines = getLines(ctx, text, maxW);
  while ((lines.length > 2 || lines.some((l) => ctx.measureText(l).width > maxW)) && size > minSize) {
    size -= step;
    ctx.font = `${weight} ${size}px "Montserrat"`;
    lines = getLines(ctx, text, maxW);
  }
  return { size, lines };
}

export function drawCoverSlide(canvas, cfg, assets, format, isReelCoverForGrid = false, renderScale = 2, hideLogo = false) {
  const tall = isTallFormat(format);
  const H = tall || isReelCoverForGrid ? 1920 : 1350;
  const ctx = prepareCanvas(canvas, H, renderScale);
  ctx.clearRect(0, 0, W, H);

  const bg = assets.coverImg;
  drawBlurredBackground(ctx, bg, H, cfg);

  const offsetY = isReelCoverForGrid ? 285 : 0;
  const coverSize = 660;
  const coverY = isReelCoverForGrid ? 190 + offsetY : (tall ? 450 : 190);

  if (bg) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#000000';
    ctx.fillRect((W - coverSize) / 2, coverY, coverSize, coverSize);
    ctx.restore();
    drawImageProp(ctx, bg, (W - coverSize) / 2, coverY, coverSize, coverSize);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect((W - coverSize) / 2, coverY, coverSize, coverSize);
  }

  if (!hideLogo) drawLogosTopRight(ctx, assets, format, offsetY, 1);

  const artist = (cfg.albumArtist || '').trim();
  const title = (cfg.albumTitle || '').trim();
  const year = (cfg.albumYear || '').trim();
  const label = (cfg.albumLabel || '').trim();
  const maxW = W - 120;

  let textY = coverY + coverSize + 85;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;

  if (artist) {
    ctx.fillStyle = cfg.colArtist;
    const { size, lines } = fitLines(ctx, artist.toUpperCase(), 800, int(cfg.szArtist, 42), 20, 2, maxW);
    lines.forEach((line) => { ctx.fillText(line, W / 2, textY); textY += size * 1.2; });
    textY += 15;
  }
  if (title) {
    ctx.fillStyle = cfg.colTitle;
    const { size, lines } = fitLines(ctx, title.toUpperCase(), 900, int(cfg.szTitle, 90), 28, 4, maxW);
    lines.forEach((line) => { ctx.fillText(line, W / 2, textY); textY += size * 1.1; });
    textY += 25;
  }
  const yearAndLabel = year && label ? `${year}  •  ${label.toUpperCase()}` : (year || label.toUpperCase());
  if (yearAndLabel) {
    ctx.fillStyle = cfg.colYear;
    const { size, lines } = fitLines(ctx, yearAndLabel, 500, int(cfg.szYear, 26), 14, 2, maxW);
    lines.forEach((line) => { ctx.fillText(line, W / 2, textY); textY += size * 1.5; });
  }
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
}

// ─────────────────────────────── SLAJD Z CIEKAWOSTKĄ ───────────────────────────────
function measureHeader(ctx, size, textArtist, textTitle, separator) {
  ctx.font = `800 ${size}px "Montserrat"`;
  const wArtist = textArtist ? ctx.measureText(textArtist).width : 0;
  ctx.font = `600 ${size}px "Montserrat"`;
  const wTitle = textTitle ? ctx.measureText(textTitle).width : 0;
  const wSep = separator ? ctx.measureText(separator).width : 0;
  return { wArtist, wTitle, wSep, totalW: wArtist + wSep + wTitle };
}

export function drawSlide(canvas, cfg, assets, slide, format, isReelCoverForGrid = false, renderScale = 2, hideLogo = false) {
  const tall = isTallFormat(format);
  const H = tall || isReelCoverForGrid ? 1920 : 1350;
  const ctx = prepareCanvas(canvas, H, renderScale);
  ctx.clearRect(0, 0, W, H);
  drawBlurredBackground(ctx, assets.coverImg, H, cfg);

  const offsetY = isReelCoverForGrid ? 285 : 0;
  const margin = 50;

  if (cfg.postMode === 'album') {
    const headerBaseY = isReelCoverForGrid ? 130 + offsetY : (tall ? 320 : 130);
    const artist = (cfg.albumArtist || '').trim();
    const title = (cfg.albumTitle || '').trim();
    const textArtist = artist.toUpperCase();
    const textTitle = title.toUpperCase();
    const separator = artist && title ? '  •  ' : '';
    const baseRefSize = 106;
    ctx.textBaseline = 'middle';

    // Dobór rozmiaru tak, żeby nagłówek nie wchodził pod logotypy
    let testFontSize = baseRefSize;
    let fits = false;
    while (!fits && testFontSize >= 16) {
      const { totalW } = measureHeader(ctx, testFontSize, textArtist, textTitle, separator);
      if (W / 2 + totalW / 2 < 740) fits = true; else testFontSize -= 1;
    }
    if (!fits) {
      testFontSize = Math.floor(baseRefSize * 0.77);
      while (testFontSize >= 12) {
        const { totalW } = measureHeader(ctx, testFontSize, textArtist, textTitle, separator);
        if (margin + totalW < 740) break;
        testFontSize -= 1;
      }
    }
    const headerFontSize = Math.max(10, Math.floor(int(cfg.szSlideHeader, 106) * (testFontSize / baseRefSize)));
    const { wArtist, wSep, totalW } = measureHeader(ctx, headerFontSize, textArtist, textTitle, separator);

    let currentX = (W - totalW) / 2;
    ctx.textAlign = 'left';
    if (artist) {
      ctx.fillStyle = cfg.colSlideArtist;
      ctx.font = `800 ${headerFontSize}px "Montserrat"`;
      ctx.fillText(textArtist, currentX, headerBaseY);
      currentX += wArtist;
    }
    if (separator) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = cfg.colSlideTitle;
      ctx.font = `600 ${headerFontSize}px "Montserrat"`;
      ctx.fillText(separator, currentX, headerBaseY);
      ctx.restore();
      currentX += wSep;
    }
    if (title) {
      ctx.fillStyle = cfg.colSlideTitle;
      ctx.font = `600 ${headerFontSize}px "Montserrat"`;
      ctx.fillText(textTitle, currentX, headerBaseY);
    }
  }

  const imgY = isReelCoverForGrid ? 210 + offsetY : (tall ? 420 : 210);
  const imgH = 640;
  const imgW = W - margin * 2;

  if (slide.imgObj) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 15;
    ctx.fillStyle = '#000000';
    ctx.fillRect(margin, imgY, imgW, imgH);
    ctx.restore();
    drawImageProp(ctx, slide.imgObj, margin, imgY, imgW, imgH, slide.panX || 0, slide.panY || 0);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(margin, imgY, imgW, imgH);
  }

  const textW = imgW;
  const textY = imgY + imgH;
  const textH = isReelCoverForGrid ? 1350 - 210 - imgH - margin : H - textY - (tall ? 300 : margin);

  ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
  ctx.fillRect(margin, textY, textW, textH);

  const text = (slide.text || '').trim();
  if (text) {
    const padding = 50;
    const maxTextW = textW - padding * 2;
    let fontSize = 42;
    let lineHeight = fontSize * 1.4;
    let lines = [];
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (;;) {
      ctx.font = `500 ${fontSize}px "DM Sans"`;
      lineHeight = fontSize * 1.4;
      lines = getLines(ctx, text, maxTextW);
      const tooBig = lines.length * lineHeight > textH - padding * 1.5 || lines.some((l) => ctx.measureText(l).width > maxTextW);
      if (!tooBig || fontSize <= 14) break;
      fontSize -= 1.5;
    }
    let currentY = textY + textH / 2 - (lines.length * lineHeight) / 2 + lineHeight / 2 - fontSize * 0.1;
    lines.forEach((line) => { ctx.fillText(line, margin + textW / 2, currentY); currentY += lineHeight; });
  }

  if (!hideLogo) drawLogosTopRight(ctx, assets, format, offsetY, 1);
}

// ─────────────────────────────── SLAJD KOŃCOWY (CTA) ───────────────────────────────
const ICONS = {
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  repeat: ['M17 1l4 4-4 4', 'M3 11V9a4 4 0 0 1 4-4h14', 'M7 23l-4-4 4-4', 'M21 13v2a4 4 0 0 1-4 4H3'],
};

/** Ikona w stylu Feather (siatka 24×24) wyśrodkowana w punkcie (cx, cy). */
function drawIcon(ctx, name, cx, cy, size, color, lineWidth = 2) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ICONS[name].forEach((d) => ctx.stroke(new Path2D(d)));
  ctx.restore();
}

function drawPill(ctx, x, y, w, h, { fill, color, text, iconName, outline = false }) {
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2); else ctx.rect(x, y, w, h);
  if (outline) { ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); } else { ctx.fillStyle = fill; ctx.fill(); }
  ctx.font = '900 34px "Montserrat"';
  const tw = ctx.measureText(text).width;
  const iconSize = 38, gap = 20;
  const sx = x + (w - tw - gap - iconSize) / 2;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, sx, y + h / 2 + 2);
  drawIcon(ctx, iconName, sx + tw + gap + iconSize / 2, y + h / 2, iconSize, color, 2.4);
  ctx.restore();
}

/** Układ tekstów CTA dopasowany do dostępnej wysokości (zmniejsza fonty, gdy tekst jest długi). */
function layoutCta(ctx, cfg, availableH, tall) {
  const label = (cfg.ctaLabel || '').trim().toUpperCase();
  const title = (cfg.ctaTitle || '').trim().toUpperCase();
  const body = (cfg.ctaText || '').trim();
  const handle = (cfg.ctaHandle || '').trim();
  const maxW = W - 180;
  const buttonsGap = tall ? 80 : 44;
  let titleSize = 96, bodySize = 34, layout;
  for (;;) {
    ctx.font = `900 ${titleSize}px "Montserrat"`;
    const titleLines = title ? getLines(ctx, title, maxW) : [];
    ctx.font = `500 ${bodySize}px "DM Sans"`;
    const bodyLines = body ? getLines(ctx, body, maxW - 80) : [];
    const titleLH = Math.round(titleSize * 1.04), bodyLH = Math.round(bodySize * 1.41);
    const height = (label ? 58 : 0)
      + titleLines.length * titleLH + (title ? 22 : 0)
      + bodyLines.length * bodyLH + buttonsGap
      + 96 + (handle ? 30 + 30 : 0);
    layout = { label, handle, titleLines, bodyLines, titleSize, bodySize, titleLH, bodyLH, buttonsGap, height };
    if ((height <= availableH && titleLines.length <= 3) || titleSize <= 56) return layout;
    titleSize -= 4;
    if (bodySize > 26) bodySize -= 1;
  }
}

/**
 * Slajd końcowy: tło identyczne jak na 1. slajdzie (rozmyta okładka z tymi samymi ustawieniami blur/przyciemnienia),
 * na nim ostra okładka wtapiająca się w tło, a pod nią zachęta do udostępnienia i repostu.
 */
export function drawCtaSlide(canvas, cfg, assets, format, renderScale = 2, hideLogo = false) {
  const tall = isTallFormat(format);
  const H = tall ? 1920 : 1350;
  const ctx = prepareCanvas(canvas, H, renderScale);
  ctx.clearRect(0, 0, W, H);
  const cover = assets.coverImg;
  drawBlurredBackground(ctx, cover, H, cfg);

  const accent = cfg.colSlideArtist || '#f0e040';
  const bottomLimit = H - (tall ? 300 : 60);
  let y;

  if (cover) {
    const size = tall ? 980 : 780;
    const x = (W - size) / 2;
    const y0 = tall ? 260 : 190;
    // Okładka na osobnej warstwie z maską: dół i boki płynnie przechodzą w rozmyte tło
    const layer = document.createElement('canvas');
    layer.width = layer.height = Math.round(size * renderScale);
    const lc = layer.getContext('2d');
    lc.imageSmoothingQuality = 'high';
    lc.scale(renderScale, renderScale);
    drawImageProp(lc, cover, 0, 0, size, size);
    lc.globalCompositeOperation = 'destination-in';
    const fadeY = lc.createLinearGradient(0, size * 0.28, 0, size * 0.66);
    fadeY.addColorStop(0, 'rgba(0,0,0,1)');
    fadeY.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = fadeY;
    lc.fillRect(0, 0, size, size);
    const fadeX = lc.createLinearGradient(0, 0, size, 0);
    fadeX.addColorStop(0, 'rgba(0,0,0,0)');
    fadeX.addColorStop(0.06, 'rgba(0,0,0,1)');
    fadeX.addColorStop(0.94, 'rgba(0,0,0,1)');
    fadeX.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = fadeX;
    lc.fillRect(0, 0, size, size);
    ctx.drawImage(layer, x, y0, size, size);
    y = y0 + size * (tall ? 0.7 : 0.68);
  }

  const available = bottomLimit - (y ?? (tall ? 300 : 160));
  const L = layoutCta(ctx, cfg, available, tall);
  if (y === undefined) y = Math.max(tall ? 300 : 160, (H - L.height) / 2); // bez okładki: tekst na środku

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  if (L.label) {
    ctx.fillStyle = accent;
    let size = 34;
    ctx.font = `800 ${size}px "Montserrat"`;
    while (ctx.measureText(L.label).width > W - 120 && size > 20) { size -= 2; ctx.font = `800 ${size}px "Montserrat"`; }
    ctx.fillText(L.label, W / 2, y);
    y += 58;
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${L.titleSize}px "Montserrat"`;
  L.titleLines.forEach((line) => { ctx.fillText(line, W / 2, y); y += L.titleLH; });
  if (L.titleLines.length) y += 22;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `500 ${L.bodySize}px "DM Sans"`;
  L.bodyLines.forEach((line) => { ctx.fillText(line, W / 2, y); y += L.bodyLH; });
  ctx.restore();

  y += L.buttonsGap;
  const bw = 400, bh = 96, gap = 24;
  drawPill(ctx, W / 2 - bw - gap / 2, y, bw, bh, { fill: accent, color: '#0a0a0a', text: 'UDOSTĘPNIJ', iconName: 'send' });
  drawPill(ctx, W / 2 + gap / 2, y, bw, bh, { color: '#ffffff', text: 'REPOSTUJ', iconName: 'repeat', outline: true });
  y += bh;

  if (L.handle) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.font = '800 30px "DM Sans"';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`OBSERWUJ ${L.handle}`, W / 2, y + 30);
    ctx.restore();
  }

  if (!hideLogo) drawLogosTopRight(ctx, assets, format, 0, 1);
}

/** Rysuje wszystkie canvasy podglądu (canvases – tablica elementów <canvas>). */
export function renderPreview(canvases, cfg, assets, slides, scale = 2) {
  const mode = cfg.postMode;
  const format = cfg.postFormat;
  if (mode === 'calendar') {
    if (canvases[0]) drawCalendarSlide(canvases[0], cfg, assets, scale, false);
    return;
  }
  const active = getActiveSlides(slides);
  let i = 0;
  if (mode === 'album') drawCoverSlide(canvases[i++], cfg, assets, format, false, scale);
  active.forEach((slide) => drawSlide(canvases[i++], cfg, assets, slide, format, false, scale));
  if (hasCtaSlide(cfg, slides) && canvases[i]) drawCtaSlide(canvases[i], cfg, assets, format, scale);
}

/** Okładka rolki do siatki profilu (4:5 wycięte z 9:16). */
export function drawReelGridCover(canvas, cfg, assets, slides) {
  if (cfg.postMode === 'calendar') return drawCalendarSlide(canvas, cfg, assets, 2, false);
  if (cfg.postMode === 'album') return drawCoverSlide(canvas, cfg, assets, 'carousel', true, 2, false);
  const first = getActiveSlides(slides)[0];
  if (first) drawSlide(canvas, cfg, assets, first, 'carousel', true, 2, false);
}

// ─────────────────────────────── WIDEO ───────────────────────────────
/** Pre-renderuje slajdy do wideo (bez logotypów – te są rysowane na każdej klatce z timerem). */
export function buildVideoSlides(cfg, assets, slides, scale = 1) {
  const H = 1920;
  const bg = document.createElement('canvas');
  const bgCtx = prepareCanvas(bg, H, scale);
  drawBlurredBackground(bgCtx, assets.coverImg, H, cfg);

  const out = [];
  if (cfg.postMode === 'calendar') {
    const c = document.createElement('canvas');
    drawCalendarSlide(c, cfg, assets, scale, true);
    out.push(c);
    return { slides: out, bg };
  }
  if (cfg.postMode === 'album') {
    const c = document.createElement('canvas');
    drawCoverSlide(c, cfg, assets, 'video', false, scale, true);
    out.push(c);
  }
  for (const slide of getActiveSlides(slides)) {
    const c = document.createElement('canvas');
    drawSlide(c, cfg, assets, slide, 'video', false, scale, true);
    out.push(c);
  }
  if (hasCtaSlide(cfg, slides)) {
    const c = document.createElement('canvas');
    drawCtaSlide(c, cfg, assets, 'video', scale, true);
    out.push(c);
  }
  return { slides: out, bg };
}

export function videoTiming(cfg, slideCount, fps = 30) {
  const coverFrames = fps * (int(cfg.coverDuration, 3) || 3);
  const regularFrames = fps * (int(cfg.slideDuration, 4) || 4);
  const transFrames = cfg.transType === 'none' ? 0 : Math.floor(fps * 0.6);
  let totalFrames;
  if (cfg.postMode === 'calendar') totalFrames = regularFrames;
  else if (cfg.postMode === 'album') totalFrames = coverFrames + (slideCount - 1) * regularFrames;
  else totalFrames = slideCount * regularFrames;
  return { fps, coverFrames, regularFrames, transFrames, totalFrames };
}

/** Który slajd, która klatka w nim i postęp przejścia dla numeru klatki. */
export function frameState(frame, cfg, timing, slideCount) {
  const { coverFrames, regularFrames, transFrames } = timing;
  let sIdx, f, slideFrames;
  if (cfg.postMode === 'calendar') {
    sIdx = 0; f = frame % regularFrames; slideFrames = regularFrames;
  } else if (cfg.postMode === 'album' && frame < coverFrames) {
    sIdx = 0; f = frame; slideFrames = coverFrames;
  } else {
    const rel = cfg.postMode === 'album' ? frame - coverFrames : frame;
    sIdx = (cfg.postMode === 'album' ? 1 : 0) + Math.floor(rel / regularFrames);
    f = rel % regularFrames;
    slideFrames = regularFrames;
  }
  const hasNext = sIdx < slideCount - 1;
  const transProgress = hasNext && transFrames > 0 && f >= slideFrames - transFrames
    ? (f - (slideFrames - transFrames)) / transFrames
    : 0;
  return { sIdx, hasNext, transProgress, timerProgress: 1 - f / slideFrames };
}

export function renderVideoFrame(ctx, Wpx, Hpx, slideA, slideB, cfg, assets, state, bgCanvas) {
  const { transProgress, timerProgress } = state;
  const transType = cfg.transType;
  ctx.clearRect(0, 0, Wpx, Hpx);
  ctx.save();

  if (transProgress <= 0 || !slideB || transType === 'none') {
    ctx.drawImage(slideA, 0, 0, Wpx, Hpx);
  } else if (transType === 'fade') {
    ctx.globalAlpha = 1 - transProgress; ctx.drawImage(slideA, 0, 0, Wpx, Hpx);
    ctx.globalAlpha = transProgress; ctx.drawImage(slideB, 0, 0, Wpx, Hpx);
  } else if (transType === 'slideLeft') {
    ctx.drawImage(slideA, -Wpx * transProgress, 0, Wpx, Hpx);
    ctx.drawImage(slideB, Wpx - Wpx * transProgress, 0, Wpx, Hpx);
  } else if (transType === 'slideUp') {
    ctx.drawImage(slideA, 0, -Hpx * transProgress, Wpx, Hpx);
    ctx.drawImage(slideB, 0, Hpx - Hpx * transProgress, Wpx, Hpx);
  } else if (transType === 'zoom') {
    ctx.globalAlpha = 1 - transProgress;
    const scaleA = 1 + 0.15 * transProgress;
    ctx.translate(Wpx / 2, Hpx / 2); ctx.scale(scaleA, scaleA); ctx.drawImage(slideA, -Wpx / 2, -Hpx / 2, Wpx, Hpx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = transProgress;
    const scaleB = 0.85 + 0.15 * transProgress;
    ctx.translate(Wpx / 2, Hpx / 2); ctx.scale(scaleB, scaleB); ctx.drawImage(slideB, -Wpx / 2, -Hpx / 2, Wpx, Hpx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  } else if (transType === 'flip') {
    const k = Wpx / 1080;
    const cx = 50 * k, cy = 420 * k, cw = 980 * k, ch = 1200 * k;
    const topH = 390 * k;
    const bottomY = 1700 * k;

    ctx.drawImage(bgCanvas, 0, 0, Wpx, Hpx);
    ctx.drawImage(slideB, 0, 0, Wpx, topH, 0, 0, Wpx, topH);
    ctx.drawImage(slideB, 0, bottomY, Wpx, Hpx - bottomY, 0, bottomY, Wpx, Hpx - bottomY);

    ctx.translate(cx + cw / 2, 0);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 15;
    if (transProgress < 0.5) {
      ctx.scale(Math.cos(transProgress * Math.PI), 1);
      ctx.drawImage(slideA, cx, cy, cw, ch, -cw / 2, cy, cw, ch);
    } else {
      ctx.scale(Math.sin((transProgress - 0.5) * Math.PI), 1);
      ctx.drawImage(slideB, cx, cy, cw, ch, -cw / 2, cy, cw, ch);
    }
  }
  ctx.restore();

  if (cfg.postMode !== 'calendar') drawLogosTopRight(ctx, assets, 'video', 0, timerProgress);
}
