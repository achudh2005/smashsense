import { BoundingBox, PlayerRole, TrackedPlayer } from '../tracking/byteTrack';
import { MatchConfig } from '../game/gameState';

export interface JerseyColor {
  hex: string;
  name: string;
  isLight: boolean;
}

export interface PlayerIdentificationResult {
  role: PlayerRole;
  customName: string;
  team: 'A' | 'B';
  courtSide: 'Near Court (Team B)' | 'Far Court (Team A)';
  jerseyColor: JerseyColor;
  identificationConfidence: number;
}

/**
 * Maps RGB values to standard badminton jersey color descriptors
 */
export function classifyJerseyColor(r: number, g: number, b: number): JerseyColor {
  // Convert RGB to HSL
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;

  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h *= 60;
  }

  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const isLight = l > 0.55;

  // Classify by Hue and Lightness
  if (s < 0.15) {
    if (l > 0.75) return { hex: '#f8fafc', name: 'White', isLight: true };
    if (l < 0.25) return { hex: '#1e293b', name: 'Black', isLight: false };
    return { hex: '#64748b', name: 'Gray', isLight };
  }

  if (h >= 345 || h < 15) {
    return { hex, name: l < 0.4 ? 'Crimson' : 'Red', isLight };
  }
  if (h >= 15 && h < 45) {
    return { hex, name: 'Orange', isLight: true };
  }
  if (h >= 45 && h < 70) {
    return { hex, name: 'Yellow', isLight: true };
  }
  if (h >= 70 && h < 165) {
    return { hex, name: l < 0.35 ? 'Dark Green' : 'Green', isLight };
  }
  if (h >= 165 && h < 195) {
    return { hex, name: 'Teal', isLight };
  }
  if (h >= 195 && h < 255) {
    return { hex, name: l < 0.35 ? 'Navy Blue' : 'Royal Blue', isLight: l >= 0.5 };
  }
  if (h >= 255 && h < 315) {
    return { hex, name: 'Purple', isLight };
  }
  return { hex, name: 'Magenta', isLight };
}

/**
 * Extracts average jersey color from the torso region of player bounding box
 */
export function extractJerseyColorFromImageData(
  imageData: ImageData | undefined | null,
  bbox: BoundingBox
): JerseyColor {
  if (!imageData) {
    // Default fallback styling
    return { hex: '#38bdf8', name: 'Team Jersey', isLight: true };
  }

  const { data, width, height } = imageData;

  // Torso region: 18% to 45% of height, 25% to 75% of width
  const startX = Math.max(0, Math.floor(bbox.x + bbox.width * 0.25));
  const endX = Math.min(width, Math.floor(bbox.x + bbox.width * 0.75));
  const startY = Math.max(0, Math.floor(bbox.y + bbox.height * 0.18));
  const endY = Math.min(height, Math.floor(bbox.y + bbox.height * 0.48));

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 2) {
    const rowOffset = y * width * 4;
    for (let x = startX; x < endX; x += 2) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Exclude court background green and extreme shadows
      const isGreenFloor = g > 80 && g > r * 1.2 && g > b * 1.2;
      if (!isGreenFloor && (r + g + b) > 60) {
        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }
    }
  }

  if (count === 0) {
    return { hex: '#0284c7', name: 'Blue', isLight: false };
  }

  return classifyJerseyColor(rSum / count, gSum / count, bSum / count);
}

/**
 * Intelligent player role identifier based on court position, geometry, and match config
 */
export class PlayerIdentifier {
  private lockedRoles = new Map<number, PlayerIdentificationResult>();

  public reset(): void {
    this.lockedRoles.clear();
  }

  /**
   * Identify all active players on the court and assign roles/teams
   */
  public identifyPlayers(
    players: TrackedPlayer[],
    config: MatchConfig,
    imageData?: ImageData | null
  ): Map<number, PlayerIdentificationResult> {
    const results = new Map<number, PlayerIdentificationResult>();
    if (players.length === 0) return results;

    // Split players into Team A (Far Court) and Team B (Near Court)
    // Court Y = 6.70m is the net line
    const farPlayers: TrackedPlayer[] = [];
    const nearPlayers: TrackedPlayer[] = [];

    for (const player of players) {
      // Check existing lock first
      const existing = this.lockedRoles.get(player.trackId);
      if (existing) {
        results.set(player.trackId, existing);
        continue;
      }

      const courtY = player.courtPosition?.y;
      const screenY = player.bbox.y + player.bbox.height;

      // Far court (Team A) is y < 6.70m or higher up on the screen
      const isFar = courtY !== undefined ? courtY < 6.70 : screenY < 400;

      if (isFar) {
        farPlayers.push(player);
      } else {
        nearPlayers.push(player);
      }
    }

    // Sort by X coordinate for consistent left/right assignment
    farPlayers.sort((p1, p2) => (p1.courtPosition?.x ?? p1.bbox.x) - (p2.courtPosition?.x ?? p2.bbox.x));
    nearPlayers.sort((p1, p2) => (p1.courtPosition?.x ?? p1.bbox.x) - (p2.courtPosition?.x ?? p2.bbox.x));

    // Assign Far Players (Team A)
    farPlayers.forEach((player, idx) => {
      if (results.has(player.trackId)) return;

      const role: PlayerRole = idx === 0 ? 'A1' : 'A2';
      const customName = idx === 0
        ? config.teamANames.A1
        : (config.teamANames.A2 || 'Partner A');

      const jerseyColor = extractJerseyColorFromImageData(imageData, player.bbox);

      const ident: PlayerIdentificationResult = {
        role,
        customName,
        team: 'A',
        courtSide: 'Far Court (Team A)',
        jerseyColor,
        identificationConfidence: 0.94,
      };

      this.lockedRoles.set(player.trackId, ident);
      results.set(player.trackId, ident);
    });

    // Assign Near Players (Team B)
    nearPlayers.forEach((player, idx) => {
      if (results.has(player.trackId)) return;

      const role: PlayerRole = idx === 0 ? 'B1' : 'B2';
      const customName = idx === 0
        ? config.teamBNames.B1
        : (config.teamBNames.B2 || 'Partner B');

      const jerseyColor = extractJerseyColorFromImageData(imageData, player.bbox);

      const ident: PlayerIdentificationResult = {
        role,
        customName,
        team: 'B',
        courtSide: 'Near Court (Team B)',
        jerseyColor,
        identificationConfidence: 0.96,
      };

      this.lockedRoles.set(player.trackId, ident);
      results.set(player.trackId, ident);
    });

    return results;
  }

  /**
   * Swap sides for all locked players (e.g. after game end or side change)
   */
  public swapSides(config: MatchConfig): void {
    const updated = new Map<number, PlayerIdentificationResult>();

    this.lockedRoles.forEach((val, trackId) => {
      const isTeamA = val.team === 'A';
      const newTeam: 'A' | 'B' = isTeamA ? 'B' : 'A';
      const newRole: PlayerRole = isTeamA
        ? (val.role === 'A1' ? 'B1' : 'B2')
        : (val.role === 'B1' ? 'A1' : 'A2');

      const newName = newRole === 'A1'
        ? config.teamANames.A1
        : newRole === 'A2'
        ? (config.teamANames.A2 || 'Partner A')
        : newRole === 'B1'
        ? config.teamBNames.B1
        : (config.teamBNames.B2 || 'Partner B');

      updated.set(trackId, {
        ...val,
        team: newTeam,
        role: newRole,
        customName: newName,
        courtSide: newTeam === 'A' ? 'Far Court (Team A)' : 'Near Court (Team B)',
      });
    });

    this.lockedRoles = updated;
  }
}

export const playerIdentifier = new PlayerIdentifier();
