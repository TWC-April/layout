import React, { useState } from 'react';
import { Group } from '../hooks/useGroups';

interface GroupManagerProps {
  groups: Group[];
  onCreateGroup: (name: string) => void;
  onUpdateGroup: (id: string, newName: string) => void;
  onDeleteGroup: (id: string) => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
      setShowCreateForm(false);
    }
  };

  const startEdit = (group: Group) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  const saveEdit = (groupId: string) => {
    if (editingName.trim()) {
      onUpdateGroup(groupId, editingName.trim());
    }
    setEditingGroupId(null);
    setEditingName('');
  };

  const cancelEdit = () => {
    setEditingGroupId(null);
    setEditingName('');
  };

  return (
    <div className="group-manager">
      <div className="group-manager-header">
        <h4>Groups</h4>
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

      <div className="groups-list">
        {groups.length === 0 ? (
          <p className="no-groups-message">No groups yet. Create one to organize your fixtures.</p>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="group-item">
              {editingGroupId === group.id ? (
                <div className="group-edit-form">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => saveEdit(group.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveEdit(group.id);
                      } else if (e.key === 'Escape') {
                        cancelEdit();
                      }
                    }}
                    autoFocus
                    className="group-name-input"
                  />
                </div>
              ) : (
                <>
                  <span className="group-name">{group.name}</span>
                  <div className="group-actions">
                    <button
                      onClick={() => startEdit(group)}
                      className="edit-group-button"
                      title="Rename Group"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete group "${group.name}"? Fixtures in this group will become ungrouped.`)) {
                          onDeleteGroup(group.id);
                        }
                      }}
                      className="delete-group-button"
                      title="Delete Group"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

