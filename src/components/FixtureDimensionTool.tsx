import { useState, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { ScaleInfo, FixtureDimensionLine, Position } from '../types';
import { pixelsToRealUnits, realUnitsToPixels, calculateLineLength } from '../utils/scaleUtils';

interface FixtureDimensionToolProps {
  imageUrl: string;
  scaleInfo: ScaleInfo;
  displayedImageSize: { width: number; height: number };
  onDimensionComplete: (dimension: FixtureDimensionLine) => void;
  onCancel: () => void;
}

export interface FixtureDimensionToolHandle {
  handleFloorPlanClick: (position: Position) => void;
  handleFloorPlanMouseMove: (position: Position) => void;
  getPreviewState: () => {
    startPos: Position | null;
    currentPos: Position | null;
    endPos: Position | null;
    isShiftPressed: boolean;
  };
  setDimensionInput: (dimension: number) => void;
}

export const FixtureDimensionTool = forwardRef<FixtureDimensionToolHandle, FixtureDimensionToolProps>(({
  scaleInfo,
  displayedImageSize,
  onDimensionComplete,
  onCancel,
}, ref) => {
  const [startPos, setStartPos] = useState<Position | null>(null);
  const [endPos, setEndPos] = useState<Position | null>(null);
  const [currentPos, setCurrentPos] = useState<Position | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [dimensionInput, setDimensionInput] = useState('');
  const [isInputMode, setIsInputMode] = useState(false);

  // Handle Shift key for straight line constraint
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !e.repeat) {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const constrainToStraightLine = useCallback((start: Position, current: Position): Position => {
    if (!isShiftPressed) return current;
    
    const dx = Math.abs(current.x - start.x);
    const dy = Math.abs(current.y - start.y);
    
    // Constrain to the direction that's closer to the mouse
    if (dx > dy) {
      // Horizontal line - keep Y the same as start
      return { x: current.x, y: start.y };
    } else {
      // Vertical line - keep X the same as start
      return { x: start.x, y: current.y };
    }
  }, [isShiftPressed]);

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
      setIsInputMode(false);
      setDimensionInput('');
    } else if (!endPos && !isInputMode) {
      // Second click: Set end position OR enter input mode
      // If user wants to input dimension, they can type it
      // For now, we'll set end position on second click
      const constrainedPos = constrainToStraightLine(startPos, calibrationPos);
      const constrainedDisplayPos = constrainToStraightLine(
        { x: startPos.x * scaleX, y: startPos.y * scaleY },
        position
      );
      setEndPos(constrainedPos);
      setCurrentPos(constrainedDisplayPos);
    }
  }, [startPos, endPos, isInputMode, scaleInfo, displayedImageSize, constrainToStraightLine]);

  const handleFloorPlanMouseMove = useCallback((position: Position) => {
    if (!startPos || endPos) return;
    
    // Convert from displayed pixels to calibration pixels
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    
    // Constrain to straight line if Shift is pressed
    const constrainedDisplayPos = constrainToStraightLine(
      { x: startPos.x * scaleX, y: startPos.y * scaleY },
      position
    );
    
    setCurrentPos(constrainedDisplayPos);
  }, [startPos, endPos, scaleInfo, displayedImageSize, constrainToStraightLine]);

  // Handle dimension input mode - calculate second point from dimension
  const handleDimensionInput = useCallback((dimension: number) => {
    if (!startPos) return; // Need startPos
    if (endPos) return; // Already have endPos, don't recalculate
    
    // Calculate direction from start to current position
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    const startDisplayPos = { x: startPos.x * scaleX, y: startPos.y * scaleY };
    
    if (!currentPos) {
      // Default to horizontal if no current position
      const pixelDistance = realUnitsToPixels(dimension, scaleInfo);
      const endCalibrationPos: Position = {
        x: startPos.x + pixelDistance,
        y: startPos.y,
      };
      setEndPos(endCalibrationPos);
      setCurrentPos({ x: startDisplayPos.x + pixelDistance * scaleX, y: startDisplayPos.y });
    } else {
      // Calculate direction from start to current
      const dx = currentPos.x - startDisplayPos.x;
      const dy = currentPos.y - startDisplayPos.y;
      const angle = Math.atan2(dy, dx);
      
      const pixelDistance = realUnitsToPixels(dimension, scaleInfo);
      const endCalibrationPos: Position = {
        x: startPos.x + Math.cos(angle) * pixelDistance,
        y: startPos.y + Math.sin(angle) * pixelDistance,
      };
      setEndPos(endCalibrationPos);
      setCurrentPos({
        x: startDisplayPos.x + Math.cos(angle) * pixelDistance * scaleX,
        y: startDisplayPos.y + Math.sin(angle) * pixelDistance * scaleY,
      });
    }
    setIsInputMode(false);
  }, [startPos, endPos, currentPos, scaleInfo, displayedImageSize]);

  // Expose handlers via ref
  useImperativeHandle(ref, () => ({
    handleFloorPlanClick,
    handleFloorPlanMouseMove,
    getPreviewState: () => ({
      startPos,
      currentPos,
      endPos,
      isShiftPressed,
    }),
    setDimensionInput: (dimension: number) => {
      setDimensionInput(dimension.toString());
      setIsInputMode(true);
      handleDimensionInput(dimension);
    },
  }), [handleFloorPlanClick, handleFloorPlanMouseMove, startPos, currentPos, endPos, isShiftPressed, handleDimensionInput]);

  const handleConfirm = useCallback(() => {
    if (!startPos || !endPos) return;

    // Calculate distance in pixels (calibration coordinates)
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);

    // Convert to millimeters
    const realLength = pixelsToRealUnits(pixelDistance, scaleInfo);

    // Calculate default label position (middle of line)
    const midX = (startPos.x + endPos.x) / 2;
    const midY = (startPos.y + endPos.y) / 2;
    
    const dimension: FixtureDimensionLine = {
      id: `fixture-dim-${Date.now()}`,
      startPosition: startPos,
      endPosition: endPos,
      realLength,
      label: customLabel.trim() || undefined,
      labelPosition: { x: midX, y: midY }, // Default to middle, user can move it
      imageWidth: displayedImageSize.width,
      imageHeight: displayedImageSize.height,
    };

    onDimensionComplete(dimension);
    // Reset
    setStartPos(null);
    setEndPos(null);
    setCurrentPos(null);
    setCustomLabel('');
    setDimensionInput('');
    setIsInputMode(false);
  }, [startPos, endPos, scaleInfo, customLabel, displayedImageSize, onDimensionComplete]);

  const handleReset = useCallback(() => {
    setStartPos(null);
    setEndPos(null);
    setCurrentPos(null);
    setCustomLabel('');
    setDimensionInput('');
    setIsInputMode(false);
  }, []);

  // Calculate preview distance
  const displayEndPos = endPos && currentPos 
    ? { x: endPos.x * (displayedImageSize.width / scaleInfo.imageWidth), y: endPos.y * (displayedImageSize.height / scaleInfo.imageHeight) }
    : currentPos;
  
  const previewDistance = startPos && displayEndPos ? (() => {
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    const startDisplayPos = { x: startPos.x * scaleX, y: startPos.y * scaleY };
    const pixelLength = calculateLineLength(startDisplayPos, displayEndPos);
    return pixelsToRealUnits(pixelLength, scaleInfo);
  })() : null;

  return (
    <div className="fixture-dimension-tool">
      <div className="tool-header">
        <h3>Add Dimension</h3>
        <p>
          {!startPos 
            ? 'Click on the floor plan to set the first point'
            : !endPos
            ? `Click again to set the end point${isShiftPressed ? ' • Hold Shift for straight line' : ''}`
            : 'Dimension ready'}
        </p>
      </div>

      {startPos && displayEndPos && previewDistance !== null && (
        <div className="dimension-preview">
          <p>
            Distance: {Math.round(previewDistance).toLocaleString()} mm
          </p>
        </div>
      )}

      {startPos && !endPos && (
        <div className="dimension-input-section">
          <label>
            Or enter dimension (mm) to calculate second point:
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={dimensionInput}
              onChange={(e) => {
                setDimensionInput(e.target.value);
                const dim = parseFloat(e.target.value);
                if (!isNaN(dim) && dim > 0) {
                  handleDimensionInput(dim);
                }
              }}
              placeholder="e.g., 5000"
              className="dimension-label-input"
            />
          </label>
        </div>
      )}

      {startPos && endPos && (
        <div className="dimension-preview">
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
        <p>Hold <strong>Shift</strong> while clicking or moving mouse for straight lines (horizontal/vertical).</p>
        <p>After clicking the first point, you can type a dimension in mm to automatically calculate the second point.</p>
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
