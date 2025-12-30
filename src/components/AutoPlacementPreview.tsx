import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PlacedFixture, ScaleInfo, PlacementArea } from '../types';
import { realUnitsToPixels } from '../utils/scaleUtils';

interface AutoPlacementPreviewProps {
  imageUrl: string;
  area: PlacementArea;
  previewFixtures: PlacedFixture[];
  scaleInfo: ScaleInfo;
  displayedImageSize: { width: number; height: number } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AutoPlacementPreview: React.FC<AutoPlacementPreviewProps> = ({
  imageUrl,
  area,
  previewFixtures,
  scaleInfo,
  displayedImageSize: propDisplayedImageSize,
  onConfirm,
  onCancel,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
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

  if (!currentDisplayedImageSize) {
    return (
      <div className="auto-placement-preview">
        <div className="preview-header">
          <h3>Auto-Placement Preview</h3>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate scale factors from calibration image to displayed image
  const scaleX = currentDisplayedImageSize.width / scaleInfo.imageWidth;
  const scaleY = currentDisplayedImageSize.height / scaleInfo.imageHeight;
  
  // Convert area from millimeters to calibration pixels, then to displayed pixels
  const areaCalPx = {
    x: realUnitsToPixels(area.x, scaleInfo),
    y: realUnitsToPixels(area.y, scaleInfo),
    width: realUnitsToPixels(area.width, scaleInfo),
    height: realUnitsToPixels(area.height, scaleInfo),
  };
  
  const areaPx = {
    x: areaCalPx.x * scaleX,
    y: areaCalPx.y * scaleY,
    width: areaCalPx.width * scaleX,
    height: areaCalPx.height * scaleY,
  };

  return (
    <div className="auto-placement-preview">
      <div className="preview-header">
        <h3>Auto-Placement Preview</h3>
        <p>{previewFixtures.length} fixture(s) will be placed</p>
      </div>
      
      <div className="preview-area-overlay" style={{ position: 'relative' }}>
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Floor plan"
          style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          onLoad={handleImageLoad}
        />
        <div
          className="preview-area-box"
          style={{
            position: 'absolute',
            left: areaPx.x,
            top: areaPx.y,
            width: areaPx.width,
            height: areaPx.height,
            border: '2px solid var(--apple-green)',
            backgroundColor: 'rgba(52, 199, 89, 0.1)',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        />
        
        {/* Render preview fixtures */}
        {previewFixtures.map((fixture) => {
          // Fixture positions are already in calibration image pixels
          // Just scale to displayed image pixels
          const fixturePx = {
            x: fixture.position.x * scaleX,
            y: fixture.position.y * scaleY,
            width: fixture.width * scaleInfo.pixelsPerMillimeter * scaleX,
            height: fixture.height * scaleInfo.pixelsPerMillimeter * scaleY,
          };
          
          return (
            <div
              key={fixture.id}
              className="preview-fixture"
              style={{
                position: 'absolute',
                left: fixturePx.x,
                top: fixturePx.y,
                width: fixturePx.width,
                height: fixturePx.height,
                border: '2px solid var(--apple-blue)',
                backgroundColor: 'rgba(0, 122, 255, 0.2)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: 'var(--apple-blue)',
                fontWeight: 'bold',
                transform: `rotate(${fixture.rotation || 0}deg)`,
                transformOrigin: 'center center',
                boxSizing: 'border-box',
              }}
            >
              {fixture.name}
            </div>
          );
        })}
      </div>
      
      <div className="preview-actions">
        <button
          onClick={onConfirm}
          className="confirm-placement-button"
        >
          Place {previewFixtures.length} Fixture(s)
        </button>
        <button
          onClick={onCancel}
          className="cancel-placement-button"
        >
          Cancel
        </button>
      </div>
      
      {previewFixtures.length === 0 && (
        <div className="preview-warning">
          <p>No fixtures could be placed in this area. Try selecting different groups or a larger area.</p>
        </div>
      )}
    </div>
  );
};

