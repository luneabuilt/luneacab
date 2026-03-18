import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { useRef } from "react";

// Fix for default Leaflet marker icons in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41], // ✅ ADD THIS
});
L.Marker.prototype.options.icon = DefaultIcon;

// 🚗 Car icon
const carIcon = new L.Icon({
  iconUrl: "/icons/car.png",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// 🏍 Bike icon
const bikeIcon = new L.Icon({
  iconUrl: "/icons/bike.png",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
});

// 🛺 Auto icon
const autoIcon = new L.Icon({
  iconUrl: "/icons/auto.png",
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
});

// User location icon
const userIcon = new L.Icon({
  iconUrl: "/icons/passenger.png",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

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
        center={[center.lat, center.lng] as [number, number]}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full rounded-none md:rounded-3xl z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Recenter helper */}
        <MapRecenter
          lat={center.lat}
          lng={center.lng}
          follow={route.length > 0}
        />

        {/* Render Markers */}
        {markers.map((marker) => {
          let iconToUse = userIcon;

        if (marker.type === "driver") {
          const type = marker.vehicleType?.toLowerCase();

          if (type === "bike") {
            iconToUse = bikeIcon;
          } else if (type === "auto") {
            iconToUse = autoIcon;
          } else {
            iconToUse = carIcon;
          }
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

        {route.length > 0 && (
          <>
            {/* Shadow Route */}
            <Polyline
              positions={route}
              pathOptions={{
                color: "#000000",
                weight: 10,
                opacity: 0.15,
                lineCap: "round",
                lineJoin: "round",
              }}
            />

            {/* Main Route */}
            <Polyline
              positions={route}
              pathOptions={{
                color: "#2563eb",
                weight: 6,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {route.length > 0 ? (
          <RouteFitBounds route={route} />
        ) : markers.length > 1 ? (
          <FitBounds markers={markers} />
        ) : null}

        {/* Map Click Handler */}
        {onMapClick && <MapEventsHandler onMapClick={onMapClick} />}
      </MapContainer>
    </div>
  );
}

function MapEventsHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    map.on("click", (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });
    return () => {
      map.off("click");
    };
  }, [map, onMapClick]);
  return null;
}
function FitBounds({ markers }: { markers: { lat: number; lng: number }[] }) {
  const map = useMap();

  useEffect(() => {
    if (!markers.length) return;

    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [markers, map]);

  return null;
}
function RouteFitBounds({ route }: { route: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!route.length) return;

    const bounds = L.latLngBounds(route.map((point) => [point[0], point[1]]));

    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 16,
    });
  }, [route, map]);

  return null;
}
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

    const duration = 1000; // 1 second smooth move
    const startTime = performance.now();

    function animate(time: number) {
      const progress = Math.min((time - startTime) / duration, 1);

      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      marker.setLatLng([lat, lng]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [position]);

  return <Marker ref={markerRef} position={position} icon={icon} />;
  
}
