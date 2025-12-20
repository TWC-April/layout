import React from 'react';
import { useDrag } from 'react-dnd';
import { Fixture } from '../types';

interface FixtureItemProps {
  fixture: Fixture;
}

export const FixtureItem: React.FC<FixtureItemProps> = ({ fixture }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'fixture',
    item: fixture,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Format dimensions for display (convert mm to readable format)
  const formatDimension = (mm: number): string => {
    if (mm >= 1000) {
      return `${(mm / 1000).toFixed(2)} m`;
    }
    return `${mm} mm`;
  };

  const hasImage = !!fixture.icon;

  return (
    <div
      ref={drag}
      className={`fixture-item ${isDragging ? 'dragging' : ''} ${hasImage ? 'has-image' : ''}`}
      style={{ 
        backgroundColor: hasImage ? '#f8f9fa' : fixture.color 
      }}
    >
      {hasImage ? (
        <img 
          src={fixture.icon} 
          alt={fixture.name}
          className="fixture-image"
        />
      ) : (
        <div className="fixture-color-preview" style={{ backgroundColor: fixture.color }} />
      )}
      <div className="fixture-name">{fixture.name}</div>
      <div className="fixture-dimensions">
        {formatDimension(fixture.width)} × {formatDimension(fixture.height)}
      </div>
    </div>
  );
};

