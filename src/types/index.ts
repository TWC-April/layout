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

export interface FloorPlanState {
  imageUrl: string | null;
  scaleInfo: ScaleInfo | null;
  dimensionLines: DimensionLine[];
  fixtures: PlacedFixture[];
  isDrawingDimension: boolean;
  isCropping: boolean;
}

