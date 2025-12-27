import React, { useRef, useState, useCallback, useEffect } from 'react';

interface ImageCropToolProps {
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string, width: number, height: number) => void;
  onCancel: () => void;
}

export const ImageCropTool: React.FC<ImageCropToolProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  }, []);

  useEffect(() => {
    handleImageLoad();
    window.addEventListener('resize', handleImageLoad);
    return () => window.removeEventListener('resize', handleImageLoad);
  }, [handleImageLoad]);

  const getMousePos = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    const pos = getMousePos(e);
    setIsSelecting(true);
    setCropStart(pos);
    setCropEnd(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !cropStart) return;
    const pos = getMousePos(e);
    setCropEnd(pos);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleCrop = () => {
    if (!cropStart || !cropEnd || !imageRef.current || !imageSize) return;

    // Calculate crop area
    const x1 = Math.min(cropStart.x, cropEnd.x);
    const y1 = Math.min(cropStart.y, cropEnd.y);
    const x2 = Math.max(cropStart.x, cropEnd.x);
    const y2 = Math.max(cropStart.y, cropEnd.y);

    const cropWidth = x2 - x1;
    const cropHeight = y2 - y1;

    if (cropWidth < 10 || cropHeight < 10) {
      alert('Crop area is too small. Please select a larger area.');
      return;
    }

    // Calculate scale factor between displayed image and actual image
    const img = new Image();
    img.onload = () => {
      const scaleX = img.width / imageSize.width;
      const scaleY = img.height / imageSize.height;

      // Create canvas for cropping
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to crop dimensions
      canvas.width = cropWidth * scaleX;
      canvas.height = cropHeight * scaleY;

      // Draw cropped portion
      ctx.drawImage(
        img,
        x1 * scaleX,
        y1 * scaleY,
        cropWidth * scaleX,
        cropHeight * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Convert to data URL
      const croppedDataUrl = canvas.toDataURL('image/png');
      onCropComplete(croppedDataUrl, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  };

  const cropArea = cropStart && cropEnd
    ? {
        left: Math.min(cropStart.x, cropEnd.x),
        top: Math.min(cropStart.y, cropEnd.y),
        width: Math.abs(cropEnd.x - cropStart.x),
        height: Math.abs(cropEnd.y - cropStart.y),
      }
    : null;

  return (
    <div className="crop-tool-container">
      <div className="crop-tool-header">
        <h3>Crop Floor Plan</h3>
        <p>Click and drag to select the area you want to keep</p>
      </div>
      <div
        ref={containerRef}
        className="crop-tool-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Floor plan to crop"
          className="crop-tool-image"
          onLoad={handleImageLoad}
        />
        {cropArea && (
          <div
            className="crop-selection"
            style={{
              left: cropArea.left,
              top: cropArea.top,
              width: cropArea.width,
              height: cropArea.height,
            }}
          />
        )}
      </div>
      <div className="crop-tool-actions">
        <button
          onClick={handleCrop}
          className="crop-button"
          disabled={!cropArea || cropArea.width < 10 || cropArea.height < 10}
        >
          Apply Crop
        </button>
        <button onClick={onCancel} className="cancel-button">
          Skip Cropping
        </button>
        {cropArea && (
          <button
            onClick={() => {
              setCropStart(null);
              setCropEnd(null);
            }}
            className="reset-button"
          >
            Reset Selection
          </button>
        )}
      </div>
    </div>
  );
};

