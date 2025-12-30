import { Fixture, PlacedFixture, Position, PlacementArea, ScaleInfo } from '../types';
import { realUnitsToPixels } from './scaleUtils';

const CLEARANCE_MM = 0; // Clearance is already included in fixture dimensions

interface PlacementOptions {
  clearance?: number; // mm clearance from area edges (default 0, already included)
  scaleInfo: ScaleInfo; // Required to convert mm to pixels
}

/**
 * Auto-place fixtures in a given area
 * Rules:
 * - Sort fixtures by size (largest first)
 * - Clearance is already included in fixture dimensions (no additional clearance needed)
 * - Try both orientations (0° and 90°)
 * - Avoid overlaps
 * - Positions are returned in calibration image pixel coordinates
 */
export function autoPlaceFixtures(
  area: PlacementArea,
  fixtures: Fixture[],
  existingFixtures: PlacedFixture[],
  options: PlacementOptions
): PlacedFixture[] {
  const { scaleInfo, clearance = CLEARANCE_MM } = options;
  
  // Calculate usable area (with optional clearance from edges)
  // Note: User said clearance is already included, so this should be 0
  const usableArea = {
    x: area.x + clearance,
    y: area.y + clearance,
    width: area.width - (2 * clearance),
    height: area.height - (2 * clearance),
  };
  
  // Validate usable area
  if (usableArea.width <= 0 || usableArea.height <= 0) {
    return []; // Area too small
  }
  
  // Sort fixtures by size (largest first)
  const sortedFixtures = [...fixtures].sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    return areaB - areaA; // Descending
  });
  
  const placedFixtures: PlacedFixture[] = [];
  const occupiedSpaces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  
  // Add existing fixtures to occupied spaces
  // Existing fixtures are already in calibration image pixel coordinates
  existingFixtures.forEach(fixture => {
    occupiedSpaces.push({
      x: fixture.position.x,
      y: fixture.position.y,
      width: fixture.width * scaleInfo.pixelsPerMillimeter, // Convert mm to pixels
      height: fixture.height * scaleInfo.pixelsPerMillimeter, // Convert mm to pixels
    });
  });
  
  // Try to place each fixture
  for (const fixture of sortedFixtures) {
    // Convert fixture dimensions from mm to pixels
    const fixtureWidthPx = fixture.width * scaleInfo.pixelsPerMillimeter;
    const fixtureHeightPx = fixture.height * scaleInfo.pixelsPerMillimeter;
    
    // Try both orientations
    const orientations = [
      { width: fixtureWidthPx, height: fixtureHeightPx, rotation: 0 },
      { width: fixtureHeightPx, height: fixtureWidthPx, rotation: 90 },
    ];
    
    // Convert usable area from mm to pixels for position finding
    const usableAreaPx = {
      x: realUnitsToPixels(usableArea.x, scaleInfo),
      y: realUnitsToPixels(usableArea.y, scaleInfo),
      width: realUnitsToPixels(usableArea.width, scaleInfo),
      height: realUnitsToPixels(usableArea.height, scaleInfo),
    };
    
    for (const orientation of orientations) {
      // Skip if fixture is too large for usable area (check in pixels)
      if (orientation.width > usableAreaPx.width || orientation.height > usableAreaPx.height) {
        continue;
      }
      
      // Find best position (in pixels)
      const positionPx = findBestPosition(
        orientation.width,
        orientation.height,
        usableAreaPx,
        occupiedSpaces
      );
      
      if (positionPx) {
        // Convert position from pixels back to calibration image coordinates
        // Position is already in calibration image pixels, so we can use it directly
        const position: Position = {
          x: positionPx.x,
          y: positionPx.y,
        };
        
        // Place fixture
        const placedFixture: PlacedFixture = {
          ...fixture,
          id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          position,
          rotation: orientation.rotation,
        };
        
        placedFixtures.push(placedFixture);
        
        // Mark space as occupied (in pixels)
        occupiedSpaces.push({
          x: positionPx.x,
          y: positionPx.y,
          width: orientation.width,
          height: orientation.height,
        });
        
        break; // Move to next fixture
      }
    }
  }
  
  return placedFixtures;
}

/**
 * Find the best position for a fixture within the usable area
 * Uses a grid-based approach with configurable step size
 * All coordinates are in pixels (calibration image coordinates)
 */
function findBestPosition(
  width: number,
  height: number,
  usableArea: { x: number; y: number; width: number; height: number },
  occupiedSpaces: Array<{ x: number; y: number; width: number; height: number }>
): Position | null {
  // Step size in pixels (approximately 100mm converted to pixels)
  // Use a reasonable step size - about 50-100 pixels depending on scale
  const step = Math.max(10, Math.min(100, width / 10)); // Adaptive step based on fixture size
  
  // Try positions from top-left, moving right then down
  for (let y = usableArea.y; y + height <= usableArea.y + usableArea.height; y += step) {
    for (let x = usableArea.x; x + width <= usableArea.x + usableArea.width; x += step) {
      const candidate: Position = { x, y };
      
      // Check if fits in usable area
      if (x + width > usableArea.x + usableArea.width ||
          y + height > usableArea.y + usableArea.height) {
        continue;
      }
      
      // Check for overlaps with occupied spaces
      const overlaps = occupiedSpaces.some(occupied => {
        return !(
          x + width <= occupied.x ||
          x >= occupied.x + occupied.width ||
          y + height <= occupied.y ||
          y >= occupied.y + occupied.height
        );
      });
      
      if (!overlaps) {
        return candidate;
      }
    }
  }
  
  // If grid search fails, try more precise search with smaller steps
  const fineStep = Math.max(5, step / 2); // Half the step size, minimum 5 pixels
  for (let y = usableArea.y; y + height <= usableArea.y + usableArea.height; y += fineStep) {
    for (let x = usableArea.x; x + width <= usableArea.x + usableArea.width; x += fineStep) {
      const candidate: Position = { x, y };
      
      if (x + width > usableArea.x + usableArea.width ||
          y + height > usableArea.y + usableArea.height) {
        continue;
      }
      
      const overlaps = occupiedSpaces.some(occupied => {
        return !(
          x + width <= occupied.x ||
          x >= occupied.x + occupied.width ||
          y + height <= occupied.y ||
          y >= occupied.y + occupied.height
        );
      });
      
      if (!overlaps) {
        return candidate;
      }
    }
  }
  
  return null; // No position found
}

