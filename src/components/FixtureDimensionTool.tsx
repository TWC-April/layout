import React, { useState, useCallback } from 'react';
import { PlacedFixture, ScaleInfo, FixtureDimensionLine, Position } from '../types';
import { pixelsToRealUnits } from '../utils/scaleUtils';

interface FixtureDimensionToolProps {
  fixtures: PlacedFixture[];
  scaleInfo: ScaleInfo;
  displayedImageSize: { width: number; height: number };
  onDimensionComplete: (dimension: FixtureDimensionLine) => void;
  onCancel: () => void;
  selectedFixtureId?: string | null;
  onFixtureSelect?: (fixtureId: string) => void;
}

export const FixtureDimensionTool: React.FC<FixtureDimensionToolProps> = ({
  fixtures,
  scaleInfo,
  displayedImageSize,
  onDimensionComplete,
  onCancel,
  selectedFixtureId,
  onFixtureSelect,
}) => {
  const [selectedFixtureId1, setSelectedFixtureId1] = useState<string | null>(null);
  const [selectedFixtureId2, setSelectedFixtureId2] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');

  // Handle fixture selection from canvas
  React.useEffect(() => {
    if (selectedFixtureId && onFixtureSelect) {
      if (!selectedFixtureId1) {
        setSelectedFixtureId1(selectedFixtureId);
      } else if (!selectedFixtureId2 && selectedFixtureId !== selectedFixtureId1) {
        setSelectedFixtureId2(selectedFixtureId);
      }
    }
  }, [selectedFixtureId, selectedFixtureId1, onFixtureSelect]);

  const getFixtureCenter = useCallback((fixture: PlacedFixture): Position => {
    // Fixture position is in calibration image pixels
    // Calculate center accounting for rotation
    const centerX = fixture.position.x + (fixture.width * scaleInfo.pixelsPerMillimeter) / 2;
    const centerY = fixture.position.y + (fixture.height * scaleInfo.pixelsPerMillimeter) / 2;
    
    // If rotated, we need to rotate the center point
    if (fixture.rotation) {
      const angleRad = (fixture.rotation * Math.PI) / 180;
      const dx = centerX - fixture.position.x;
      const dy = centerY - fixture.position.y;
      const rotatedX = fixture.position.x + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
      const rotatedY = fixture.position.y + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
      return { x: rotatedX, y: rotatedY };
    }
    
    return { x: centerX, y: centerY };
  }, [scaleInfo]);

  // Handle fixture selection from canvas
  React.useEffect(() => {
    if (selectedFixtureId) {
      if (!selectedFixtureId1) {
        setSelectedFixtureId1(selectedFixtureId);
        // Clear selection after processing
        if (onFixtureSelect) {
          setTimeout(() => onFixtureSelect(''), 100);
        }
      } else if (!selectedFixtureId2 && selectedFixtureId !== selectedFixtureId1) {
        setSelectedFixtureId2(selectedFixtureId);
        // Clear selection after processing
        if (onFixtureSelect) {
          setTimeout(() => onFixtureSelect(''), 100);
        }
      }
    }
  }, [selectedFixtureId, selectedFixtureId1, onFixtureSelect]);

  const handleConfirm = useCallback(() => {
    if (!selectedFixtureId1 || !selectedFixtureId2) return;

    const fixture1 = fixtures.find(f => f.id === selectedFixtureId1);
    const fixture2 = fixtures.find(f => f.id === selectedFixtureId2);
    
    if (!fixture1 || !fixture2) return;

    const center1 = getFixtureCenter(fixture1);
    const center2 = getFixtureCenter(fixture2);

    // Calculate distance in pixels
    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);

    // Convert to millimeters
    const realLength = pixelsToRealUnits(pixelDistance, scaleInfo);

    const dimension: FixtureDimensionLine = {
      id: `fixture-dim-${Date.now()}`,
      fixtureId1: selectedFixtureId1,
      fixtureId2: selectedFixtureId2,
      startPosition: center1,
      endPosition: center2,
      realLength,
      label: customLabel.trim() || undefined,
      imageWidth: displayedImageSize.width,
      imageHeight: displayedImageSize.height,
    };

    onDimensionComplete(dimension);
  }, [selectedFixtureId1, selectedFixtureId2, fixtures, getFixtureCenter, scaleInfo, customLabel, displayedImageSize, onDimensionComplete]);

  const handleReset = useCallback(() => {
    setSelectedFixtureId1(null);
    setSelectedFixtureId2(null);
    setCustomLabel('');
  }, []);

  return (
    <div className="fixture-dimension-tool">
      <div className="tool-header">
        <h3>Add Fixture Dimension</h3>
        <p>
          {!selectedFixtureId1 
            ? 'Click on the first fixture'
            : !selectedFixtureId2
            ? 'Click on the second fixture'
            : 'Dimension ready'}
        </p>
      </div>

      {selectedFixtureId1 && selectedFixtureId2 && (
        <div className="dimension-preview">
          <p>
            Distance: {(() => {
              const fixture1 = fixtures.find(f => f.id === selectedFixtureId1);
              const fixture2 = fixtures.find(f => f.id === selectedFixtureId2);
              if (!fixture1 || !fixture2) return '0';
              const center1 = getFixtureCenter(fixture1);
              const center2 = getFixtureCenter(fixture2);
              const dx = center2.x - center1.x;
              const dy = center2.y - center1.y;
              const pixelDistance = Math.sqrt(dx * dx + dy * dy);
              const realLength = pixelsToRealUnits(pixelDistance, scaleInfo);
              return `${Math.round(realLength).toLocaleString()} mm`;
            })()}
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
          disabled={!selectedFixtureId1 || !selectedFixtureId2}
        >
          Add Dimension
        </button>
        <button
          onClick={handleReset}
          className="reset-button"
          disabled={!selectedFixtureId1}
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
        <p>Click on two fixtures to measure the distance between them.</p>
        <p className="highlight-text">
          Selected: {selectedFixtureId1 ? fixtures.find(f => f.id === selectedFixtureId1)?.name : 'None'} → {selectedFixtureId2 ? fixtures.find(f => f.id === selectedFixtureId2)?.name : 'None'}
        </p>
      </div>
    </div>
  );
};

