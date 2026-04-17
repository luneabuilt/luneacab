import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Polyline,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotatedmarker";

import { useEffect, useRef, useState } from "react";

// Default marker fix
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Icons
const carIcon = new L.Icon({
  iconUrl: "/icons/car.png",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const bikeIcon = new L.Icon({
  iconUrl: "/icons/bike.png",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const autoIcon = new L.Icon({
  iconUrl: "/icons/auto.png",
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const userIcon = new L.Icon({
  iconUrl: "/icons/passenger.png",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Recenter
function MapRecenter({ lat, lng, follow = false }: any) {
  const map = useMap();

  useEffect(() => {
    if (!follow) return;

    map.flyTo([lat, lng], map.getZoom(), {
      animate: true,
      duration: 0.8,
    });
  }, [lat, lng, follow, map]);

  return null;
}

// ✅ FIXED POSITION (ABOVE BOTTOM NAV)
function CenterButton({ center }: any) {
  const map = useMap();

  return (
    <div className="absolute bottom-24 right-4 z-[500]">
      <button
        onClick={() => map.flyTo([center.lat, center.lng], 16)}
        className="bg-white/90 backdrop-blur-md shadow-xl px-4 py-2 rounded-full text-sm font-medium border"
      >
        📍
      </button>
    </div>
  );
}

// ✅ FIXED POSITION (BELOW TOP BAR)
function MapSwitcher({ setType }: any) {
  return (
    <div className="absolute top-20 left-4 z-[500]">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setType((prev: any) =>
            prev === "light" ? "satellite" : "light"
          );
        }}
        className="bg-white/90 backdrop-blur-md shadow-lg px-3 py-1.5 rounded-lg text-xs border"
      >
        🗺 Map
      </button>
    </div>
  );
}

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    lat: number;
    lng: number;
    type: "user" | "driver" | "pickup" | "drop";
    vehicleType?: "bike" | "auto" | "car";
    id: string | number;
  }>;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
  route?: [number, number][];
}

export default function Map({
  center,
  zoom = 15,
  markers = [],
  className = "h-full w-full",
  onMapClick,
  route = [],
}: MapProps) {
  const [mapType, setMapType] = useState("light");

  const tileUrl =
    mapType === "light"
      ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full rounded-none z-0"
      >
        <TileLayer url={tileUrl} />

        {/* Zoom control (safe position) */}
        <div className="absolute top-24 right-4 z-[400]">
  <ZoomControl position="topright" />
</div>

        <MapRecenter
          lat={center.lat}
          lng={center.lng}
          follow={route.length > 0}
        />

        {/* Markers */}
        {markers.map((marker) => {
          let iconToUse = userIcon;

          if (marker.type === "driver") {
            const type = (marker.vehicleType || "car").toLowerCase();

            if (type === "bike") iconToUse = bikeIcon;
            else if (type === "auto") iconToUse = autoIcon;
            else iconToUse = carIcon;
          }

          return (
            <SmoothMarker
              key={`${marker.type}-${marker.id}`}
              position={[marker.lat, marker.lng]}
              icon={iconToUse}
              smooth={marker.type === "driver"}
            />
          );
        })}

        {/* Route */}
        {route.length > 0 && (
          <>
            <Polyline
              positions={route}
              pathOptions={{
                color: "#000",
                weight: 10,
                opacity: 0.1,
              }}
            />
            <Polyline
              positions={route}
              pathOptions={{
                color: "#2563eb",
                weight: 6,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {route.length > 0 ? (
          <RouteFitBounds route={route} />
        ) : markers.length > 1 ? (
          <FitBounds markers={markers} />
        ) : null}

        {onMapClick && <MapEventsHandler onMapClick={onMapClick} />}

        {/* Floating Controls */}
        <CenterButton center={center} />
        <MapSwitcher setType={setMapType} />
      </MapContainer>
    </div>
  );
}

// Click handler
function MapEventsHandler({ onMapClick }: any) {
  const map = useMap();

  useEffect(() => {
    const handler = (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on("click", handler);

    return () => {
      map.off("click", handler);
    };
  }, [map, onMapClick]);

  return null;
}

// Fit markers
function FitBounds({ markers }: any) {
  const map = useMap();

  useEffect(() => {
    if (!markers.length) return;

    const bounds = L.latLngBounds(
      markers.map((m: any) => [m.lat, m.lng])
    );

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [markers, map]);

  return null;
}

// Fit route
function RouteFitBounds({ route }: any) {
  const map = useMap();

  useEffect(() => {
    if (!route.length) return;

    const bounds = L.latLngBounds(route);

    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 16,
    });
  }, [route, map]);

  return null;
}

// Smooth marker
function SmoothMarker({ position, icon, smooth }: any) {
  const markerRef = useRef<any>(null);
  const prev = useRef(position);

  useEffect(() => {
    if (!markerRef.current || !smooth) return;

    const marker = markerRef.current;

    const start = L.latLng(prev.current[0], prev.current[1]);
    const end = L.latLng(position[0], position[1]);

    const angle =
      Math.atan2(end.lng - start.lng, end.lat - start.lat) *
      (180 / Math.PI);

    marker.setRotationAngle(angle);

    const duration = 800;
    const startTime = performance.now();

    function animate(time: number) {
      const progress = Math.min((time - startTime) / duration, 1);

      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      marker.setLatLng([lat, lng]);

      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prev.current = position;
  }, [position]);

  return <Marker ref={markerRef} position={position} icon={icon} />;
}