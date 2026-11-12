import * as qrImage from "qr-image";

export type ECLevel = "L" | "M" | "Q" | "H";
export type ModuleStyle = "square" | "rounded" | "dots";
export type EyeStyle = "square" | "rounded" | "circle";

export interface QRMatrix {
  size: number;
  /** Total QR "version" (1–40). Each version adds 4 modules per side. */
  version: number;
  isDark: (row: number, col: number) => boolean;
}

export interface RenderOptions {
  fg: string;
  bg: string;
  transparent: boolean;
  moduleStyle: ModuleStyle;
  eyeStyle: EyeStyle;
  /** Quiet zone, in modules. The spec asks for 4; 2 scans fine on most phones. */
  margin: number;
  logo?: string;
  /** Logo width as a fraction of the code's width (0–0.3). */
  logoScale: number;
}

/* -------------------------------------------------------------------------- */
/*                                Matrix                                      */
/* -------------------------------------------------------------------------- */

/**
 * Build the module matrix. qr-image does the encoding (UTF-8, mode/version
 * selection, masking); we draw the SVG ourselves so we control module shapes,
 * eyes and logo excavation.
 *
 * Why not qrcode-svg? Its version picker under-counts header bits, so inputs
 * near a capacity boundary throw "code length overflow" (e.g. a 58-char URL
 * at level H). qr-image sizes correctly and also powers the EPS export, so
 * every format comes from the same encoder.
 */
export function buildMatrix(content: string, ecl: ECLevel): QRMatrix {
  const rows = qrImage.matrix(content, ecl) as number[][];
  const size = rows.length;
  return {
    size,
    version: (size - 17) / 4,
    isDark: (r, c) => rows[r][c] === 1,
  };
}

/** Returns true if (r, c) lies inside one of the three 7×7 finder patterns. */
function inFinder(r: number, c: number, size: number) {
  return (
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
  );
}

/* -------------------------------------------------------------------------- */
/*                                Rendering                                   */
/* -------------------------------------------------------------------------- */

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
}

/** One finder "eye": a 7×7 ring with a 3×3 pupil, drawn with even-odd fill. */
function eyePath(x: number, y: number, style: EyeStyle) {
  if (style === "circle") {
    const cx = x + 3.5,
      cy = y + 3.5;
    const circle = (r: number) =>
      `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0z`;
    return `${circle(3.5)}${circle(2.5)}${circle(1.5)}`;
  }
  const r = style === "rounded" ? 1.6 : 0;
  const ri = style === "rounded" ? 0.9 : 0;
  const rp = style === "rounded" ? 0.8 : 0;
  const rect = (ox: number, oy: number, s: number, rr: number) =>
    rr ? roundedRectPath(ox, oy, s, s, rr) : `M${ox} ${oy}h${s}v${s}h-${s}z`;
  return rect(x, y, 7, r) + rect(x + 1, y + 1, 5, ri) + rect(x + 2, y + 2, 3, rp);
}

export function renderSVG(matrix: QRMatrix, o: RenderOptions): string {
  const { size } = matrix;
  const m = o.margin;
  const total = size + m * 2;

  // Logo box (in module units), snapped to whole modules and kept odd-sized
  // so it stays visually centred on the timing grid.
  let logoBox: { x: number; y: number; s: number } | null = null;
  if (o.logo) {
    let s = Math.round(size * o.logoScale);
    if (s % 2 !== size % 2) s += 1;
    const start = (size - s) / 2;
    logoBox = { x: start, y: start, s };
  }
  const underLogo = (r: number, c: number) =>
    !!logoBox &&
    r >= logoBox.y - 1 &&
    r < logoBox.y + logoBox.s + 1 &&
    c >= logoBox.x - 1 &&
    c < logoBox.x + logoBox.s + 1;

  let body = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!matrix.isDark(r, c) || inFinder(r, c, size) || underLogo(r, c)) continue;
      const x = c + m,
        y = r + m;
      if (o.moduleStyle === "dots") {
        body += `M${x + 0.08} ${y + 0.5}a0.42 0.42 0 1 0 0.84 0a0.42 0.42 0 1 0 -0.84 0z`;
      } else if (o.moduleStyle === "rounded") {
        body += roundedRectPath(x + 0.04, y + 0.04, 0.92, 0.92, 0.3);
      } else {
        body += `M${x} ${y}h1v1h-1z`;
      }
    }
  }

  const eyes =
    eyePath(m, m, o.eyeStyle) +
    eyePath(m + size - 7, m, o.eyeStyle) +
    eyePath(m, m + size - 7, o.eyeStyle);

  let logo = "";
  if (logoBox) {
    const pad = 0.6;
    const lx = logoBox.x + m,
      ly = logoBox.y + m,
      s = logoBox.s;
    const plate = o.transparent ? "#ffffff" : o.bg;
    logo =
      `<rect x="${lx - pad}" y="${ly - pad}" width="${s + pad * 2}" height="${s + pad * 2}" rx="${(s + pad * 2) * 0.18}" fill="${plate}"/>` +
      `<image href="${escapeAttr(o.logo!)}" x="${lx}" y="${ly}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const background = o.transparent
    ? ""
    : `<rect width="${total}" height="${total}" fill="${o.bg}"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="${o.moduleStyle === "square" ? "crispEdges" : "geometricPrecision"}">` +
    background +
    `<path d="${body}" fill="${o.fg}"/>` +
    `<path d="${eyes}" fill="${o.fg}" fill-rule="evenodd"/>` +
    logo +
    `</svg>`
  );
}

/* -------------------------------------------------------------------------- */
/*                                Exporters                                   */
/* -------------------------------------------------------------------------- */

/** Rasterise an SVG string to a PNG blob at `px` × `px`. */
export function svgToPng(svg: string, px: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = px;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas 2D context unavailable"));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, px, px);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
        "image/png"
      );
    };
    img.onerror = () => reject(new Error("Could not load SVG for rasterising"));
    // Explicit width/height so Firefox/Safari rasterise at full resolution.
    const sized = svg.replace("<svg ", `<svg width="${px}" height="${px}" `);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
  });
}

/**
 * Monochrome EPS for print workflows. qr-image's EC level lookup is
 * case-sensitive — passing a lowercase level silently falls back to "M".
 */
export function generateEps(content: string, ecl: ECLevel, margin: number) {
  return qrImage.imageSync(content, { type: "eps", ec_level: ecl, margin });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Turn the payload into a short, filesystem-safe name. */
export function slugify(content: string) {
  const s = content
    .replace(/^(https?:\/\/|mailto:|tel:|smsto:|wifi:)/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .toLowerCase();
  return s ? `qr-${s}` : "qrcode";
}

/* -------------------------------------------------------------------------- */
/*                                Colour                                      */
/* -------------------------------------------------------------------------- */

function luminance(hex: string) {
  const v = hex.replace("#", "");
  const full = v.length === 3 ? v.split("").map((ch) => ch + ch).join("") : v;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Many scanners expect dark-on-light; inverted codes are a common failure. */
export function isInverted(fg: string, bg: string) {
  return luminance(fg) > luminance(bg);
}
