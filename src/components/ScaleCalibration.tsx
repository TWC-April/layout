import React from 'react';
import { ScaleInfo, DimensionLine } from '../types';
import { calculateScaleFromLines, calculateSeparateScales } from '../utils/scaleUtils';

interface ScaleCalibrationProps {
  imageWidth: number;
  imageHeight: number;
  dimensionLines: DimensionLine[];
  onScaleSet: (scaleInfo: ScaleInfo) => void;
}

export const ScaleCalibration: React.FC<ScaleCalibrationProps> = ({
  imageWidth,
  imageHeight,
  dimensionLines,
  onScaleSet,
}) => {
  const pixelsPerMillimeter = calculateScaleFromLines(dimensionLines);
  const separateScales = calculateSeparateScales(dimensionLines);

  React.useEffect(() => {
    if (pixelsPerMillimeter && dimensionLines.length > 0) {
      // Use the displayed image dimensions from the most recent dimension line
      // All lines should have the same image dimensions since they're drawn on the same displayed image
      const lastLine = dimensionLines[dimensionLines.length - 1];
      const displayedWidth = lastLine?.imageWidth || imageWidth;
      const displayedHeight = lastLine?.imageHeight || imageHeight;
      
      onScaleSet({
        imageWidth: displayedWidth,
        imageHeight: displayedHeight,
        pixelsPerMillimeter,
        unit: 'millimeters',
      });
    }
  }, [pixelsPerMillimeter, dimensionLines.length, dimensionLines, imageWidth, imageHeight, onScaleSet]);

  if (dimensionLines.length === 0) {
    return (
      <div className="scale-calibration">
        <p>Draw at least one dimension line to set the scale.</p>
      </div>
    );
  }

  const getMismatchColor = (mismatch: number | null) => {
    if (mismatch === null) return '#666';
    if (mismatch < 1) return '#27ae60'; // green - good
    if (mismatch < 3) return '#f39c12'; // yellow - warning
    return '#e74c3c'; // red - significant mismatch
  };

  const getMismatchMessage = (mismatch: number | null) => {
    if (mismatch === null) return null;
    if (mismatch < 1) return '✓ Scale is consistent';
    if (mismatch < 3) return '⚠ Slight difference';
    return '⚠ Significant mismatch - check image distortion';
  };

  return (
    <div className="scale-calibration">
      <h3>Scale Calibration</h3>
      <div className="calibration-info">
        <p><strong>Reference lines:</strong> {dimensionLines.length}</p>
        {pixelsPerMillimeter && (
          <p>
            <strong>Average scale:</strong> {pixelsPerMillimeter.toFixed(4)} px/mm
          </p>
        )}
        
        {/* Show separate X/Y scales if available */}
        {(separateScales.scaleX !== null || separateScales.scaleY !== null) && (
          <div className="separate-scales">
            {separateScales.scaleX !== null && (
              <p className="scale-axis">
                <strong>X-axis (horizontal):</strong> {separateScales.scaleX.toFixed(4)} px/mm
              </p>
            )}
            {separateScales.scaleY !== null && (
              <p className="scale-axis">
                <strong>Y-axis (vertical):</strong> {separateScales.scaleY.toFixed(4)} px/mm
              </p>
            )}
            {separateScales.mismatchPercent !== null && (
              <p 
                className="scale-mismatch"
                style={{ color: getMismatchColor(separateScales.mismatchPercent) }}
              >
                <strong>Difference:</strong> {separateScales.mismatchPercent.toFixed(2)}%
                {getMismatchMessage(separateScales.mismatchPercent) && (
                  <span className="mismatch-message"> - {getMismatchMessage(separateScales.mismatchPercent)}</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Hints */}
        <div className="calibration-hints">
          {dimensionLines.length === 1 ? (
            <p className="hint">
              💡 Draw horizontal and vertical lines to verify scale accuracy
            </p>
          ) : separateScales.scaleX === null ? (
            <p className="hint">
              💡 Draw a horizontal line to check X-axis scale
            </p>
          ) : separateScales.scaleY === null ? (
            <p className="hint">
              💡 Draw a vertical line to check Y-axis scale
            </p>
          ) : (
            <p className="hint">
              Scale calculated from {dimensionLines.length} line{dimensionLines.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

