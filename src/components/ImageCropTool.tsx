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

  // Reset crop selection when component mounts or imageUrl changes
  useEffect(() => {
    setCropStart(null);
    setCropEnd(null);
    setIsSelecting(false);
  }, [imageUrl]);

  // Add global mouse up handler to ensure crop selection completes even if mouse leaves container
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isSelecting && cropStart && imageRef.current) {
        const pos = getMousePos(e);
        setCropEnd(pos);
        setIsSelecting(false);
      }
    };

    if (isSelecting) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isSelecting, cropStart]);

  const getMousePos = (e: React.MouseEvent | MouseEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    
    // Get mouse position relative to the image element, not the container
    const imageRect = imageRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    // Calculate position relative to image
    let x = clientX - imageRect.left;
    let y = clientY - imageRect.top;
    
    // Clamp to image bounds
    x = Math.max(0, Math.min(imageRect.width, x));
    y = Math.max(0, Math.min(imageRect.height, y));
    
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    const pos = getMousePos(e);
    setIsSelecting(true);
    setCropStart(pos);
    setCropEnd(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !cropStart) return;
    e.preventDefault();
    const pos = getMousePos(e);
    setCropEnd(pos);
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      // Set final crop end position on mouse up
      const pos = getMousePos(e);
      setCropEnd(pos);
    }
    setIsSelecting(false);
  };

  const handleCrop = () => {
    if (!cropStart || !cropEnd || !imageRef.current) {
      alert('Please select a crop area first.');
      return;
    }

    if (!imageSize) {
      alert('Image is still loading. Please wait.');
      return;
    }

    // Calculate crop area (coordinates are already relative to displayed image)
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

    // Get actual image dimensions
    const img = new Image();
    img.onload = () => {
      // Calculate scale factor between displayed image size and actual image size
      const displayedWidth = imageSize.width;
      const displayedHeight = imageSize.height;
      const actualWidth = img.width;
      const actualHeight = img.height;
      
      const scaleX = actualWidth / displayedWidth;
      const scaleY = actualHeight / displayedHeight;

      // Create canvas for cropping
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        alert('Failed to create canvas context.');
        return;
      }

      // Calculate actual crop dimensions in source image coordinates
      const sourceX = x1 * scaleX;
      const sourceY = y1 * scaleY;
      const sourceWidth = cropWidth * scaleX;
      const sourceHeight = cropHeight * scaleY;

      // Set canvas size to crop dimensions (use actual pixel dimensions)
      canvas.width = Math.round(sourceWidth);
      canvas.height = Math.round(sourceHeight);

      // Draw cropped portion from source image
      ctx.drawImage(
        img,
        Math.round(sourceX),
        Math.round(sourceY),
        Math.round(sourceWidth),
        Math.round(sourceHeight),
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Convert to data URL
      const croppedDataUrl = canvas.toDataURL('image/png');
      onCropComplete(croppedDataUrl, canvas.width, canvas.height);
    };
    img.onerror = () => {
      alert('Failed to load image for cropping.');
    };
    img.src = imageUrl;
  };

  const cropArea = cropStart && cropEnd && imageSize
    ? {
        left: Math.min(cropStart.x, cropEnd.x),
        top: Math.min(cropStart.y, cropEnd.y),
        width: Math.abs(cropEnd.x - cropStart.x),
        height: Math.abs(cropEnd.y - cropStart.y),
      }
    : null;

  // Check if crop area is valid (has minimum size)
  const isValidCropArea = cropArea && cropArea.width >= 10 && cropArea.height >= 10;

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
        onMouseLeave={(e) => {
          // Only finalize if we were selecting
          if (isSelecting && cropStart) {
            handleMouseUp(e);
          }
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
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
                left: `${cropArea.left}px`,
                top: `${cropArea.top}px`,
                width: `${cropArea.width}px`,
                height: `${cropArea.height}px`,
              }}
            />
          )}
        </div>
      </div>
      <div className="crop-tool-actions">
        <button
          onClick={handleCrop}
          className="crop-button"
          disabled={!isValidCropArea}
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
      {!imageSize && (
        <div className="crop-loading-message">
          Loading image...
        </div>
      )}
    </div>
  );
};

