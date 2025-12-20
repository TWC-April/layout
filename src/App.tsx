import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ImageUpload } from './components/ImageUpload';
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
  });

  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleImageUpload = (url: string, width: number, height: number) => {
    setState({
      imageUrl: url,
      scaleInfo: null,
      dimensionLines: [],
      fixtures: [],
      isDrawingDimension: true,
    });
    setImageDimensions({ width, height });
  };

  const handleDimensionLineComplete = (line: DimensionLine) => {
    setState((prev) => ({
      ...prev,
      dimensionLines: [...prev.dimensionLines, line],
    }));
  };

  const handleDeleteDimensionLine = (lineId: string) => {
    setState((prev) => ({
      ...prev,
      dimensionLines: prev.dimensionLines.filter((line) => line.id !== lineId),
      scaleInfo: null, // Reset scale when deleting lines
    }));
  };

  const handleClearAllDimensionLines = () => {
    setState((prev) => ({
      ...prev,
      dimensionLines: [],
      scaleInfo: null,
    }));
  };

  const handleScaleSet = (scaleInfo: ScaleInfo) => {
    setState((prev) => ({
      ...prev,
      scaleInfo,
      // Don't exit calibration mode automatically - let user decide when done
    }));
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
    setState((prev) => ({
      ...prev,
      fixtures: [...prev.fixtures, fixture],
    }));
  };

  const handleFixtureMove = (id: string, position: { x: number; y: number }) => {
    setState((prev) => ({
      ...prev,
      fixtures: prev.fixtures.map((f) =>
        f.id === id ? { ...f, position } : f
      ),
    }));
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
          <h1>Layout Designer</h1>
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
                {state.isDrawingDimension ? (
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

