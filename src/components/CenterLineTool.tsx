import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ScaleInfo, CenterLine, Position } from '../types';
import { pixelsToRealUnits, calculateLineLength } from '../utils/scaleUtils';

interface CenterLineToolProps {
  imageUrl: string;
  scaleInfo: ScaleInfo;
  displayedImageSize: { width: number; height: number };
  onCenterLineComplete: (centerLine: CenterLine) => void;
  onCancel: () => void;
}

export interface CenterLineToolHandle {
  handleFloorPlanClick: (position: Position) => void;
  handleFloorPlanMouseMove: (position: Position) => void;
  getPreviewState: () => {
    startPos: Position | null;
    currentPos: Position | null;
    endPos: Position | null;
  };
}

export const CenterLineTool = forwardRef<CenterLineToolHandle, CenterLineToolProps>(({
  scaleInfo,
  displayedImageSize,
  onCenterLineComplete,
  onCancel,
}, ref) => {
  const [startPos, setStartPos] = useState<Position | null>(null);
  const [endPos, setEndPos] = useState<Position | null>(null);
  const [currentPos, setCurrentPos] = useState<Position | null>(null);

  const handleFloorPlanClick = useCallback((position: Position) => {
    // Convert from displayed pixels to calibration pixels
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    const calibrationX = position.x / scaleX;
    const calibrationY = position.y / scaleY;

    const calibrationPos: Position = { x: calibrationX, y: calibrationY };

    if (!startPos) {
      // First click: Set start position
      setStartPos(calibrationPos);
      setCurrentPos(position); // Keep displayed position for preview
      setEndPos(null);
    } else if (!endPos) {
      // Second click: Set end position and automatically create center line
      setEndPos(calibrationPos);
      setCurrentPos(position);
      
      // Calculate midpoint
      const midX = (startPos.x + calibrationPos.x) / 2;
      const midY = (startPos.y + calibrationPos.y) / 2;
      const centerPoint: Position = { x: midX, y: midY };
      
      // Calculate total distance in pixels (calibration)
      const pixelLength = calculateLineLength(startPos, calibrationPos);
      
      // Convert to real-world units (mm)
      const totalLength = pixelsToRealUnits(pixelLength, scaleInfo);
      
      // Calculate left and right dimensions (equal, half of total)
      const halfLength = totalLength / 2;
      
      // Calculate center line length (perpendicular line)
      // Make it proportional to the total length (e.g., 10% of total length, minimum 20px)
      const centerLinePixelLength = Math.max(20, pixelLength * 0.1);
      
      // Create center line
      const centerLine: CenterLine = {
        id: `center-line-${Date.now()}`,
        start: startPos,
        end: calibrationPos,
        centerPoint: centerPoint,
        totalLength: totalLength,
        leftDimension: halfLength,
        rightDimension: halfLength,
        centerLineLength: centerLinePixelLength,
        imageWidth: displayedImageSize.width,
        imageHeight: displayedImageSize.height,
      };
      
      onCenterLineComplete(centerLine);
      
      // Reset for next center line
      setStartPos(null);
      setEndPos(null);
      setCurrentPos(null);
    }
  }, [startPos, endPos, scaleInfo, displayedImageSize, onCenterLineComplete]);

  const handleFloorPlanMouseMove = useCallback((position: Position) => {
    if (!startPos || endPos) return; // Only show preview before second click
    
    setCurrentPos(position);
  }, [startPos, endPos]);

  // Expose handlers via ref
  useImperativeHandle(ref, () => ({
    handleFloorPlanClick,
    handleFloorPlanMouseMove,
    getPreviewState: () => ({
      startPos, // Keep in calibration pixels (will be converted in rendering)
      currentPos, // Already in displayed pixels
      endPos, // Keep in calibration pixels (will be converted in rendering)
    }),
  }), [handleFloorPlanClick, handleFloorPlanMouseMove, startPos, endPos, currentPos]);

  const handleReset = useCallback(() => {
    setStartPos(null);
    setEndPos(null);
    setCurrentPos(null);
  }, []);

  return (
    <div className="center-line-tool">
      <div className="tool-header">
        <h3>Add Center Line</h3>
        <p>
          {!startPos 
            ? 'Click on the floor plan to set the first point'
            : !endPos
            ? 'Click on the floor plan to set the second point (center line will be created automatically)'
            : 'Center line created'}
        </p>
      </div>

      <div className="tool-actions">
        <button
          onClick={handleReset}
          className="reset-button"
          disabled={!startPos}
        >
          Reset Selection
        </button>
        <button
          onClick={onCancel}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>

      <div className="tool-instructions">
        <p><strong>Instructions:</strong> Click two points on the floor plan. A center line with equal dimensions will be created automatically.</p>
        {startPos && (
          <p className="highlight-text">
            First point set ✓
          </p>
        )}
        {endPos && (
          <p className="highlight-text">
            Center line created ✓
          </p>
        )}
      </div>
    </div>
  );
});
