export async function fetchEvents({ impact, type }) {
  const params = new URLSearchParams();
  if (impact && impact !== "all") {
    params.set("impact", impact);
  }
  if (type && type !== "all") {
    params.set("type", type);
  }

  const url = params.toString() ? `/events?${params}` : "/events";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load events");
  }
  return response.json();
}

export async function createSource({ url, eventType }) {
  const response = await fetch("/sources", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, event_type: eventType }),
  });

  if (!response.ok) {
    throw new Error("Failed to create source");
  }

  return response.json();
}
