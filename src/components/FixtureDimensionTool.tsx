import { useState, useCallback, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
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
  const [fixedDistance, setFixedDistance] = useState<number | null>(null); // Distance in pixels (calibration)
  const [isAdjustingSecondPoint, setIsAdjustingSecondPoint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setFixedDistance(null);
      setIsAdjustingSecondPoint(false);
      // Auto-focus the input field after a short delay to allow state to update
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    } else if (endPos && fixedDistance !== null && isAdjustingSecondPoint) {
      // User is adjusting the second point - update it
      const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
      const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
      const startDisplayPos = { x: startPos.x * scaleX, y: startPos.y * scaleY };
      
      // Calculate angle from start to click position
      const dx = position.x - startDisplayPos.x;
      const dy = position.y - startDisplayPos.y;
      const angle = Math.atan2(dy, dx);
      
      // Apply 90-degree constraint if Shift is pressed
      let finalAngle = angle;
      if (isShiftPressed) {
        const degrees = (angle * 180) / Math.PI;
        const roundedDegrees = Math.round(degrees / 90) * 90;
        finalAngle = (roundedDegrees * Math.PI) / 180;
      }
      
      // Calculate new end position at fixed distance
      const newEndPos: Position = {
        x: startPos.x + Math.cos(finalAngle) * fixedDistance,
        y: startPos.y + Math.sin(finalAngle) * fixedDistance,
      };
      
      const newEndDisplayPos = {
        x: startDisplayPos.x + Math.cos(finalAngle) * fixedDistance * scaleX,
        y: startDisplayPos.y + Math.sin(finalAngle) * fixedDistance * scaleY,
      };
      
      setEndPos(newEndPos);
      setCurrentPos(newEndDisplayPos);
    } else if (!endPos && !isInputMode) {
      // Second click: Set end position (normal click mode)
      const constrainedPos = constrainToStraightLine(startPos, calibrationPos);
      const constrainedDisplayPos = constrainToStraightLine(
        { x: startPos.x * scaleX, y: startPos.y * scaleY },
        position
      );
      setEndPos(constrainedPos);
      setCurrentPos(constrainedDisplayPos);
      setFixedDistance(null); // No fixed distance in click mode
      setIsAdjustingSecondPoint(false);
    }
  }, [startPos, endPos, isInputMode, fixedDistance, isAdjustingSecondPoint, isShiftPressed, scaleInfo, displayedImageSize, constrainToStraightLine]);

  const handleFloorPlanMouseMove = useCallback((position: Position) => {
    // Don't update preview if user is typing in the input field
    if (inputRef.current && document.activeElement === inputRef.current) {
      return;
    }
    
    if (!startPos) return;
    
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    const startDisplayPos = { x: startPos.x * scaleX, y: startPos.y * scaleY };
    
    if (endPos && fixedDistance !== null && isAdjustingSecondPoint) {
      // User is adjusting the second point - move it around the first point at fixed distance
      const dx = position.x - startDisplayPos.x;
      const dy = position.y - startDisplayPos.y;
      const angle = Math.atan2(dy, dx);
      
      // Apply 90-degree constraint if Shift is pressed
      let finalAngle = angle;
      if (isShiftPressed) {
        const degrees = (angle * 180) / Math.PI;
        const roundedDegrees = Math.round(degrees / 90) * 90;
        finalAngle = (roundedDegrees * Math.PI) / 180;
      }
      
      // Calculate new end position at fixed distance
      const newEndPos: Position = {
        x: startPos.x + Math.cos(finalAngle) * fixedDistance,
        y: startPos.y + Math.sin(finalAngle) * fixedDistance,
      };
      
      const newEndDisplayPos = {
        x: startDisplayPos.x + Math.cos(finalAngle) * fixedDistance * scaleX,
        y: startDisplayPos.y + Math.sin(finalAngle) * fixedDistance * scaleY,
      };
      
      setEndPos(newEndPos);
      setCurrentPos(newEndDisplayPos);
    } else if (!endPos) {
      // Normal preview mode before second point is set
      // Constrain to straight line if Shift is pressed
      const constrainedDisplayPos = constrainToStraightLine(
        startDisplayPos,
        position
      );
      setCurrentPos(constrainedDisplayPos);
    }
  }, [startPos, endPos, fixedDistance, isAdjustingSecondPoint, isShiftPressed, scaleInfo, displayedImageSize, constrainToStraightLine]);

  // Handle dimension input mode - calculate second point from dimension
  const handleDimensionInput = useCallback((dimension: number) => {
    if (!startPos) return; // Need startPos
    if (endPos && fixedDistance !== null) return; // Already have endPos from dimension input, don't recalculate
    
    // Calculate pixel distance for the fixed dimension
    const pixelDistance = realUnitsToPixels(dimension, scaleInfo);
    setFixedDistance(pixelDistance);
    
    // Calculate direction from start to current position (or default to horizontal)
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    const startDisplayPos = { x: startPos.x * scaleX, y: startPos.y * scaleY };
    
    let angle = 0; // Default to horizontal (0 degrees)
    if (currentPos) {
      // Use current mouse direction if available
      const dx = currentPos.x - startDisplayPos.x;
      const dy = currentPos.y - startDisplayPos.y;
      angle = Math.atan2(dy, dx);
    }
    
    // Calculate initial end position
    const endCalibrationPos: Position = {
      x: startPos.x + Math.cos(angle) * pixelDistance,
      y: startPos.y + Math.sin(angle) * pixelDistance,
    };
    
    const endDisplayPos = {
      x: startDisplayPos.x + Math.cos(angle) * pixelDistance * scaleX,
      y: startDisplayPos.y + Math.sin(angle) * pixelDistance * scaleY,
    };
    
    setEndPos(endCalibrationPos);
    setCurrentPos(endDisplayPos);
    setIsInputMode(false);
    setIsAdjustingSecondPoint(true); // Enable adjustment mode
  }, [startPos, endPos, currentPos, fixedDistance, scaleInfo, displayedImageSize]);

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
    setFixedDistance(null);
    setIsAdjustingSecondPoint(false);
  }, [startPos, endPos, scaleInfo, customLabel, displayedImageSize, onDimensionComplete]);

  const handleReset = useCallback(() => {
    setStartPos(null);
    setEndPos(null);
    setCurrentPos(null);
    setCustomLabel('');
    setDimensionInput('');
    setIsInputMode(false);
    setFixedDistance(null);
    setIsAdjustingSecondPoint(false);
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
            : fixedDistance !== null && isAdjustingSecondPoint
            ? `Adjust second point position${isShiftPressed ? ' • Shift for 90° increments' : ''}`
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
            Enter dimension (mm) to calculate second point:
            <input
              ref={inputRef}
              type="number"
              step="0.1"
              min="0.1"
              value={dimensionInput}
              autoFocus={startPos !== null && !endPos}
              onChange={(e) => {
                setDimensionInput(e.target.value);
                const dim = parseFloat(e.target.value);
                if (!isNaN(dim) && dim > 0) {
                  handleDimensionInput(dim);
                }
              }}
              onKeyDown={(e) => {
                // Allow Enter key to confirm dimension input
                if (e.key === 'Enter' && dimensionInput) {
                  const dim = parseFloat(dimensionInput);
                  if (!isNaN(dim) && dim > 0) {
                    handleDimensionInput(dim);
                    e.preventDefault();
                  }
                }
                // Prevent mouse move updates when typing
                e.stopPropagation();
              }}
              onFocus={() => {
                // Stop mouse move updates when input is focused
              }}
              onBlur={() => {
                // Resume mouse move updates when input loses focus
              }}
              placeholder="Type dimension (e.g., 1000)"
              className="dimension-label-input"
            />
          </label>
        </div>
      )}
      
      {startPos && endPos && fixedDistance !== null && isAdjustingSecondPoint && (
        <div className="dimension-adjustment-hint">
          <p>
            Move mouse to adjust second point position (360° rotation)
            {isShiftPressed && <span className="shift-hint"> • Shift for 90° increments</span>}
          </p>
          <p className="hint-text">Click to lock position, or click "Add Dimension" to confirm</p>
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
