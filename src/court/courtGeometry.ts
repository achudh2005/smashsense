/**
 * Standard Badminton World Federation (BWF) Court Dimensions (in meters)
 * Coordinate origin (0, 0) is at the Top-Left corner of the full court (Team A back left).
 * X-axis runs along the width (0 to 6.10m).
 * Y-axis runs along the length (0 to 13.40m).
 * Net is located at y = 6.70m.
 */
export interface CourtDimensions {
  length: number;           // 13.40m
  widthDoubles: number;     // 6.10m
  widthSingles: number;     // 5.18m (0.46m margin on each side)
  singlesSideMargin: number;// 0.46m
  shortServiceDistance: number; // 1.98m from net (4.72m and 8.68m)
  doublesLongServiceDistance: number; // 0.76m from back baseline (0.76m and 12.64m)
  netY: number;             // 6.70m
  netHeightCenter: number;  // 1.524m
  netHeightPosts: number;   // 1.55m
}

export const BWF_COURT: CourtDimensions = {
  length: 13.40,
  widthDoubles: 6.10,
  widthSingles: 5.18,
  singlesSideMargin: 0.46,
  shortServiceDistance: 1.98,
  doublesLongServiceDistance: 0.76,
  netY: 6.70,
  netHeightCenter: 1.524,
  netHeightPosts: 1.55,
};

export interface Point2D {
  x: number;
  y: number;
}

export interface LineSegment {
  from: Point2D;
  to: Point2D;
  label?: string;
  isNet?: boolean;
}

/**
 * Returns all key line segments of a standard badminton court in metric court coordinates.
 */
export function getStandardCourtLines(): LineSegment[] {
  const { length, widthDoubles, singlesSideMargin, netY, shortServiceDistance, doublesLongServiceDistance } = BWF_COURT;
  const halfWidth = widthDoubles / 2;

  const shortServiceA = netY - shortServiceDistance; // 4.72m
  const shortServiceB = netY + shortServiceDistance; // 8.68m
  const longServiceA = doublesLongServiceDistance;    // 0.76m
  const longServiceB = length - doublesLongServiceDistance; // 12.64m
  const singlesLeft = singlesSideMargin;               // 0.46m
  const singlesRight = widthDoubles - singlesSideMargin; // 5.64m

  return [
    // Outer boundary (Doubles lines)
    { from: { x: 0, y: 0 }, to: { x: widthDoubles, y: 0 }, label: 'Baseline Team A' },
    { from: { x: widthDoubles, y: 0 }, to: { x: widthDoubles, y: length }, label: 'Right Doubles Sideline' },
    { from: { x: widthDoubles, y: length }, to: { x: 0, y: length }, label: 'Baseline Team B' },
    { from: { x: 0, y: length }, to: { x: 0, y: 0 }, label: 'Left Doubles Sideline' },

    // Singles sidelines
    { from: { x: singlesLeft, y: 0 }, to: { x: singlesLeft, y: length }, label: 'Left Singles Sideline' },
    { from: { x: singlesRight, y: 0 }, to: { x: singlesRight, y: length }, label: 'Right Singles Sideline' },

    // Doubles Long Service Lines
    { from: { x: 0, y: longServiceA }, to: { x: widthDoubles, y: longServiceA }, label: 'Doubles Long Service Line A' },
    { from: { x: 0, y: longServiceB }, to: { x: widthDoubles, y: longServiceB }, label: 'Doubles Long Service Line B' },

    // Short Service Lines
    { from: { x: 0, y: shortServiceA }, to: { x: widthDoubles, y: shortServiceA }, label: 'Short Service Line A' },
    { from: { x: 0, y: shortServiceB }, to: { x: widthDoubles, y: shortServiceB }, label: 'Short Service Line B' },

    // Center Service Lines (from short service line to back baseline)
    { from: { x: halfWidth, y: 0 }, to: { x: halfWidth, y: shortServiceA }, label: 'Center Line Team A' },
    { from: { x: halfWidth, y: shortServiceB }, to: { x: halfWidth, y: length }, label: 'Center Line Team B' },

    // The Net
    { from: { x: -0.1, y: netY }, to: { x: widthDoubles + 0.1, y: netY }, label: 'Net', isNet: true },
  ];
}

/**
 * Standard 4 corners of the court in metric space (Order: Top-Left, Top-Right, Bottom-Right, Bottom-Left)
 */
export const STANDARD_COURT_CORNERS: Point2D[] = [
  { x: 0, y: 0 },                           // Top-Left (Team A far left)
  { x: BWF_COURT.widthDoubles, y: 0 },      // Top-Right (Team A far right)
  { x: BWF_COURT.widthDoubles, y: BWF_COURT.length }, // Bottom-Right (Team B near right)
  { x: 0, y: BWF_COURT.length },            // Bottom-Left (Team B near left)
];
