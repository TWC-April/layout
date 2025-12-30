import React, { useRef, useState, useCallback } from 'react';
import { PlacedFixture, ScaleInfo, Position, DimensionLine, PlacementArea, FixtureDimensionLine, CenterLine, TextAnnotation } from '../types';
import { checkFit } from '../utils/scaleUtils';

interface FloorPlanCanvasProps {
  imageUrl: string;
  scaleInfo: ScaleInfo | null;
  dimensionLines: DimensionLine[];
  fixtures: PlacedFixture[];
  fixtureDimensionLines?: FixtureDimensionLine[];
  centerLines?: CenterLine[];
  textAnnotations?: TextAnnotation[];
  onFixtureMove: (id: string, position: Position) => void;
  onFixtureRotate: (id: string, angle: number) => void;
  onFixtureDelete: (id: string) => void;
  onFixtureMoveComplete?: () => void;
  onFixtureRotateComplete?: () => void;
  placementArea?: PlacementArea | null;
  onDisplayedImageSizeChange?: (size: { width: number; height: number }) => void;
  isAddingFixtureDimension?: boolean;
  isAddingCenterLine?: boolean;
  onFloorPlanClick?: (position: Position) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  imageUrl,
  scaleInfo,
  dimensionLines,
  fixtures,
  fixtureDimensionLines = [],
  centerLines = [],
  textAnnotations = [],
  onFixtureMove,
  onFixtureRotate,
  onFixtureDelete,
  onFixtureMoveComplete,
  onFixtureRotateComplete,
  placementArea,
  onDisplayedImageSizeChange,
  isAddingFixtureDimension = false,
  isAddingCenterLine = false,
  onFloorPlanClick,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [displayedImageSize, setDisplayedImageSize] = useState<{ width: number; height: number } | null>(null);
  const [draggedFixture, setDraggedFixture] = useState<PlacedFixture | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const [rotationStartMouseAngle, setRotationStartMouseAngle] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const tempDragPosition = useRef<Position | null>(null);
  const tempRotationAngle = useRef<number | null>(null);
  const fixtureRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastStateUpdateTime = useRef<number>(0);
  const isDeletingRef = useRef<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      // Use offsetWidth/offsetHeight to match DimensionLineTool's approach
      // This ensures both views use the same displayed image size calculation
      updateDisplayedSize();
    }
  }, []);

  // Update displayed size when image loads or container resizes
  const updateDisplayedSize = useCallback(() => {
    if (imageRef.current) {
      // Use offsetWidth/offsetHeight to match DimensionLineTool's approach
      // This ensures both views use the same displayed image size calculation
      // This is critical for dimension lines to stay in the same position when switching views
      const size = {
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      };
      setDisplayedImageSize(size);
      if (onDisplayedImageSizeChange) {
        onDisplayedImageSizeChange(size);
      }
    }
  }, [onDisplayedImageSizeChange]);

  React.useEffect(() => {
    handleImageLoad();
    updateDisplayedSize();
    window.addEventListener('resize', () => {
      handleImageLoad();
      updateDisplayedSize();
    });
    return () => {
      window.removeEventListener('resize', handleImageLoad);
      // Cleanup: cancel any pending animation frame on unmount
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleImageLoad, updateDisplayedSize]);

  // Handle mouse wheel zoom
  React.useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!canvasRef.current?.contains(e.target as Node)) return;
      
      // Only zoom if Ctrl/Cmd key is held (standard zoom behavior)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Slower zoom: smaller increment per scroll
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoomLevel((prev) => {
          const newZoom = Math.max(0.1, Math.min(5.0, prev + delta));
          return Math.round(newZoom * 20) / 20; // Round to 2 decimals (0.05 increments)
        });
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(5.0, Math.round((prev + 0.05) * 20) / 20));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.1, Math.round((prev - 0.05) * 20) / 20));
  };

  const handleZoomFit = () => {
    setZoomLevel(1.0);
  };


  const handleFixtureMouseDown = useCallback((fixture: PlacedFixture, e: React.MouseEvent, isRotationHandle: boolean = false) => {
    // If in annotation mode, don't handle fixture interaction here
    // It's handled in the onMouseDown handler on the fixture div
    if (isAddingFixtureDimension || isAddingCenterLine) {
      return;
    }
    
    e.stopPropagation();
    
    // Right-click: delete fixture (don't start drag)
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      isDeletingRef.current = true;
      // Call delete handler - it will show confirmation dialog
      // If user cancels, isDeletingRef will prevent drag from starting
      onFixtureDelete(fixture.id);
      // Reset after a short delay to allow dialog to appear and user to respond
      setTimeout(() => {
        isDeletingRef.current = false;
      }, 500);
      return;
    }
    
    // Left-click: check if clicking rotation handle
    if (e.button === 0) {
      // Don't start drag if we're in the middle of a delete operation
      if (isDeletingRef.current) {
        return;
      }
      if (isRotationHandle) {
        // Start rotation
        e.preventDefault();
        setIsRotating(true);
        setSelectedFixtureId(fixture.id);
        
        if (!scaleInfo || !displayedImageSize || !canvasRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
        const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
        const scaledX = fixture.position.x * scaleX;
        const scaledY = fixture.position.y * scaleY;
        
        // Get center of fixture
        const widthPx = fixture.width * scaleInfo.pixelsPerMillimeter * scaleX;
        const heightPx = fixture.height * scaleInfo.pixelsPerMillimeter * scaleY;
        const centerX = rect.left + scaledX + widthPx / 2;
        const centerY = rect.top + scaledY + heightPx / 2;
        
        // Calculate initial angle
        const currentRotation = fixture.rotation || 0;
        const mouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        
        setRotationStartAngle(currentRotation);
        setRotationStartMouseAngle(mouseAngle);
        tempRotationAngle.current = currentRotation;
        return;
      }
      
      // Normal click: prepare for drag/move
      if (!scaleInfo || !displayedImageSize || !canvasRef.current) return;
      
      const canvasContentRect = canvasRef.current.querySelector('.canvas-content')?.getBoundingClientRect();
      if (!canvasContentRect) return;
      
      // Adjust mouse coordinates for zoom (CSS transform)
      // Mouse coordinates are in screen pixels, need to convert to canvas content coordinates
      const mouseX = (e.clientX - canvasContentRect.left) / zoomLevel;
      const mouseY = (e.clientY - canvasContentRect.top) / zoomLevel;
      
      // Calculate scale from calibration image to displayed image (before zoom)
      // Zoom is handled separately via CSS transform, so we don't divide by zoomLevel here
      // This ensures millimeter measurements remain constant regardless of zoom
      const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
      const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
      const scaledX = fixture.position.x * scaleX;
      const scaledY = fixture.position.y * scaleY;
      
      setDragOffset({
        x: mouseX - scaledX,
        y: mouseY - scaledY,
      });
      setDraggedFixture(fixture);
      setSelectedFixtureId(fixture.id);
      tempDragPosition.current = null;
    }
  }, [scaleInfo, displayedImageSize, onFixtureDelete, zoomLevel]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Don't handle movement if we're in annotation mode
    if (isAddingFixtureDimension || isAddingCenterLine) {
      return;
    }
    
    // Don't handle movement if we're deleting
    if (isDeletingRef.current) {
      return;
    }
    
    // Handle rotation
    if (isRotating && selectedFixtureId && scaleInfo && displayedImageSize && canvasRef.current) {
      const fixture = fixtures.find(f => f.id === selectedFixtureId);
      if (!fixture) return;

      const canvasContentRect = canvasRef.current.querySelector('.canvas-content')?.getBoundingClientRect();
      if (!canvasContentRect) return;

      // Calculate scale from calibration image to displayed image (before zoom)
      const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
      const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
      const scaledX = fixture.position.x * scaleX;
      const scaledY = fixture.position.y * scaleY;
      
      // Get center of fixture (accounting for zoom in screen coordinates)
      const widthPx = fixture.width * scaleInfo.pixelsPerMillimeter * scaleX;
      const heightPx = fixture.height * scaleInfo.pixelsPerMillimeter * scaleY;
      const centerX = canvasContentRect.left + (scaledX + widthPx / 2) * zoomLevel;
      const centerY = canvasContentRect.top + (scaledY + heightPx / 2) * zoomLevel;
      
      // Calculate current mouse angle
      const mouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      
      // Calculate rotation delta
      let deltaAngle = mouseAngle - rotationStartMouseAngle;
      
      // Normalize to -180 to 180 range
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;
      
      // Apply rotation with shift key for 15-degree snapping
      let newRotation = rotationStartAngle + deltaAngle;
      if (e.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }
      
      tempRotationAngle.current = newRotation;
      
      // Schedule update for next animation frame (rotation can be batched for smoothness)
      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(() => {
          if (tempRotationAngle.current !== null && selectedFixtureId) {
            onFixtureRotate(selectedFixtureId, tempRotationAngle.current);
          }
          animationFrameRef.current = null;
        });
      }
      return;
    }
    
    // Handle movement - Update state immediately for precise positioning
    if (!draggedFixture || !scaleInfo || !displayedImageSize || !canvasRef.current) return;

    const canvasContentRect = canvasRef.current.querySelector('.canvas-content')?.getBoundingClientRect();
    if (!canvasContentRect) return;

    // Calculate scale from calibration image to displayed image (before zoom)
    // Zoom is handled separately via CSS transform, so we don't divide by zoomLevel here
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    
    // Get mouse position relative to canvas content (accounting for zoom)
    // Mouse coordinates are in screen pixels, convert to canvas content coordinates
    const mouseX = (e.clientX - canvasContentRect.left) / zoomLevel - dragOffset.x;
    const mouseY = (e.clientY - canvasContentRect.top) / zoomLevel - dragOffset.y;
    
    // Convert back to calibration image coordinates
    const calibrationX = mouseX / scaleX;
    const calibrationY = mouseY / scaleY;

    const newPosition = { x: calibrationX, y: calibrationY };
    
    // Check if position is valid
    if (checkFit(newPosition, { width: draggedFixture.width, height: draggedFixture.height }, scaleInfo)) {
      // Update state immediately for precise positioning
      tempDragPosition.current = newPosition;
      onFixtureMove(draggedFixture.id, newPosition);
    }
  }, [isRotating, selectedFixtureId, rotationStartAngle, rotationStartMouseAngle, fixtures, draggedFixture, dragOffset, scaleInfo, displayedImageSize, onFixtureMove, onFixtureRotate]);

  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    const wasDragging = !!draggedFixture;
    const wasRotating = isRotating;
    
    // Ensure final rotation is committed
    if (tempRotationAngle.current !== null && selectedFixtureId) {
      onFixtureRotate(selectedFixtureId, tempRotationAngle.current);
    }
    
    setDraggedFixture(null);
    setIsRotating(false);
    tempDragPosition.current = null;
    tempRotationAngle.current = null;
    lastStateUpdateTime.current = 0;
    
    // Save to history on mouse up
    if (wasDragging && onFixtureMoveComplete) {
      onFixtureMoveComplete();
    }
    if (wasRotating && onFixtureRotateComplete) {
      onFixtureRotateComplete();
    }
    
    // Keep selectedFixtureId so rotation handle stays visible on hover
  }, [draggedFixture, selectedFixtureId, isRotating, onFixtureRotate, onFixtureMoveComplete, onFixtureRotateComplete]);

  return (
    <div
      ref={canvasRef}
      className="floor-plan-canvas"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
    >
      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button
          onClick={handleZoomIn}
          className="zoom-button"
          title="Zoom In (Ctrl/Cmd + Scroll)"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="zoom-button"
          title="Zoom Out (Ctrl/Cmd + Scroll)"
        >
          −
        </button>
        <button
          onClick={handleZoomFit}
          className="zoom-button"
          title="Fit to Screen"
        >
          ⌂
        </button>
        <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
      </div>
      
      <div 
        className="canvas-content"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
        }}
      >
        <img 
          ref={imageRef}
          src={imageUrl} 
          alt="Floor plan" 
          className="floor-plan-image"
          onLoad={handleImageLoad}
          onClick={(e) => {
            // Handle clicks on floor plan image for annotation tools
            if ((isAddingFixtureDimension || isAddingCenterLine) && onFloorPlanClick && displayedImageSize && scaleInfo) {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              // Account for zoom
              const zoomX = x / zoomLevel;
              const zoomY = y / zoomLevel;
              onFloorPlanClick({ x: zoomX, y: zoomY });
            }
          }}
          style={{
            cursor: (isAddingFixtureDimension || isAddingCenterLine) ? 'crosshair' : 'default',
          }}
        />
        
            {/* Render placement area overlay */}
            {placementArea && displayedImageSize && scaleInfo && (
              <div
                className="placement-area-overlay"
                style={{
                  position: 'absolute',
                  left: (placementArea.x * scaleInfo.pixelsPerMillimeter) * (displayedImageSize.width / scaleInfo.imageWidth),
                  top: (placementArea.y * scaleInfo.pixelsPerMillimeter) * (displayedImageSize.height / scaleInfo.imageHeight),
                  width: (placementArea.width * scaleInfo.pixelsPerMillimeter) * (displayedImageSize.width / scaleInfo.imageWidth),
                  height: (placementArea.height * scaleInfo.pixelsPerMillimeter) * (displayedImageSize.height / scaleInfo.imageHeight),
                  border: '2px dashed var(--apple-blue)',
                  backgroundColor: 'rgba(0, 122, 255, 0.05)',
                  pointerEvents: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}

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
              // Scale positions directly from the line's original image coordinates to current displayed image size
              // This ensures lines stay exactly where they were drawn, regardless of view changes
              // The line's imageWidth/imageHeight are the displayed dimensions when it was drawn
              // displayedImageSize is the current displayed dimensions (before zoom)
              const scaleX = displayedImageSize.width / line.imageWidth;
              const scaleY = displayedImageSize.height / line.imageHeight;
              
              // Direct scaling from original coordinates to current displayed size
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
          // Calculate scale factors from calibration image size to current displayed image size (before zoom)
          // This ensures millimeter measurements remain constant regardless of zoom
          const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
          const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
          
          // pixelsPerMillimeter is stored in calibration image coordinates (scaleInfo.imageWidth/imageHeight)
          // Convert fixture dimensions from mm to pixels in current displayed image (before CSS zoom transform)
          // Formula: mm * (px/mm in calibration) * (current displayed / calibration displayed)
          // The CSS transform scale() will handle the visual zoom without affecting the actual millimeter scale
          const widthPx = fixture.width * scaleInfo.pixelsPerMillimeter * scaleX;
          const heightPx = fixture.height * scaleInfo.pixelsPerMillimeter * scaleY;
          
          // Use temp position if this fixture is being dragged
          const displayPosition = draggedFixture?.id === fixture.id && tempDragPosition.current
            ? tempDragPosition.current
            : fixture.position;
          
          // Use temp rotation if this fixture is being rotated
          const displayRotation = isRotating && selectedFixtureId === fixture.id && tempRotationAngle.current !== null
            ? tempRotationAngle.current
            : (fixture.rotation || 0);
          
          // Scale fixture positions from calibration image coordinates to current displayed image (before zoom)
          // The CSS transform will apply zoom visually
          const scaledX = displayPosition.x * scaleX;
          const scaledY = displayPosition.y * scaleY;

          const rotation = displayRotation;
          const isSelected = selectedFixtureId === fixture.id;
          
          return (
            <div
              key={fixture.id}
              ref={(el) => {
                if (el) {
                  fixtureRefs.current.set(fixture.id, el);
                } else {
                  fixtureRefs.current.delete(fixture.id);
                }
              }}
              className={`placed-fixture ${isSelected ? 'selected' : ''} ${(isAddingFixtureDimension || isAddingCenterLine) ? 'annotation-mode' : ''}`}
              style={{
                left: scaledX,
                top: scaledY,
                width: widthPx,
                height: heightPx,
                position: 'absolute',
                cursor: (isAddingFixtureDimension || isAddingCenterLine) ? 'pointer' : 'move',
                overflow: 'visible', // Changed to visible to show rotation handle
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                willChange: draggedFixture?.id === fixture.id ? 'transform' : 'auto', // Optimize for dragging
                pointerEvents: 'auto', // Ensure fixtures are clickable
              }}
              onMouseDown={(e) => {
                // If in annotation mode, prevent fixture interaction
                if (isAddingFixtureDimension || isAddingCenterLine) {
                  e.stopPropagation();
                  // Don't call handleFixtureMouseDown to prevent drag
                  return;
                }
                // Otherwise, handle normal fixture interaction
                handleFixtureMouseDown(fixture, e, false);
              }}
              onMouseUp={(e) => {
                // In annotation mode, prevent any drag completion
                if (isAddingFixtureDimension || isAddingCenterLine) {
                  e.stopPropagation();
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Prevent default context menu, delete is handled in onMouseDown
              }}
              onMouseEnter={() => setSelectedFixtureId(fixture.id)}
              onMouseLeave={() => {
                if (!isRotating) {
                  setSelectedFixtureId(null);
                }
              }}
            >
              {fixture.icon ? (
                <img 
                  src={fixture.icon} 
                  alt={fixture.name}
                  className="placed-fixture-image"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill', // Fill exact dimensions - no gaps
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: fixture.color || '#e0e0e0',
                }} />
              )}
              
              {/* Rotation handle - appears when fixture is selected */}
              {isSelected && (
                <>
                  <div
                    className="rotation-handle"
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: -12,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: '#007AFF',
                      border: '2px solid white',
                      cursor: 'grab',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      zIndex: 10,
                      pointerEvents: 'auto',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleFixtureMouseDown(fixture, e, true);
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 1 L8 3 L6 5 M8 3 L3 3 M6 11 L8 9 L6 7 M8 9 L3 9"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  
                  {/* Delete button - appears when fixture is selected */}
                  <div
                    className="delete-handle"
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: -12,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: '#FF3B30',
                      border: '2px solid white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      zIndex: 10,
                      pointerEvents: 'auto',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onFixtureDelete(fixture.id);
                    }}
                    title="Delete fixture"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 3 L9 9 M9 3 L3 9"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Render fixture dimension lines */}
        {fixtureDimensionLines.length > 0 && displayedImageSize && scaleInfo && (
          <svg
            className="fixture-dimension-lines-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: displayedImageSize.width,
              height: displayedImageSize.height,
              pointerEvents: 'none',
            }}
          >
            {fixtureDimensionLines.map((dim) => {
              const scaleX = displayedImageSize.width / dim.imageWidth;
              const scaleY = displayedImageSize.height / dim.imageHeight;
              
              const scaledStartX = dim.startPosition.x * scaleX;
              const scaledStartY = dim.startPosition.y * scaleY;
              const scaledEndX = dim.endPosition.x * scaleX;
              const scaledEndY = dim.endPosition.y * scaleY;
              
              const midX = (scaledStartX + scaledEndX) / 2;
              const midY = (scaledStartY + scaledEndY) / 2;
              const angle = Math.atan2(
                scaledEndY - scaledStartY,
                scaledEndX - scaledStartX
              ) * 180 / Math.PI;

              return (
                <g key={dim.id}>
                  <line
                    x1={scaledStartX}
                    y1={scaledStartY}
                    x2={scaledEndX}
                    y2={scaledEndY}
                    stroke="#007AFF"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                  <circle
                    cx={scaledStartX}
                    cy={scaledStartY}
                    r="4"
                    fill="#007AFF"
                  />
                  <circle
                    cx={scaledEndX}
                    cy={scaledEndY}
                    r="4"
                    fill="#007AFF"
                  />
                  <text
                    x={midX}
                    y={midY - 10}
                    fill="#007AFF"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    transform={`rotate(${angle} ${midX} ${midY})`}
                  >
                    {dim.label || `${Math.round(dim.realLength).toLocaleString()} mm`}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Render center lines */}
        {centerLines.length > 0 && displayedImageSize && scaleInfo && (
          <svg
            className="center-lines-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: displayedImageSize.width,
              height: displayedImageSize.height,
              pointerEvents: 'none',
            }}
          >
            {centerLines.map((line) => {
              const scaleX = displayedImageSize.width / line.imageWidth;
              const scaleY = displayedImageSize.height / line.imageHeight;
              
              const scaledStartX = line.start.x * scaleX;
              const scaledStartY = line.start.y * scaleY;
              const scaledEndX = line.end.x * scaleX;
              const scaledEndY = line.end.y * scaleY;

              return (
                <line
                  key={line.id}
                  x1={scaledStartX}
                  y1={scaledStartY}
                  x2={scaledEndX}
                  y2={scaledEndY}
                  stroke="#8E8E93"
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity="0.6"
                />
              );
            })}
          </svg>
        )}

        {/* Render text annotations */}
        {textAnnotations.length > 0 && displayedImageSize && scaleInfo && (
          <div className="text-annotations-overlay" style={{ position: 'absolute', top: 0, left: 0, width: displayedImageSize.width, height: displayedImageSize.height, pointerEvents: 'none' }}>
            {textAnnotations.map((annotation) => {
              const scaleX = displayedImageSize.width / annotation.imageWidth;
              const scaleY = displayedImageSize.height / annotation.imageHeight;
              
              const scaledX = annotation.position.x * scaleX;
              const scaledY = annotation.position.y * scaleY;

              return (
                <div
                  key={annotation.id}
                  style={{
                    position: 'absolute',
                    left: scaledX,
                    top: scaledY,
                    padding: '6px 10px',
                    backgroundColor: annotation.backgroundColor || 'rgba(255, 255, 255, 0.95)',
                    color: annotation.color || '#000',
                    fontSize: annotation.fontSize || '13px',
                    borderRadius: 'var(--apple-border-radius-small)',
                    boxShadow: 'var(--apple-shadow)',
                    border: '1px solid var(--apple-gray-medium)',
                    whiteSpace: 'nowrap',
                    transform: `translate(-50%, -50%) rotate(${annotation.rotation || 0}deg)`,
                  }}
                >
                  {annotation.text}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

