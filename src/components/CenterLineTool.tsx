import React, { useState, useCallback } from 'react';
import { PlacedFixture, ScaleInfo, CenterLine } from '../types';

interface CenterLineToolProps {
  fixtures: PlacedFixture[];
  scaleInfo: ScaleInfo;
  displayedImageSize: { width: number; height: number };
  onCenterLineComplete: (centerLine: CenterLine) => void;
  onCancel: () => void;
  selectedFixtureId?: string | null;
  onFixtureSelect?: (fixtureId: string) => void;
}

export const CenterLineTool: React.FC<CenterLineToolProps> = ({
  fixtures,
  scaleInfo,
  displayedImageSize,
  onCenterLineComplete,
  onCancel,
  selectedFixtureId,
  onFixtureSelect,
}) => {
  const [selectedFixtureId1, setSelectedFixtureId1] = useState<string | null>(null);
  const [selectedFixtureId2, setSelectedFixtureId2] = useState<string | null>(null);

  // Handle fixture selection from canvas
  React.useEffect(() => {
    if (selectedFixtureId) {
      if (!selectedFixtureId1) {
        setSelectedFixtureId1(selectedFixtureId);
        if (onFixtureSelect) {
          setTimeout(() => onFixtureSelect(''), 100);
        }
      } else if (!selectedFixtureId2 && selectedFixtureId !== selectedFixtureId1) {
        setSelectedFixtureId2(selectedFixtureId);
        if (onFixtureSelect) {
          setTimeout(() => onFixtureSelect(''), 100);
        }
      }
    }
  }, [selectedFixtureId, selectedFixtureId1, onFixtureSelect]);

  const getFixtureCenter = useCallback((fixture: PlacedFixture): { x: number; y: number } => {
    // Fixture position is in calibration image pixels
    const centerX = fixture.position.x + (fixture.width * scaleInfo.pixelsPerMillimeter) / 2;
    const centerY = fixture.position.y + (fixture.height * scaleInfo.pixelsPerMillimeter) / 2;
    
    // If rotated, rotate the center point
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

  const handleConfirm = useCallback(() => {
    if (!selectedFixtureId1 || !selectedFixtureId2) return;

    const fixture1 = fixtures.find(f => f.id === selectedFixtureId1);
    const fixture2 = fixtures.find(f => f.id === selectedFixtureId2);
    
    if (!fixture1 || !fixture2) return;

    const center1 = getFixtureCenter(fixture1);
    const center2 = getFixtureCenter(fixture2);

    const centerLine: CenterLine = {
      id: `center-line-${Date.now()}`,
      fixtureId1: selectedFixtureId1,
      fixtureId2: selectedFixtureId2,
      start: center1,
      end: center2,
      imageWidth: displayedImageSize.width,
      imageHeight: displayedImageSize.height,
    };

    onCenterLineComplete(centerLine);
  }, [selectedFixtureId1, selectedFixtureId2, fixtures, getFixtureCenter, displayedImageSize, onCenterLineComplete]);

  const handleReset = useCallback(() => {
    setSelectedFixtureId1(null);
    setSelectedFixtureId2(null);
  }, []);

  return (
    <div className="center-line-tool">
      <div className="tool-header">
        <h3>Add Center Line</h3>
        <p>
          {!selectedFixtureId1 
            ? 'Click on the first fixture'
            : !selectedFixtureId2
            ? 'Click on the second fixture'
            : 'Center line ready'}
        </p>
      </div>

      <div className="tool-actions">
        <button
          onClick={handleConfirm}
          className="confirm-button"
          disabled={!selectedFixtureId1 || !selectedFixtureId2}
        >
          Add Center Line
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
        <p>Click on two fixtures to draw a center line between them.</p>
        <p className="highlight-text">
          Selected: {selectedFixtureId1 ? fixtures.find(f => f.id === selectedFixtureId1)?.name : 'None'} → {selectedFixtureId2 ? fixtures.find(f => f.id === selectedFixtureId2)?.name : 'None'}
        </p>
      </div>
    </div>
  );
};

