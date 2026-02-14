export async function fetchEvents({ impact, type, region }) {
  const params = new URLSearchParams();
  if (impact && impact !== "all") {
    params.set("impact", impact);
  }
  if (type && type !== "all") {
    params.set("type", type);
  }
  if (region && region !== "all") {
    params.set("region", region);
  }

  const url = params.toString() ? `/events?${params}` : "/events";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load events");
  }
  return response.json();
}

export async function fetchGeoSummary() {
  const response = await fetch("/events/geo-summary");
  if (!response.ok) {
    throw new Error("Failed to load geo summary");
  }
  return response.json();
}

export async function createSource({ url, eventType, sourceType }) {
  const response = await fetch("/sources", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      event_type: eventType,
      source_type: sourceType || "news",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create source");
  }

  return response.json();
}

export async function fetchNarratives() {
  const response = await fetch("/narratives");
  if (!response.ok) {
    throw new Error("Failed to load narratives");
  }
  return response.json();
}
