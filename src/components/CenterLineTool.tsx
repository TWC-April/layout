import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ScaleInfo, CenterLine, Position } from '../types';

interface CenterLineToolProps {
  imageUrl: string;
  scaleInfo: ScaleInfo;
  displayedImageSize: { width: number; height: number };
  onCenterLineComplete: (centerLine: CenterLine) => void;
  onCancel: () => void;
}

export interface CenterLineToolHandle {
  handleFloorPlanClick: (position: Position) => void;
}

export const CenterLineTool = forwardRef<CenterLineToolHandle, CenterLineToolProps>(({
  scaleInfo,
  displayedImageSize,
  onCenterLineComplete,
  onCancel,
}, ref) => {
  const [startPos, setStartPos] = useState<Position | null>(null);
  const [endPos, setEndPos] = useState<Position | null>(null);

  const handleFloorPlanClick = useCallback((position: Position) => {
    // Convert from displayed pixels to calibration pixels
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    const calibrationX = position.x / scaleX;
    const calibrationY = position.y / scaleY;

    const calibrationPos: Position = { x: calibrationX, y: calibrationY };

    if (!startPos) {
      setStartPos(calibrationPos);
    } else if (!endPos) {
      setEndPos(calibrationPos);
    }
  }, [startPos, endPos, scaleInfo, displayedImageSize]);

  // Expose click handler via ref
  useImperativeHandle(ref, () => ({
    handleFloorPlanClick,
  }), [handleFloorPlanClick]);

  const handleConfirm = useCallback(() => {
    if (!startPos || !endPos) return;

    const centerLine: CenterLine = {
      id: `center-line-${Date.now()}`,
      start: startPos,
      end: endPos,
      imageWidth: displayedImageSize.width,
      imageHeight: displayedImageSize.height,
    };

    onCenterLineComplete(centerLine);
    // Reset
    setStartPos(null);
    setEndPos(null);
  }, [startPos, endPos, displayedImageSize, onCenterLineComplete]);

  const handleReset = useCallback(() => {
    setStartPos(null);
    setEndPos(null);
  }, []);

  return (
    <div className="center-line-tool">
      <div className="tool-header">
        <h3>Add Center Line</h3>
        <p>
          {!startPos 
            ? 'Click on the floor plan to set the first point'
            : !endPos
            ? 'Click on the floor plan to set the second point'
            : 'Center line ready'}
        </p>
      </div>

      <div className="tool-actions">
        <button
          onClick={handleConfirm}
          className="confirm-button"
          disabled={!startPos || !endPos}
        >
          Add Center Line
        </button>
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
        <p><strong>Instructions:</strong> Click two points on the floor plan to draw a center line between them.</p>
        {startPos && (
          <p className="highlight-text">
            First point set ✓
          </p>
        )}
        {endPos && (
          <p className="highlight-text">
            Second point set ✓
          </p>
        )}
      </div>
    </div>
  );
});
