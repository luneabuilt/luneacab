import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

// 🔥 FIX DEFAULT ICON
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// 🚗 Icons
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

// 🔥 RECENTER
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), {
      duration: 0.8,
    });
  }, [lat, lng]);

  return null;
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
  return (
    <div className={className}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full rounded-2xl shadow-lg z-0"
      >
        {/* ✅ PREMIUM LIGHT MAP (NOT DARK) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* 🔄 RECENTER */}
        <MapRecenter lat={center.lat} lng={center.lng} />

        {/* 🔥 CLICK HANDLER (FIXED) */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* 🚗 MARKERS */}
        {markers.map((marker) => {
          let iconToUse = userIcon;

          if (marker.type === "driver") {
            const type = marker.vehicleType || "car";

            if (type === "bike") iconToUse = bikeIcon;
            else if (type === "auto") iconToUse = autoIcon;
            else iconToUse = carIcon;
          }

          return (
            <SmoothMarker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={iconToUse}
              smooth={marker.type === "driver"}
            />
          );
        })}

        {/* 🛣 ROUTE */}
        {route.length > 0 && (
          <>
            {/* Glow */}
            <Polyline
              positions={route}
              pathOptions={{
                color: "#2563eb",
                weight: 10,
                opacity: 0.15,
              }}
            />

            {/* Main */}
            <Polyline
              positions={route}
              pathOptions={{
                color: "#2563eb",
                weight: 5,
              }}
            />
          </>
        )}

        {/* 🔄 AUTO FIT */}
        {route.length > 0 && <RouteFitBounds route={route} />}
      </MapContainer>
    </div>
  );
}

// ✅ CLICK HANDLER (PROPER FIX)
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

// 🔄 FIT ROUTE
function RouteFitBounds({ route }: { route: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(route);
    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 16,
    });
  }, [route]);

  return null;
}

// 🚗 SMOOTH DRIVER
function SmoothMarker({
  position,
  icon,
  smooth,
}: {
  position: [number, number];
  icon: L.Icon;
  smooth: boolean;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!markerRef.current || !smooth) return;

    const marker = markerRef.current;
    const start = marker.getLatLng();
    const end = L.latLng(position[0], position[1]);

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
  }, [position]);

  return <Marker ref={markerRef} position={position} icon={icon} />;
}