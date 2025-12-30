import React, { useState } from 'react';

interface GroupManagerProps {
  onCreateGroup: (name: string) => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  onCreateGroup,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
      setShowCreateForm(false);
    }
  };

  return (
    <div className="group-manager">
      <div className="group-manager-header">
        <button
          onClick={() => setShowCreateForm(true)}
          className="create-group-button"
          title="Create New Group"
        >
          + New Group
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateGroup} className="create-group-form">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            autoFocus
            className="group-name-input"
          />
          <div className="group-form-actions">
            <button type="submit" className="save-group-button">
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewGroupName('');
              }}
              className="cancel-group-button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

