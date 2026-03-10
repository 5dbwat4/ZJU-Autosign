import { v4 as uuidv4 } from "uuid";

import { RADAR_INFO } from "./constants.js";
import { solveSphereLeastSquaresDecimal } from "./geography.js";
import { notify } from "./notifications.js";

async function sendRadarAnswer(courses, rid, lon, lat) {
  const response = await courses.fetch(
    `https://courses.zju.edu.cn/api/rollcall/${rid}/answer?api_version=1.1.2`,
    {
      body: JSON.stringify({
        deviceId: uuidv4(),
        latitude: lat,
        longitude: lon,
        speed: null,
        accuracy: 68,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
      }),
      method: "PUT",
      headers: { "Content-Type": "application/json" },
    }
  );

  try {
    return await response.json();
  } catch (error) {
    console.log("[Autosign][JSON error]", error);
    return null;
  }
}

export async function answerRadarRollcall(courses, rid, preferredRadarXY) {
  const outcomes = [];

  if (preferredRadarXY) {
    const outcome = await sendRadarAnswer(courses, rid, preferredRadarXY[0], preferredRadarXY[1]);
    if (outcome?.status_name === "on_call_fine") {
      return true;
    }
    outcomes.push([preferredRadarXY, outcome]);
  }

  for (const beacon of Object.values(RADAR_INFO)) {
    const outcome = await sendRadarAnswer(courses, rid, beacon[0], beacon[1]);

    if (outcome?.status_name === "on_call_fine") {
      return true;
    }
    outcomes.push([beacon, outcome]);
  }

  const points = outcomes
    .map(([coord, outcome]) => {
      const distance = Number(outcome?.distance ?? outcome?.data?.distance ?? outcome?.result?.distance);
      if (!Number.isFinite(distance) || distance <= 0) {
        return null;
      }
      return { lon: coord[0], lat: coord[1], d: distance };
    })
    .filter(Boolean);

  if (points.length < 3) {
    return false;
  }

  const estimate = solveSphereLeastSquaresDecimal(points);
  const finalOutcome = await sendRadarAnswer(courses, rid, estimate.lon, estimate.lat);

  if (finalOutcome?.status_name === "on_call_fine") {
    notify("default",`[Autosign] Estimated position success: ${estimate.lon}, ${estimate.lat}`);
    return true;
  }

  return false;
}
