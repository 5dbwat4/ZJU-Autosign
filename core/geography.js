import Decimal from "decimal.js";

Decimal.set({ precision: 100 });

function decimalHaversineDist(lon, lat, lon_i, lat_i, R) {
  const DEG = Decimal.acos(-1).div(180);

  const λ  = new Decimal(lon).mul(DEG);
  const φ  = new Decimal(lat).mul(DEG);
  const λi = new Decimal(lon_i).mul(DEG);
  const φi = new Decimal(lat_i).mul(DEG);

  const dφ = φ.minus(φi);
  const dλ = λ.minus(λi);

  const sin_dφ_2 = dφ.div(2).sin().pow(2);
  const sin_dλ_2 = dλ.div(2).sin().pow(2);

  const h = sin_dφ_2.plus(
    φ.cos().mul(φi.cos()).mul(sin_dλ_2)
  );

  const deltaSigma = Decimal.asin(h.sqrt()).mul(2);

  return R.mul(deltaSigma);
}

function residualsDecimal(lon, lat, points, radius) {
  return points.map((point) => {
    const dist = decimalHaversineDist(lon, lat, point.lon, point.lat, radius);
    return new Decimal(point.d).minus(dist);
  });
}

function jacobianDecimal(lon, lat, points, radius) {
  const eps = new Decimal("1e-12");

  const base = residualsDecimal(lon, lat, points, radius);
  const resLon = residualsDecimal(new Decimal(lon).plus(eps), lat, points, radius);
  const resLat = residualsDecimal(lon, new Decimal(lat).plus(eps), points, radius);

  return points.map((_, index) => {
    const dLon = resLon[index].minus(base[index]).div(eps).neg();
    const dLat = resLat[index].minus(base[index]).div(eps).neg();
    return [dLon, dLat];
  });
}

function gaussNewtonDecimal(points, lon0, lat0, radius) {
  let lon = new Decimal(lon0);
  let lat = new Decimal(lat0);

  for (let iter = 0; iter < 30; iter++) {
    const residuals = residualsDecimal(lon, lat, points, radius);
    const jacobian = jacobianDecimal(lon, lat, points, radius);

    let jtj = [
      [new Decimal(0), new Decimal(0)],
      [new Decimal(0), new Decimal(0)],
    ];
    let jtr = [new Decimal(0), new Decimal(0)];

    for (let i = 0; i < points.length; i++) {
      const j = jacobian[i];
      const r = residuals[i];

      jtj[0][0] = jtj[0][0].plus(j[0].mul(j[0]));
      jtj[0][1] = jtj[0][1].plus(j[0].mul(j[1]));
      jtj[1][0] = jtj[1][0].plus(j[1].mul(j[0]));
      jtj[1][1] = jtj[1][1].plus(j[1].mul(j[1]));

      jtr[0] = jtr[0].plus(j[0].mul(r));
      jtr[1] = jtr[1].plus(j[1].mul(r));
    }

    const det = jtj[0][0].mul(jtj[1][1]).minus(jtj[0][1].mul(jtj[1][0]));
    const inv = [
      [jtj[1][1].div(det), jtj[0][1].neg().div(det)],
      [jtj[1][0].neg().div(det), jtj[0][0].div(det)],
    ];

    const dLon = inv[0][0].mul(jtr[0]).plus(inv[0][1].mul(jtr[1]));
    const dLat = inv[1][0].mul(jtr[0]).plus(inv[1][1].mul(jtr[1]));

    lon = lon.plus(dLon);
    lat = lat.plus(dLat);

    if (dLon.abs().lt("1e-14") && dLat.abs().lt("1e-14")) {
      break;
    }
  }

  return { lon, lat };
}

function rmsDecimal(lon, lat, points, radius) {
  const sum = points.reduce((acc, point) => {
    const dModel = decimalHaversineDist(lon, lat, point.lon, point.lat, radius);
    const diff = new Decimal(point.d).minus(dModel);
    return acc.plus(diff.mul(diff));
  }, new Decimal(0));

  return sum.div(points.length).sqrt();
}

export function solveSphereLeastSquaresDecimal(rawPoints) {
  const lon0 = rawPoints.reduce((sum, point) => sum + point.lon, 0) / rawPoints.length;
  const lat0 = rawPoints.reduce((sum, point) => sum + point.lat, 0) / rawPoints.length;
  const radius = new Decimal("6372999.26");

  const result = gaussNewtonDecimal(rawPoints, lon0, lat0, radius);
  const rms = rmsDecimal(result.lon, result.lat, rawPoints, radius);

  return {
    lon: Number(result.lon),
    lat: Number(result.lat),
    rms: Number(rms),
  };
}
