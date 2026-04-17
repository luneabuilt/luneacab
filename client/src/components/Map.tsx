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

// 🔥 Recenter (SAFE FIX)
function MapRecenter({
  lat,
  lng,
  follow = false,
}: {
  lat: number;
  lng: number;
  follow?: boolean;
}) {
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

// 🔥 Floating center button
function CenterButton({
  center,
}: {
  center: { lat: number; lng: number };
}) {
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
    <div className={`relative ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full rounded-2xl overflow-hidden z-0"
      >
        {/* LIGHT PREMIUM MAP */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        {/* Zoom controls */}
        <ZoomControl position="topright" />

        {/* Keep original follow logic */}
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

        {/* KEEP BOTH (IMPORTANT FIX) */}
        {route.length > 0 ? (
          <RouteFitBounds route={route} />
        ) : markers.length > 1 ? (
          <FitBounds markers={markers} />
        ) : null}

        {/* Click */}
        {onMapClick && <MapEventsHandler onMapClick={onMapClick} />}

        {/* Premium Button */}
        <CenterButton center={center} />
      </MapContainer>
    </div>
  );
}

// 🔥 Click handler FIXED CLEANUP
function MapEventsHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on("click", handler);
    return () => map.off("click", handler);
  }, [map, onMapClick]);

  return null;
}

// 🔥 Fit markers (RESTORED)
function FitBounds({
  markers,
}: {
  markers: { lat: number; lng: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!markers.length) return;

    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng])
    );

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [markers, map]);

  return null;
}

// 🔥 Fit route
function RouteFitBounds({
  route,
}: {
  route: [number, number][];
}) {
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

// 🔥 Smooth marker
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

    const duration = 900;
    const startTime = performance.now();

    function animate(time: number) {
      const progress = Math.min((time - startTime) / duration, 1);

      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      marker.setLatLng([lat, lng]);

      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [position, smooth]);

  return <Marker ref={markerRef} position={position} icon={icon} />;
}