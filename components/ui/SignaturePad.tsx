"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import { RotateCcw } from "lucide-react";

/**
 * Native canvas signature pad — shared between the client-side signing page
 * (`/sign/[token]`) and the artisan signature modal.
 *
 * Rendering quality is tuned for:
 *   - Retina / mobile (devicePixelRatio handled — backing store is sized in
 *     physical pixels, drawing coords stay in CSS units via ctx.scale()).
 *   - Smooth strokes — we buffer pointer samples and draw with
 *     quadraticCurveTo midpoints so the line follows the pen instead of
 *     showing the polygonal artefact of lineTo-per-sample. Without this the
 *     signature looks jagged at any reasonable stroke width.
 *   - PNG export quality — the canvas resolution is the device's, so the
 *     exported toDataURL("image/png") inherits the same sharpness and the
 *     PDF render stays crisp at A4 print sizes.
 *
 * Touch-first: artisans sign on a phone on the jobsite, so the canvas uses
 * `touch-action: none` (CSS) + `e.preventDefault()` on touch events to stop
 * the browser from swallowing the gesture as a scroll.
 *
 * The component is OPTIONALLY controlled via the imperative handle: parents
 * can call `.clear()` / `.isEmpty()` / `.toDataURL()` without re-rendering.
 * Drawing changes are reported via `onSignatureChange(dataUrl | null)` —
 * `null` means "the pad was cleared", a string means "here is a fresh PNG".
 */

interface SignaturePadProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  /** Fallback CSS pixel width when the container has no measurable size yet. */
  width?: number;
  /** Fallback CSS pixel height. The container width drives the actual layout. */
  height?: number;
  /** Stroke color — defaults to a near-black indigo that prints well. */
  strokeColor?: string;
  strokeWidth?: number;
  /** Background — kept transparent by default so the PNG composites cleanly
   *  on top of the PDF "Bon pour accord" cell. */
  backgroundColor?: string;
  /** Faint hint text rendered behind the stroke ("Signez ici" by default). */
  placeholder?: string;
  className?: string;
  /** Hides the inline "Effacer" link when the parent prefers its own toolbar. */
  hideClearButton?: boolean;
}

export interface SignaturePadHandle {
  /** Clear the canvas and notify the parent (`onSignatureChange(null)`). */
  clear: () => void;
  /** True when no stroke has been drawn since the last clear. */
  isEmpty: () => boolean;
  /** Snapshot of the current canvas as PNG data URL (or null when empty). */
  toDataURL: () => string | null;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Get pointer position in CSS pixels (not backing-store pixels). The drawing
 * context is ctx.scale(dpr, dpr)'d on mount so all coords stay in CSS units.
 */
function getEventPos(
  e:
    | React.MouseEvent<HTMLCanvasElement>
    | React.TouchEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): Point {
  const rect = canvas.getBoundingClientRect();
  if ("touches" in e) {
    const touch = e.touches[0] ?? e.changedTouches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad(
    {
      onSignatureChange,
      width = 600,
      height = 180,
      strokeColor = "#1e1b4b",
      strokeWidth = 2.8,
      backgroundColor = "transparent",
      placeholder = "Signez ici",
      className,
      hideClearButton = false,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDrawing = useRef(false);
    const hasSignature = useRef(false);
    // Sample buffer used to smooth a stroke: we draw quadraticCurveTo through
    // the midpoint of consecutive samples so the line stays tangent to the
    // pointer path instead of showing the polygonal lineTo zig-zag.
    const points = useRef<Point[]>([]);

    const getCtx = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      return { canvas, ctx };
    }, []);

    /**
     * Size the canvas backing-store to its CSS box * devicePixelRatio, then
     * scale the context so drawing coords stay in CSS units. Called on mount
     * and whenever the container resizes. Preserves whatever is already drawn
     * by snapshotting before the resize and re-blitting after.
     */
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const cssW =
        container.clientWidth > 0 ? container.clientWidth : width;
      const cssH = height;

      // Snapshot existing strokes so the resize doesn't wipe a partial
      // signature (the canvas clears whenever width/height is reassigned).
      let snapshot: ImageData | null = null;
      const prevCtx = canvas.getContext("2d");
      if (prevCtx && hasSignature.current && canvas.width > 0) {
        try {
          snapshot = prevCtx.getImageData(0, 0, canvas.width, canvas.height);
        } catch {
          snapshot = null;
        }
      }

      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (backgroundColor !== "transparent") {
        ctx.save();
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.restore();
      }

      // We re-blit the snapshot at native resolution (bypassing the dpr
      // scale) so the existing pixels land at their original position. The
      // snapshot's CSS area is the same — only the device resolution
      // potentially changed (rare: only DPR shifts trigger that).
      if (snapshot) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.putImageData(snapshot, 0, 0);
        ctx.restore();
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }, [width, height, strokeColor, strokeWidth, backgroundColor]);

    // Mount + observe container size. ResizeObserver triggers on the parent
    // layout settling (e.g. modal animation finishing) so the first paint
    // doesn't lock the canvas to a stale "0px wide" reading.
    useEffect(() => {
      resizeCanvas();
      const container = containerRef.current;
      if (!container || typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(() => resizeCanvas());
      ro.observe(container);
      return () => ro.disconnect();
    }, [resizeCanvas]);

    /**
     * Start a stroke. We seed the points buffer with the touchdown coord and
     * draw a tiny dot so a single tap registers as a visible mark (otherwise
     * an unmoved tap leaves the canvas blank because draw() needs ≥2 points
     * to emit anything).
     */
    const startDraw = useCallback(
      (
        e:
          | React.MouseEvent<HTMLCanvasElement>
          | React.TouchEvent<HTMLCanvasElement>,
      ) => {
        e.preventDefault();
        const res = getCtx();
        if (!res) return;
        isDrawing.current = true;
        const pos = getEventPos(e, res.canvas);
        points.current = [pos];
        // Dot for single-tap signatures.
        res.ctx.beginPath();
        res.ctx.arc(pos.x, pos.y, strokeWidth / 2, 0, Math.PI * 2);
        res.ctx.fillStyle = strokeColor;
        res.ctx.fill();
      },
      [getCtx, strokeColor, strokeWidth],
    );

    /**
     * Smooth stroke draw: we always draw a quadratic curve from the second-
     * to-last point, through the midpoint of the last two points. This is the
     * classic "midpoint smoothing" trick used by signature_pad and similar
     * libraries. Endpoints look natural because we connect the last segment
     * with a straight lineTo in stopDraw.
     */
    const draw = useCallback(
      (
        e:
          | React.MouseEvent<HTMLCanvasElement>
          | React.TouchEvent<HTMLCanvasElement>,
      ) => {
        if (!isDrawing.current) return;
        e.preventDefault();
        const res = getCtx();
        if (!res) return;
        const pos = getEventPos(e, res.canvas);
        const buf = points.current;
        buf.push(pos);
        if (buf.length < 3) return;
        const last = buf[buf.length - 1];
        const prev = buf[buf.length - 2];
        const prev2 = buf[buf.length - 3];
        const mid1 = { x: (prev2.x + prev.x) / 2, y: (prev2.y + prev.y) / 2 };
        const mid2 = { x: (prev.x + last.x) / 2, y: (prev.y + last.y) / 2 };
        res.ctx.beginPath();
        res.ctx.moveTo(mid1.x, mid1.y);
        res.ctx.quadraticCurveTo(prev.x, prev.y, mid2.x, mid2.y);
        res.ctx.stroke();
        hasSignature.current = true;
      },
      [getCtx],
    );

    const stopDraw = useCallback(() => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const res = getCtx();
      if (res) {
        // Close out the last segment with a straight line to the final
        // sample so the tail of the stroke reaches where the user lifted
        // (the quadratic-midpoint loop stops one sample short).
        const buf = points.current;
        if (buf.length >= 2) {
          const last = buf[buf.length - 1];
          const prev = buf[buf.length - 2];
          const mid = { x: (prev.x + last.x) / 2, y: (prev.y + last.y) / 2 };
          res.ctx.beginPath();
          res.ctx.moveTo(mid.x, mid.y);
          res.ctx.lineTo(last.x, last.y);
          res.ctx.stroke();
          hasSignature.current = true;
        }
        points.current = [];
      }
      const canvas = canvasRef.current;
      if (!canvas || !hasSignature.current) return;
      onSignatureChange?.(canvas.toDataURL("image/png"));
    }, [getCtx, onSignatureChange]);

    // Window-level pointer-up so releasing the mouse off-canvas still ends
    // the stroke cleanly (the previous mouse-only listener missed the
    // off-canvas case and left isDrawing=true).
    useEffect(() => {
      function onUp() {
        if (isDrawing.current) stopDraw();
      }
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      return () => {
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    }, [stopDraw]);

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Wipe the entire backing store (transform-independent clear), then
      // restore the dpr scale + stroke settings since clearRect under the
      // current transform would miss the un-scaled fringe.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      if (backgroundColor !== "transparent") {
        ctx.save();
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      points.current = [];
      hasSignature.current = false;
      onSignatureChange?.(null);
    }, [onSignatureChange, backgroundColor]);

    useImperativeHandle(
      ref,
      () => ({
        clear,
        isEmpty: () => !hasSignature.current,
        toDataURL: () => {
          const canvas = canvasRef.current;
          if (!canvas || !hasSignature.current) return null;
          return canvas.toDataURL("image/png");
        },
      }),
      [clear],
    );

    const canvasStyle: CSSProperties = { touchAction: "none" };

    return (
      <div className={className ?? "space-y-2"}>
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/30"
          style={{ height }}
        >
          <canvas
            ref={canvasRef}
            style={canvasStyle}
            className="block w-full cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
            onTouchCancel={stopDraw}
          />
          {placeholder && (
            <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-sm font-medium text-indigo-300">
              {placeholder}
            </p>
          )}
        </div>
        {!hideClearButton && (
          <button
            type="button"
            onClick={clear}
            className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="h-3 w-3" />
            Effacer
          </button>
        )}
      </div>
    );
  },
);
