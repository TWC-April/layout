import React, { useState } from 'react';
import { Fixture } from '../types';
import { AddFixtureForm } from './AddFixtureForm';

interface FixtureManagerProps {
  customFixtures: Fixture[];
  onUpdate: (id: string, updates: Partial<Fixture>) => void;
  onDelete: (id: string) => void;
  onFixtureClick: (fixture: Fixture) => void;
}

export const FixtureManager: React.FC<FixtureManagerProps> = ({
  customFixtures,
  onUpdate,
  onDelete,
  onFixtureClick,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingFixture = customFixtures.find((f) => f.id === editingId);

  const handleUpdate = (fixture: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>) => {
    if (editingId) {
      onUpdate(editingId, fixture);
      setEditingId(null);
    }
  };

  if (customFixtures.length === 0) {
    return null;
  }

  return (
    <div className="fixture-manager">
      <h3>Custom Fixtures</h3>
      <div className="custom-fixtures-list">
        {customFixtures.map((fixture) => (
          <div key={fixture.id} className="custom-fixture-item">
            <div
              className={`fixture-preview ${fixture.icon ? 'has-image' : ''}`}
              style={{ 
                backgroundColor: fixture.icon ? '#f8f9fa' : fixture.color,
                cursor: 'pointer',
              }}
              onClick={() => onFixtureClick(fixture)}
            >
              {fixture.icon ? (
                <>
                  <img 
                    src={fixture.icon} 
                    alt={fixture.name}
                    className="fixture-preview-image"
                    draggable={false}
                  />
                  <div className="fixture-preview-info">
                    <div className="fixture-preview-name">{fixture.name}</div>
                    <div className="fixture-preview-dimensions">
                      {fixture.width} × {fixture.height} mm
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="fixture-preview-name">{fixture.name}</div>
                  <div className="fixture-preview-dimensions">
                    {fixture.width} × {fixture.height} mm
                  </div>
                </>
              )}
            </div>
            <div className="fixture-actions" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(fixture.id);
                }}
                className="edit-button"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${fixture.name}"?`)) {
                    onDelete(fixture.id);
                  }
                }}
                className="delete-button"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingId && editingFixture && (
        <AddFixtureForm
          initialFixture={editingFixture}
          isEdit={true}
          onSave={handleUpdate}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  );
};

