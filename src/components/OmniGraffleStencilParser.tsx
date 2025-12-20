import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { parse as parsePlist } from 'plist';
import { Buffer } from 'buffer';
import { Fixture } from '../types';

interface OmniGraffleStencilParserProps {
  onFixturesParsed: (fixtures: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>[]) => void;
  onCancel: () => void;
  onAddSingleFixture?: (fixture: Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>) => void;
}

type ParsedFixture = Omit<Fixture, 'id' | 'isCustom' | 'createdAt'>;

export const OmniGraffleStencilParser: React.FC<OmniGraffleStencilParserProps> = ({
  onFixturesParsed,
  onCancel,
  onAddSingleFixture,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedFixtures, setParsedFixtures] = useState<ParsedFixture[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseStencilFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setParsedFixtures([]);

    try {
      // Read the ZIP file
      const zip = new JSZip();
      const zipData = await zip.loadAsync(file);

      // List all files in the ZIP for debugging
      const allFiles: string[] = [];
      zipData.forEach((relativePath) => {
        allFiles.push(relativePath);
      });
      console.log('Files in ZIP archive:', allFiles);

      // Try to find plist file - check common names and locations
      let plistFile: JSZip.JSZipObject | null = null;
      const possiblePlistNames = [
        'data.plist',
        'Data.plist',
        'DATA.plist',
        'stencil.plist',
        'Stencil.plist',
        'info.plist',
        'Info.plist',
      ];

      // First, try exact matches
      for (const name of possiblePlistNames) {
        plistFile = zipData.file(name);
        if (plistFile) {
          console.log(`Found plist file: ${name}`);
          break;
        }
      }

      // If not found, search for any .plist file
      if (!plistFile) {
        for (const relativePath of allFiles) {
          if (relativePath.toLowerCase().endsWith('.plist')) {
            plistFile = zipData.file(relativePath);
            if (plistFile) {
              console.log(`Found plist file: ${relativePath}`);
              break;
            }
          }
        }
      }

      if (!plistFile) {
        throw new Error(
          `No plist file found in stencil file. Files in archive: ${allFiles.join(', ')}`
        );
      }

      // Read plist file - try as string first (XML), then as buffer (binary)
      let data: any;
      
      try {
        // Read as buffer first to check format
        const plistBuffer = await plistFile.async('uint8array');
        console.log('Plist file size:', plistBuffer.length, 'bytes');
        console.log('First 20 bytes:', Array.from(plistBuffer.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        
        // Check if it's binary plist (starts with "bplist")
        const isBinary = plistBuffer.length >= 6 && 
                         plistBuffer[0] === 0x62 && // 'b'
                         plistBuffer[1] === 0x70 && // 'p'
                         plistBuffer[2] === 0x6C && // 'l'
                         plistBuffer[3] === 0x69 && // 'i'
                         plistBuffer[4] === 0x73 && // 's'
                         plistBuffer[5] === 0x74;   // 't'
        
        console.log('Is binary plist?', isBinary);
        
        if (isBinary) {
          // Use Buffer polyfill (provided by vite-plugin-node-polyfills)
          console.log('Parsing binary plist with Buffer');
          const buffer = Buffer.from(plistBuffer);
          data = parsePlist(buffer as any);
        } else {
          // For XML plist, convert to string
          const plistString = new TextDecoder('utf-8').decode(plistBuffer);
          console.log('XML plist preview (first 200 chars):', plistString.substring(0, 200));
          data = parsePlist(plistString);
        }
      } catch (err) {
        console.error('Error parsing plist:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to parse plist file: ${errorMessage}. The file may be corrupted or in an unsupported format.`);
      }
      
      if (!data) {
        console.error('Failed to parse plist - data is null');
        throw new Error('Failed to parse plist data');
      }
      
      console.log('Successfully parsed plist data:', Object.keys(data));

      const fixtures: ParsedFixture[] = [];
      const seenNames = new Set<string>();

      // Debug: Log the parsed data structure
      console.log('Parsed data structure:', data);
      console.log('Sheets:', data?.Sheets);
      
      // Parse fixtures from GraphicsList in Sheets
      const sheets = data?.Sheets || [];
      console.log('Number of sheets:', sheets.length);
      
      for (const sheet of sheets) {
        const graphicsList = sheet?.GraphicsList || [];
        console.log('GraphicsList length:', graphicsList.length);
        
        for (const group of graphicsList) {
          console.log('Group:', group);
          if (group?.Class === 'Group' && group?.Name) {
            const name = group.Name.trim();
            
            // Skip non-fixture items (zoom levels, etc.)
            if (name === 'Low' || name === 'Medium' || name === 'High' || name === 'Canvas 1' || name === 'Layer 1') {
              continue;
            }

            // Skip duplicates
            if (seenNames.has(name)) {
              continue;
            }
            seenNames.add(name);

            // Extract dimensions from name (e.g., "1.85m" = 1850mm)
            const nameMatch = name.match(/(\d+\.?\d*)\s*m/);
            let widthMm = 0;
            let heightMm = 0;

            if (nameMatch) {
              // Parse width from name (e.g., "1.85m" = 1850mm)
              widthMm = parseFloat(nameMatch[1]) * 1000;
            }

            // Get bounds from graphics to calculate height
            const graphics = group?.Graphics || [];
            if (graphics.length > 0) {
              const firstGraphic = graphics[0];
              const boundsStr = firstGraphic?.Bounds;
              
              if (boundsStr) {
                // Parse {{x, y}, {width, height}}
                const boundsMatch = boundsStr.match(/\{\{([^,]+),\s*([^}]+)\},\s*\{([^,]+),\s*([^}]+)\}\}/);
                if (boundsMatch) {
                  const widthPts = parseFloat(boundsMatch[3]);
                  const heightPts = parseFloat(boundsMatch[4]);
                  
                  // Convert points to mm (1 point = 0.352778 mm)
                  const widthFromBounds = widthPts * 0.352778;
                  const heightFromBounds = heightPts * 0.352778;

                  // Use width from name if available, otherwise from bounds
                  if (widthMm === 0) {
                    widthMm = widthFromBounds;
                  }
                  
                  // Use height from bounds, but if it's too small (< 100mm), estimate it
                  // For wall-mounted fixtures, height might represent depth/thickness
                  if (heightFromBounds > 100) {
                    heightMm = heightFromBounds;
                  } else {
                    // For wall-mounted fixtures, estimate reasonable height
                    // Check if name suggests it's a wall fixture
                    const isWallFixture = name.toLowerCase().includes('wall') || 
                                         name.toLowerCase().includes('bay') ||
                                         name.toLowerCase().includes('shop');
                    if (isWallFixture) {
                      // Wall fixtures: estimate height as 30% of width (typical wall height)
                      heightMm = widthMm * 0.3;
                    } else {
                      // Table fixtures: estimate height as 15% of width (typical table depth)
                      heightMm = widthMm * 0.15;
                    }
                  }
                }
              }
            }

            // If we still don't have dimensions, skip
            if (widthMm === 0 || heightMm === 0) {
              continue;
            }

            // Generate a color based on the fixture name
            const color = generateColorFromName(name);

            fixtures.push({
              name,
              width: Math.round(widthMm),
              height: Math.round(heightMm),
              color,
            });
          }
        }
      }

      // Limit to 20 fixtures
      const limitedFixtures = fixtures.slice(0, 20);
      console.log('Found fixtures:', fixtures.length, fixtures);
      setParsedFixtures(limitedFixtures);

      if (limitedFixtures.length === 0) {
        console.error('No fixtures found. Data structure:', data);
        setError(`No fixtures found in the stencil file. Found ${sheets.length} sheet(s) with ${sheets.reduce((sum: number, s: any) => sum + (s?.GraphicsList?.length || 0), 0)} graphics. Make sure it contains fixture groups with names.`);
      }
    } catch (err) {
      console.error('Error parsing stencil:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse stencil file');
    } finally {
      setIsProcessing(false);
    }
  };


  const generateColorFromName = (name: string): string => {
    // Generate a consistent color based on the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
    const lightness = 45 + (Math.abs(hash) % 15); // 45-60%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    // Check file extension
    const fileName = file.name.toLowerCase();
    const isValidExtension = fileName.endsWith('.gstencil') || 
                             fileName.endsWith('.stencil') ||
                             fileName.endsWith('.zip'); // Also accept .zip as stencils are ZIP files

    // Verify it's actually a ZIP file by checking the first bytes
    let isZipFile = false;
    try {
      const firstBytes = await file.slice(0, 4).arrayBuffer();
      const uint8Array = new Uint8Array(firstBytes);
      // ZIP files start with PK (0x50 0x4B)
      isZipFile = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B;
    } catch (err) {
      console.warn('Could not verify file type:', err);
    }

    // Accept file if it has valid extension OR is a ZIP file
    if (!isValidExtension && !isZipFile) {
      setError(`Please select a valid OmniGraffle stencil file (.gstencil or .stencil).\nSelected file: ${file.name}`);
      setIsProcessing(false);
      return;
    }

    await parseStencilFile(file);
  };

  const handleImport = () => {
    if (parsedFixtures.length > 0) {
      onFixturesParsed(parsedFixtures);
      setParsedFixtures([]);
    }
  };

  const formatDimension = (mm: number): string => {
    if (mm >= 1000) {
      return `${(mm / 1000).toFixed(2)} m`;
    }
    return `${mm} mm`;
  };

  return (
    <div className="stencil-parser-overlay" onClick={onCancel}>
      <div className="stencil-parser" onClick={(e) => e.stopPropagation()}>
        <h3>Import OmniGraffle Stencil</h3>
        
        <div className="parser-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept=".gstencil,.stencil"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="upload-stencil-button"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Select Stencil File'}
          </button>
        </div>

        {error && (
          <div className="parser-error">
            <p>{error}</p>
          </div>
        )}

        {isProcessing && (
          <div className="parser-status">
            <p>Parsing stencil file...</p>
          </div>
        )}

        {parsedFixtures.length > 0 && (
          <div className="parser-preview">
            <h4>Found {parsedFixtures.length} fixtures:</h4>
            <div className="fixtures-preview-list">
              {parsedFixtures.map((fixture, index) => (
                <div key={index} className="fixture-preview-item">
                  <div
                    className="preview-color-box"
                    style={{ backgroundColor: fixture.color }}
                  />
                  <div className="preview-details">
                    <div className="preview-name">{fixture.name}</div>
                    <div className="preview-dimensions">
                      {formatDimension(fixture.width)} × {formatDimension(fixture.height)}
                    </div>
                  </div>
                  {onAddSingleFixture && (
                    <button
                      onClick={() => {
                        onAddSingleFixture(fixture);
                        // Remove from preview after adding
                        setParsedFixtures(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="add-single-button"
                      title="Add this fixture individually"
                    >
                      + Add
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="parser-actions">
              <button onClick={handleImport} className="import-button">
                Import {parsedFixtures.length} Fixtures
              </button>
              <button onClick={onCancel} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isProcessing && parsedFixtures.length === 0 && !error && (
          <div className="parser-actions">
            <button onClick={onCancel} className="cancel-button">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

