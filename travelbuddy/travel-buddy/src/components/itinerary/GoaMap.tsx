"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Minus, Plus, Navigation } from "lucide-react";
import { locate, GOA_CENTRE, type LatLng } from "@/lib/goa-geo";

/**
 * Interactive OpenStreetMap of the trip's stops.
 *
 * Same dependency-free tile approach as the onboarding picker: raster tiles
 * straight from OSM, drag to pan, buttons to zoom. Stops are geocoded through
 * the gazetteer in goa-geo, so the pins sit on the real places rather than
 * decorative coordinates. No API key, no Google Maps billing.
 */

const TILE = 256;
const MIN_ZOOM = 9;
const MAX_ZOOM = 16;

export type MapStop = { label: string; day: number; at: LatLng };

const lngToTileX = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z;
const latToTileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};
const tileXToLng = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const tileYToLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

export default function GoaMap({
  stops,
  loading,
  height = 340,
}: {
  stops: MapStop[];
  loading?: boolean;
  height?: number;
}) {
  const [zoom, setZoom] = useState(11);
  const [centre, setCentre] = useState<LatLng>(GOA_CENTRE);
  const [size, setSize] = useState({ w: 360, h: height });
  const [selected, setSelected] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    lat: number;
    lng: number;
  } | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight }),
    );
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Frame all the stops once they're known
  useEffect(() => {
    if (fitted.current || stops.length === 0 || size.w < 50) return;
    fitted.current = true;
    const lats = stops.map((s) => s.at.lat);
    const lngs = stops.map((s) => s.at.lng);
    const mid = {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
    const spanLat = Math.max(0.02, Math.max(...lats) - Math.min(...lats));
    const spanLng = Math.max(0.02, Math.max(...lngs) - Math.min(...lngs));
    let z = MAX_ZOOM;
    while (z > MIN_ZOOM) {
      const h = (spanLat / 360) * 2 ** z * TILE * 1.6;
      const w = (spanLng / 360) * 2 ** z * TILE * 1.6;
      if (h <= size.h && w <= size.w) break;
      z--;
    }
    setCentre(mid);
    setZoom(z);
  }, [stops, size.w, size.h]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      lat: centre.lat,
      lng: centre.lng,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const tx = lngToTileX(d.lng, zoom) - (e.clientX - d.x) / TILE;
    const ty = latToTileY(d.lat, zoom) - (e.clientY - d.y) / TILE;
    setCentre({ lat: tileYToLat(ty, zoom), lng: tileXToLng(tx, zoom) });
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const tiles = useMemo(() => {
    const cx = lngToTileX(centre.lng, zoom);
    const cy = latToTileY(centre.lat, zoom);
    const cols = Math.ceil(size.w / TILE) + 2;
    const rows = Math.ceil(size.h / TILE) + 2;
    const x0 = Math.floor(cx - cols / 2);
    const y0 = Math.floor(cy - rows / 2);
    const max = 2 ** zoom;
    const out: { key: string; src: string; left: number; top: number }[] = [];
    for (let i = 0; i <= cols; i++)
      for (let j = 0; j <= rows; j++) {
        const tx = x0 + i;
        const ty = y0 + j;
        if (ty < 0 || ty >= max) continue;
        out.push({
          key: `${zoom}/${tx}/${ty}`,
          src: `https://tile.openstreetmap.org/${zoom}/${((tx % max) + max) % max}/${ty}.png`,
          left: (tx - cx) * TILE + size.w / 2,
          top: (ty - cy) * TILE + size.h / 2,
        });
      }
    return out;
  }, [centre.lat, centre.lng, zoom, size.w, size.h]);

  const project = (at: LatLng) => ({
    left:
      (lngToTileX(at.lng, zoom) - lngToTileX(centre.lng, zoom)) * TILE +
      size.w / 2,
    top:
      (latToTileY(at.lat, zoom) - latToTileY(centre.lat, zoom)) * TILE +
      size.h / 2,
  });

  return (
    <div>
      <div
        ref={boxRef}
        className="relative overflow-hidden rounded-3xl bg-[#E8EDE4] touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {tiles.map((t) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={t.key}
            src={t.src}
            alt=""
            width={TILE}
            height={TILE}
            draggable={false}
            className="tb-map-tiles absolute pointer-events-none"
            style={{ left: t.left, top: t.top }}
          />
        ))}

        {stops.map((s, i) => {
          const p = project(s.at);
          if (
            p.left < -40 ||
            p.top < -40 ||
            p.left > size.w + 40 ||
            p.top > size.h + 40
          )
            return null;
          const on = selected === i;
          return (
            <button
              key={`${s.label}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(on ? null : i);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: p.left, top: p.top }}
              aria-label={s.label}
            >
              <span
                className={`flex items-center justify-center rounded-full font-bold shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-all ${
                  on
                    ? "w-8 h-8 text-[13px] bg-[#1A1A1A] text-white"
                    : "w-7 h-7 text-[12px] bg-[#FFD233] text-[#1A1A1A]"
                }`}
              >
                {i + 1}
              </span>
            </button>
          );
        })}

        {selected !== null && stops[selected] && (
          <div className="absolute left-3 right-3 bottom-3 z-20 bg-white rounded-2xl px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.18)]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#F5A623]">
              Stop {selected + 1} · Day {stops[selected].day}
            </p>
            <p className="text-[14px] font-bold text-[#1A1A1A] mt-0.5">
              {stops[selected].label}
            </p>
            <p className="text-[11px] text-[#8E8E93] mt-0.5">
              {stops[selected].at.lat.toFixed(4)},{" "}
              {stops[selected].at.lng.toFixed(4)}
            </p>
          </div>
        )}

        <div className="absolute right-3 top-3 flex flex-col rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.18)] z-20">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
            className="w-9 h-9 bg-white flex items-center justify-center active:bg-[#F2F2F7]"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
            className="w-9 h-9 bg-white flex items-center justify-center border-t border-[#E5E5EA] active:bg-[#F2F2F7]"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-white/55 z-30">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1A1A1A]">
              <Loader2 className="w-4 h-4 animate-spin" /> Placing your stops…
            </span>
          </div>
        )}

        <span className="absolute bottom-1 right-2 text-[9px] text-black/55 bg-white/70 rounded px-1 z-20">
          © OpenStreetMap
        </span>
      </div>

      <div className="flex items-center gap-2 mt-3 px-1">
        <Navigation className="w-3.5 h-3.5 text-[#8E8E93]" />
        <p className="text-[11.5px] text-[#8E8E93]">
          {stops.length} stops located · tap a pin for details
        </p>
      </div>
    </div>
  );
}
