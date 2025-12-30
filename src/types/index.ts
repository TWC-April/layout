export interface Dimension {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Fixture {
  id: string;
  name: string;
  width: number; // in millimeters
  height: number;
  color?: string; // optional, for backward compatibility
  icon?: string;
  isCustom?: boolean; // true for user-created fixtures
  createdAt?: number; // timestamp for custom fixtures
  group?: string; // optional group name
}

export interface PlacedFixture extends Fixture {
  position: Position;
  rotation?: number;
}

export interface DimensionLine {
  id: string;
  start: Position;
  end: Position;
  realLength: number; // in millimeters
  pixelLength: number;
  imageWidth: number; // displayed image width in pixels
  imageHeight: number; // displayed image height in pixels
}

export interface ScaleInfo {
  imageWidth: number; // pixels
  imageHeight: number; // pixels
  pixelsPerMillimeter: number; // calculated from dimension lines
  unit: 'millimeters' | 'meters' | 'feet' | 'inches';
}

export interface PlacementArea {
  id: string;
  x: number; // in millimeters (calibration image coordinates)
  y: number;
  width: number; // in millimeters
  height: number; // in millimeters
}

export interface FixtureDimensionLine {
  id: string;
  fixtureId1: string; // First fixture
  fixtureId2: string; // Second fixture
  startPosition: Position; // Start point (center of fixture 1) in calibration pixels
  endPosition: Position; // End point (center of fixture 2) in calibration pixels
  realLength: number; // Calculated distance in mm
  label?: string; // Optional custom label
  imageWidth: number; // displayed image width in pixels when created
  imageHeight: number; // displayed image height in pixels when created
}

export interface CenterLine {
  id: string;
  fixtureId1: string;
  fixtureId2: string;
  start: Position; // Center of fixture 1 in calibration pixels
  end: Position; // Center of fixture 2 in calibration pixels
  imageWidth: number; // displayed image width in pixels when created
  imageHeight: number; // displayed image height in pixels when created
}

export interface TextAnnotation {
  id: string;
  text: string;
  position: Position; // Absolute position on floor plan in calibration pixels
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  rotation?: number;
  imageWidth: number; // displayed image width in pixels when created
  imageHeight: number; // displayed image height in pixels when created
}

export interface FixtureAnnotation {
  id: string;
  fixtureId: string; // Reference to the fixture
  note: string; // e.g., "Center of 2 tables"
}

export interface FloorPlanState {
  imageUrl: string | null;
  scaleInfo: ScaleInfo | null;
  dimensionLines: DimensionLine[];
  fixtures: PlacedFixture[];
  isDrawingDimension: boolean;
  isCropping: boolean;
  placementArea: PlacementArea | null; // Currently selected area for auto-placement
  isSelectingArea: boolean; // Whether user is in area selection mode
  fixtureDimensionLines: FixtureDimensionLine[]; // Dimensions between fixtures
  centerLines: CenterLine[]; // Center lines between fixtures
  textAnnotations: TextAnnotation[]; // Text notes on floor plan
  fixtureAnnotations: FixtureAnnotation[]; // Notes attached to fixtures
  isAddingFixtureDimension?: boolean; // Whether user is adding fixture dimension
  isAddingCenterLine?: boolean; // Whether user is adding center line
  isAddingTextAnnotation?: boolean; // Whether user is adding text annotation
}

