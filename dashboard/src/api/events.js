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
