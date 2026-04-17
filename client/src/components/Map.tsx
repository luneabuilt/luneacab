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
import { useEffect, useRef } from "react";

// Fix default marker
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

// 🔥 Recenter helper
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), {
      animate: true,
      duration: 0.7,
    });
  }, [lat, lng]);

  return null;
}

// 🔥 Floating center button
function CenterButton({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();

  return (
    <div className="absolute bottom-6 right-4 z-[1000]">
      <button
        onClick={() => map.flyTo([center.lat, center.lng], 16)}
        className="bg-white shadow-lg px-4 py-2 rounded-full text-sm font-medium hover:scale-105 transition"
      >
        📍 Center
      </button>
    </div>
  );
}

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: any[];
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
    <div className={`relative ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full rounded-2xl overflow-hidden"
      >
        {/* 🔥 LIGHT PREMIUM MAP (not dark) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Zoom Controls */}
        <ZoomControl position="topright" />

        {/* Recenter */}
        <MapRecenter lat={center.lat} lng={center.lng} />

        {/* Markers */}
        {markers.map((marker) => {
          let iconToUse = userIcon;

          if (marker.type === "driver") {
            if (marker.vehicleType === "bike") iconToUse = bikeIcon;
            else if (marker.vehicleType === "auto") iconToUse = autoIcon;
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

        {/* 🔥 ROUTE */}
        {route.length > 0 && (
          <>
            {/* Soft shadow */}
            <Polyline
              positions={route}
              pathOptions={{
                color: "#000",
                weight: 10,
                opacity: 0.08,
              }}
            />

            {/* Main line */}
            <Polyline
              positions={route}
              pathOptions={{
                color: "#3b82f6",
                weight: 6,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {route.length > 0 && <RouteFitBounds route={route} />}

        {onMapClick && <MapEventsHandler onMapClick={onMapClick} />}

        {/* 🔥 Floating Button */}
        <CenterButton center={center} />
      </MapContainer>
    </div>
  );
}

// 🔥 Map click
function MapEventsHandler({ onMapClick }: any) {
  const map = useMap();

  useEffect(() => {
    map.on("click", (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    return () => map.off("click");
  }, []);

  return null;
}

// 🔥 Fit route
function RouteFitBounds({ route }: { route: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(route);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [route]);

  return null;
}

// 🔥 Smooth marker animation
function SmoothMarker({ position, icon, smooth }: any) {
  const ref = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!ref.current || !smooth) return;

    const marker = ref.current;
    const start = marker.getLatLng();
    const end = L.latLng(position[0], position[1]);

    const duration = 800;
    const startTime = performance.now();

    function animate(t: number) {
      const progress = Math.min((t - startTime) / duration, 1);

      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      marker.setLatLng([lat, lng]);

      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [position]);

  return <Marker ref={ref} position={position} icon={icon} />;
}