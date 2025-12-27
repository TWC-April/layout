# Layout

A web application for uploading floor plans, calibrating scale using dimension lines, and placing fixtures to check if they fit.

## Features

- 📐 **Dimension Line Tool**: Draw lines on the floor plan and specify real-world dimensions (in millimeters) to calibrate scale
- 🖼️ **PNG/JPEG Import**: Import multiple fixture images (PNG/JPEG) with dimensions
- ➕ **Custom Fixtures**: Add your own fixtures with custom dimensions, colors, and images
- 🖱️ **Drag & Drop**: Drag fixtures from the library onto the floor plan
- ✅ **Fit Detection**: Automatically checks if fixtures fit within the floor plan boundaries
- 💾 **Local Storage**: Custom fixtures are saved in browser localStorage and persist across reloads
- 📄 **PDF Support**: Upload floor plans as PDF files (first page is rendered)

## Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

### Quick Start (Recommended)

Build and serve the application:
```bash
npm run start
```

Or use the serve command:
```bash
npm run serve
```

The application will be available at **http://localhost:5173**

### Development Mode

Run the development server with hot reload:
```bash
npm run dev
```

### Build for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Usage

1. **Upload Floor Plan**: Click "Upload Floor Plan" and select an image file (JPEG, PNG) or PDF
2. **Calibrate Scale**: 
   - Click to start a dimension line, then click again to end it
   - Hold Shift while drawing to constrain to horizontal/vertical lines
   - Enter the real-world length in millimeters
   - Add multiple reference lines for better accuracy (X/Y axis detection)
3. **Import Fixtures** (optional):
   - Click "📎 Import PNG Files" to import multiple fixture images at once
   - Or click "+ Miscellaneous" to add a single fixture with image
   - Enter name, dimensions (mm), and upload an image
   - Custom fixtures are saved automatically and persist across reloads
4. **Place Fixtures**: Drag fixtures from the library onto the floor plan
5. **Move Fixtures**: Click and drag placed fixtures to reposition them

## Project Structure

```
src/
├── components/          # React components
│   ├── ImageUpload.tsx
│   ├── DimensionLineTool.tsx
│   ├── ScaleCalibration.tsx
│   ├── FloorPlanCanvas.tsx
│   ├── FixtureLibrary.tsx
│   ├── FixtureItem.tsx
│   ├── AddFixtureForm.tsx
│   └── FixtureManager.tsx
├── hooks/              # Custom React hooks
│   └── useCustomFixtures.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   └── scaleUtils.ts
├── styles/             # CSS styles
│   └── App.css
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## Technologies

- React 18
- TypeScript
- Vite
- react-dnd (drag and drop)
- HTML5 Canvas/SVG

## License

MIT

