/**
 * Several independent GPS reads (fresh each time), then a weighted average of lat/lng.
 * Reduces random jump from a single noisy fix; still limited by device (WiFi vs real GPS).
 */
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function readOnce(highAccuracy: boolean, timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation non supportée'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: highAccuracy,
      maximumAge: 0,
      timeout: timeoutMs,
    });
  });
}

function accuracyMeters(p: GeolocationPosition): number {
  const a = p.coords.accuracy;
  if (typeof a === 'number' && Number.isFinite(a) && a > 0) return a;
  return 800;
}

function weightedCenter(samples: { lat: number; lng: number; acc: number }[]): {
  lat: number;
  lng: number;
  accuracyM: number;
} {
  let wSum = 0;
  let latSum = 0;
  let lngSum = 0;
  let minAcc = Infinity;
  for (const s of samples) {
    const a = Math.max(10, s.acc);
    const w = 1 / (a * a);
    wSum += w;
    latSum += s.lat * w;
    lngSum += s.lng * w;
    minAcc = Math.min(minAcc, s.acc);
  }
  return {
    lat: latSum / wSum,
    lng: lngSum / wSum,
    accuracyM: Number.isFinite(minAcc) ? minAcc : 500,
  };
}

export async function acquireBestGeolocation(options?: {
  timeoutMs?: number;
}): Promise<{ lat: number; lng: number; accuracyM: number }> {
  const timeoutMs = options?.timeoutMs ?? 22000;

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation non supportée');
  }

  const bucket: { lat: number; lng: number; acc: number }[] = [];

  const push = (p: GeolocationPosition) => {
    bucket.push({
      lat: p.coords.latitude,
      lng: p.coords.longitude,
      acc: accuracyMeters(p),
    });
  };

  const tryRead = async (highAccuracy: boolean, t: number) => {
    try {
      push(await readOnce(highAccuracy, t));
    } catch {
      /* ignore */
    }
  };

  await tryRead(true, timeoutMs);
  await delay(450);
  await tryRead(true, Math.min(16000, timeoutMs));
  await delay(450);
  await tryRead(true, Math.min(16000, timeoutMs));

  if (bucket.length === 0) {
    await tryRead(false, 18000);
  } else if (bucket.every((s) => s.acc > 200)) {
    await tryRead(false, 16000);
  }

  if (bucket.length === 0) {
    throw new Error('Aucune position');
  }

  return weightedCenter(bucket);
}
