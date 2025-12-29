import React, { useState, useRef } from 'react';
import { Fixture } from '../types';
import { Group } from '../hooks/useGroups';

interface AddFixtureFormProps {
  onSave: (fixture: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>) => void;
  onCancel: () => void;
  initialFixture?: Fixture;
  isEdit?: boolean;
  groups?: Group[];
  onCreateGroup?: (name: string) => void;
}

export const AddFixtureForm: React.FC<AddFixtureFormProps> = ({
  onSave,
  onCancel,
  initialFixture,
  isEdit = false,
  groups = [],
  onCreateGroup,
}) => {
  const [name, setName] = useState(initialFixture?.name || '');
  const [width, setWidth] = useState(initialFixture?.width.toString() || '');
  const [height, setHeight] = useState(initialFixture?.height.toString() || '');
  const [imagePreview, setImagePreview] = useState<string | null>(initialFixture?.icon || null);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialFixture?.group || '');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, etc.)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file is too large. Please use an image smaller than 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim() && onCreateGroup) {
      onCreateGroup(newGroupName.trim());
      setSelectedGroup(newGroupName.trim());
      setNewGroupName('');
      setShowNewGroupInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const widthNum = parseFloat(width);
    const heightNum = parseFloat(height);

    if (name.trim() && widthNum > 0 && heightNum > 0) {
      onSave({
        name: name.trim(),
        width: widthNum,
        height: heightNum,
        icon: imagePreview || undefined,
        group: selectedGroup || undefined,
      });
      // Reset form if not editing
      if (!isEdit) {
        setName('');
        setWidth('');
        setHeight('');
        setImagePreview(null);
        setSelectedGroup('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  return (
    <div className="add-fixture-form-overlay" onClick={onCancel}>
      <div className="add-fixture-form" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Edit Fixture' : 'Miscellaneous'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Name:
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Custom Sofa"
                required
                autoFocus
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              Fixture Image (Optional):
              <div className="image-upload-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                {imagePreview ? (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="remove-image-button"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="upload-image-button"
                  >
                    📷 Upload Image (JPG/PNG)
                  </button>
                )}
              </div>
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Width (mm):
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="e.g., 2000"
                  required
                />
              </label>
            </div>

            <div className="form-group">
              <label>
                Height (mm):
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g., 1000"
                  required
                />
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>
              Group (Optional):
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

          <div className="form-actions">
            <button type="submit" className="save-button">
              {isEdit ? 'Update' : 'Add'} Fixture
            </button>
            <button type="button" onClick={onCancel} className="cancel-button">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

