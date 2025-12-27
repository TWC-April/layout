import { useState, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ImageUpload } from './components/ImageUpload';
import { ImageCropTool } from './components/ImageCropTool';
import { DimensionLineTool } from './components/DimensionLineTool';
import { ScaleCalibration } from './components/ScaleCalibration';
import { FloorPlanCanvas } from './components/FloorPlanCanvas';
import { FixtureLibrary } from './components/FixtureLibrary';
import { FloorPlanState, PlacedFixture, ScaleInfo, DimensionLine, Fixture } from './types';
import { useCustomFixtures } from './hooks/useCustomFixtures';
import { checkFit } from './utils/scaleUtils';
import './styles/App.css';

function App() {
  const { customFixtures, addFixture, bulkAddFixtures, updateFixture, deleteFixture } = useCustomFixtures();
  
  const [state, setState] = useState<FloorPlanState>({
    imageUrl: null,
    scaleInfo: null,
    dimensionLines: [],
    fixtures: [],
    isDrawingDimension: false,
    isCropping: false,
  });

  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Undo/Redo history
  const historyRef = useRef<FloorPlanState[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);

  // Save state to history
  const saveToHistory = (newState: FloorPlanState) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    // Remove any history after current index (when undoing then making new changes)
    const currentIndex = historyIndexRef.current;
    if (currentIndex < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, currentIndex + 1);
    }

    // Add new state to history
    historyRef.current.push(JSON.parse(JSON.stringify(newState))); // Deep clone
    historyIndexRef.current = historyRef.current.length - 1;

    // Limit history size to 50 states
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      isUndoRedoRef.current = true;
      const previousState = historyRef.current[historyIndexRef.current];
      setState(previousState);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      isUndoRedoRef.current = true;
      const nextState = historyRef.current[historyIndexRef.current];
      setState(nextState);
    }
  };

  // Keyboard listener for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize history with initial state
  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current.push(JSON.parse(JSON.stringify(state)));
      historyIndexRef.current = 0;
    }
  }, []);

  const handleImageUpload = (url: string, width: number, height: number) => {
    const newState = {
      imageUrl: url,
      scaleInfo: null,
      dimensionLines: [],
      fixtures: [],
      isDrawingDimension: false,
      isCropping: true, // Show crop tool first
    };
    saveToHistory(newState);
    setState(newState);
    setImageDimensions({ width, height });
  };

  const handleCropComplete = (croppedUrl: string, width: number, height: number) => {
    setState((prev) => {
      const newState = {
        ...prev,
        imageUrl: croppedUrl,
        isCropping: false,
        isDrawingDimension: true, // Move to dimension line tool after cropping
      };
      saveToHistory(newState);
      return newState;
    });
    setImageDimensions({ width, height });
  };

  const handleCancelCrop = () => {
    setState((prev) => ({
      ...prev,
      isCropping: false,
      isDrawingDimension: true, // Skip cropping, go to dimension lines
    }));
  };

  const handleDimensionLineComplete = (line: DimensionLine) => {
    setState((prev) => {
      const newState = {
        ...prev,
        dimensionLines: [...prev.dimensionLines, line],
      };
      saveToHistory(newState);
      return newState;
    });
  };

  const handleDeleteDimensionLine = (lineId: string) => {
    setState((prev) => {
      const newState = {
        ...prev,
        dimensionLines: prev.dimensionLines.filter((line) => line.id !== lineId),
        scaleInfo: null, // Reset scale when deleting lines
      };
      saveToHistory(newState);
      return newState;
    });
  };

  const handleClearAllDimensionLines = () => {
    setState((prev) => {
      const newState = {
        ...prev,
        dimensionLines: [],
        scaleInfo: null,
      };
      saveToHistory(newState);
      return newState;
    });
  };

  const handleScaleSet = (scaleInfo: ScaleInfo) => {
    setState((prev) => {
      const newState = {
        ...prev,
        scaleInfo,
        // Don't exit calibration mode automatically - let user decide when done
      };
      saveToHistory(newState);
      return newState;
    });
  };

  const handleFinishCalibration = () => {
    setState((prev) => ({
      ...prev,
      isDrawingDimension: false,
    }));
  };

  const handleStartCalibration = () => {
    setState((prev) => ({
      ...prev,
      isDrawingDimension: true,
      scaleInfo: null,
    }));
  };

  const handleCancelCalibration = () => {
    setState((prev) => ({
      ...prev,
      isDrawingDimension: false,
    }));
  };

  const handleFixturePlaced = (fixture: PlacedFixture) => {
    setState((prev) => {
      const newState = {
        ...prev,
        fixtures: [...prev.fixtures, fixture],
      };
      saveToHistory(newState);
      return newState;
    });
  };

  const handleFixtureMove = (id: string, position: { x: number; y: number }) => {
    setState((prev) => {
      const newState = {
        ...prev,
        fixtures: prev.fixtures.map((f) =>
          f.id === id ? { ...f, position } : f
        ),
      };
      // Don't save every move to history - only save on mouse up
      return newState;
    });
  };

  // Save fixture move to history (called on mouse up)
  const handleFixtureMoveComplete = () => {
    setState((prev) => {
      saveToHistory(prev);
      return prev;
    });
  };

  const handleFixtureRotate = (id: string, angle: number) => {
    setState((prev) => {
      const newState = {
        ...prev,
        fixtures: prev.fixtures.map((f) => {
          if (f.id !== id) return f;
          return { ...f, rotation: angle };
        }),
      };
      // Don't save every rotation to history - only save on mouse up
      return newState;
    });
  };

  // Save fixture rotation to history (called on mouse up)
  const handleFixtureRotateComplete = () => {
    setState((prev) => {
      saveToHistory(prev);
      return prev;
    });
  };

  const handleFixtureDelete = (id: string) => {
    const fixture = state.fixtures.find((f) => f.id === id);
    const fixtureName = fixture?.name || 'this fixture';
    
    if (window.confirm(`Are you sure you want to delete "${fixtureName}"?`)) {
      setState((prev) => {
        const newState = {
          ...prev,
          fixtures: prev.fixtures.filter((f) => f.id !== id),
        };
        saveToHistory(newState);
        return newState;
      });
    }
  };

  const handleFixtureClick = (fixture: Fixture) => {
    if (!state.scaleInfo || !imageDimensions) {
      alert('Please calibrate the scale first by drawing dimension lines.');
      return;
    }

    // Place fixture at center of floor plan
    const centerX = imageDimensions.width / 2;
    const centerY = imageDimensions.height / 2;

    const newFixture: PlacedFixture = {
      ...fixture,
      position: { x: centerX, y: centerY },
    };

    if (checkFit(newFixture.position, { width: fixture.width, height: fixture.height }, state.scaleInfo)) {
      handleFixturePlaced(newFixture);
    } else {
      // If center doesn't fit, try placing at top-left corner
      const topLeftFixture: PlacedFixture = {
        ...fixture,
        position: { x: 0, y: 0 },
      };
      if (checkFit(topLeftFixture.position, { width: fixture.width, height: fixture.height }, state.scaleInfo)) {
        handleFixturePlaced(topLeftFixture);
      } else {
        alert('Fixture is too large for the floor plan.');
      }
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app">
        <header className="app-header">
          <h1>Layout</h1>
        </header>
        <div className="app-content">
          <aside className="sidebar">
            {!state.imageUrl ? (
              <ImageUpload onImageUpload={handleImageUpload} />
            ) : state.isDrawingDimension ? (
              <div className="calibration-sidebar">
                <ScaleCalibration
                  imageWidth={imageDimensions?.width || 0}
                  imageHeight={imageDimensions?.height || 0}
                  dimensionLines={state.dimensionLines}
                  onScaleSet={handleScaleSet}
                />
                <div className="dimension-lines-list">
                  <div className="dimension-lines-header">
                    <h4>Reference Lines ({state.dimensionLines.length})</h4>
                    {state.dimensionLines.length > 0 && (
                      <button
                        onClick={handleClearAllDimensionLines}
                        className="clear-all-button"
                        title="Clear all lines"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {state.dimensionLines.length === 0 ? (
                    <p className="no-lines-message">No dimension lines yet. Draw a line to get started.</p>
                  ) : (
                    state.dimensionLines.map((line) => (
                      <div key={line.id} className="dimension-line-item">
                        <span>{line.realLength.toLocaleString()} mm</span>
                        <button
                          onClick={() => handleDeleteDimensionLine(line.id)}
                          className="delete-line-button"
                          title="Delete this line"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {state.dimensionLines.length > 0 && state.scaleInfo && (
                  <div className="calibration-actions">
                    <button
                      onClick={handleFinishCalibration}
                      className="finish-calibration-button"
                    >
                      Finish Calibration
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="scale-info-display">
                  {state.scaleInfo && (
                    <div className="scale-info">
                      <h3>Scale</h3>
                      <p>{state.scaleInfo.pixelsPerMillimeter.toFixed(4)} px/mm</p>
                      <button onClick={handleStartCalibration} className="recalibrate-button">
                        Recalibrate
                      </button>
                    </div>
                  )}
                </div>
                <FixtureLibrary
                  customFixtures={customFixtures}
                  onAddFixture={addFixture}
                  onBulkAddFixtures={bulkAddFixtures}
                  onUpdateFixture={updateFixture}
                  onDeleteFixture={deleteFixture}
                  onFixtureClick={handleFixtureClick}
                />
              </>
            )}
          </aside>
          <main className="main-content">
            {state.imageUrl ? (
              <>
                {state.isCropping ? (
                  <ImageCropTool
                    imageUrl={state.imageUrl}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCancelCrop}
                  />
                ) : state.isDrawingDimension ? (
                  <div className="calibration-view">
                    <DimensionLineTool
                      imageUrl={state.imageUrl}
                      existingLines={state.dimensionLines}
                      scaleInfo={state.scaleInfo}
                      onLineComplete={handleDimensionLineComplete}
                      onCancel={handleCancelCalibration}
                    />
                  </div>
                ) : state.scaleInfo ? (
                  <FloorPlanCanvas
                    imageUrl={state.imageUrl}
                    scaleInfo={state.scaleInfo}
                    dimensionLines={state.dimensionLines}
                    fixtures={state.fixtures}
                    onFixtureMove={handleFixtureMove}
                    onFixtureRotate={handleFixtureRotate}
                    onFixtureDelete={handleFixtureDelete}
                    onFixtureMoveComplete={handleFixtureMoveComplete}
                    onFixtureRotateComplete={handleFixtureRotateComplete}
                  />
                ) : (
                  <div className="empty-state">
                    <p>Draw dimension lines to set the scale</p>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <p>Upload a floor plan image to get started</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </DndProvider>
  );
}

export default App;

