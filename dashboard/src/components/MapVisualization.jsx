import { useEffect, useRef } from "react";
import L from "leaflet";
import { stateCoordinates } from "../data/brazilGeoJSON";
import "../styles/map.css";

export function MapVisualization({ geoData, selectedRegion, onRegionClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(
        [-14.24, -51.92],
        4,
      );

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current = {};

    // Add markers for each state with data
    Object.entries(geoData).forEach(([uf, count]) => {
      if (uf === "BR" || !stateCoordinates[uf]) return;

      const coords = stateCoordinates[uf];
      const isSelected = selectedRegion === uf;
      const size = Math.min(Math.max(count * 8, 20), 60); // Scale from 20 to 60px

      const html = `
        <div class="map-badge ${isSelected ? "selected" : ""}">
          <div class="badge-content">
            <div class="badge-uf">${uf}</div>
            <div class="badge-count">${count}</div>
          </div>
        </div>
      `;

      const marker = L.marker([coords.lat, coords.lng], {
        icon: L.divIcon({
          html,
          iconSize: [size, size],
          className: "map-marker-container",
        }),
      }).addTo(map);

      // Handle click to filter
      marker.on("click", () => {
        onRegionClick(uf);
      });

      markersRef.current[uf] = marker;
    });
  }, [geoData, selectedRegion, onRegionClick]);

  return <div ref={mapRef} className="map-container" />;
}
