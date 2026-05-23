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

// Native pointer-up listener attached to the window. Without it, releasing the
// mouse OUTSIDE the canvas (very common on desktop — the cursor drifts off the
// pad while drawing the last stroke) leaves `isDrawing.current = true` and the
// next mousedown extends the previous stroke with a stray line back to where
// the previous one ended. Mirrors what react-signature-canvas does internally.

/**
 * Native canvas signature pad — shared between the client-side signing page
 * (`/sign/[token]`) and the artisan signature modal. We deliberately avoid
 * `react-signature-canvas` and friends; the dependency is overkill for the
 * 60 lines of logic we need and would inflate the bundle on a hot path.
 *
 * Touch-first: artisans sign on a phone on the jobsite, so the canvas uses
 * `touch-action: none` (CSS) + `e.preventDefault()` on touch events to stop
 * the browser from swallowing the gesture as a scroll.
 *
 * The component is OPTIONALLY controlled via the imperative handle: parents
 * can call `.clear()` and `.isEmpty()` without re-rendering. Drawing changes
 * are reported via `onSignatureChange(dataUrl | null)` — `null` means "the
 * pad was cleared", a string means "here is a fresh PNG data URL".
 */

interface SignaturePadProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  /** Canvas backing-store size in pixels. CSS width is 100% of the parent so
   *  the stroke quality stays sharp regardless of the visual size. */
  width?: number;
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

function getEventPos(
  e:
    | React.MouseEvent<HTMLCanvasElement>
    | React.TouchEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  if ("touches" in e) {
    const touch = e.touches[0] ?? e.changedTouches[0];
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
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
    const isDrawing = useRef(false);
    const hasSignature = useRef(false);

    const getCtx = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      return { canvas, ctx };
    }, [strokeColor, strokeWidth]);

    // Paint the background once on mount so PNG exports don't ship with a
    // transparent fill when the caller asked for a solid color.
    useEffect(() => {
      const res = getCtx();
      if (!res || backgroundColor === "transparent") return;
      res.ctx.save();
      res.ctx.fillStyle = backgroundColor;
      res.ctx.fillRect(0, 0, res.canvas.width, res.canvas.height);
      res.ctx.restore();
    }, [getCtx, backgroundColor]);

    const startDraw = useCallback(
      (
        e:
          | React.MouseEvent<HTMLCanvasElement>
          | React.TouchEvent<HTMLCanvasElement>,
      ) => {
        // Stop the browser from interpreting the touch as a scroll/zoom.
        // `touch-action: none` covers most of it but Safari still fires
        // ghost scrolls without preventDefault here.
        e.preventDefault();
        const res = getCtx();
        if (!res) return;
        isDrawing.current = true;
        const pos = getEventPos(e, res.canvas);
        res.ctx.beginPath();
        res.ctx.moveTo(pos.x, pos.y);
      },
      [getCtx],
    );

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
        res.ctx.lineTo(pos.x, pos.y);
        res.ctx.stroke();
        hasSignature.current = true;
      },
      [getCtx],
    );

    const stopDraw = useCallback(() => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const canvas = canvasRef.current;
      if (!canvas || !hasSignature.current) return;
      // Lazy notify: parents that don't need live previews can leave the
      // callback off and pull a frame via toDataURL() at submit time.
      onSignatureChange?.(canvas.toDataURL("image/png"));
    }, [onSignatureChange]);

    // Window-level pointer-up so releasing the mouse off-canvas still ends
    // the stroke cleanly. Without this, drifting off the pad on the final
    // pen lift left isDrawing=true and the next mousedown drew a phantom
    // line from the previous endpoint to the new starting point.
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
      const res = getCtx();
      if (!res) return;
      res.ctx.clearRect(0, 0, res.canvas.width, res.canvas.height);
      if (backgroundColor !== "transparent") {
        res.ctx.save();
        res.ctx.fillStyle = backgroundColor;
        res.ctx.fillRect(0, 0, res.canvas.width, res.canvas.height);
        res.ctx.restore();
      }
      hasSignature.current = false;
      onSignatureChange?.(null);
    }, [getCtx, onSignatureChange, backgroundColor]);

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

    const canvasStyle: CSSProperties = {
      touchAction: "none",
    };

    return (
      <div className={className ?? "space-y-2"}>
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/30">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={canvasStyle}
            className="w-full cursor-crosshair"
            // No onMouseLeave — the window-level pointerup listener handles
            // pen-lift outside the canvas without prematurely cutting a
            // stroke that briefly grazes the border on a fast scribble.
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
