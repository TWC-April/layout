import { useState, useEffect } from 'react';

const GROUPS_STORAGE_KEY = 'fixtureGroups';

export interface Group {
  id: string;
  name: string;
  createdAt: number;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (stored) {
      try {
        setGroups(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load groups:', error);
      }
    }
  }, []);

  // Save to localStorage whenever groups changes
  useEffect(() => {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  }, [groups]);

  const createGroup = (name: string): Group => {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: name.trim(),
      createdAt: Date.now(),
    };
    setGroups((prev) => [...prev, newGroup]);
    return newGroup;
  };

  const updateGroup = (id: string, newName: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, name: newName.trim() } : g))
    );
  };

  const deleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const getGroupById = (id: string): Group | undefined => {
    return groups.find((g) => g.id === id);
  };

  const getGroupByName = (name: string): Group | undefined => {
    return groups.find((g) => g.name === name);
  };

  return {
    groups,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupById,
    getGroupByName,
  };
}

