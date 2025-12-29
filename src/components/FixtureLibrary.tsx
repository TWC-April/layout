import React, { useState } from 'react';
import { FixtureItem } from './FixtureItem';
import { AddFixtureForm } from './AddFixtureForm';
import { FixtureManager } from './FixtureManager';
import { PngFixtureImporter } from './PngFixtureImporter';
import { GroupManager } from './GroupManager';
import { Fixture } from '../types';
import { useGroups } from '../hooks/useGroups';

const DEFAULT_FIXTURES: Fixture[] = [];

interface FixtureLibraryProps {
  customFixtures: Fixture[];
  onAddFixture: (fixture: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>) => void;
  onBulkAddFixtures: (fixtures: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>[]) => void;
  onUpdateFixture: (id: string, updates: Partial<Fixture>) => void;
  onDeleteFixture: (id: string) => void;
  onFixtureClick: (fixture: Fixture) => void;
}

export const FixtureLibrary: React.FC<FixtureLibraryProps> = ({
  customFixtures,
  onAddFixture,
  onBulkAddFixtures,
  onUpdateFixture,
  onDeleteFixture,
  onFixtureClick,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPngImporter, setShowPngImporter] = useState(false);
  const {
    groups,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useGroups();

  // When a group is deleted, remove group assignment from fixtures
  const handleDeleteGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (group) {
      // Remove group from all fixtures that belong to this group
      customFixtures.forEach((fixture) => {
        if (fixture.group === group.name) {
          onUpdateFixture(fixture.id, { group: undefined });
        }
      });
      deleteGroup(groupId);
    }
  };

  return (
    <div className="fixture-library">
      <div className="fixture-library-header">
        <h2>Fixture Library</h2>
        <div className="header-buttons">
          <button
            onClick={() => setShowPngImporter(true)}
            className="import-stencil-button"
            title="Import PNG/JPEG fixtures"
          >
            📎 Import PNG Files
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="add-fixture-button"
          >
            + Miscellaneous
          </button>
        </div>
      </div>

      <GroupManager
        groups={groups}
        onCreateGroup={createGroup}
        onUpdateGroup={updateGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      <FixtureManager
        customFixtures={customFixtures}
        onUpdate={onUpdateFixture}
        onDelete={onDeleteFixture}
        onFixtureClick={onFixtureClick}
        groups={groups}
        onCreateGroup={createGroup}
      />

      {DEFAULT_FIXTURES.length > 0 && (
        <div className="fixture-list">
          <h3 className="section-title">Default Fixtures</h3>
          {DEFAULT_FIXTURES.map((fixture) => (
            <FixtureItem key={fixture.id} fixture={fixture} />
          ))}
        </div>
      )}

      {showAddForm && (
        <AddFixtureForm
          onSave={(fixture) => {
            onAddFixture(fixture);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          groups={groups}
          onCreateGroup={createGroup}
        />
      )}

      {showPngImporter && (
        <PngFixtureImporter
          onFixturesParsed={(fixtures) => {
            onBulkAddFixtures(fixtures);
            setShowPngImporter(false);
          }}
          onAddSingleFixture={(fixture) => {
            onAddFixture(fixture);
          }}
          onCancel={() => setShowPngImporter(false)}
          groups={groups}
          onCreateGroup={createGroup}
        />
      )}
    </div>
  );
};

