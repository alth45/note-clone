"use client";

// components/analytics/ViewsChart.tsx
// Line chart views per hari menggunakan Chart.js.
// Isolated agar bisa lazy-loaded dari halaman analytics.

import { useEffect, useRef, useState } from "react";

interface ChartPoint {
    date: string;
    label: string;
    views: number;
}

interface ViewsChartProps {
    data: ChartPoint[];
    period: number;
    isLoading: boolean;
}

// Warna dari CSS variable — fallback ke nilai konkret kalau tidak tersedia
const CHART_COLOR = "#1c1c1e";
const CHART_COLOR_20 = "rgba(28,28,30,0.12)";
const CHART_COLOR_5 = "rgba(28,28,30,0.04)";
const GRID_COLOR = "rgba(28,28,30,0.06)";
const TOOLTIP_BG = "#ffffff";

export default function ViewsChart({ data, period, isLoading }: ViewsChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);
    const [hover, setHover] = useState<{ views: number; label: string } | null>(null);

    useEffect(() => {
        if (isLoading || !data.length) return;

        // Dynamic import Chart.js — tidak bundle kalau halaman tidak dibuka
        let destroyed = false;

        (async () => {
            const { Chart, registerables } = await import("chart.js");
            Chart.register(...registerables);

            if (destroyed || !canvasRef.current) return;

            // Destroy chart lama sebelum buat baru
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }

            const labels = data.map((d) => d.label);
            const values = data.map((d) => d.views);
            const maxVal = Math.max(...values, 1);

            // Decimation: kalau data > 60 titik, tampilkan setiap 2 hari
            const step = period > 60 ? 2 : 1;
            const displayLabels = labels.map((l, i) =>
                i % step === 0 ? l : ""
            );

            const ctx = canvasRef.current.getContext("2d");
            if (!ctx) return;

            // Gradient fill di bawah line
            const gradient = ctx.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, "rgba(28,28,30,0.10)");
            gradient.addColorStop(0.6, "rgba(28,28,30,0.02)");
            gradient.addColorStop(1, "rgba(28,28,30,0)");

            chartRef.current = new Chart(ctx, {
                type: "line",
                data: {
                    labels: displayLabels,
                    datasets: [{
                        data: values,
                        borderColor: CHART_COLOR,
                        borderWidth: 2,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,    // smooth curve
                        pointRadius: 0,      // sembunyikan titik
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: CHART_COLOR,
                        pointHoverBorderColor: "#fff",
                        pointHoverBorderWidth: 2,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: "easeInOutQuart" },
                    interaction: {
                        mode: "index",
                        intersect: false,
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: TOOLTIP_BG,
                            titleColor: CHART_COLOR,
                            bodyColor: CHART_COLOR,
                            borderColor: CHART_COLOR_20,
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 10,
                            displayColors: false,
                            callbacks: {
                                title: (items: any) => {
                                    // Tampilkan tanggal lengkap dari data asli
                                    const i = items[0].dataIndex;
                                    setHover({ views: values[i], label: labels[i] });
                                    return labels[i];
                                },
                                label: (item: any) =>
                                    `${item.raw?.toLocaleString("id-ID")} views`,
                            },
                        },
                    },
                    scales: {
                        x: {
                            grid: {
                                color: GRID_COLOR,
                                drawTicks: false,
                            },
                            border: { dash: [4, 4], display: false },
                            ticks: {
                                color: "rgba(28,28,30,0.35)",
                                font: { size: 10, family: "inherit" },
                                maxRotation: 0,
                                padding: 8,
                            },
                        },
                        y: {
                            position: "right",
                            grid: {
                                color: GRID_COLOR,
                                drawTicks: false,
                            },
                            border: { display: false },
                            ticks: {
                                color: "rgba(28,28,30,0.35)",
                                font: { size: 10, family: "inherit" },
                                padding: 10,
                                maxTicksLimit: 5,
                                callback: (v: any) =>
                                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v,
                            },
                            suggestedMax: maxVal * 1.15,
                            min: 0,
                        },
                    },
                },
            });
        })();

        return () => { destroyed = true; };
    }, [data, period, isLoading]);

    // Destroy saat unmount
    useEffect(() => {
        return () => { chartRef.current?.destroy(); };
    }, []);

    if (isLoading) {
        return (
            <div className="w-full h-[280px] flex items-center justify-center">
                <div className="w-full h-full bg-sumi-10/40 rounded-xl animate-pulse" />
            </div>
        );
    }

    const totalInView = data.reduce((s, d) => s + d.views, 0);
    const peakDay = data.reduce(
        (best, d) => d.views > best.views ? d : best,
        data[0] ?? { label: "-", views: 0 }
    );

    return (
        <div className="flex flex-col gap-2">
            {/* Mini stat di atas chart */}
            <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-sumi tabular-nums">
                    {(hover?.views ?? totalInView).toLocaleString("id-ID")}
                </span>
                <span className="text-sm text-sumi-muted">
                    {hover ? `views pada ${hover.label}` : "total views periode ini"}
                </span>
                {!hover && peakDay.views > 0 && (
                    <span className="text-xs text-sumi-muted/60 ml-auto hidden sm:block">
                        Puncak: <strong className="text-sumi">{peakDay.views.toLocaleString("id-ID")}</strong> pada {peakDay.label}
                    </span>
                )}
            </div>

            {/* Canvas */}
            <div
                className="relative w-full"
                style={{ height: 280 }}
                onMouseLeave={() => setHover(null)}
            >
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}