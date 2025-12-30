import React, { useState, useMemo, useEffect } from 'react';
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
  onDeleteGroup?: (groupId: string) => void;
  onUpdateGroup?: (id: string, newName: string) => void;
}

export const FixtureManager: React.FC<FixtureManagerProps> = ({
  customFixtures,
  onUpdate,
  onDelete,
  onFixtureClick,
  groups = [],
  onCreateGroup,
  onDeleteGroup,
  onUpdateGroup,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingFixture = customFixtures.find((f) => f.id === editingId);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

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

  // Initialize expanded groups when groups change (expand all by default)
  useEffect(() => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      // Add all groups from the groups prop
      groups.forEach((group) => {
        if (!newSet.has(group.name)) {
          newSet.add(group.name);
        }
      });
      // Also ensure "Ungrouped" is expanded if it exists
      if (groupedFixtures.ungrouped.length > 0) {
        newSet.add('Ungrouped');
      }
      return newSet;
    });
  }, [groups, groupedFixtures.ungrouped.length]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const isGroupExpanded = (groupName: string) => expandedGroups.has(groupName);

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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.5 3.5H10.5M5.5 3.5V2.5C5.5 2.22386 5.72386 2 6 2H8C8.27614 2 8.5 2.22386 8.5 2.5V3.5M2.5 3.5H11.5L11 11.5C11 12.0523 10.5523 12.5 10 12.5H4C3.44772 12.5 3 12.0523 3 11.5L2.5 3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5.5 6V10.5M8.5 6V10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixture-manager">
      <h3>Program</h3>
      
      {/* Render all groups (including empty ones) */}
      {groups.map((group) => {
        const fixtures = groupedFixtures.grouped[group.name] || [];
        const isExpanded = isGroupExpanded(group.name);
        const isEditing = editingGroupId === group.id;
        return (
          <div key={group.id} className="fixture-group">
            <div 
              className="fixture-group-header"
              onClick={() => !isEditing && toggleGroup(group.name)}
              style={{ cursor: 'pointer' }}
            >
              <div className="group-header-left">
                <svg 
                  className={`group-chevron ${isExpanded ? 'expanded' : ''}`}
                  width="12" 
                  height="12" 
                  viewBox="0 0 12 12" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onBlur={() => {
                      if (editingGroupName.trim() && editingGroupName.trim() !== group.name && onUpdateGroup) {
                        onUpdateGroup(group.id, editingGroupName.trim());
                      }
                      setEditingGroupId(null);
                      setEditingGroupName('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingGroupName.trim() && editingGroupName.trim() !== group.name && onUpdateGroup) {
                          onUpdateGroup(group.id, editingGroupName.trim());
                        }
                        setEditingGroupId(null);
                        setEditingGroupName('');
                      } else if (e.key === 'Escape') {
                        setEditingGroupId(null);
                        setEditingGroupName('');
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="group-name-input-inline"
                    autoFocus
                  />
                ) : (
                  <h4 
                    className="group-title"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingGroupId(group.id);
                      setEditingGroupName(group.name);
                    }}
                  >
                    {group.name}
                  </h4>
                )}
              </div>
              <div className="group-header-right" onClick={(e) => e.stopPropagation()}>
                <span className="group-count">({fixtures.length})</span>
                {onDeleteGroup && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete group "${group.name}"? Fixtures in this group will be moved to "Ungrouped".`)) {
                        onDeleteGroup(group.id);
                      }
                    }}
                    className="delete-group-button-header"
                    title="Delete Group"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.5 3.5H10.5M5.5 3.5V2.5C5.5 2.22386 5.72386 2 6 2H8C8.27614 2 8.5 2.22386 8.5 2.5V3.5M2.5 3.5H11.5L11 11.5C11 12.0523 10.5523 12.5 10 12.5H4C3.44772 12.5 3 12.0523 3 11.5L2.5 3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5.5 6V10.5M8.5 6V10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {isExpanded && (
              <div className="custom-fixtures-list">
                {fixtures.length > 0 ? (
                  fixtures.map(renderFixture)
                ) : (
                  <p className="empty-group-message">No fixtures in this group yet.</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Render ungrouped fixtures */}
      {groupedFixtures.ungrouped.length > 0 && (() => {
        const isExpanded = isGroupExpanded('Ungrouped');
        return (
          <div className="fixture-group">
            <div 
              className="fixture-group-header"
              onClick={() => toggleGroup('Ungrouped')}
              style={{ cursor: 'pointer' }}
            >
              <div className="group-header-left">
                <svg 
                  className={`group-chevron ${isExpanded ? 'expanded' : ''}`}
                  width="12" 
                  height="12" 
                  viewBox="0 0 12 12" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h4 className="group-title">Ungrouped</h4>
              </div>
              <span className="group-count">({groupedFixtures.ungrouped.length})</span>
            </div>
            {isExpanded && (
              <div className="custom-fixtures-list">
                {groupedFixtures.ungrouped.map(renderFixture)}
              </div>
            )}
          </div>
        );
      })()}

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

