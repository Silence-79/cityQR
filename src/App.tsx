import React, { useState, useEffect, useCallback } from 'react';
import { CityScene } from './components/CityScene';
import { QRControls } from './components/QRControls';
import { RecentQRs } from './components/RecentQRs';
import type {
  QRStateData,
  QROptions,
  RecentQRItem,
  ValidationResult,
} from './types/qr';
import {
  formatQRPayload,
  validateQRInput,
  getQRMatrix,
  downloadQRPNG,
} from './utils/qrGenerator';
import {
  getRecentQRs,
  saveRecentQR,
  removeRecentQR,
  clearRecentQRs,
} from './utils/storage';
import {
  Check,
  Rotate3d,
  MousePointer,
  ZoomIn,
  Sliders,
  History,
  Eye,
  Building2,
} from 'lucide-react';

const INITIAL_FORM_STATE: QRStateData = {
  type: 'url',
  url: { url: 'https://example.com' },
  text: { text: 'CityQR Architectural Matrix' },
  wifi: { ssid: 'OfficeNetwork', password: 'password123', encryption: 'WPA', hidden: false },
};

const INITIAL_OPTIONS: QROptions = {
  margin: 2,
  size: 512,
  centerContent: {
    type: 'none',
    text: '',
    logoDataUrl: null,
  },
};

interface ActiveQRState {
  stateData: QRStateData;
  options: QROptions;
  payload: string;
  matrix: boolean[][];
  matrixSize: number;
}

export const App: React.FC = () => {
  // View & UI states
  const [isTopDown, setIsTopDown] = useState<boolean>(false);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Editing State (Does NOT immediately affect the active QR)
  const [formState, setFormState] = useState<QRStateData>(INITIAL_FORM_STATE);
  const [formOptions, setFormOptions] = useState<QROptions>(INITIAL_OPTIONS);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });

  // Committed / Active Generated QR State
  const [activeQR, setActiveQR] = useState<ActiveQRState>(() => {
    const initialPayload = formatQRPayload(INITIAL_FORM_STATE);
    const { size, matrix } = getQRMatrix(initialPayload, INITIAL_OPTIONS.centerContent);
    return {
      stateData: INITIAL_FORM_STATE,
      options: INITIAL_OPTIONS,
      payload: initialPayload,
      matrix,
      matrixSize: size,
    };
  });

  const [recentItems, setRecentItems] = useState<RecentQRItem[]>([]);

  // Load history on mount
  useEffect(() => {
    setRecentItems(getRecentQRs());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  /**
   * Explicit Generate Handler:
   * Commits current form inputs and options into the active QR.
   * If invalid, preserves existing valid QR and displays validation alert.
   */
  const handleGenerate = useCallback(() => {
    const result = validateQRInput(formState);
    if (!result.isValid) {
      setValidation(result);
      return;
    }

    setValidation({ isValid: true });
    const newPayload = formatQRPayload(formState);
    const { size, matrix } = getQRMatrix(newPayload, formOptions.centerContent);

    const newActive: ActiveQRState = {
      stateData: formState,
      options: { ...formOptions },
      payload: newPayload,
      matrix,
      matrixSize: size,
    };

    setActiveQR(newActive);
    showToast('QR Code Generated');

    // Save to local storage history
    let title = '';
    switch (formState.type) {
      case 'url':
        title = formState.url.url;
        break;
      case 'text':
        title = formState.text.text.substring(0, 30);
        break;
      case 'wifi':
        title = `Wi-Fi: ${formState.wifi.ssid}`;
        break;
    }

    const updated = saveRecentQR({
      type: formState.type,
      title: title || newPayload,
      rawPayload: newPayload,
      stateData: formState,
      options: formOptions,
    });
    setRecentItems(updated);
  }, [formState, formOptions]);

  // Scene click handler: clean click triggers city-to-QR transition
  const handleSceneClick = useCallback(() => {
    setIsTopDown((prev) => !prev);
  }, []);

  const handleToggleView = useCallback(() => {
    setIsTopDown((prev) => !prev);
  }, []);

  // Download PNG handler
  const handleDownloadPNG = useCallback(async () => {
    if (!activeQR.payload) return;

    const filename = `cityqr-${activeQR.stateData.type}-${Date.now()}.png`;
    await downloadQRPNG(activeQR.payload, activeQR.options, filename);
    showToast(`Downloaded ${activeQR.options.size}x${activeQR.options.size} PNG`);
  }, [activeQR]);

  // Restore item from history
  const handleSelectRecent = useCallback((item: RecentQRItem) => {
    setFormState(item.stateData);
    const opts: QROptions = {
      margin: item.options?.margin || 2,
      size: item.options?.size || 512,
      centerContent: item.options?.centerContent || {
        type: 'none',
        text: '',
        logoDataUrl: null,
      },
    };
    setFormOptions(opts);
    setValidation({ isValid: true });

    const newPayload = formatQRPayload(item.stateData);
    const { size, matrix } = getQRMatrix(newPayload, opts.centerContent);

    setActiveQR({
      stateData: item.stateData,
      options: opts,
      payload: newPayload,
      matrix,
      matrixSize: size,
    });

    setIsTopDown(true);
    showToast('Restored from history');
  }, []);

  const handleRemoveRecent = useCallback((id: string) => {
    const updated = removeRecentQR(id);
    setRecentItems(updated);
  }, []);

  const handleClearAllRecent = useCallback(() => {
    clearRecentQRs();
    setRecentItems([]);
  }, []);

  return (
    <div className="w-full h-full h-[100dvh] relative overflow-hidden bg-[#f6f8f5] text-[#1a252f] select-none font-sans">
      {/* 1. CLEAN MINIMAL TOP HEADER */}
      <header className="absolute top-0 left-0 right-0 z-30 h-14 sm:h-16 px-3 sm:px-4 md:px-8 flex items-center justify-between pointer-events-none pt-[env(safe-area-inset-top)]">
        {/* Project Branding */}
        <div className="pointer-events-auto flex items-center space-x-2 sm:space-x-3 bg-white/80 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm border border-black/5">
          <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-[#111e29]">
            CityQR
          </h1>
          <span className="text-[11px] text-[#556977] font-medium hidden md:inline">
            // Architectural 3D City & QR Generator
          </span>
        </div>

        {/* Header Action Buttons */}
        <div className="pointer-events-auto flex items-center space-x-1.5 sm:space-x-2">
          {/* Controls Panel Toggle */}
          <button
            onClick={() => setIsControlsOpen(!isControlsOpen)}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isControlsOpen
                ? 'bg-[#2b4457] text-white shadow-md'
                : 'bg-white/85 hover:bg-white text-[#1e3242] border border-black/5'
            }`}
            title="Toggle Controls Panel"
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Controls</span>
          </button>

          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/85 hover:bg-white text-[#1e3242] border border-black/5 text-xs font-semibold shadow-sm transition-all cursor-pointer relative"
            title="Saved QR Codes"
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">History</span>
            {recentItems.length > 0 && (
              <span className="ml-0.5 sm:ml-1 px-1.5 py-0.2 min-w-4 text-[10px] font-bold bg-[#345268] text-white rounded-full text-center">
                {recentItems.length}
              </span>
            )}
          </button>

          {/* Perspective 3D / Top-Down View Toggle */}
          <button
            onClick={handleToggleView}
            className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
              isTopDown
                ? 'bg-[#1e3242] text-white'
                : 'bg-white/85 hover:bg-white text-[#1e3242] border border-black/5'
            }`}
            title={isTopDown ? 'Return to 3D City View' : 'Switch to Scannable QR View'}
          >
            {isTopDown ? (
              <>
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#82b3d9]" />
                <span>3D City</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2b4457]" />
                <span>Scan QR</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. FULLSCREEN 3D CITY / QR SCENE VIEWPORT */}
      <main className="w-full h-full relative overflow-hidden">
        <CityScene
          matrix={activeQR.matrix}
          matrixSize={activeQR.matrixSize}
          options={activeQR.options}
          isTopDown={isTopDown}
          onSceneClick={handleSceneClick}
        />

        {/* Informational Guidance HUD (in 3D city mode) */}
        {!isTopDown && (
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[calc(100vw-1.5rem)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-black/75 backdrop-blur-md text-white text-[11px] sm:text-xs shadow-lg border border-white/10 whitespace-nowrap">
              <span className="flex items-center space-x-1 text-[#d8e5ee]">
                <Rotate3d className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Drag to Rotate City 360°</span>
                <span className="sm:hidden">Drag: Rotate</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center space-x-1 text-[#d8e5ee]">
                <ZoomIn className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Scroll/Pinch to Zoom</span>
                <span className="sm:hidden">Pinch: Zoom</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center space-x-1 font-bold text-white">
                <MousePointer className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Click City to Reveal QR</span>
                <span className="sm:hidden">Tap: Reveal</span>
              </span>
            </div>
          </div>
        )}

        {/* Top-Down Scannable Banner */}
        {isTopDown && (
          <div className="absolute top-16 sm:top-20 right-3 sm:right-6 z-20 pointer-events-none pt-[env(safe-area-inset-top)]">
            <div className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white text-[11px] sm:text-xs font-semibold shadow-sm border border-white/10">
              Scannable QR Code
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#1e3242] border border-[#3e5f78] text-white text-xs font-semibold shadow-xl animate-in fade-in duration-200 whitespace-nowrap">
            <Check className="w-4 h-4 text-[#7cb7e3] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>

      {/* 3. COLLAPSIBLE NEUMORPHIC CONTROLS CARD */}
      <QRControls
        isOpen={isControlsOpen}
        onClose={() => setIsControlsOpen(false)}
        formState={formState}
        formOptions={formOptions}
        validation={validation}
        onUpdateFormState={setFormState}
        onUpdateFormOptions={setFormOptions}
        onGenerate={handleGenerate}
        onDownloadPNG={handleDownloadPNG}
      />

      {/* 4. GENUINE GLASSMORPHIC RECENT QR MODAL */}
      <RecentQRs
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={recentItems}
        onSelect={handleSelectRecent}
        onRemove={handleRemoveRecent}
        onClearAll={handleClearAllRecent}
      />
    </div>
  );
};

export default App;
