import React, { useState, useRef, useCallback } from 'react';
import { Position, DimensionLine, ScaleInfo } from '../types';
import { calculateLineLength, pixelsToRealUnits } from '../utils/scaleUtils';

interface DimensionLineToolProps {
  imageUrl: string;
  existingLines: DimensionLine[];
  scaleInfo: ScaleInfo | null;
  onLineComplete: (line: DimensionLine) => void;
  onCancel: () => void;
}

export const DimensionLineTool: React.FC<DimensionLineToolProps> = ({
  imageUrl,
  existingLines,
  scaleInfo,
  onLineComplete,
  onCancel,
}) => {
  const [startPos, setStartPos] = useState<Position | null>(null);
  const [endPos, setEndPos] = useState<Position | null>(null);
  const [currentPos, setCurrentPos] = useState<Position | null>(null);
  const [realLength, setRealLength] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // If Shift is pressed and we have a start position, constrain to horizontal or vertical
    if (isShiftPressed && startPos) {
      const dx = Math.abs(x - startPos.x);
      const dy = Math.abs(y - startPos.y);
      
      // Constrain to the direction that's closer to the mouse
      if (dx > dy) {
        // Horizontal line - keep Y the same as start
        y = startPos.y;
      } else {
        // Vertical line - keep X the same as start
        x = startPos.x;
      }
    }
    
    const position = { x, y };

    if (!startPos) {
      // First click: Set start position
      setStartPos(position);
      setCurrentPos(position);
      setEndPos(null);
    } else if (!endPos) {
      // Second click: Set end position and show input form
      setEndPos(position);
      setCurrentPos(position);
      const pixelLength = calculateLineLength(startPos, position);
      if (pixelLength > 10) { // Minimum line length
        setIsInputVisible(true);
      } else {
        // Line too short, reset
        setStartPos(null);
        setEndPos(null);
        setCurrentPos(null);
      }
    }
  }, [startPos, endPos, isShiftPressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!startPos || endPos || !canvasRef.current) return;
    
    // Only update preview if we have start but not end yet
    const rect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // If Shift is pressed, constrain to horizontal or vertical
    if (isShiftPressed && startPos) {
      const dx = Math.abs(x - startPos.x);
      const dy = Math.abs(y - startPos.y);
      
      // Constrain to the direction that's closer to the mouse
      if (dx > dy) {
        // Horizontal line - keep Y the same as start
        y = startPos.y;
      } else {
        // Vertical line - keep X the same as start
        x = startPos.x;
      }
    }
    
    setCurrentPos({ x, y });
  }, [startPos, endPos, isShiftPressed]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const length = parseFloat(realLength);
    
    if (length > 0 && startPos && endPos && imageSize) {
      const pixelLength = calculateLineLength(startPos, endPos);
      const line: DimensionLine = {
        id: `dim-${Date.now()}`,
        start: startPos,
        end: endPos,
        realLength: length,
        pixelLength,
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
      };
      
      onLineComplete(line);
      setStartPos(null);
      setEndPos(null);
      setCurrentPos(null);
      setRealLength('');
      setIsInputVisible(false);
    }
  }, [realLength, startPos, endPos, imageSize, onLineComplete]);

  const handleReset = useCallback(() => {
    setStartPos(null);
    setEndPos(null);
    setCurrentPos(null);
    setRealLength('');
    setIsInputVisible(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  }, []);

  React.useEffect(() => {
    handleImageLoad();
    window.addEventListener('resize', handleImageLoad);
    return () => window.removeEventListener('resize', handleImageLoad);
  }, [handleImageLoad]);

  // Handle Shift key for straight line constraint
  React.useEffect(() => {
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

  const displayEndPos = endPos || currentPos;
  const pixelLength = startPos && displayEndPos 
    ? calculateLineLength(startPos, displayEndPos) 
    : 0;
  
  // Calculate real-world dimension if scale is available
  const estimatedMillimeters = scaleInfo && pixelLength > 0
    ? pixelsToRealUnits(pixelLength, scaleInfo)
    : null;

  return (
    <div className="dimension-line-tool">
      <div className="tool-instructions">
        <h3>Set Scale with Dimension Line</h3>
        {!startPos ? (
          <p>Click once to start the line, then click again to end it</p>
        ) : !endPos ? (
          <p>
            Click again to set the end point of the line
            {isShiftPressed && <span className="shift-hint"> • Hold Shift for straight line</span>}
          </p>
        ) : (
          <p>Enter the real-world length for this dimension</p>
        )}
        {startPos && displayEndPos && (
          <div className="line-info">
            <p>Line length: {pixelLength.toFixed(1)} pixels</p>
            {estimatedMillimeters !== null && !endPos && (
              <p className="estimated-dimension">
                Estimated: ~{estimatedMillimeters.toFixed(0)} mm
              </p>
            )}
          </div>
        )}
      </div>

      <div className="dimension-canvas-container">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Floor plan"
          className="calibration-image"
          onLoad={handleImageLoad}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
        {imageSize && (
          <div
            ref={canvasRef}
            className="dimension-canvas"
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            style={{
              width: imageSize.width,
              height: imageSize.height,
            }}
          >
            {/* Render existing dimension lines */}
            {existingLines.length > 0 && (
              <svg
                className="existing-dimension-lines"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {existingLines.map((line) => {
                  // Normalize to calibration image size (scaleInfo) if available, otherwise use line's image size
                  // This ensures consistency between calibration view and main canvas view
                  const referenceWidth = scaleInfo?.imageWidth || line.imageWidth;
                  const referenceHeight = scaleInfo?.imageHeight || line.imageHeight;
                  
                  // First normalize to reference coordinates
                  const normalizedStartX = (line.start.x / line.imageWidth) * referenceWidth;
                  const normalizedStartY = (line.start.y / line.imageHeight) * referenceHeight;
                  const normalizedEndX = (line.end.x / line.imageWidth) * referenceWidth;
                  const normalizedEndY = (line.end.y / line.imageHeight) * referenceHeight;
                  
                  // Then scale to current displayed image size
                  const scaleX = imageSize.width / referenceWidth;
                  const scaleY = imageSize.height / referenceHeight;
                  const scaledStartX = normalizedStartX * scaleX;
                  const scaledStartY = normalizedStartY * scaleY;
                  const scaledEndX = normalizedEndX * scaleX;
                  const scaledEndY = normalizedEndY * scaleY;
                  const midX = (scaledStartX + scaledEndX) / 2;
                  const midY = (scaledStartY + scaledEndY) / 2;
                  const angle = Math.atan2(
                    scaledEndY - scaledStartY,
                    scaledEndX - scaledStartX
                  ) * 180 / Math.PI;

                  return (
                    <g key={line.id}>
                      <line
                        x1={scaledStartX}
                        y1={scaledStartY}
                        x2={scaledEndX}
                        y2={scaledEndY}
                        stroke="#00aa00"
                        strokeWidth="2"
                      />
                      <circle
                        cx={scaledStartX}
                        cy={scaledStartY}
                        r="3"
                        fill="#00aa00"
                      />
                      <circle
                        cx={scaledEndX}
                        cy={scaledEndY}
                        r="3"
                        fill="#00aa00"
                      />
                      <text
                        x={midX}
                        y={midY - 10}
                        fill="#00aa00"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform={`rotate(${angle} ${midX} ${midY})`}
                      >
                        {line.realLength.toLocaleString()} mm
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Render current line being drawn */}
            {startPos && displayEndPos && (
              <svg
                className="dimension-line-preview"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                <line
                  x1={startPos.x}
                  y1={startPos.y}
                  x2={displayEndPos.x}
                  y2={displayEndPos.y}
                  stroke={endPos ? "#00aa00" : "#ff4444"}
                  strokeWidth="2"
                  strokeDasharray={endPos ? "0" : "5,5"}
                />
                <circle
                  cx={startPos.x}
                  cy={startPos.y}
                  r="4"
                  fill="#ff4444"
                />
                <circle
                  cx={displayEndPos.x}
                  cy={displayEndPos.y}
                  r="4"
                  fill={endPos ? "#00aa00" : "#ff4444"}
                />
              </svg>
            )}
          </div>
        )}
      </div>

      {isInputVisible && (
        <div className="dimension-input-overlay">
          <form onSubmit={handleSubmit} className="dimension-input-form">
            <label>
              Real-world length (millimeters):
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={realLength}
                onChange={(e) => setRealLength(e.target.value)}
                placeholder="e.g., 5000"
                autoFocus
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit">Confirm</button>
              <button type="button" onClick={handleReset}>Reset</button>
              <button type="button" onClick={onCancel}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {!isInputVisible && (
        <div className="tool-actions">
          <button onClick={onCancel} className="cancel-button">
            Cancel Calibration
          </button>
        </div>
      )}
    </div>
  );
};

