"use client";

// components/analytics/ViewsChart.tsx
// Line chart views per hari — native Canvas API, zero dependency.
// Tidak perlu chart.js atau library apapun.

import { useEffect, useRef, useState, useCallback } from "react";

export interface ChartPoint {
    date: string;
    label: string;
    views: number;
}

interface ViewsChartProps {
    data: ChartPoint[];
    period: number;
    isLoading: boolean;
}

// ─── Konstanta visual ─────────────────────────────────────────────────────────
const PADDING = { top: 20, right: 52, bottom: 36, left: 16 };
const LINE_COLOR = "#1c1c1e";
const GRID_COLOR = "rgba(28,28,30,0.07)";
const TICK_COLOR = "rgba(28,28,30,0.35)";
const GRADIENT_TOP = "rgba(28,28,30,0.10)";
const GRADIENT_BOTTOM = "rgba(28,28,30,0.00)";
const TOOLTIP_BG = "#ffffff";
const TOOLTIP_BORDER = "rgba(28,28,30,0.12)";
const POINT_COLOR = "#1c1c1e";
const POINT_BORDER = "#ffffff";

function formatTick(v: number): string {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "jt";
    if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
    return String(v);
}

// Smooth bezier untuk setiap segmen garis
function buildSmoothPath(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    tension = 0.35,
) {
    if (points.length < 2) return;
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];

        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
}

export default function ViewsChart({ data, period, isLoading }: ViewsChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);

    const [tooltip, setTooltip] = useState<{
        x: number; y: number;
        point: ChartPoint;
    } | null>(null);

    // ── Draw ──────────────────────────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data.length) return;

        const dpr = window.devicePixelRatio || 1;
        const W = canvas.offsetWidth;
        const H = canvas.offsetHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        const innerW = W - PADDING.left - PADDING.right;
        const innerH = H - PADDING.top - PADDING.bottom;

        const maxV = Math.max(...data.map((d) => d.views), 1);
        const ySteps = 4;

        // ── Grid lines + Y ticks ───────────────────────────────────────────────
        ctx.font = `10px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "right";
        ctx.fillStyle = TICK_COLOR;
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;

        for (let i = 0; i <= ySteps; i++) {
            const v = (maxV / ySteps) * i;
            const y = PADDING.top + innerH - (innerH * i / ySteps);

            ctx.beginPath();
            ctx.moveTo(PADDING.left, y);
            ctx.lineTo(W - PADDING.right, y);
            ctx.stroke();

            ctx.fillText(
                formatTick(Math.round(v)),
                W - PADDING.right + 48,
                y + 3.5,
            );
        }

        // ── X ticks ───────────────────────────────────────────────────────────
        // Tampilkan setiap N hari agar tidak penuh
        const maxLabels = Math.floor(innerW / 52);
        const step = Math.max(1, Math.ceil(data.length / maxLabels));

        ctx.textAlign = "center";
        data.forEach((d, i) => {
            if (i % step !== 0) return;
            const x = PADDING.left + (i / (data.length - 1)) * innerW;
            ctx.fillStyle = TICK_COLOR;
            ctx.fillText(d.label, x, H - 8);
        });

        // ── Chart points ──────────────────────────────────────────────────────
        const pts = data.map((d, i) => ({
            x: PADDING.left + (i / (data.length - 1)) * innerW,
            y: PADDING.top + innerH - (d.views / maxV) * innerH,
        }));

        // Gradient fill
        const grad = ctx.createLinearGradient(0, PADDING.top, 0, PADDING.top + innerH);
        grad.addColorStop(0, GRADIENT_TOP);
        grad.addColorStop(1, GRADIENT_BOTTOM);

        ctx.beginPath();
        buildSmoothPath(ctx, pts);
        ctx.lineTo(pts[pts.length - 1].x, PADDING.top + innerH);
        ctx.lineTo(pts[0].x, PADDING.top + innerH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Line
        ctx.beginPath();
        buildSmoothPath(ctx, pts);
        ctx.strokeStyle = LINE_COLOR;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.stroke();

        // Hover point — kalau ada
        if (tooltip) {
            const i = data.findIndex((d) => d.date === tooltip.point.date);
            if (i !== -1) {
                const px = pts[i].x;
                const py = pts[i].y;

                // Vertical hairline
                ctx.beginPath();
                ctx.moveTo(px, PADDING.top);
                ctx.lineTo(px, PADDING.top + innerH);
                ctx.strokeStyle = "rgba(28,28,30,0.15)";
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Point circle
                ctx.beginPath();
                ctx.arc(px, py, 5, 0, Math.PI * 2);
                ctx.fillStyle = POINT_COLOR;
                ctx.fill();
                ctx.strokeStyle = POINT_BORDER;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }, [data, tooltip]);

    // Redraw setiap kali data / tooltip berubah
    useEffect(() => {
        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current!);
    }, [draw]);

    // Redraw saat resize
    useEffect(() => {
        const ro = new ResizeObserver(() => {
            rafRef.current = requestAnimationFrame(draw);
        });
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [draw]);

    // ── Mouse interaction ─────────────────────────────────────────────────────
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !data.length) return;

        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const innerW = canvas.offsetWidth - PADDING.left - PADDING.right;

        // Cari titik terdekat secara horizontal
        const idx = Math.round(
            ((mx - PADDING.left) / innerW) * (data.length - 1)
        );
        const clamped = Math.max(0, Math.min(data.length - 1, idx));

        const pt = data[clamped];
        const px = PADDING.left + (clamped / (data.length - 1)) * innerW;
        const maxV = Math.max(...data.map((d) => d.views), 1);
        const innerH = canvas.offsetHeight - PADDING.top - PADDING.bottom;
        const py = PADDING.top + innerH - (pt.views / maxV) * innerH;

        setTooltip({ x: px, y: py, point: pt });
    }, [data]);

    const handleMouseLeave = useCallback(() => setTooltip(null), []);

    // ── Derived stats ─────────────────────────────────────────────────────────
    const totalInView = data.reduce((s, d) => s + d.views, 0);
    const peakDay = data.length
        ? data.reduce((best, d) => d.views > best.views ? d : best)
        : null;

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2">
                <div className="h-9 w-48 bg-sumi-10/60 rounded-lg animate-pulse" />
                <div className="w-full h-[280px] bg-sumi-10/40 rounded-xl animate-pulse" />
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="w-full h-[280px] flex items-center justify-center text-sumi-muted text-sm">
                Belum ada data views.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Mini stat */}
            <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-black text-sumi tabular-nums">
                    {(tooltip?.point.views ?? totalInView).toLocaleString("id-ID")}
                </span>
                <span className="text-sm text-sumi-muted">
                    {tooltip
                        ? `views pada ${tooltip.point.label}`
                        : "total views periode ini"
                    }
                </span>
                {!tooltip && peakDay && peakDay.views > 0 && (
                    <span className="text-xs text-sumi-muted/60 ml-auto hidden sm:block">
                        Puncak:&nbsp;
                        <strong className="text-sumi">
                            {peakDay.views.toLocaleString("id-ID")}
                        </strong>
                        &nbsp;pada {peakDay.label}
                    </span>
                )}
            </div>

            {/* Canvas container */}
            <div
                ref={containerRef}
                className="relative w-full select-none"
                style={{ height: 280 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ display: "block" }}
                />

                {/* Tooltip bubble */}
                {tooltip && (() => {
                    const canvas = canvasRef.current;
                    const W = canvas?.offsetWidth ?? 0;
                    const raw = tooltip.x;
                    // Flip ke kiri kalau terlalu dekat kanan
                    const left = raw + 90 > W ? raw - 100 : raw + 12;

                    return (
                        <div
                            className="pointer-events-none absolute -translate-y-1/2 bg-white border border-sumi-10 shadow-md rounded-xl px-3 py-2 text-xs whitespace-nowrap z-10"
                            style={{
                                left: left,
                                top: tooltip.y,
                                borderColor: TOOLTIP_BORDER,
                            }}
                        >
                            <div className="font-bold text-sumi">
                                {tooltip.point.views.toLocaleString("id-ID")} views
                            </div>
                            <div className="text-sumi-muted mt-0.5">
                                {tooltip.point.label}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}