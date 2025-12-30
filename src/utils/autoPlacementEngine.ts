import { Fixture, PlacedFixture, Position, PlacementArea } from '../types';

const CLEARANCE_MM = 1000; // Minimum gap from area edges

interface PlacementOptions {
  clearance?: number; // mm clearance from area edges (default 1000)
}

/**
 * Auto-place fixtures in a given area
 * Rules:
 * - Sort fixtures by size (largest first)
 * - Maintain 1000mm clearance from area edges
 * - Try both orientations (0° and 90°)
 * - Avoid overlaps
 */
export function autoPlaceFixtures(
  area: PlacementArea,
  fixtures: Fixture[],
  existingFixtures: PlacedFixture[],
  options: PlacementOptions = {}
): PlacedFixture[] {
  const clearance = options.clearance || CLEARANCE_MM;
  
  // Calculate usable area (with clearance from edges)
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
  existingFixtures.forEach(fixture => {
    occupiedSpaces.push({
      x: fixture.position.x,
      y: fixture.position.y,
      width: fixture.width,
      height: fixture.height,
    });
  });
  
  // Try to place each fixture
  for (const fixture of sortedFixtures) {
    // Try both orientations
    const orientations = [
      { width: fixture.width, height: fixture.height, rotation: 0 },
      { width: fixture.height, height: fixture.width, rotation: 90 },
    ];
    
    let placed = false;
    
    for (const orientation of orientations) {
      // Skip if fixture is too large for usable area
      if (orientation.width > usableArea.width || orientation.height > usableArea.height) {
        continue;
      }
      
      // Find best position
      const position = findBestPosition(
        orientation.width,
        orientation.height,
        usableArea,
        occupiedSpaces
      );
      
      if (position) {
        // Place fixture
        const placedFixture: PlacedFixture = {
          ...fixture,
          id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          position,
          rotation: orientation.rotation,
        };
        
        placedFixtures.push(placedFixture);
        
        // Mark space as occupied
        occupiedSpaces.push({
          x: position.x,
          y: position.y,
          width: orientation.width,
          height: orientation.height,
        });
        
        placed = true;
        break; // Move to next fixture
      }
    }
  }
  
  return placedFixtures;
}

/**
 * Find the best position for a fixture within the usable area
 * Uses a grid-based approach with configurable step size
 */
function findBestPosition(
  width: number,
  height: number,
  usableArea: { x: number; y: number; width: number; height: number },
  occupiedSpaces: Array<{ x: number; y: number; width: number; height: number }>
): Position | null {
  const step = 100; // Try positions every 100mm (can be optimized)
  
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
  const fineStep = 50;
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

