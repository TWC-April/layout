import React from 'react';
import { Group } from '../hooks/useGroups';
import { Fixture } from '../types';

interface GroupSelectorProps {
  groups: Group[];
  fixtures: Fixture[];
  selectedGroups: Set<string>;
  onToggleGroup: (groupName: string) => void;
}

export const GroupSelector: React.FC<GroupSelectorProps> = ({
  groups,
  fixtures,
  selectedGroups,
  onToggleGroup,
}) => {
  // Count fixtures per group
  const getGroupCount = (groupName: string): number => {
    return fixtures.filter(f => f.group === groupName).length;
  };

  // Count ungrouped fixtures
  const ungroupedCount = fixtures.filter(f => !f.group).length;

  return (
    <div className="group-selector">
      <h4>Select Groups for Auto-Placement</h4>
      <div className="group-selector-list">
        {groups.map((group) => {
          const count = getGroupCount(group.name);
          const isSelected = selectedGroups.has(group.name);
          
          return (
            <label key={group.id} className="group-selector-item">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleGroup(group.name)}
              />
              <span className="group-selector-label">
                {group.name}
                <span className="group-selector-count">({count})</span>
              </span>
            </label>
          );
        })}
        
        {ungroupedCount > 0 && (
          <label className="group-selector-item">
            <input
              type="checkbox"
              checked={selectedGroups.has('Ungrouped')}
              onChange={() => onToggleGroup('Ungrouped')}
            />
            <span className="group-selector-label">
              Ungrouped
              <span className="group-selector-count">({ungroupedCount})</span>
            </span>
          </label>
        )}
      </div>
      
      {selectedGroups.size === 0 && (
        <p className="group-selector-hint">Select at least one group to proceed</p>
      )}
    </div>
  );
};

