import { Point2D, STANDARD_COURT_CORNERS } from './courtGeometry';

/**
 * 3x3 Homography Matrix represented as row-major flat 9-number tuple or 3x3 array
 */
export type Matrix3x3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export interface HomographyResult {
  matrix: Matrix3x3;
  inverse: Matrix3x3;
}

/**
 * Solves an 8x8 linear system using Gaussian elimination with partial pivoting.
 * A * x = b
 */
function solve8x8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxVal) {
        maxVal = Math.abs(M[k][i]);
        maxRow = k;
      }
    }

    if (maxVal < 1e-12) {
      throw new Error('Collinear or degenerate points: cannot compute homography');
    }

    // Swap rows
    if (maxRow !== i) {
      const temp = M[i];
      M[i] = M[maxRow];
      M[maxRow] = temp;
    }

    // Pivot normalization
    const pivot = M[i][i];
    for (let j = i; j <= n; j++) {
      M[i][j] /= pivot;
    }

    // Eliminate below and above
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  return M.map(row => row[n]);
}

/**
 * Computes the 3x3 homography matrix mapping srcPoints -> dstPoints.
 * Expects exactly 4 srcPoints and 4 dstPoints in consistent order:
 * [Top-Left, Top-Right, Bottom-Right, Bottom-Left].
 */
export function computeHomography(srcPoints: Point2D[], dstPoints: Point2D[]): Matrix3x3 {
  if (srcPoints.length !== 4 || dstPoints.length !== 4) {
    throw new Error('Homography requires exactly 4 source and 4 destination points');
  }

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = srcPoints[i];
    const { x: u, y: v } = dstPoints[i];

    // Row 1: h00*x + h01*y + h02 - u*h20*x - u*h21*y = u
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);

    // Row 2: h10*x + h11*y + h12 - v*h20*x - v*h21*y = v
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solve8x8(A, b);

  return [
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    h[6], h[7], 1.0
  ];
}

/**
 * Inverts a 3x3 matrix.
 */
export function invert3x3(m: Matrix3x3): Matrix3x3 {
  const [
    a, b, c,
    d, e, f,
    g, h, i
  ] = m;

  const det =
    a * (e * i - f * h) -
    b * (d * i - f * g) +
    c * (d * h - e * g);

  if (Math.abs(det) < 1e-12) {
    throw new Error('Singular matrix cannot be inverted');
  }

  const invDet = 1.0 / det;

  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,

    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,

    (d * h - e * g) * invDet,
    (g * b - a * h) * invDet,
    (a * e - b * d) * invDet
  ];
}

/**
 * Projects a 2D point using a 3x3 homography matrix.
 */
export function projectPoint(m: Matrix3x3, pt: Point2D): Point2D {
  const x = pt.x;
  const y = pt.y;

  const w = m[6] * x + m[7] * y + m[8];
  if (Math.abs(w) < 1e-8) {
    return { x: 0, y: 0 };
  }

  const px = (m[0] * x + m[1] * y + m[2]) / w;
  const py = (m[3] * x + m[4] * y + m[5]) / w;

  return { x: px, y: py };
}

/**
 * Helper to compute full court calibration pair:
 * - courtToImage: transforms standard court meter coords -> camera image pixels
 * - imageToCourt: transforms camera image pixels -> standard court meter coords
 */
export function computeCourtCalibration(userScreenCorners: Point2D[]): HomographyResult {
  const courtCorners = STANDARD_COURT_CORNERS;
  const courtToImage = computeHomography(courtCorners, userScreenCorners);
  const imageToCourt = invert3x3(courtToImage);

  return {
    matrix: courtToImage,
    inverse: imageToCourt
  };
}

/**
 * Checks if a point in court metric coordinates (x, y) is inside the court or within a margin.
 */
export function isPointInCourt(pt: Point2D, marginMeters = 0.5): boolean {
  return (
    pt.x >= -marginMeters &&
    pt.x <= 6.10 + marginMeters &&
    pt.y >= -marginMeters &&
    pt.y <= 13.40 + marginMeters
  );
}
