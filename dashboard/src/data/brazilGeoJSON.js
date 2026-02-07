// Simplified GeoJSON of Brazil states with centroids for badge positioning
export const brazilGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Acre", uf: "AC" },
      geometry: {
        type: "Point",
        coordinates: [-67.5, -8.76],
      },
    },
    {
      type: "Feature",
      properties: { name: "Alagoas", uf: "AL" },
      geometry: {
        type: "Point",
        coordinates: [-37.5, -9.5],
      },
    },
    {
      type: "Feature",
      properties: { name: "Amapá", uf: "AP" },
      geometry: {
        type: "Point",
        coordinates: [-52.5, 2.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Amazonas", uf: "AM" },
      geometry: {
        type: "Point",
        coordinates: [-65.0, -3.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Bahia", uf: "BA" },
      geometry: {
        type: "Point",
        coordinates: [-45.0, -12.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Ceará", uf: "CE" },
      geometry: {
        type: "Point",
        coordinates: [-39.5, -5.5],
      },
    },
    {
      type: "Feature",
      properties: { name: "Distrito Federal", uf: "DF" },
      geometry: {
        type: "Point",
        coordinates: [-47.88, -15.79],
      },
    },
    {
      type: "Feature",
      properties: { name: "Espírito Santo", uf: "ES" },
      geometry: {
        type: "Point",
        coordinates: [-40.5, -19.5],
      },
    },
    {
      type: "Feature",
      properties: { name: "Goiás", uf: "GO" },
      geometry: {
        type: "Point",
        coordinates: [-50.0, -16.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Maranhão", uf: "MA" },
      geometry: {
        type: "Point",
        coordinates: [-45.5, -7.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Mato Grosso", uf: "MT" },
      geometry: {
        type: "Point",
        coordinates: [-55.5, -12.5],
      },
    },
    {
      type: "Feature",
      properties: { name: "Mato Grosso do Sul", uf: "MS" },
      geometry: {
        type: "Point",
        coordinates: [-55.0, -20.5],
      },
    },
    {
      type: "Feature",
      properties: { name: "Minas Gerais", uf: "MG" },
      geometry: {
        type: "Point",
        coordinates: [-44.5, -19.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Pará", uf: "PA" },
      geometry: {
        type: "Point",
        coordinates: [-54.0, -5.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Paraíba", uf: "PB" },
      geometry: {
        type: "Point",
        coordinates: [-37.0, -7.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Paraná", uf: "PR" },
      geometry: {
        type: "Point",
        coordinates: [-51.5, -24.5],
      },
    },
    {
      type: "Feature",
      properties: { name: "Pernambuco", uf: "PE" },
      geometry: {
        type: "Point",
        coordinates: [-37.5, -8.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Piauí", uf: "PI" },
      geometry: {
        type: "Point",
        coordinates: [-42.0, -7.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Rio de Janeiro", uf: "RJ" },
      geometry: {
        type: "Point",
        coordinates: [-42.0, -22.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Rio Grande do Norte", uf: "RN" },
      geometry: {
        type: "Point",
        coordinates: [-36.5, -5.5],
      },
    },
    {
      type: "Feature",
      properties: { name: "Rio Grande do Sul", uf: "RS" },
      geometry: {
        type: "Point",
        coordinates: [-54.0, -28.5],
      },
    },
    {
      type: "Feature",
      properties: { name: "Rondônia", uf: "RO" },
      geometry: {
        type: "Point",
        coordinates: [-63.0, -10.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Roraima", uf: "RR" },
      geometry: {
        type: "Point",
        coordinates: [-61.0, 3.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Santa Catarina", uf: "SC" },
      geometry: {
        type: "Point",
        coordinates: [-50.5, -28.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "São Paulo", uf: "SP" },
      geometry: {
        type: "Point",
        coordinates: [-48.5, -21.5],
      },
    },
    {
      type: "Feature",
      properties: { name: "Sergipe", uf: "SE" },
      geometry: {
        type: "Point",
        coordinates: [-37.5, -10.0],
      },
    },
    {
      type: "Feature",
      properties: { name: "Tocantins", uf: "TO" },
      geometry: {
        type: "Point",
        coordinates: [-49.0, -10.0],
      },
    },
  ],
};

// Map for quick lookup
export const stateCoordinates = {};
brazilGeoJSON.features.forEach((feature) => {
  const uf = feature.properties.uf;
  stateCoordinates[uf] = {
    name: feature.properties.name,
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
  };
});
