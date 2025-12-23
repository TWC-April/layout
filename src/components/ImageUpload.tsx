import React, { useRef, useState } from 'react';

// Lazy load PDF.js only when needed
let pdfjsLib: any = null;
const loadPdfJs = async () => {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Set up PDF.js worker - use base path for GitHub Pages compatibility
    const basePath = import.meta.env.BASE_URL || '/';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${basePath}pdf.worker.min.mjs`;
  }
  return pdfjsLib;
};

interface ImageUploadProps {
  onImageUpload: (url: string, width: number, height: number) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onImageUpload(url, img.width, img.height);
        setIsProcessing(false);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handlePDFFile = async (file: File) => {
    setIsProcessing(true);
    try {
      // Lazy load PDF.js library
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF with error handling
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        verbosity: 0, // Suppress console warnings
      });
      
      const pdf = await loadingTask.promise;
      
      if (pdf.numPages === 0) {
        throw new Error('PDF has no pages');
      }
      
      // Get the first page
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
      
      // Create a canvas to render the PDF page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      onImageUpload(dataUrl, canvas.width, canvas.height);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Full error details:', error);
      alert(`Error loading PDF: ${errorMessage}\n\nPlease check:\n1. The file is a valid PDF\n2. The PDF is not password-protected\n3. The PDF is not corrupted`);
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    // Check file type
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      await handlePDFFile(file);
    } else if (file.type.startsWith('image/')) {
      handleImageFile(file);
    } else {
      alert('Please upload an image (JPEG, PNG, etc.) or PDF file.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="upload-button"
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Upload Floor Plan (Image or PDF)'}
      </button>
      {isProcessing && (
        <p className="upload-status">Processing file...</p>
      )}
    </div>
  );
};

