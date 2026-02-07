import { useEffect, useRef } from "react";
import L from "leaflet";
import { worldCoordinates } from "../data/worldCoordinates"; // Updated
import "../styles/map.css";

export function MapVisualization({ geoData, selectedRegion, onRegionClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map (World View)
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(
        [20.0, 0.0], // Center of the world approximately
        2, // Zoom level 2 for whole world
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

    // Add markers for each COUNTRY with data
    Object.entries(geoData).forEach(([countryCode, count]) => {
      if (countryCode === "GLOBAL" || !worldCoordinates[countryCode]) return;

      const coords = worldCoordinates[countryCode];
      const isSelected = selectedRegion === countryCode; // selectedRegion now holds ISO code
      const size = Math.min(Math.max(count * 6, 20), 50); // Adjusted scale for world map

      const html = `
        <div class="map-badge ${isSelected ? "selected" : ""}">
          <div class="badge-content">
            <div class="badge-uf">${countryCode}</div> 
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
        onRegionClick(countryCode);
      });

      markersRef.current[countryCode] = marker;
    });
  }, [geoData, selectedRegion, onRegionClick]);

  return <div ref={mapRef} className="map-container" />;
}
