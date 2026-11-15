// Horn's 3x3 gradient estimate. Values are kept continuous in degrees; this
// module deliberately does not turn any threshold into a "safe" classification.
export function calculateSlopeDegrees({ elevations, width, height, pixelSizeX, pixelSizeY }) {
  if (!(elevations instanceof Float32Array || elevations instanceof Float64Array || Array.isArray(elevations))) {
    throw new TypeError('DEM elevations must be a numeric array.');
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3 || elevations.length !== width * height) {
    throw new RangeError('DEM dimensions must describe a grid of at least 3 by 3 cells.');
  }
  if (!(pixelSizeX > 0) || !(pixelSizeY > 0)) throw new RangeError('DEM pixel sizes must be positive metres.');

  const slopes = new Float32Array(width * height);
  slopes.fill(Number.NaN);
  const at = (x, y) => elevations[y * width + x];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const neighborhood = [
        at(x - 1, y - 1), at(x, y - 1), at(x + 1, y - 1),
        at(x - 1, y), at(x, y), at(x + 1, y),
        at(x - 1, y + 1), at(x, y + 1), at(x + 1, y + 1),
      ];
      if (neighborhood.some((value) => !Number.isFinite(value))) continue;
      const dzdx = ((neighborhood[2] + 2 * neighborhood[5] + neighborhood[8]) - (neighborhood[0] + 2 * neighborhood[3] + neighborhood[6])) / (8 * pixelSizeX);
      const dzdy = ((neighborhood[6] + 2 * neighborhood[7] + neighborhood[8]) - (neighborhood[0] + 2 * neighborhood[1] + neighborhood[2])) / (8 * pixelSizeY);
      slopes[y * width + x] = Math.atan(Math.hypot(dzdx, dzdy)) * 180 / Math.PI;
    }
  }
  return slopes;
}
