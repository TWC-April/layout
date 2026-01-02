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

/**
 * Validates if dimension lines are consistent with each other.
 * When there are exactly 2 lines, checks if one is significantly different from the other.
 * Returns information about which line (if any) appears to be incorrect.
 */
export function validateDimensionLines(
  dimensionLines: DimensionLine[]
): {
  isValid: boolean;
  inconsistentLineIndex: number | null;
  mismatchPercent: number | null;
  message: string | null;
} {
  if (dimensionLines.length < 2) {
    return {
      isValid: true,
      inconsistentLineIndex: null,
      mismatchPercent: null,
      message: null,
    };
  }

  // Calculate scale for each line
  const lineScales = dimensionLines.map((line) => {
    const pixelLength = Math.sqrt(
      Math.pow(line.end.x - line.start.x, 2) +
      Math.pow(line.end.y - line.start.y, 2)
    );
    return pixelLength / line.realLength;
  });

  // If exactly 2 lines, check if one is inconsistent
  if (dimensionLines.length === 2) {
    const scale1 = lineScales[0];
    const scale2 = lineScales[1];
    const avgScale = (scale1 + scale2) / 2;
    const diff = Math.abs(scale1 - scale2);
    const mismatchPercent = (diff / avgScale) * 100;

    // Threshold: if difference is more than 5%, flag as inconsistent
    if (mismatchPercent > 5) {
      // Determine which line is more likely incorrect
      // The one that deviates more from the average
      const dev1 = Math.abs(scale1 - avgScale);
      const dev2 = Math.abs(scale2 - avgScale);
      const inconsistentIndex = dev1 > dev2 ? 0 : 1;

      return {
        isValid: false,
        inconsistentLineIndex: inconsistentIndex,
        mismatchPercent,
        message: `Line ${inconsistentIndex + 1} appears to be incorrect (${mismatchPercent.toFixed(1)}% difference)`,
      };
    }

    return {
      isValid: true,
      inconsistentLineIndex: null,
      mismatchPercent,
      message: mismatchPercent > 1 ? `Lines are consistent (${mismatchPercent.toFixed(1)}% difference)` : 'Lines are consistent',
    };
  }

  // For more than 2 lines, check each line against the average
  const avgScale = lineScales.reduce((sum, s) => sum + s, 0) / lineScales.length;
  const deviations = lineScales.map((scale) => Math.abs(scale - avgScale));
  const maxDeviation = Math.max(...deviations);
  const maxDeviationIndex = deviations.indexOf(maxDeviation);
  const maxMismatchPercent = (maxDeviation / avgScale) * 100;

  // If any line deviates more than 10% from average, flag it
  if (maxMismatchPercent > 10) {
    return {
      isValid: false,
      inconsistentLineIndex: maxDeviationIndex,
      mismatchPercent: maxMismatchPercent,
      message: `Line ${maxDeviationIndex + 1} appears to be incorrect (${maxMismatchPercent.toFixed(1)}% deviation from average)`,
    };
  }

  return {
    isValid: true,
    inconsistentLineIndex: null,
    mismatchPercent: maxMismatchPercent,
    message: maxMismatchPercent > 1 ? `All lines are consistent (max ${maxMismatchPercent.toFixed(1)}% deviation)` : 'All lines are consistent',
  };
}

