// Haversine formula to calculate distance between two coordinates
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

export const findNearestMechanic = (
  customerLat: number,
  customerLon: number,
  mechanics: any[]
): any | null => {
  let nearest = null;
  let minDistance = Infinity;

  for (const mechanic of mechanics) {
    if (!mechanic.is_available || !mechanic.lat || !mechanic.lon) continue;

    const distance = calculateDistance(
      customerLat,
      customerLon,
      mechanic.lat,
      mechanic.lon
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...mechanic, distance };
    }
  }

  return nearest;
};

export const calculateETA = (distance: number): number => {
  // Assuming average speed of 40 km/h
  const speed = 40;
  const hours = distance / speed;
  const minutes = Math.round(hours * 60);
  return minutes;
};
