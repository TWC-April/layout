import React, { useState, useCallback, useRef } from 'react';
import { TextAnnotation, ScaleInfo, Position } from '../types';

interface TextAnnotationToolProps {
  imageUrl: string;
  scaleInfo: ScaleInfo;
  displayedImageSize: { width: number; height: number };
  onAnnotationComplete: (annotation: TextAnnotation) => void;
  onCancel: () => void;
}

export const TextAnnotationTool: React.FC<TextAnnotationToolProps> = ({
  imageUrl,
  scaleInfo,
  displayedImageSize,
  onAnnotationComplete,
  onCancel,
}) => {
  const [clickPosition, setClickPosition] = useState<Position | null>(null);
  const [text, setText] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current) return;

    const imageRect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - imageRect.left;
    const y = e.clientY - imageRect.top;

    // Convert from displayed pixels to calibration pixels
    const scaleX = displayedImageSize.width / scaleInfo.imageWidth;
    const scaleY = displayedImageSize.height / scaleInfo.imageHeight;
    const calibrationX = x / scaleX;
    const calibrationY = y / scaleY;

    setClickPosition({ x: calibrationX, y: calibrationY });
  }, [scaleInfo, displayedImageSize]);

  const handleConfirm = useCallback(() => {
    if (!clickPosition || !text.trim()) return;

    const annotation: TextAnnotation = {
      id: `text-annotation-${Date.now()}`,
      text: text.trim(),
      position: clickPosition,
      imageWidth: displayedImageSize.width,
      imageHeight: displayedImageSize.height,
    };

    onAnnotationComplete(annotation);
    setClickPosition(null);
    setText('');
  }, [clickPosition, text, displayedImageSize, onAnnotationComplete]);

  const handleCancel = useCallback(() => {
    setClickPosition(null);
    setText('');
    onCancel();
  }, [onCancel]);

  return (
    <div className="text-annotation-tool">
      <div className="tool-header">
        <h3>Add Text Annotation</h3>
        <p>Click on the floor plan where you want to add a note</p>
      </div>

      <div className="annotation-canvas" style={{ position: 'relative' }}>
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Floor plan"
          style={{ display: 'block', maxWidth: '100%', height: 'auto', cursor: 'crosshair' }}
          onClick={handleImageClick}
        />
        {clickPosition && (
          <div
            className="annotation-preview"
            style={{
              position: 'absolute',
              left: clickPosition.x * (displayedImageSize.width / scaleInfo.imageWidth),
              top: clickPosition.y * (displayedImageSize.height / scaleInfo.imageHeight),
              transform: 'translate(-50%, -50%)',
              padding: '8px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '2px solid var(--apple-blue)',
              borderRadius: 'var(--apple-border-radius-small)',
              boxShadow: 'var(--apple-shadow)',
              pointerEvents: 'none',
            }}
          >
            {text || 'Click to add text'}
          </div>
        )}
      </div>

      {clickPosition && (
        <div className="annotation-input">
          <input
            type="text"
            placeholder="Enter annotation text (e.g., 'Center of 2 tables')"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            className="text-input"
            autoFocus
          />
        </div>
      )}

      <div className="tool-actions">
        <button
          onClick={handleConfirm}
          className="confirm-button"
          disabled={!clickPosition || !text.trim()}
        >
          Add Annotation
        </button>
        <button
          onClick={() => {
            setClickPosition(null);
            setText('');
          }}
          className="reset-button"
          disabled={!clickPosition}
        >
          Reset Position
        </button>
        <button
          onClick={handleCancel}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

