import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Position, ScaleInfo } from '../types';
import { pixelsToRealUnits } from '../utils/scaleUtils';

interface AreaSelectionToolProps {
  imageUrl: string;
  scaleInfo: ScaleInfo | null;
  displayedImageSize: { width: number; height: number } | null;
  onAreaComplete: (area: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

export const AreaSelectionTool: React.FC<AreaSelectionToolProps> = ({
  imageUrl,
  scaleInfo,
  displayedImageSize: propDisplayedImageSize,
  onAreaComplete,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [areaStart, setAreaStart] = useState<Position | null>(null);
  const [areaEnd, setAreaEnd] = useState<Position | null>(null);
  const [displayedImageSize, setDisplayedImageSize] = useState<{ width: number; height: number } | null>(propDisplayedImageSize);

  // Update displayed image size when image loads
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const size = {
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      };
      setDisplayedImageSize(size);
    }
  }, []);

  useEffect(() => {
    handleImageLoad();
    window.addEventListener('resize', handleImageLoad);
    return () => window.removeEventListener('resize', handleImageLoad);
  }, [handleImageLoad]);

  // Use prop if available, otherwise use local state
  const currentDisplayedImageSize = propDisplayedImageSize || displayedImageSize;

  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent): Position => {
    if (!imageRef.current || !scaleInfo || !currentDisplayedImageSize) return { x: 0, y: 0 };
    
    const imageRect = imageRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    // Calculate position relative to displayed image (in pixels)
    let x = clientX - imageRect.left;
    let y = clientY - imageRect.top;
    
    // Clamp to image bounds
    x = Math.max(0, Math.min(imageRect.width, x));
    y = Math.max(0, Math.min(imageRect.height, y));
    
    // Convert from displayed image pixels to calibration image pixels
    const scaleX = currentDisplayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = currentDisplayedImageSize.height / scaleInfo.imageHeight;
    const calibrationX = x / scaleX;
    const calibrationY = y / scaleY;
    
    // Convert to millimeters
    const mmX = pixelsToRealUnits(calibrationX, scaleInfo);
    const mmY = pixelsToRealUnits(calibrationY, scaleInfo);
    
    return { x: mmX, y: mmY };
  }, [scaleInfo, currentDisplayedImageSize]);

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isSelecting && areaStart) {
        const pos = getMousePos(e);
        setAreaEnd(pos);
        setIsSelecting(false);
      }
    };

    if (isSelecting) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isSelecting, areaStart, getMousePos]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = getMousePos(e);
    setIsSelecting(true);
    setAreaStart(pos);
    setAreaEnd(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !areaStart) return;
    e.preventDefault();
    const pos = getMousePos(e);
    setAreaEnd(pos);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isSelecting || !areaStart) return;
    e.preventDefault();
    const pos = getMousePos(e);
    setAreaEnd(pos);
    setIsSelecting(false);
  };

  const handleConfirm = () => {
    if (!areaStart || !areaEnd || !scaleInfo) return;
    
    const x1 = Math.min(areaStart.x, areaEnd.x);
    const y1 = Math.min(areaStart.y, areaEnd.y);
    const x2 = Math.max(areaStart.x, areaEnd.x);
    const y2 = Math.max(areaStart.y, areaEnd.y);
    
    const width = x2 - x1;
    const height = y2 - y1;
    
    if (width < 1000 || height < 1000) {
      alert('Area must be at least 1000mm × 1000mm to accommodate fixture clearance.');
      return;
    }
    
    onAreaComplete({
      x: x1,
      y: y1,
      width,
      height,
    });
  };

  const handleReset = () => {
    setAreaStart(null);
    setAreaEnd(null);
  };

  // Convert mm to displayed pixels for rendering
  const getDisplayedArea = () => {
    if (!areaStart || !areaEnd || !scaleInfo || !currentDisplayedImageSize) return null;
    
    const scaleX = currentDisplayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = currentDisplayedImageSize.height / scaleInfo.imageHeight;
    
    const x1 = Math.min(areaStart.x, areaEnd.x);
    const y1 = Math.min(areaStart.y, areaEnd.y);
    const x2 = Math.max(areaStart.x, areaEnd.x);
    const y2 = Math.max(areaStart.y, areaEnd.y);
    
    // Convert mm to calibration pixels, then to displayed pixels
    const px1 = (x1 * scaleInfo.pixelsPerMillimeter) * scaleX;
    const py1 = (y1 * scaleInfo.pixelsPerMillimeter) * scaleY;
    const px2 = (x2 * scaleInfo.pixelsPerMillimeter) * scaleX;
    const py2 = (y2 * scaleInfo.pixelsPerMillimeter) * scaleY;
    
    return {
      left: px1,
      top: py1,
      width: px2 - px1,
      height: py2 - py1,
    };
  };

  const displayedArea = getDisplayedArea();
  // Validate area size in mm (not pixels)
  const isValidArea = areaStart && areaEnd && 
    Math.abs(areaEnd.x - areaStart.x) >= 1000 && 
    Math.abs(areaEnd.y - areaStart.y) >= 1000;

  return (
    <div className="area-selection-tool">
      <div className="area-selection-header">
        <h3>Select Placement Area</h3>
        <p>Click and drag to draw an area where fixtures should be placed</p>
        <p className="area-hint">Minimum area: 1000mm × 1000mm (for fixture clearance)</p>
      </div>
      
      <div
        ref={canvasRef}
        className="area-selection-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: 'crosshair' }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Floor plan"
          className="area-selection-image"
          style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          onLoad={handleImageLoad}
        />
        
        {displayedArea && (
          <div
            className="area-selection-box"
            style={{
              position: 'absolute',
              left: displayedArea.left,
              top: displayedArea.top,
              width: displayedArea.width,
              height: displayedArea.height,
              border: '2px dashed var(--apple-blue)',
              backgroundColor: 'rgba(0, 122, 255, 0.1)',
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>
      
      <div className="area-selection-actions">
        <button
          onClick={handleConfirm}
          className="confirm-area-button"
          disabled={!isValidArea}
        >
          Confirm Area
        </button>
        <button
          onClick={handleReset}
          className="reset-area-button"
          disabled={!areaStart}
        >
          Reset Selection
        </button>
        <button
          onClick={onCancel}
          className="cancel-area-button"
        >
          Cancel
        </button>
      </div>
      
      {displayedArea && areaStart && areaEnd && (
        <div className="area-selection-info">
          <p>
            Area: {Math.round(Math.abs(areaEnd.x - areaStart.x)).toLocaleString()}mm × {' '}
            {Math.round(Math.abs(areaEnd.y - areaStart.y)).toLocaleString()}mm
          </p>
        </div>
      )}
    </div>
  );
};

