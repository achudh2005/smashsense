/**
 * 4D Kalman Filter for 2D position and velocity: [x, y, vx, vy]
 * State transition:
 *   x_{k} = x_{k-1} + vx_{k-1} * dt
 *   y_{k} = y_{k-1} + vy_{k-1} * dt
 *   vx_{k} = vx_{k-1}
 *   vy_{k} = vy_{k-1}
 */
export class KalmanFilter2D {
  // State vector [x, y, vx, vy]
  private x: [number, number, number, number] = [0, 0, 0, 0];

  // Covariance matrix 4x4 (stored as 16 elements row-major)
  private P: number[] = [
    10, 0,  0,  0,
    0,  10, 0,  0,
    0,  0,  100, 0,
    0,  0,  0,  100
  ];

  // Process noise covariance
  private qPos: number;
  private qVel: number;

  // Measurement noise covariance
  private rPos: number;

  private initialized = false;

  constructor(options: { qPos?: number; qVel?: number; rPos?: number } = {}) {
    this.qPos = options.qPos ?? 0.1;
    this.qVel = options.qVel ?? 1.0;
    this.rPos = options.rPos ?? 2.0;
  }

  /**
   * Initializes or resets filter with initial observation
   */
  public init(x: number, y: number): void {
    this.x = [x, y, 0, 0];
    this.P = [
      10, 0, 0, 0,
      0, 10, 0, 0,
      0, 0, 100, 0,
      0, 0, 0, 100
    ];
    this.initialized = true;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Prediction step
   * @param dt Time delta in seconds
   */
  public predict(dt: number = 1 / 30): [number, number] {
    if (!this.initialized) return [0, 0];

    // State transition x = F * x
    this.x[0] += this.x[2] * dt;
    this.x[1] += this.x[3] * dt;

    // Covariance update: P = F * P * F^T + Q
    // F = [1 0 dt 0; 0 1 0 dt; 0 0 1 0; 0 0 0 1]
    const dt2 = dt * dt;
    this.P[0] += dt * (this.P[8] + this.P[2]) + dt2 * this.P[10] + this.qPos;
    this.P[1] += dt * (this.P[9] + this.P[3]) + dt2 * this.P[11];
    this.P[4] += dt * (this.P[12] + this.P[6]) + dt2 * this.P[14];
    this.P[5] += dt * (this.P[13] + this.P[7]) + dt2 * this.P[15] + this.qPos;

    this.P[10] += this.qVel;
    this.P[15] += this.qVel;

    return [this.x[0], this.x[1]];
  }

  /**
   * Correction / Update step with measured position
   */
  public update(mx: number, my: number): [number, number] {
    if (!this.initialized) {
      this.init(mx, my);
      return [mx, my];
    }

    // Residual (innovation)
    const y0 = mx - this.x[0];
    const y1 = my - this.x[1];

    // Innovation covariance S = H * P * H^T + R
    const s00 = this.P[0] + this.rPos;
    const s01 = this.P[1];
    const s10 = this.P[4];
    const s11 = this.P[5] + this.rPos;

    // S inverse (2x2 determinant)
    const det = s00 * s11 - s01 * s10;
    if (Math.abs(det) < 1e-8) {
      return [this.x[0], this.x[1]];
    }
    const invDet = 1.0 / det;
    const is00 = s11 * invDet;
    const is01 = -s01 * invDet;
    const is10 = -s10 * invDet;
    const is11 = s00 * invDet;

    // Kalman gain K = P * H^T * S^-1 (4x2 matrix)
    // H is [1 0 0 0; 0 1 0 0]
    const k00 = this.P[0] * is00 + this.P[1] * is10;
    const k01 = this.P[0] * is01 + this.P[1] * is11;
    const k10 = this.P[4] * is00 + this.P[5] * is10;
    const k11 = this.P[4] * is01 + this.P[5] * is11;
    const k20 = this.P[8] * is00 + this.P[9] * is10;
    const k21 = this.P[8] * is01 + this.P[9] * is11;
    const k30 = this.P[12] * is00 + this.P[13] * is10;
    const k31 = this.P[12] * is01 + this.P[13] * is11;

    // State update x = x + K * y
    this.x[0] += k00 * y0 + k01 * y1;
    this.x[1] += k10 * y0 + k11 * y1;
    this.x[2] += k20 * y0 + k21 * y1;
    this.x[3] += k30 * y0 + k31 * y1;

    // Covariance update P = (I - K * H) * P
    const p0 = this.P[0] - (k00 * this.P[0] + k01 * this.P[4]);
    const p1 = this.P[1] - (k00 * this.P[1] + k01 * this.P[5]);
    const p5 = this.P[5] - (k10 * this.P[1] + k11 * this.P[5]);
    const p4 = this.P[4] - (k10 * this.P[0] + k11 * this.P[4]);

    this.P[0] = p0;
    this.P[1] = p1;
    this.P[4] = p4;
    this.P[5] = p5;

    return [this.x[0], this.x[1]];
  }

  public getPosition(): [number, number] {
    return [this.x[0], this.x[1]];
  }

  public getVelocity(): [number, number] {
    return [this.x[2], this.x[3]];
  }
}
