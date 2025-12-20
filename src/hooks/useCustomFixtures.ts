import { useState, useEffect } from 'react';
import { Fixture } from '../types';

const STORAGE_KEY = 'customFixtures';

export function useCustomFixtures() {
  const [customFixtures, setCustomFixtures] = useState<Fixture[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCustomFixtures(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load custom fixtures:', error);
      }
    }
  }, []);

  // Save to localStorage whenever customFixtures changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customFixtures));
  }, [customFixtures]);

  const addFixture = (fixture: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>) => {
    const newFixture: Fixture = {
      ...fixture,
      id: `custom-${Date.now()}`,
      isCustom: true,
      createdAt: Date.now(),
    };
    setCustomFixtures((prev) => [...prev, newFixture]);
    return newFixture;
  };

  const updateFixture = (id: string, updates: Partial<Fixture>) => {
    setCustomFixtures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const deleteFixture = (id: string) => {
    setCustomFixtures((prev) => prev.filter((f) => f.id !== id));
  };

  const bulkAddFixtures = (fixtures: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>[]) => {
    const newFixtures: Fixture[] = fixtures.map((fixture) => ({
      ...fixture,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true,
      createdAt: Date.now(),
    }));
    setCustomFixtures((prev) => [...prev, ...newFixtures]);
    return newFixtures;
  };

  return {
    customFixtures,
    addFixture,
    updateFixture,
    deleteFixture,
    bulkAddFixtures,
  };
}

