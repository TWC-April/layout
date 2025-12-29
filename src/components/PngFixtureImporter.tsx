import React, { useState, useRef } from 'react';
import { Fixture } from '../types';
import { Group } from '../hooks/useGroups';

interface PngFixtureImporterProps {
  onFixturesParsed: (fixtures: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>[]) => void;
  onCancel: () => void;
  onAddSingleFixture?: (fixture: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>) => void;
  groups?: Group[];
  onCreateGroup?: (name: string) => void;
}

type ParsedFixture = Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>;

interface PendingFixture {
  file: File;
  imageData: string;
  name: string;
  width: string;
  height: string;
  group?: string;
}

export const PngFixtureImporter: React.FC<PngFixtureImporterProps> = ({
  onFixturesParsed,
  onCancel,
  onAddSingleFixture,
  groups = [],
  onCreateGroup,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFixtures, setPendingFixtures] = useState<PendingFixture[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      const newPendingFixtures: PendingFixture[] = [];
      const errors: string[] = [];

      // Process each selected file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith('image/')) {
          errors.push(`File "${file.name}" is not an image file. Skipping.`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          errors.push(`File "${file.name}" is too large (max 5MB). Skipping.`);
          continue;
        }

        // Read file as data URL
        try {
          const imageData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Extract name from filename (remove extension)
          const fileName = file.name.replace(/\.[^/.]+$/, '');

          newPendingFixtures.push({
            file,
            imageData,
            name: fileName,
            width: '',
            height: '',
          });
        } catch (err) {
          errors.push(`Failed to read "${file.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        setError(errors.join('\n'));
      }

      if (newPendingFixtures.length > 0) {
        setPendingFixtures((prev) => [...prev, ...newPendingFixtures]);
      }
    } catch (err) {
      console.error('Error processing files:', err);
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setIsProcessing(false);
    }
  };

  const updatePendingFixture = (index: number, updates: Partial<PendingFixture>) => {
    setPendingFixtures((prev) =>
      prev.map((fixture, i) => (i === index ? { ...fixture, ...updates } : fixture))
    );
  };

  const removePendingFixture = (index: number) => {
    setPendingFixtures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim() && onCreateGroup) {
      onCreateGroup(newGroupName.trim());
      setSelectedGroup(newGroupName.trim());
      setNewGroupName('');
      setShowNewGroupInput(false);
    }
  };

  const handleImport = () => {
    const validFixtures: ParsedFixture[] = [];

    for (const pending of pendingFixtures) {
      const widthNum = parseFloat(pending.width);
      const heightNum = parseFloat(pending.height);

      if (pending.name.trim() && widthNum > 0 && heightNum > 0) {
        validFixtures.push({
          name: pending.name.trim(),
          width: widthNum,
          height: heightNum,
          icon: pending.imageData,
          group: pending.group || selectedGroup || undefined,
        });
      }
    }

    if (validFixtures.length > 0) {
      onFixturesParsed(validFixtures);
      setPendingFixtures([]);
      setSelectedGroup('');
    } else {
      setError('Please fill in name, width, and height for at least one fixture.');
    }
  };

  const handleAddSingle = (index: number) => {
    const pending = pendingFixtures[index];
    const widthNum = parseFloat(pending.width);
    const heightNum = parseFloat(pending.height);

    if (pending.name.trim() && widthNum > 0 && heightNum > 0 && onAddSingleFixture) {
      onAddSingleFixture({
        name: pending.name.trim(),
        width: widthNum,
        height: heightNum,
        icon: pending.imageData,
        group: pending.group || selectedGroup || undefined,
      });
      removePendingFixture(index);
    }
  };

  return (
    <div className="stencil-parser-overlay" onClick={onCancel}>
      <div className="stencil-parser" onClick={(e) => e.stopPropagation()}>
        <h3>Import PNG/JPEG Fixtures</h3>
        
        <div className="parser-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileChange}
            multiple
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="upload-stencil-button"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Select PNG/JPEG Files'}
          </button>
          <p className="upload-hint">You can select multiple files at once</p>
        </div>

        {error && (
          <div className="parser-error">
            <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
          </div>
        )}

        {pendingFixtures.length > 0 && (
          <div className="parser-preview">
            <h4>Configure {pendingFixtures.length} fixture(s):</h4>
            
            {/* Group selection for bulk import */}
            <div className="bulk-group-selection">
              <label>
                Assign all fixtures to group (optional):
                <div className="group-selection">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="group-select"
                  >
                    <option value="">Ungrouped</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.name}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  {!showNewGroupInput ? (
                    <button
                      type="button"
                      onClick={() => setShowNewGroupInput(true)}
                      className="new-group-button"
                    >
                      + New Group
                    </button>
                  ) : (
                    <div className="new-group-input">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Group name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateGroup();
                          } else if (e.key === 'Escape') {
                            setShowNewGroupInput(false);
                            setNewGroupName('');
                          }
                        }}
                        autoFocus
                        className="group-name-input-small"
                      />
                      <button
                        type="button"
                        onClick={handleCreateGroup}
                        className="create-group-button-small"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewGroupInput(false);
                          setNewGroupName('');
                        }}
                        className="cancel-group-button-small"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="fixtures-preview-list">
              {pendingFixtures.map((pending, index) => (
                <div key={index} className="fixture-preview-item">
                  <div className="preview-image-container">
                    <img 
                      src={pending.imageData} 
                      alt={pending.name}
                      className="preview-image"
                    />
                  </div>
                  <div className="preview-details">
                    <input
                      type="text"
                      value={pending.name}
                      onChange={(e) => updatePendingFixture(index, { name: e.target.value })}
                      placeholder="Fixture name"
                      className="preview-name-input"
                    />
                    <div className="preview-dimensions-input">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={pending.width}
                        onChange={(e) => updatePendingFixture(index, { width: e.target.value })}
                        placeholder="Width (mm)"
                        className="dimension-input"
                      />
                      <span>×</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={pending.height}
                        onChange={(e) => updatePendingFixture(index, { height: e.target.value })}
                        placeholder="Height (mm)"
                        className="dimension-input"
                      />
                    </div>
                  </div>
                  {onAddSingleFixture && (
                    <button
                      onClick={() => handleAddSingle(index)}
                      className="add-single-button"
                      disabled={!pending.name.trim() || !pending.width || !pending.height}
                      title="Add this fixture individually"
                    >
                      + Add
                    </button>
                  )}
                  <button
                    onClick={() => removePendingFixture(index)}
                    className="remove-preview-button"
                    title="Remove this fixture"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="parser-actions">
              <button 
                onClick={handleImport} 
                className="import-button"
                disabled={pendingFixtures.every(p => !p.name.trim() || !p.width || !p.height)}
              >
                Import {pendingFixtures.filter(p => p.name.trim() && p.width && p.height).length} Fixtures
              </button>
              <button onClick={onCancel} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isProcessing && pendingFixtures.length === 0 && !error && (
          <div className="parser-actions">
            <button onClick={onCancel} className="cancel-button">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

