'use client';

import React from 'react';

// ─── SVG Math Helpers ────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Dataset {
  label: string;
  data: number[];
  color: string;
}

interface ChartData {
  labels: string[];
  datasets: Dataset[];
}

// ─── LineChart ────────────────────────────────────────────────────────────────

export function LineChart({
  data,
  height = 260,
  title,
}: {
  data: ChartData;
  height?: number;
  title?: string;
}) {
  const { labels, datasets } = data;
  if (!datasets.length || !labels.length)
    return title ? <EmptyChart title={title} /> : <EmptyChart />;

  const PAD = { top: 20, right: 20, bottom: 48, left: 52 };
  const W = 600;
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const allValues = datasets.flatMap((d) => d.data);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const valMin = rawMin === rawMax ? rawMin - 1 : rawMin;
  const valMax = rawMin === rawMax ? rawMax + 1 : rawMax;
  const valRange = valMax - valMin || 1;

  const TICK_COUNT = 5;
  const tickStep = valRange / (TICK_COUNT - 1);
  const yTicks = Array.from({ length: TICK_COUNT }, (_, i) => valMin + tickStep * i);

  const xOf = (i: number) => (labels.length < 2 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const yOf = (v: number) => innerH - ((v - valMin) / valRange) * innerH;

  // Show every Nth label to avoid crowding
  const labelStep = Math.ceil(labels.length / 8);

  return (
    <div className="w-full">
      {title && <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid lines + Y axis ticks */}
          {yTicks.map((tick) => {
            const y = yOf(tick);
            return (
              <g key={tick}>
                <line x1={0} y1={y} x2={innerW} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                  {formatNum(tick)}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {labels.map((label, i) => {
            if (i % labelStep !== 0 && i !== labels.length - 1) return null;
            return (
              <text
                key={i}
                x={xOf(i)}
                y={innerH + 18}
                textAnchor="middle"
                fontSize={10}
                fill="#9ca3af"
              >
                {label}
              </text>
            );
          })}

          {/* Axes */}
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#e5e7eb" strokeWidth={1} />
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#e5e7eb" strokeWidth={1} />

          {/* Lines + dots per dataset */}
          {datasets.map((ds) => {
            const pts = ds.data.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
            return (
              <g key={ds.label}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={ds.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {ds.data.map((v, i) => (
                  <circle key={i} cx={xOf(i)} cy={yOf(v)} r={3.5} fill={ds.color}>
                    <title>{`${ds.label}: ${formatNum(v)} (${labels[i]})`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      {datasets.length > 1 && (
        <div className="flex flex-wrap gap-4 mt-2 px-1">
          {datasets.map((ds) => (
            <div key={ds.label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-0.5 rounded-full"
                style={{ backgroundColor: ds.color, height: 2, width: 20 }}
              />
              <span className="text-xs text-gray-500">{ds.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BarChart ─────────────────────────────────────────────────────────────────

export function BarChart({
  data,
  height = 260,
  title,
  horizontal = false,
}: {
  data: ChartData;
  height?: number;
  title?: string;
  horizontal?: boolean;
}) {
  const { labels, datasets } = data;
  if (!datasets.length || !labels.length)
    return title ? <EmptyChart title={title} /> : <EmptyChart />;

  const PAD = { top: 20, right: 20, bottom: 48, left: 52 };
  const W = 600;
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const allValues = datasets.flatMap((d) => d.data).filter((v) => isFinite(v));
  const valMax = Math.max(0, ...allValues);
  const valRange = valMax || 1;

  const TICK_COUNT = 5;
  const yTicks = Array.from({ length: TICK_COUNT }, (_, i) => (valMax * i) / (TICK_COUNT - 1));

  const groupCount = labels.length;
  const dsCount = datasets.length;
  const groupW = innerW / groupCount;
  const barGap = groupW * 0.1;
  const barW = Math.max(4, (groupW - barGap * 2) / dsCount - 2);

  if (horizontal) {
    const barH = Math.max(6, (innerH / groupCount) * 0.6);
    const rowH = innerH / groupCount;
    return (
      <div className="w-full">
        {title && <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${PAD.left},${PAD.top})`}>
            {yTicks.map((tick) => {
              const x = (tick / valRange) * innerW;
              return (
                <g key={tick}>
                  <line x1={x} y1={0} x2={x} y2={innerH} stroke="#f3f4f6" strokeWidth={1} />
                  <text x={x} y={innerH + 16} textAnchor="middle" fontSize={10} fill="#9ca3af">
                    {formatNum(tick)}
                  </text>
                </g>
              );
            })}
            {labels.map((label, gi) => {
              const rowY = gi * rowH;
              return (
                <g key={gi}>
                  <text
                    x={-8}
                    y={rowY + rowH / 2 + 4}
                    textAnchor="end"
                    fontSize={10}
                    fill="#9ca3af"
                  >
                    {label}
                  </text>
                  {datasets.map((ds, di) => {
                    const val = ds.data[gi] ?? 0;
                    const bW = (val / valRange) * innerW;
                    const bY = rowY + (rowH - barH * dsCount) / 2 + di * barH;
                    return (
                      <rect
                        key={di}
                        x={0}
                        y={bY}
                        width={Math.max(0, bW)}
                        height={barH - 2}
                        fill={ds.color}
                        rx={2}
                      >
                        <title>{`${ds.label}: ${formatNum(val)}`}</title>
                      </rect>
                    );
                  })}
                </g>
              );
            })}
            <line x1={0} y1={0} x2={0} y2={innerH} stroke="#e5e7eb" strokeWidth={1} />
            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#e5e7eb" strokeWidth={1} />
          </g>
        </svg>
        {datasets.length > 1 && <Legend datasets={datasets} />}
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid lines + Y ticks */}
          {yTicks.map((tick) => {
            const y = innerH - (tick / valRange) * innerH;
            return (
              <g key={tick}>
                <line x1={0} y1={y} x2={innerW} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                  {formatNum(tick)}
                </text>
              </g>
            );
          })}

          {/* Bars + X labels */}
          {labels.map((label, gi) => {
            const gx = gi * groupW + barGap;
            return (
              <g key={gi}>
                <text
                  x={gx + (groupW - barGap * 2) / 2}
                  y={innerH + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#9ca3af"
                >
                  {label}
                </text>
                {datasets.map((ds, di) => {
                  const val = ds.data[gi] ?? 0;
                  const bH = (val / valRange) * innerH;
                  const bX = gx + di * (barW + 2);
                  const bY = innerH - bH;
                  const showLabel = bH > 16;
                  return (
                    <g key={di}>
                      <rect
                        x={bX}
                        y={bY}
                        width={barW}
                        height={Math.max(0, bH)}
                        fill={ds.color}
                        rx={2}
                      >
                        <title>{`${ds.label}: ${formatNum(val)}`}</title>
                      </rect>
                      {showLabel && (
                        <text
                          x={bX + barW / 2}
                          y={bY - 4}
                          textAnchor="middle"
                          fontSize={9}
                          fill={ds.color}
                          fontWeight="600"
                        >
                          {formatNum(val)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Axes */}
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#e5e7eb" strokeWidth={1} />
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#e5e7eb" strokeWidth={1} />
        </g>
      </svg>
      {datasets.length > 1 && <Legend datasets={datasets} />}
    </div>
  );
}

// ─── DonutChart ───────────────────────────────────────────────────────────────

export function DonutChart({
  data,
  title,
  centerLabel,
}: {
  data: { label: string; value: number; color: string }[];
  title?: string;
  centerLabel?: string;
}) {
  if (!data.length) return title ? <EmptyChart title={title} /> : <EmptyChart />;

  const SIZE = 180;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R_OUTER = 74;
  const R_INNER = 48;

  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  let angle = 0;
  const segments = data.map((d) => {
    const sweep = (d.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...d, start, end, sweep };
  });

  const displayCenter = centerLabel ?? formatNum(total);

  return (
    <div className="w-full">
      {title && <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>}
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
            {segments.map((seg, i) => {
              if (seg.sweep < 0.5) return null;
              const endAngle = seg.sweep >= 359.9 ? seg.end - 0.01 : seg.end;
              const d = arcPath(CX, CY, R_OUTER, seg.start, endAngle);
              const innerStart = polarToCartesian(CX, CY, R_INNER, endAngle);
              const innerEnd = polarToCartesian(CX, CY, R_INNER, seg.start);
              const large = seg.sweep > 180 ? 1 : 0;
              const fullPath = `${d} L ${innerStart.x} ${innerStart.y} A ${R_INNER} ${R_INNER} 0 ${large} 0 ${innerEnd.x} ${innerEnd.y} Z`;
              return (
                <path key={i} d={fullPath} fill={seg.color}>
                  <title>{`${seg.label}: ${formatNum(seg.value)} (${((seg.value / total) * 100).toFixed(1)}%)`}</title>
                </path>
              );
            })}
            <text
              x={CX}
              y={CY - 6}
              textAnchor="middle"
              fontSize={14}
              fontWeight="700"
              fill="#111827"
            >
              {displayCenter}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize={9} fill="#9ca3af">
              total
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 min-w-0">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2 min-w-0">
              <span
                className="flex-shrink-0 w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-xs text-gray-600 truncate">{seg.label}</span>
              <span className="text-xs text-gray-400 ml-auto pl-2 flex-shrink-0">
                {((seg.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── KPICard ──────────────────────────────────────────────────────────────────

export function KPICard({
  title,
  value,
  change,
  changeDir = 'neutral',
  icon,
  color,
}: {
  title: string;
  value: string;
  change?: string;
  changeDir?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
}) {
  const changeBg =
    changeDir === 'up'
      ? 'bg-emerald-50 text-emerald-700'
      : changeDir === 'down'
        ? 'bg-red-50 text-red-600'
        : 'bg-gray-100 text-gray-500';

  const arrow = changeDir === 'up' ? '↑' : changeDir === 'down' ? '↓' : '';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '1a', color }}
        >
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${changeBg}`}>
            {arrow} {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{title}</p>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EmptyChart({ title }: { title?: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-10 text-gray-400">
      {title && <p className="text-sm font-semibold text-gray-600 mb-2">{title}</p>}
      <p className="text-xs">No data</p>
    </div>
  );
}

function Legend({ datasets }: { datasets: Dataset[] }) {
  return (
    <div className="flex flex-wrap gap-4 mt-2 px-1">
      {datasets.map((ds) => (
        <div key={ds.label} className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-sm"
            style={{ backgroundColor: ds.color, width: 10, height: 10 }}
          />
          <span className="text-xs text-gray-500">{ds.label}</span>
        </div>
      ))}
    </div>
  );
}

function formatNum(n: number): string {
  if (!isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}
