import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  AlertTriangle,
  Check,
  Clipboard,
  Code2,
  Download,
  FileArchive,
  Github,
  Globe,
  ImagePlus,
  Link2,
  Mail,
  MessageSquare,
  Origami,
  Palette,
  Phone,
  RotateCcw,
  ScanLine,
  Settings2,
  ShieldCheck,
  Trash2,
  Type,
  Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/ui/darkmodemenu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ColorField,
  Field,
  Section,
  Segmented,
  Slider,
  textareaClass,
} from "@/components/controls";
import { buildPayload, emptyFields, type ContentType, type PayloadFields } from "@/lib/payload";
import {
  buildMatrix,
  contrastRatio,
  downloadBlob,
  generateEps,
  isInverted,
  renderSVG,
  slugify,
  svgToPng,
  type ECLevel,
  type EyeStyle,
  type ModuleStyle,
} from "@/lib/qr";
import { cn } from "@/lib/utils";

const CONTENT_TYPES: { value: ContentType; label: string; icon: typeof Link2 }[] = [
  { value: "url", label: "Link", icon: Link2 },
  { value: "text", label: "Text", icon: Type },
  { value: "wifi", label: "Wi-Fi", icon: Wifi },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Call", icon: Phone },
  { value: "sms", label: "SMS", icon: MessageSquare },
];

const EC_LEVELS: { value: ECLevel; recovery: string; hint: string }[] = [
  { value: "L", recovery: "7%", hint: "Smallest code. Clean, digital-only use." },
  { value: "M", recovery: "15%", hint: "Balanced default for most prints." },
  { value: "Q", recovery: "25%", hint: "Industrial labels, rough surfaces." },
  { value: "H", recovery: "30%", hint: "Best with a logo or for outdoor wear." },
];

const PRESETS = [
  { name: "Ink", fg: "#0a0a0a", bg: "#ffffff" },
  { name: "Ocean", fg: "#1e3a8a", bg: "#eff6ff" },
  { name: "Forest", fg: "#065f46", bg: "#ecfdf5" },
  { name: "Ember", fg: "#9a3412", bg: "#fff7ed" },
  { name: "Grape", fg: "#581c87", bg: "#faf5ff" },
  { name: "Rose", fg: "#be123c", bg: "#fff1f2" },
  { name: "Slate", fg: "#0f172a", bg: "#e2e8f0" },
];

const EXPORT_SIZES = [512, 1024, 2048, 4096] as const;

const DEFAULT_STYLE = {
  fg: "#0a0a0a",
  bg: "#ffffff",
  transparent: false,
  moduleStyle: "square" as ModuleStyle,
  eyeStyle: "square" as EyeStyle,
  margin: 4,
};

type Toast = { kind: "ok" | "err"; text: string } | null;

function App() {
  /* ----------------------------- content state ----------------------------- */
  const [type, setType] = useState<ContentType>("url");
  const [fields, setFields] = useState<PayloadFields>(emptyFields);
  const set = <K extends keyof PayloadFields>(k: K, v: PayloadFields[K]) =>
    setFields((f) => ({ ...f, [k]: v }));

  /* ------------------------------ style state ------------------------------ */
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const patch = (p: Partial<typeof DEFAULT_STYLE>) => setStyle((s) => ({ ...s, ...p }));
  const [ecl, setEcl] = useState<ECLevel>("M");
  const [logo, setLogo] = useState<{ uri: string; name: string } | null>(null);
  const [logoScale, setLogoScale] = useState(0.22);
  const [exportSize, setExportSize] = useState<(typeof EXPORT_SIZES)[number]>(2048);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number>();

  /* ------------------------------ derivations ------------------------------ */
  // Deferred so typing stays snappy even when long payloads re-render the code.
  const payload = useDeferredValue(buildPayload(type, fields));

  const result = useMemo(() => {
    if (!payload) return null;
    try {
      const matrix = buildMatrix(payload, ecl);
      const svg = renderSVG(matrix, { ...style, logo: logo?.uri, logoScale });
      return { matrix, svg, error: null as string | null };
    } catch {
      return {
        matrix: null,
        svg: "",
        error:
          "That's more data than a QR code can hold at this error-correction level. Shorten it or lower the level.",
      };
    }
  }, [payload, ecl, style, logo, logoScale]);

  // Preview through <img> rather than injecting markup: the browser renders
  // SVG-as-image in a sandbox (no scripts, no DOM access).
  const previewSrc = useMemo(
    () => (result?.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}` : ""),
    [result]
  );

  const bytes = useMemo(() => new TextEncoder().encode(payload).length, [payload]);
  const contrast = contrastRatio(style.fg, style.bg);
  const warnings: string[] = [];
  if (!style.transparent && contrast < 4)
    warnings.push(`Low contrast (${contrast.toFixed(1)}:1). Aim for 4:1 or more so it scans reliably.`);
  if (!style.transparent && isInverted(style.fg, style.bg))
    warnings.push("Light-on-dark codes aren't supported by some older scanners.");
  if (logo && (ecl === "L" || ecl === "M"))
    warnings.push("A logo hides data. Use error correction Q or H.");
  if (style.margin < 2) warnings.push("A quiet zone under 2 modules can stop phones finding the code.");

  /* -------------------------------- helpers -------------------------------- */
  const flash = useCallback((t: NonNullable<Toast>) => {
    setToast(t);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const loadLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return flash({ kind: "err", text: "That file isn't an image." });
    const reader = new FileReader();
    reader.onload = () => {
      setLogo({ uri: reader.result as string, name: file.name });
      // A centred logo destroys modules; bump error correction so it still scans.
      setEcl((l) => (l === "L" || l === "M" ? "H" : l));
    };
    reader.readAsDataURL(file);
  };

  const name = slugify(payload);

  const run = async (label: string, fn: () => Promise<void>) => {
    if (!result?.svg) return;
    setBusy(true);
    try {
      await fn();
      flash({ kind: "ok", text: label });
    } catch (e) {
      flash({ kind: "err", text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  };

  const downloadPng = () =>
    run(`Saved ${name}.png`, async () => downloadBlob(await svgToPng(result!.svg, exportSize), `${name}.png`));

  const downloadSvg = () =>
    run(`Saved ${name}.svg`, async () =>
      downloadBlob(new Blob([result!.svg], { type: "image/svg+xml" }), `${name}.svg`)
    );

  const downloadZip = () =>
    run(`Saved ${name}.zip`, async () => {
      const zip = new JSZip();
      zip.file(`${name}.svg`, result!.svg);
      zip.file(`${name}.png`, await svgToPng(result!.svg, exportSize));
      zip.file(`${name}.eps`, generateEps(payload, ecl, style.margin));
      zip.file(
        "README.txt",
        [
          `Payload: ${payload}`,
          `Error correction: ${ecl}`,
          `Version: ${result!.matrix!.version} (${result!.matrix!.size}x${result!.matrix!.size} modules)`,
          `PNG: ${exportSize}x${exportSize}px`,
          "",
          "The EPS is monochrome (black on white) for print shops and does not include the logo or styling.",
        ].join("\n")
      );
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${name}.zip`);
    });

  const copyPng = () =>
    run("PNG copied to clipboard", async () => {
      // Passing the promise (not the resolved blob) keeps Safari's user-gesture check happy.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": svgToPng(result!.svg, 1024) })]);
    });

  const copySvg = () => run("SVG markup copied", () => navigator.clipboard.writeText(result!.svg));

  // ⌘/Ctrl+S → PNG download
  const pngRef = useRef(downloadPng);
  pngRef.current = downloadPng;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        pngRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const disabled = !result?.svg || busy;

  /* --------------------------------- view ---------------------------------- */
  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative min-h-screen">
        <div aria-hidden className="bg-grid pointer-events-none fixed inset-0 -z-10" />

        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/75 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Origami className="size-4" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">Quick Response Codes</p>
                <p className="hidden text-[11px] text-muted-foreground sm:block">Private, in-browser QR generator</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground md:flex">
                <ShieldCheck className="size-3.5 text-emerald-500" /> Nothing leaves your device
              </span>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://github.com/inkincaps/utils.qr" target="_blank" rel="noreferrer" aria-label="Source on GitHub">
                  <Github />
                </a>
              </Button>
              <ModeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6 lg:py-10">
          {/* ------------------------------ Editor ------------------------------ */}
          {/* `contents` on mobile lets the preview slot in right after Content. */}
          <div className="contents lg:block lg:space-y-5">
            <div className="order-1 lg:mb-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Make a QR code</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick what it should do, style it, then export PNG, SVG or a print-ready bundle.
              </p>
            </div>

            <Section className="order-2" icon={Globe} title="Content" description="What happens when someone scans it.">
              <div role="tablist" aria-label="Content type" className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {CONTENT_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    role="tab"
                    aria-selected={type === value}
                    onClick={() => setType(value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      type === value
                        ? "border-foreground/80 bg-foreground text-background shadow"
                        : "bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {type === "url" && (
                  <Field id="url" label="Website or link" hint="Bare domains get https:// added automatically.">
                    <Input id="url" autoFocus inputMode="url" placeholder="inkincaps.com" value={fields.url} onChange={(e) => set("url", e.target.value)} />
                  </Field>
                )}
                {type === "text" && (
                  <Field id="text" label="Plain text" hint="Shown as text in the scanner app. Emoji and non-Latin scripts work.">
                    <textarea id="text" className={textareaClass} placeholder="Wow, such blank. Much creativity." value={fields.text} onChange={(e) => set("text", e.target.value)} />
                  </Field>
                )}
                {type === "wifi" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="ssid" label="Network name (SSID)">
                      <Input id="ssid" placeholder="Studio-5G" value={fields.wifiSsid} onChange={(e) => set("wifiSsid", e.target.value)} />
                    </Field>
                    <Field id="wifipass" label="Password">
                      <Input
                        id="wifipass"
                        type="text"
                        autoComplete="off"
                        disabled={fields.wifiSecurity === "nopass"}
                        placeholder={fields.wifiSecurity === "nopass" ? "Open network" : "••••••••"}
                        value={fields.wifiPassword}
                        onChange={(e) => set("wifiPassword", e.target.value)}
                      />
                    </Field>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium">Security</span>
                      <Segmented
                        label="Wi-Fi security"
                        value={fields.wifiSecurity}
                        onChange={(v) => set("wifiSecurity", v)}
                        options={[
                          { value: "WPA", label: "WPA/WPA2/3" },
                          { value: "WEP", label: "WEP" },
                          { value: "nopass", label: "None" },
                        ]}
                      />
                    </div>
                    <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium">
                      <input type="checkbox" className="size-4 accent-foreground" checked={fields.wifiHidden} onChange={(e) => set("wifiHidden", e.target.checked)} />
                      Hidden network
                    </label>
                  </div>
                )}
                {type === "email" && (
                  <div className="grid gap-4">
                    <Field id="emailto" label="To">
                      <Input id="emailto" type="email" placeholder="hello@inkincaps.com" value={fields.emailTo} onChange={(e) => set("emailTo", e.target.value)} />
                    </Field>
                    <Field id="subject" label="Subject">
                      <Input id="subject" placeholder="Project enquiry" value={fields.emailSubject} onChange={(e) => set("emailSubject", e.target.value)} />
                    </Field>
                    <Field id="body" label="Message">
                      <textarea id="body" className={textareaClass} value={fields.emailBody} onChange={(e) => set("emailBody", e.target.value)} />
                    </Field>
                  </div>
                )}
                {type === "phone" && (
                  <Field id="phone" label="Phone number" hint="Include the country code, e.g. +91 98765 43210.">
                    <Input id="phone" type="tel" placeholder="+91 98765 43210" value={fields.phone} onChange={(e) => set("phone", e.target.value)} />
                  </Field>
                )}
                {type === "sms" && (
                  <div className="grid gap-4">
                    <Field id="smsnum" label="Phone number">
                      <Input id="smsnum" type="tel" placeholder="+91 98765 43210" value={fields.smsNumber} onChange={(e) => set("smsNumber", e.target.value)} />
                    </Field>
                    <Field id="smsmsg" label="Pre-filled message">
                      <textarea id="smsmsg" className={textareaClass} value={fields.smsMessage} onChange={(e) => set("smsMessage", e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>
            </Section>

            <Section
              className="order-4"
              icon={Palette}
              title="Style"
              description="Shapes and colours. Keep it dark-on-light for the best scan rate."
              action={
                <Button variant="ghost" size="sm" onClick={() => setStyle(DEFAULT_STYLE)}>
                  <RotateCcw /> Reset
                </Button>
              }
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium">Modules</span>
                  <Segmented
                    label="Module shape"
                    value={style.moduleStyle}
                    onChange={(v) => patch({ moduleStyle: v })}
                    options={[
                      { value: "square", label: <><ShapeIcon kind="square" /> Square</> },
                      { value: "rounded", label: <><ShapeIcon kind="rounded" /> Rounded</> },
                      { value: "dots", label: <><ShapeIcon kind="dots" /> Dots</> },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium">Corner eyes</span>
                  <Segmented
                    label="Eye shape"
                    value={style.eyeStyle}
                    onChange={(v) => patch({ eyeStyle: v })}
                    options={[
                      { value: "square", label: <><ShapeIcon kind="square" /> Square</> },
                      { value: "rounded", label: <><ShapeIcon kind="rounded" /> Soft</> },
                      { value: "circle", label: <><ShapeIcon kind="dots" /> Circle</> },
                    ]}
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className="text-xs font-medium">Presets</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PRESETS.map((p) => {
                      const active = p.fg === style.fg && p.bg === style.bg;
                      return (
                        <Tooltip key={p.name}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={`${p.name} preset`}
                              aria-pressed={active}
                              onClick={() => patch({ fg: p.fg, bg: p.bg, transparent: false })}
                              className={cn(
                                "relative size-9 overflow-hidden rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                active ? "border-foreground" : "border-transparent ring-1 ring-border"
                              )}
                              style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.fg} 50%)` }}
                            >
                              {active && <Check className="absolute inset-0 m-auto size-3.5 text-white mix-blend-difference" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{p.name}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                <ColorField id="fg" label="Foreground" value={style.fg} onChange={(fg) => patch({ fg })} />
                <ColorField id="bg" label="Background" value={style.bg} onChange={(bg) => patch({ bg })} disabled={style.transparent} />

                <label className="flex items-center gap-2 text-xs font-medium sm:col-span-2">
                  <input type="checkbox" className="size-4 accent-foreground" checked={style.transparent} onChange={(e) => patch({ transparent: e.target.checked })} />
                  Transparent background (SVG &amp; PNG)
                </label>
              </div>
            </Section>

            <Section
              className="order-4"
              icon={ImagePlus}
              title="Logo"
              description="Optional. Modules under the logo are cleared so it sits on a clean plate."
              action={
                logo && (
                  <Button variant="ghost" size="sm" onClick={() => setLogo(null)}>
                    <Trash2 /> Remove
                  </Button>
                )
              }
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  loadLogo(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  loadLogo(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex w-full items-center gap-4 rounded-lg border border-dashed p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  dragging ? "border-foreground bg-accent" : "hover:border-foreground/40 hover:bg-accent/50"
                )}
              >
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border bg-background">
                  {logo ? <img src={logo.uri} alt="" className="size-full object-contain p-1" /> : <ImagePlus className="size-5 text-muted-foreground" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{logo ? logo.name : "Drop an image or click to upload"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {logo ? "Click to replace" : "PNG, SVG, JPG or WebP. Square images look best."}
                  </span>
                </span>
              </button>
              {logo && (
                <div className="mt-4">
                  <Slider id="logoScale" label="Logo size" min={0.12} max={0.3} step={0.01} value={logoScale} onChange={setLogoScale} format={(v) => `${Math.round(v * 100)}%`} />
                </div>
              )}
            </Section>

            <Section className="order-4" icon={Settings2} title="Advanced" description="Error correction, quiet zone and export resolution.">
              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="text-xs font-medium">Error correction</span>
                  <div role="radiogroup" aria-label="Error correction level" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {EC_LEVELS.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        role="radio"
                        aria-checked={ecl === l.value}
                        onClick={() => setEcl(l.value)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          ecl === l.value ? "border-foreground bg-accent shadow-sm" : "hover:border-foreground/30"
                        )}
                      >
                        <span className="flex items-baseline justify-between">
                          <span className="font-mono text-base font-semibold">{l.value}</span>
                          <span className="text-[11px] text-muted-foreground">{l.recovery}</span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{l.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Slider id="margin" label="Quiet zone" min={0} max={8} value={style.margin} onChange={(margin) => patch({ margin })} format={(v) => `${v} module${v === 1 ? "" : "s"}`} />
                  <div className="space-y-2">
                    <span className="text-xs font-medium">PNG size</span>
                    <Segmented
                      label="PNG export size"
                      value={String(exportSize)}
                      onChange={(v) => setExportSize(Number(v) as typeof exportSize)}
                      options={EXPORT_SIZES.map((s) => ({ value: String(s), label: s >= 1024 ? `${s / 1024}K` : `${s}`, title: `${s}×${s}px` }))}
                    />
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* ------------------------------ Preview ----------------------------- */}
          <aside className="order-3 lg:sticky lg:top-20 lg:order-none lg:self-start">
            <div className="rounded-2xl border bg-card p-5 shadow-lg shadow-black/5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ScanLine className="size-4" /> Live preview
                </h2>
                {result?.matrix && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Ready to scan
                  </span>
                )}
              </div>

              <div
                className={cn("relative grid aspect-square place-items-center overflow-hidden rounded-xl border", style.transparent && "bg-checker")}
                style={style.transparent || !previewSrc ? undefined : { background: style.bg }}
              >
                {previewSrc ? (
                  <img src={previewSrc} alt={`QR code for ${payload}`} className="qr-pop size-full" draggable={false} />
                ) : (
                  <EmptyState error={result?.error} />
                )}
              </div>

              {result?.matrix && (
                <dl className="mt-4 grid grid-cols-4 divide-x rounded-lg border text-center">
                  <Stat label="Version" value={result.matrix.version} />
                  <Stat label="Grid" value={`${result.matrix.size}²`} />
                  <Stat label="Bytes" value={bytes} />
                  <Stat label="ECC" value={ecl} />
                </dl>
              )}

              {warnings.length > 0 && result?.matrix && (
                <ul className="mt-3 space-y-1.5">
                  {warnings.map((w) => (
                    <li key={w} className="flex gap-2 rounded-md bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="mt-px size-3.5 shrink-0" /> {w}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button className="col-span-2 h-10" disabled={disabled} onClick={downloadPng}>
                  <Download /> Download PNG
                  <kbd className="ml-auto hidden rounded border border-primary-foreground/20 px-1.5 font-mono text-[10px] opacity-70 sm:inline">⌘S</kbd>
                </Button>
                <Button variant="outline" disabled={disabled} onClick={downloadSvg}>
                  <Code2 /> SVG
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" disabled={disabled} onClick={downloadZip}>
                      <FileArchive /> ZIP bundle
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>SVG + PNG + print EPS</TooltipContent>
                </Tooltip>
                <Button variant="ghost" size="sm" disabled={disabled} onClick={copyPng}>
                  <Clipboard /> Copy image
                </Button>
                <Button variant="ghost" size="sm" disabled={disabled} onClick={copySvg}>
                  <Code2 /> Copy SVG
                </Button>
              </div>

              {payload && (
                <details className="mt-4 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                  <summary className="cursor-pointer select-none font-medium text-muted-foreground">Encoded payload</summary>
                  <code className="mt-2 block break-all font-mono text-[11px]">{payload}</code>
                </details>
              )}
            </div>
          </aside>
        </main>

        <footer className="mx-auto max-w-6xl px-6 pb-10 text-center text-xs text-muted-foreground">
          Built by{" "}
          <a className="underline-offset-4 hover:underline" href="https://github.com/inkincaps" target="_blank" rel="noreferrer">
            Inkincaps
          </a>{" "}
          · Open source on GitHub
        </footer>

        {/* Toast */}
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          {toast && (
            <div
              className={cn(
                "toast-in flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur",
                toast.kind === "ok" ? "bg-background/90" : "border-destructive/40 bg-destructive/10 text-destructive"
              )}
            >
              {toast.kind === "ok" ? <Check className="size-4 text-emerald-500" /> : <AlertTriangle className="size-4" />}
              {toast.text}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function EmptyState({ error }: { error?: string | null }) {
  if (error)
    return (
      <div className="max-w-[260px] p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 size-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  return (
    <div className="p-6 text-center text-muted-foreground">
      <svg viewBox="0 0 29 29" className="mx-auto mb-4 size-28 opacity-25" aria-hidden>
        {[[0, 0], [22, 0], [0, 22]].map(([x, y]) => (
          <path key={`${x}-${y}`} fillRule="evenodd" fill="currentColor" d={`M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`} />
        ))}
        {Array.from({ length: 70 }, (_, i) => {
          const x = 8 + ((i * 7) % 13);
          const y = 1 + ((i * 11) % 27);
          return <rect key={i} x={x} y={y} width="1" height="1" fill="currentColor" />;
        })}
      </svg>
      <p className="text-sm font-medium">Your code appears here</p>
      <p className="mt-1 text-xs opacity-70">Start typing on the left</p>
    </div>
  );
}

function ShapeIcon({ kind }: { kind: "square" | "rounded" | "dots" }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
      {[0, 6].flatMap((x) =>
        [0, 6].map((y) =>
          kind === "dots" ? (
            <circle key={`${x}-${y}`} cx={x + 2.75} cy={y + 2.75} r="2.4" fill="currentColor" />
          ) : (
            <rect key={`${x}-${y}`} x={x + 0.25} y={y + 0.25} width="5" height="5" rx={kind === "rounded" ? 1.6 : 0} fill="currentColor" />
          )
        )
      )}
    </svg>
  );
}

export default App;
