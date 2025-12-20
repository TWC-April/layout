import React, { useRef, useState, useCallback } from 'react';
import { PlacedFixture, ScaleInfo, Position, DimensionLine } from '../types';
import { checkFit } from '../utils/scaleUtils';

interface FloorPlanCanvasProps {
  imageUrl: string;
  scaleInfo: ScaleInfo | null;
  dimensionLines: DimensionLine[];
  fixtures: PlacedFixture[];
  onFixtureMove: (id: string, position: Position) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  imageUrl,
  scaleInfo,
  dimensionLines,
  fixtures,
  onFixtureMove,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [displayedImageSize, setDisplayedImageSize] = useState<{ width: number; height: number } | null>(null);
  const [draggedFixture, setDraggedFixture] = useState<PlacedFixture | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setDisplayedImageSize({
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

  const handleFixtureMouseDown = useCallback((fixture: PlacedFixture, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!scaleInfo || !displayedImageSize || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    const scaledX = fixture.position.x * scaleX;
    const scaledY = fixture.position.y * scaleY;
    
    setDragOffset({
      x: e.clientX - rect.left - scaledX,
      y: e.clientY - rect.top - scaledY,
    });
    setDraggedFixture(fixture);
  }, [scaleInfo, displayedImageSize]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedFixture || !scaleInfo || !displayedImageSize || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    
    // Get mouse position relative to canvas
    const mouseX = e.clientX - rect.left - dragOffset.x;
    const mouseY = e.clientY - rect.top - dragOffset.y;
    
    // Convert back to calibration image coordinates
    const calibrationX = mouseX / scaleX;
    const calibrationY = mouseY / scaleY;

    const newPosition = { x: calibrationX, y: calibrationY };
    if (checkFit(newPosition, { width: draggedFixture.width, height: draggedFixture.height }, scaleInfo)) {
      onFixtureMove(draggedFixture.id, newPosition);
    }
  }, [draggedFixture, dragOffset, scaleInfo, displayedImageSize, onFixtureMove]);

  const handleMouseUp = useCallback(() => {
    setDraggedFixture(null);
  }, []);

  return (
    <div
      ref={canvasRef}
      className="floor-plan-canvas"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="canvas-content">
        <img 
          ref={imageRef}
          src={imageUrl} 
          alt="Floor plan" 
          className="floor-plan-image"
          onLoad={handleImageLoad}
        />
        
        {/* Render dimension lines */}
        {dimensionLines.length > 0 && displayedImageSize && scaleInfo && (
          <svg
            className="dimension-lines-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: displayedImageSize.width,
              height: displayedImageSize.height,
              pointerEvents: 'none',
            }}
          >
            {dimensionLines.map((line) => {
              // Scale positions from calibration image size to current displayed image size
              const scaleX = displayedImageSize.width / line.imageWidth;
              const scaleY = displayedImageSize.height / line.imageHeight;
              
              const scaledStartX = line.start.x * scaleX;
              const scaledStartY = line.start.y * scaleY;
              const scaledEndX = line.end.x * scaleX;
              const scaledEndY = line.end.y * scaleY;
              
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

        {/* Render fixtures */}
        {scaleInfo && displayedImageSize && fixtures.map((fixture) => {
          // Calculate scale factors from calibration image size to current displayed image size
          const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
          const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
          
          // pixelsPerMillimeter is in calibration image coordinates
          // Convert fixture dimensions from mm to pixels in current displayed image
          // Formula: mm * (px/mm in calibration) * (current displayed / calibration displayed)
          const widthPx = fixture.width * scaleInfo.pixelsPerMillimeter * scaleX;
          const heightPx = fixture.height * scaleInfo.pixelsPerMillimeter * scaleY;
          
          // Scale fixture positions from calibration image coordinates to current displayed image
          const scaledX = fixture.position.x * scaleX;
          const scaledY = fixture.position.y * scaleY;

          return (
            <div
              key={fixture.id}
              className="placed-fixture"
              style={{
                left: scaledX,
                top: scaledY,
                width: widthPx,
                height: heightPx,
                backgroundColor: fixture.color,
                opacity: 0.7,
                border: '2px solid #333',
                position: 'absolute',
                cursor: 'move',
              }}
              onMouseDown={(e) => handleFixtureMouseDown(fixture, e)}
            >
              {fixture.icon ? (
                <img 
                  src={fixture.icon} 
                  alt={fixture.name}
                  className="placed-fixture-image"
                  style={{
                    width: '100%',
                    height: 'calc(100% - 24px)',
                    objectFit: 'contain',
                  }}
                />
              ) : null}
              <div className="fixture-label">
                {fixture.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

