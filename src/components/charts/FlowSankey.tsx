"use client";

import { useMemo, useState, useId } from "react";
import {
  sankey,
  sankeyLinkHorizontal,
  SankeyGraph,
  SankeyNode,
  SankeyLink,
} from "d3-sankey";
import { cn } from "@/lib/utils";

interface SankeyInputNode {
  name: string;
  color?: string;
}

interface SankeyInputLink {
  source: number;
  target: number;
  value: number;
}

interface FlowSankeyProps {
  data: {
    nodes: SankeyInputNode[];
    links: SankeyInputLink[];
  };
  height?: number;
  valueFormatter?: (n: number) => string;
  className?: string;
}

const DEFAULT_PALETTE = [
  "#6C5CE7",
  "#00CEC9",
  "#2ED573",
  "#FFA801",
  "#FD7272",
  "#627EEA",
  "#9945FF",
  "#28A0F0",
  "#0052FF",
];

type N = SankeyNode<SankeyInputNode, SankeyInputLink>;
type L = SankeyLink<SankeyInputNode, SankeyInputLink>;

export function FlowSankey({
  data,
  height = 360,
  valueFormatter = (n) => n.toLocaleString(),
  className,
}: FlowSankeyProps) {
  const [hoverLink, setHoverLink] = useState<number | null>(null);
  const [hoverNode, setHoverNode] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const uid = useId().replace(/:/g, "");

  const width = 720; // viewBox width; scales via preserveAspectRatio

  const graph = useMemo(() => {
    const generator = sankey<SankeyInputNode, SankeyInputLink>()
      .nodeWidth(14)
      .nodePadding(14)
      .extent([
        [4, 8],
        [width - 4, height - 8],
      ]);

    const input: SankeyGraph<SankeyInputNode, SankeyInputLink> = {
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    };
    try {
      return generator(input);
    } catch {
      return { nodes: [] as N[], links: [] as L[] };
    }
  }, [data, height]);

  const nodeColor = (i: number, override?: string) =>
    override ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          {graph.links.map((link, i) => {
            const srcIdx = (link.source as N).index ?? 0;
            const tgtIdx = (link.target as N).index ?? 0;
            const srcColor = nodeColor(srcIdx, (link.source as N).color);
            const tgtColor = nodeColor(tgtIdx, (link.target as N).color);
            return (
              <linearGradient
                key={`lg-${uid}-${i}`}
                id={`lg-${uid}-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={(link.source as N).x1 ?? 0}
                x2={(link.target as N).x0 ?? 0}
              >
                <stop offset="0%" stopColor={srcColor} stopOpacity={0.5} />
                <stop offset="100%" stopColor={tgtColor} stopOpacity={0.5} />
              </linearGradient>
            );
          })}
        </defs>

        {/* links */}
        <g fill="none">
          {graph.links.map((link, i) => {
            const d = sankeyLinkHorizontal()(link) ?? "";
            const active = hoverLink === i;
            return (
              <path
                key={`l-${i}`}
                d={d}
                stroke={`url(#lg-${uid}-${i})`}
                strokeWidth={Math.max(1, link.width ?? 1)}
                opacity={active ? 0.85 : 0.4}
                className="transition-opacity duration-200"
                onMouseEnter={(e) => {
                  setHoverLink(i);
                  const rect = (
                    e.currentTarget.ownerSVGElement as SVGSVGElement
                  ).getBoundingClientRect();
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    text: `${(link.source as N).name} → ${
                      (link.target as N).name
                    } · ${valueFormatter(link.value)}`,
                  });
                }}
                onMouseMove={(e) => {
                  const rect = (
                    e.currentTarget.ownerSVGElement as SVGSVGElement
                  ).getBoundingClientRect();
                  setTooltip((t) =>
                    t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : t
                  );
                }}
                onMouseLeave={() => {
                  setHoverLink(null);
                  setTooltip(null);
                }}
              />
            );
          })}
        </g>

        {/* nodes */}
        <g>
          {graph.nodes.map((node, i) => {
            const color = nodeColor(i, node.color);
            const x = node.x0 ?? 0;
            const y = node.y0 ?? 0;
            const w = (node.x1 ?? 0) - (node.x0 ?? 0);
            const h = (node.y1 ?? 0) - (node.y0 ?? 0);
            const isLeftSide = x < width / 2;
            return (
              <g
                key={`n-${i}`}
                onMouseEnter={(e) => {
                  setHoverNode(i);
                  const rect = (
                    e.currentTarget.ownerSVGElement as SVGSVGElement
                  ).getBoundingClientRect();
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    text: `${node.name} · ${valueFormatter(node.value ?? 0)}`,
                  });
                }}
                onMouseLeave={() => {
                  setHoverNode(null);
                  setTooltip(null);
                }}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={Math.max(1, h)}
                  fill={color}
                  rx={2}
                  opacity={hoverNode === i ? 1 : 0.9}
                  className="transition-opacity"
                />
                <text
                  x={isLeftSide ? x + w + 6 : x - 6}
                  y={y + h / 2}
                  textAnchor={isLeftSide ? "start" : "end"}
                  dominantBaseline="middle"
                  fill="#8B8D9E"
                  fontSize={11}
                  className="pointer-events-none select-none"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-10 glass rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-text-primary shadow-xl"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            whiteSpace: "nowrap",
          }}
        >
          {tooltip.text}
        </div>
      ) : null}
    </div>
  );
}
