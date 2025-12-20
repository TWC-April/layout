import { ScaleInfo, Position, Dimension, DimensionLine } from '../types';

export function calculateScaleFromLines(
  dimensionLines: DimensionLine[]
): number | null {
  if (dimensionLines.length === 0) return null;

  // Calculate average pixels per millimeter from all dimension lines
  const scales = dimensionLines.map((line) => {
    const pixelLength = Math.sqrt(
      Math.pow(line.end.x - line.start.x, 2) +
      Math.pow(line.end.y - line.start.y, 2)
    );
    return pixelLength / line.realLength;
  });

  // Return average scale
  const avgScale = scales.reduce((sum, scale) => sum + scale, 0) / scales.length;
  return avgScale;
}

export function calculateSeparateScales(
  dimensionLines: DimensionLine[]
): {
  avgScale: number;
  scaleX: number | null;
  scaleY: number | null;
  mismatchPercent: number | null;
} {
  if (dimensionLines.length === 0) {
    return { avgScale: 0, scaleX: null, scaleY: null, mismatchPercent: null };
  }

  const horizontalScales: number[] = [];
  const verticalScales: number[] = [];
  const allScales: number[] = [];

  dimensionLines.forEach((line) => {
    const dx = Math.abs(line.end.x - line.start.x);
    const dy = Math.abs(line.end.y - line.start.y);
    const pixelLength = Math.sqrt(dx * dx + dy * dy);
    const scale = pixelLength / line.realLength;
    allScales.push(scale);

    // Classify as horizontal (mostly X) or vertical (mostly Y)
    // If dx > dy, it's more horizontal; otherwise more vertical
    if (dx > dy) {
      horizontalScales.push(scale);
    } else {
      verticalScales.push(scale);
    }
  });

  const avgScale = allScales.reduce((sum, s) => sum + s, 0) / allScales.length;
  const scaleX = horizontalScales.length > 0
    ? horizontalScales.reduce((sum, s) => sum + s, 0) / horizontalScales.length
    : null;
  const scaleY = verticalScales.length > 0
    ? verticalScales.reduce((sum, s) => sum + s, 0) / verticalScales.length
    : null;

  // Calculate mismatch percentage
  let mismatchPercent: number | null = null;
  if (scaleX !== null && scaleY !== null) {
    const avg = (scaleX + scaleY) / 2;
    const diff = Math.abs(scaleX - scaleY);
    mismatchPercent = (diff / avg) * 100;
  }

  return { avgScale, scaleX, scaleY, mismatchPercent };
}

export function pixelsToRealUnits(
  pixels: number,
  scaleInfo: ScaleInfo
): number {
  return pixels / scaleInfo.pixelsPerMillimeter;
}

export function realUnitsToPixels(
  realUnits: number, // in millimeters
  scaleInfo: ScaleInfo
): number {
  return realUnits * scaleInfo.pixelsPerMillimeter;
}

export function checkFit(
  fixturePos: Position,
  fixtureSize: Dimension,
  scaleInfo: ScaleInfo
): boolean {
  const fixtureWidthPx = realUnitsToPixels(fixtureSize.width, scaleInfo);
  const fixtureHeightPx = realUnitsToPixels(fixtureSize.height, scaleInfo);
  
  return (
    fixturePos.x >= 0 &&
    fixturePos.y >= 0 &&
    fixturePos.x + fixtureWidthPx <= scaleInfo.imageWidth &&
    fixturePos.y + fixtureHeightPx <= scaleInfo.imageHeight
  );
}

export function calculateLineLength(start: Position, end: Position): number {
  return Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );
}

