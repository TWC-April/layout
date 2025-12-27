import React, { useState } from 'react';
import { FixtureItem } from './FixtureItem';
import { AddFixtureForm } from './AddFixtureForm';
import { FixtureManager } from './FixtureManager';
import { PngFixtureImporter } from './PngFixtureImporter';
import { Fixture } from '../types';

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

      <FixtureManager
        customFixtures={customFixtures}
        onUpdate={onUpdateFixture}
        onDelete={onDeleteFixture}
        onFixtureClick={onFixtureClick}
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
        />
      )}
    </div>
  );
};

