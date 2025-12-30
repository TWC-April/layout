import React from 'react';
import { PlacedFixture, ScaleInfo, PlacementArea } from '../types';

interface AutoPlacementPreviewProps {
  imageUrl: string;
  area: PlacementArea;
  previewFixtures: PlacedFixture[];
  scaleInfo: ScaleInfo;
  displayedImageSize: { width: number; height: number };
  onConfirm: () => void;
  onCancel: () => void;
}

export const AutoPlacementPreview: React.FC<AutoPlacementPreviewProps> = ({
  imageUrl,
  area,
  previewFixtures,
  scaleInfo,
  displayedImageSize,
  onConfirm,
  onCancel,
}) => {
  // Convert area from mm to displayed pixels
  const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
  const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
  
  const areaPx = {
    x: (area.x * scaleInfo.pixelsPerMillimeter) * scaleX,
    y: (area.y * scaleInfo.pixelsPerMillimeter) * scaleY,
    width: (area.width * scaleInfo.pixelsPerMillimeter) * scaleX,
    height: (area.height * scaleInfo.pixelsPerMillimeter) * scaleY,
  };

  return (
    <div className="auto-placement-preview">
      <div className="preview-header">
        <h3>Auto-Placement Preview</h3>
        <p>{previewFixtures.length} fixture(s) will be placed</p>
      </div>
      
      <div className="preview-area-overlay" style={{ position: 'relative' }}>
        <img
          src={imageUrl}
          alt="Floor plan"
          style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
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
          const fixturePx = {
            x: (fixture.position.x * scaleInfo.pixelsPerMillimeter) * scaleX,
            y: (fixture.position.y * scaleInfo.pixelsPerMillimeter) * scaleY,
            width: (fixture.width * scaleInfo.pixelsPerMillimeter) * scaleX,
            height: (fixture.height * scaleInfo.pixelsPerMillimeter) * scaleY,
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

