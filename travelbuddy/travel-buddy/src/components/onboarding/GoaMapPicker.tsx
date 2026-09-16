"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Loader2, Minus, Plus, Crosshair } from "lucide-react";

/**
 * A dependency-free OpenStreetMap picker.
 *
 * Raster tiles come straight from tile.openstreetmap.org and the place name
 * from Nominatim — both free, both require attribution, which is rendered
 * bottom-right. Nominatim asks for at most one request a second, so the
 * reverse geocode is debounced and only fires once the map stops moving.
 *
 * The pin is fixed at the centre and the map moves underneath it, which is
 * the pattern every ride-hailing and delivery app uses because it works with
 * one thumb on a phone.
 */

const TILE = 256;
const MIN_ZOOM = 9;
const MAX_ZOOM = 16;

export type GoaSpot = { lat: number; lng: number; label: string };

/** Four broad bases — two north, two south — so nobody has to scroll a list. */
export const GOA_PRESETS: {
  name: string;
  sub: string;
  region: "North" | "South";
  lat: number;
  lng: number;
}[] = [
  {
    name: "Anjuna & Vagator",
    sub: "Markets, cliffs, nightlife",
    region: "North",
    lat: 15.5937,
    lng: 73.7407,
  },
  {
    name: "Calangute & Candolim",
    sub: "Central, busy, everything close",
    region: "North",
    lat: 15.5439,
    lng: 73.7553,
  },
  {
    name: "Palolem & Agonda",
    sub: "Slow, quiet, southern",
    region: "South",
    lat: 15.01,
    lng: 74.0233,
  },
  {
    name: "Colva & Benaulim",
    sub: "Long beaches, calm water",
    region: "South",
    lat: 15.2793,
    lng: 73.922,
  },
];

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

export default function GoaMapPicker({
  value,
  onChange,
  height = 260,
}: {
  value: GoaSpot;
  onChange: (spot: GoaSpot) => void;
  height?: number;
}) {
  const [zoom, setZoom] = useState(12);
  const [centre, setCentre] = useState({ lat: value.lat, lng: value.lng });
  const [size, setSize] = useState({ w: 360, h: height });
  const [looking, setLooking] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    cx: number;
    cy: number;
  } | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the rendered width so the tile grid always covers the box
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Recentre when a preset is chosen from outside
  useEffect(() => {
    if (
      Math.abs(value.lat - centre.lat) > 1e-6 ||
      Math.abs(value.lng - centre.lng) > 1e-6
    ) {
      setCentre({ lat: value.lat, lng: value.lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.lat, value.lng]);

  const lookUp = useCallback(
    async (lat: number, lng: number) => {
      setLooking(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${lat}&lng=${lng}`.replace(
            "&lng=",
            "&lon=",
          ),
          { headers: { Accept: "application/json" } },
        );
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        const a = j.address || {};
        const label =
          [a.suburb, a.village, a.town, a.city_district, a.city, a.county]
            .filter(Boolean)
            .slice(0, 2)
            .join(", ") ||
          j.name ||
          "Dropped pin";
        onChange({ lat, lng, label });
      } catch {
        // Offline or rate-limited — keep the coordinates, drop the name
        onChange({ lat, lng, label: "Dropped pin" });
      } finally {
        setLooking(false);
      }
    },
    [onChange],
  );

  // Debounce the geocode until the map has been still for a moment
  const settle = useCallback(
    (lat: number, lng: number) => {
      if (settleRef.current) clearTimeout(settleRef.current);
      settleRef.current = setTimeout(() => lookUp(lat, lng), 550);
    },
    [lookUp],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      cx: centre.lat,
      cy: centre.lng,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const tx = lngToTileX(d.cy, zoom) - dx / TILE;
    const ty = latToTileY(d.cx, zoom) - dy / TILE;
    setCentre({ lat: tileYToLat(ty, zoom), lng: tileXToLng(tx, zoom) });
  };
  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    settle(centre.lat, centre.lng);
  };

  const changeZoom = (delta: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
    if (z === zoom) return;
    setZoom(z);
    settle(centre.lat, centre.lng);
  };

  // Build just enough tiles to cover the visible box
  const tiles = useMemo(() => {
    const cx = lngToTileX(centre.lng, zoom);
    const cy = latToTileY(centre.lat, zoom);
    const cols = Math.ceil(size.w / TILE) + 2;
    const rows = Math.ceil(size.h / TILE) + 2;
    const x0 = Math.floor(cx - cols / 2);
    const y0 = Math.floor(cy - rows / 2);
    const max = 2 ** zoom;
    const out: { key: string; src: string; left: number; top: number }[] = [];
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const tx = x0 + i;
        const ty = y0 + j;
        if (ty < 0 || ty >= max) continue;
        const wrapped = ((tx % max) + max) % max;
        out.push({
          key: `${zoom}/${tx}/${ty}`,
          src: `https://tile.openstreetmap.org/${zoom}/${wrapped}/${ty}.png`,
          left: (tx - cx) * TILE + size.w / 2,
          top: (ty - cy) * TILE + size.h / 2,
        });
      }
    }
    return out;
  }, [centre.lat, centre.lng, zoom, size.w, size.h]);

  return (
    <div>
      <div
        ref={boxRef}
        className="relative overflow-hidden rounded-3xl bg-[#E8EDE4] touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
            className="absolute pointer-events-none"
            style={{ left: t.left, top: t.top }}
          />
        ))}

        {/* Centre pin — the map moves under it */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="flex flex-col items-center"
            style={{ marginBottom: 18 }}
          >
            <MapPin
              className="w-8 h-8 text-[#E9633B] drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
              fill="#E9633B"
              strokeWidth={1.5}
            />
            <div className="w-2 h-2 rounded-full bg-black/25 -mt-1" />
          </div>
        </div>

        {/* Zoom */}
        <div className="absolute right-3 top-3 flex flex-col rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
          <button
            type="button"
            onClick={() => changeZoom(1)}
            className="w-9 h-9 bg-white text-[#1A1A1A] flex items-center justify-center active:bg-[#F2F2F7]"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(-1)}
            className="w-9 h-9 bg-white text-[#1A1A1A] flex items-center justify-center border-t border-[#E5E5EA] active:bg-[#F2F2F7]"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <span className="absolute bottom-1 right-2 text-[9px] text-black/55 bg-white/70 rounded px-1">
          © OpenStreetMap
        </span>
      </div>

      {/* Read-out */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#F7F7FA] px-4 py-3">
        <Crosshair className="w-4 h-4 text-[#8E8E93] flex-none" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#1A1A1A] truncate">
            {looking ? "Locating…" : value.label}
          </p>
          <p className="text-[11px] text-[#8E8E93]">
            {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
          </p>
        </div>
        {looking && (
          <Loader2 className="w-4 h-4 text-[#8E8E93] animate-spin flex-none" />
        )}
      </div>
    </div>
  );
}
