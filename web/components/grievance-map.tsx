"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

function makeIcon(color: string) {
  const html = `
    <span style="
      display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      box-shadow:0 4px 12px rgba(0,0,0,0.18);
      border:2px solid white;
    "></span>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function MapController({ center }: { center: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.lat, center.lng], 16, { duration: 0.6 });
  }, [center, map]);
  return null;
}

function ClickPicker({
  onPick,
}: {
  onPick: (latlng: LatLng) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) =>
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onPick]);
  return null;
}

export function GrievancePicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
}) {
  const [initial, setInitial] = useState<LatLng | null>(value);

  useEffect(() => {
    if (value || !navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setInitial(next);
        onChange(next);
      },
      () => {
        setInitial({ lat: 12.9716, lng: 77.5946 }); // Bengaluru fallback
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  }, [value, onChange]);

  const center: LatLng = value ?? initial ?? { lat: 12.9716, lng: 77.5946 };
  const icon = useMemo(() => makeIcon("#F59E0B"), []);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={15}
        style={{ height: 320, width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickPicker onPick={onChange} />
        <MapController center={value} />
        {value && (
          <Marker position={[value.lat, value.lng]} icon={icon} draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target as L.Marker;
                const ll = m.getLatLng();
                onChange({ lat: ll.lat, lng: ll.lng });
              },
            }}
          >
            <Popup>Drag to fine-tune the pin</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

type GrievancePin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  status: string;
  color: string;
  href: string;
};

export function GrievanceOverviewMap({
  pins,
  height = 480,
}: {
  pins: GrievancePin[];
  height?: number;
}) {
  const center = useMemo(() => {
    if (pins.length === 0) return { lat: 12.9716, lng: 77.5946 };
    const lat = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
    const lng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;
    return { lat, lng };
  }, [pins]);

  const ref = useRef<L.Map | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={pins.length > 1 ? 12 : 14}
        style={{ height, width: "100%" }}
        scrollWheelZoom
        ref={(m) => {
          ref.current = m;
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={makeIcon(p.color)}>
            <Popup>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-60">
                  {p.status.replace(/_/g, " ")}
                </div>
                <div className="text-sm font-medium">{p.title}</div>
                <a
                  href={p.href}
                  className="text-xs underline"
                  style={{ color: "#F59E0B" }}
                >
                  Open →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
