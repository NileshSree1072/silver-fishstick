import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const clampPoint = (value, min, max) => Math.max(min, Math.min(max, value));

const toCanvasPoint = (event, canvas) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
};

const drawStroke = (ctx, stroke) => {
  if (!stroke?.points?.length) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.tool === 'marker' ? 'color-mix(in srgb, var(--warning) 45%, transparent)' : 'var(--danger)';
  ctx.fillStyle = 'color-mix(in srgb, var(--danger) 15%, transparent)';
  ctx.lineWidth = stroke.tool === 'marker' ? 18 : 5;

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    ctx.beginPath();
    ctx.arc(point.x, point.y, stroke.tool === 'marker' ? 9 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  stroke.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
  ctx.restore();
};

const drawCircle = (ctx, shape, preview = false) => {
  const width = shape.x2 - shape.x1;
  const height = shape.y2 - shape.y1;
  const centerX = shape.x1 + width / 2;
  const centerY = shape.y1 + height / 2;
  const radius = Math.max(Math.abs(width), Math.abs(height)) / 2;

  ctx.save();
  ctx.strokeStyle = preview ? 'color-mix(in srgb, var(--danger) 70%, transparent)' : 'var(--danger)';
  ctx.fillStyle = 'color-mix(in srgb, var(--danger) 8%, transparent)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

const ImageMarkupEditor = ({ open, file, onClose, onSave, actionLabel = 'Save edited image', title = 'Edit image before sending' }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileUrlRef = useRef('');
  const [tool, setTool] = useState('pen');
  const [annotations, setAnnotations] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [currentCircle, setCurrentCircle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isImage = useMemo(() => {
    if (!file) return false;
    if (file.type?.startsWith('image/')) return true;
    const ext = file.name?.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  }, [file]);

  useEffect(() => {
    if (!open || !file) return undefined;

    setLoading(true);
    setAnnotations([]);
    setCurrentStroke(null);
    setCurrentCircle(null);
    setTool('pen');

    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    const image = new Image();
    imageRef.current = image;

    image.onload = () => {
      const maxWidth = 1100;
      const maxHeight = 760;
      const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
      setCanvasSize({
        width: Math.max(320, Math.round(image.naturalWidth * scale)),
        height: Math.max(240, Math.round(image.naturalHeight * scale)),
      });
      setLoading(false);
    };

    image.onerror = () => setLoading(false);
    image.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !canvasSize.width || !canvasSize.height) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    annotations.forEach((annotation) => {
      if (annotation.type === 'stroke') {
        drawStroke(ctx, annotation);
      }
      if (annotation.type === 'circle') {
        drawCircle(ctx, annotation);
      }
    });

    if (currentStroke) {
      drawStroke(ctx, currentStroke);
    }
    if (currentCircle) {
      drawCircle(ctx, currentCircle, true);
    }
  }, [annotations, currentStroke, currentCircle, canvasSize]);

  const startDraw = (event) => {
    if (!canvasRef.current) return;
    const point = toCanvasPoint(event, canvasRef.current);

    if (tool === 'pen' || tool === 'marker') {
      setCurrentStroke({ type: 'stroke', tool, points: [point] });
      return;
    }

    setCurrentCircle({ type: 'circle', x1: point.x, y1: point.y, x2: point.x, y2: point.y });
  };

  const moveDraw = (event) => {
    if (!canvasRef.current) return;
    const point = toCanvasPoint(event, canvasRef.current);

    if (currentStroke) {
      setCurrentStroke((prev) => prev ? { ...prev, points: [...prev.points, point] } : prev);
    }
    if (currentCircle) {
      setCurrentCircle((prev) => prev ? { ...prev, x2: point.x, y2: point.y } : prev);
    }
  };

  const finishDraw = () => {
    if (currentStroke) {
      setAnnotations((prev) => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
    if (currentCircle) {
      setAnnotations((prev) => [...prev, currentCircle]);
      setCurrentCircle(null);
    }
  };

  const undoLast = () => setAnnotations((prev) => prev.slice(0, -1));
  const clearAll = () => {
    setAnnotations([]);
    setCurrentStroke(null);
    setCurrentCircle(null);
  };

  const saveEditedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onSave(blob, file?.name || 'edited-image.png');
    }, 'image/png');
  };

  if (!open || !file || !isImage) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-outline-variant/30 bg-surface-container-low">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-on-surface">{title}</p>
            <p className="text-[10px] uppercase tracking-wide text-on-surface-variant font-mono truncate">{file.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-surface-container-highest cursor-pointer text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-0">
          <div className="border-b lg:border-b-0 lg:border-r border-outline-variant/30 bg-surface-container-low p-4 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant mb-2">Tools</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pen', label: 'Pen', icon: 'edit' },
                  { id: 'marker', label: 'Marker', icon: 'draw' },
                  { id: 'circle', label: 'Circle', icon: 'circle' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTool(item.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-[10px] font-semibold cursor-pointer transition-all ${tool === item.id ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-background text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant mb-2">Edit actions</p>
              <div className="space-y-2">
                <button type="button" onClick={undoLast} disabled={!annotations.length} className="w-full flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-background px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-[16px]">undo</span>
                  Undo last edit
                </button>
                <button type="button" onClick={clearAll} disabled={!annotations.length} className="w-full flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-background px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Clear all marks
                </button>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-on-surface-variant">
              Draw directly on the image and send the edited version without saving a local file. Circles and pen marks are kept in memory only.
            </p>
          </div>

          <div className="bg-black/95 p-3 flex items-center justify-center overflow-auto" style={{ minHeight: '65vh' }}>
            {loading ? (
              <div className="flex items-center gap-2 text-white/70 text-sm py-20">
                <span className="material-symbols-outlined animate-pulse">progress_activity</span>
                Loading image...
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={canvasSize.width || 1}
                height={canvasSize.height || 1}
                className="max-w-full max-h-[72vh] rounded-lg bg-white touch-none"
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={finishDraw}
                onPointerLeave={finishDraw}
                onPointerCancel={finishDraw}
                style={{ width: canvasSize.width || '100%', height: canvasSize.height || 'auto', cursor: tool === 'circle' ? 'crosshair' : 'pen' }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-outline-variant/30 bg-surface-container-low">
          <p className="text-[10px] uppercase tracking-wide text-on-surface-variant font-mono">Use pen or circle to annotate screenshots before sending</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer transition-colors">
              Cancel
            </button>
            <button type="button" onClick={saveEditedImage} disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-[var(--brand-hover)] disabled:opacity-50 cursor-pointer transition-colors">
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageMarkupEditor;
