import { useCallback, useEffect, useRef, useState } from "react";
import type { StrokePath } from "../session/gradeKanjiAnswer";

export interface KanjiStrokeCanvasProps {
  character: string;
  svgPaths: string[];
  onStrokesChange: (strokes: StrokePath[]) => void;
  disabled?: boolean;
}

export function KanjiStrokeCanvas({
  character,
  svgPaths,
  onStrokesChange,
  disabled = false,
}: KanjiStrokeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<StrokePath[]>([]);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  const CANVAS_WIDTH = 200;
  const CANVAS_HEIGHT = 200;
  const STROKE_WIDTH = 3;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setContext(ctx);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    drawGuidePaths(ctx);
    redrawStrokes(ctx, strokes);
  }, [strokes]);

  function drawGuidePaths(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;

    for (const pathData of svgPaths) {
      const points = parseSvgPath(pathData ?? "");
      if (points.length === 0) continue;

      ctx.beginPath();
      ctx.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i]?.x ?? 0, points[i]?.y ?? 0);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function parseSvgPath(pathData: string): Array<{ x: number; y: number }> {
    const points = [];
    const regex = /(\d+(?:\.\d+)?)/g;
    const matches = pathData.match(regex) ?? [];

    for (let i = 0; i < matches.length; i += 2) {
      const x = parseFloat(matches[i] ?? "0");
      const y = parseFloat(matches[i + 1] ?? "0");

      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        points.push({ x, y });
      }
    }

    return points;
  }

  function redrawStrokes(
    ctx: CanvasRenderingContext2D,
    strokeList: StrokePath[],
  ) {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = STROKE_WIDTH;

    for (const stroke of strokeList) {
      if (stroke.points.length === 0) continue;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0]?.x ?? 0, stroke.points[0]?.y ?? 0);

      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        ctx.lineTo(point?.x ?? 0, point?.y ?? 0);
      }

      ctx.stroke();
    }
  }

  const handleMouseDown = useCallback(() => {
    if (disabled) return;
    setIsDrawing(true);
  }, [disabled]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !context || disabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const lastStroke = strokes[strokes.length - 1];
      const lastPoint = lastStroke?.points[lastStroke.points.length - 1] ?? {
        x,
        y,
      };

      if (context) {
        context.beginPath();
        context.moveTo(lastPoint?.x ?? 0, lastPoint?.y ?? 0);
        context.lineTo(x, y);
        context.stroke();
      }

      setStrokes((prev) => {
        const newStrokes = [...prev];
        if (newStrokes.length === 0) {
          newStrokes.push({
            points: [{ x, y }],
            timestamp: Date.now(),
          });
        } else {
          const lastStr = newStrokes[newStrokes.length - 1];
          if (lastStr) {
            lastStr.points.push({ x, y });
          }
        }
        return newStrokes;
      });
    },
    [isDrawing, context, strokes, disabled],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const newStrokes = [...strokes];
    if (newStrokes.length > 0) {
      const lastStroke = newStrokes[newStrokes.length - 1];
      if (lastStroke) {
        lastStroke.timestamp = Date.now();
      }
    }

    onStrokesChange(newStrokes);
  }, [isDrawing, strokes, onStrokesChange]);

  const handleMouseLeave = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      const newStrokes = [...strokes];
      if (newStrokes.length > 0) {
        const lastStroke = newStrokes[newStrokes.length - 1];
        if (lastStroke) {
          lastStroke.timestamp = Date.now();
        }
      }
      onStrokesChange(newStrokes);
    }
  }, [isDrawing, strokes, onStrokesChange]);

  function handleReset() {
    setStrokes([]);
    onStrokesChange([]);

    const canvas = canvasRef.current;
    if (!canvas || !context) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.strokeStyle = "#000";
    context.lineWidth = STROKE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";

    drawGuidePaths(context);
  }

  return (
    <div className="kanji-stroke-container">
      <div className="kanji-display">
        <span className="kanji-character">{character}</span>
        <p className="kanji-stroke-count">({svgPaths.length} strokes)</p>
      </div>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={`kanji-canvas ${disabled ? "kanji-canvas--disabled" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        <p className="canvas-hint">
          {disabled ? "Reviewing..." : `Strokes: ${strokes.length}`}
        </p>
      </div>
      <button
        className="secondary-button"
        type="button"
        onClick={handleReset}
        disabled={disabled || strokes.length === 0}
      >
        Clear
      </button>
    </div>
  );
}
