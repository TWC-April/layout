import React, { useState, useMemo } from 'react';
import { Fixture } from '../types';
import { AddFixtureForm } from './AddFixtureForm';
import { Group } from '../hooks/useGroups';

interface FixtureManagerProps {
  customFixtures: Fixture[];
  onUpdate: (id: string, updates: Partial<Fixture>) => void;
  onDelete: (id: string) => void;
  onFixtureClick: (fixture: Fixture) => void;
  groups?: Group[];
  onCreateGroup?: (name: string) => void;
}

export const FixtureManager: React.FC<FixtureManagerProps> = ({
  customFixtures,
  onUpdate,
  onDelete,
  onFixtureClick,
  groups = [],
  onCreateGroup,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingFixture = customFixtures.find((f) => f.id === editingId);

  const handleUpdate = (fixture: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>) => {
    if (editingId) {
      onUpdate(editingId, fixture);
      setEditingId(null);
    }
  };

  // Group fixtures by group name
  const groupedFixtures = useMemo(() => {
    const grouped: Record<string, Fixture[]> = {};
    const ungrouped: Fixture[] = [];

    customFixtures.forEach((fixture) => {
      if (fixture.group) {
        if (!grouped[fixture.group]) {
          grouped[fixture.group] = [];
        }
        grouped[fixture.group].push(fixture);
      } else {
        ungrouped.push(fixture);
      }
    });

    return { grouped, ungrouped };
  }, [customFixtures]);

  if (customFixtures.length === 0) {
    return null;
  }

  const renderFixture = (fixture: Fixture) => (
    <div key={fixture.id} className="custom-fixture-item">
      <div
        className={`fixture-preview ${fixture.icon ? 'has-image' : ''}`}
        style={{ 
          backgroundColor: fixture.icon ? '#f8f9fa' : (fixture.color || '#e0e0e0'),
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
  );

  return (
    <div className="fixture-manager">
      <h3>Custom Fixtures</h3>
      
      {/* Render grouped fixtures */}
      {Object.entries(groupedFixtures.grouped).map(([groupName, fixtures]) => (
        <div key={groupName} className="fixture-group">
          <div className="fixture-group-header">
            <h4 className="group-title">{groupName}</h4>
            <span className="group-count">({fixtures.length})</span>
          </div>
          <div className="custom-fixtures-list">
            {fixtures.map(renderFixture)}
          </div>
        </div>
      ))}

      {/* Render ungrouped fixtures */}
      {groupedFixtures.ungrouped.length > 0 && (
        <div className="fixture-group">
          <div className="fixture-group-header">
            <h4 className="group-title">Ungrouped</h4>
            <span className="group-count">({groupedFixtures.ungrouped.length})</span>
          </div>
          <div className="custom-fixtures-list">
            {groupedFixtures.ungrouped.map(renderFixture)}
          </div>
        </div>
      )}

      {editingId && editingFixture && (
        <AddFixtureForm
          initialFixture={editingFixture}
          isEdit={true}
          onSave={handleUpdate}
          onCancel={() => setEditingId(null)}
          groups={groups}
          onCreateGroup={onCreateGroup}
        />
      )}
    </div>
  );
};

