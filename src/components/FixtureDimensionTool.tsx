import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ScaleInfo, FixtureDimensionLine, Position } from '../types';
import { pixelsToRealUnits } from '../utils/scaleUtils';

interface FixtureDimensionToolProps {
  imageUrl: string;
  scaleInfo: ScaleInfo;
  displayedImageSize: { width: number; height: number };
  onDimensionComplete: (dimension: FixtureDimensionLine) => void;
  onCancel: () => void;
}

export interface FixtureDimensionToolHandle {
  handleFloorPlanClick: (position: Position) => void;
}

export const FixtureDimensionTool = forwardRef<FixtureDimensionToolHandle, FixtureDimensionToolProps>(({
  scaleInfo,
  displayedImageSize,
  onDimensionComplete,
  onCancel,
}, ref) => {
  const [startPos, setStartPos] = useState<Position | null>(null);
  const [endPos, setEndPos] = useState<Position | null>(null);
  const [customLabel, setCustomLabel] = useState('');

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

    // Calculate distance in pixels (calibration coordinates)
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);

    // Convert to millimeters
    const realLength = pixelsToRealUnits(pixelDistance, scaleInfo);

    const dimension: FixtureDimensionLine = {
      id: `fixture-dim-${Date.now()}`,
      startPosition: startPos,
      endPosition: endPos,
      realLength,
      label: customLabel.trim() || undefined,
      imageWidth: displayedImageSize.width,
      imageHeight: displayedImageSize.height,
    };

    onDimensionComplete(dimension);
    // Reset
    setStartPos(null);
    setEndPos(null);
    setCustomLabel('');
  }, [startPos, endPos, scaleInfo, customLabel, displayedImageSize, onDimensionComplete]);

  const handleReset = useCallback(() => {
    setStartPos(null);
    setEndPos(null);
    setCustomLabel('');
  }, []);

  // Calculate preview distance
  const previewDistance = startPos && endPos ? (() => {
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    return pixelsToRealUnits(pixelDistance, scaleInfo);
  })() : null;

  return (
    <div className="fixture-dimension-tool">
      <div className="tool-header">
        <h3>Add Dimension</h3>
        <p>
          {!startPos 
            ? 'Click on the floor plan to set the first point'
            : !endPos
            ? 'Click on the floor plan to set the second point'
            : 'Dimension ready'}
        </p>
      </div>

      {startPos && endPos && previewDistance !== null && (
        <div className="dimension-preview">
          <p>
            Distance: {Math.round(previewDistance).toLocaleString()} mm
          </p>
          <input
            type="text"
            placeholder="Optional custom label (e.g., 'Center of 2 tables')"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            className="dimension-label-input"
          />
        </div>
      )}

      <div className="tool-actions">
        <button
          onClick={handleConfirm}
          className="confirm-button"
          disabled={!startPos || !endPos}
        >
          Add Dimension
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
        <p><strong>Instructions:</strong> Click two points on the floor plan to measure the distance between them.</p>
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
