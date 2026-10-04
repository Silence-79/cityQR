import React from 'react';
import {
  Globe,
  FileText,
  Wifi,
  Download,
  AlertCircle,
  Image as ImageIcon,
  Type,
  X,
  Sparkles,
} from 'lucide-react';
import type {
  QRStateData,
  QRType,
  QROptions,
  ValidationResult,
  CenterContentType,
} from '../types/qr';

interface QRControlsProps {
  isOpen: boolean;
  onClose: () => void;
  formState: QRStateData;
  formOptions: QROptions;
  validation: ValidationResult;
  onUpdateFormState: (updater: (prev: QRStateData) => QRStateData) => void;
  onUpdateFormOptions: (updater: (prev: QROptions) => QROptions) => void;
  onGenerate: () => void;
  onDownloadPNG: () => void;
}

export const QRControls: React.FC<QRControlsProps> = ({
  isOpen,
  onClose,
  formState,
  formOptions,
  validation,
  onUpdateFormState,
  onUpdateFormOptions,
  onGenerate,
  onDownloadPNG,
}) => {
  if (!isOpen) return null;

  const qrTypes: { id: QRType; label: string; icon: React.ReactNode }[] = [
    { id: 'url', label: 'URL', icon: <Globe className="w-4 h-4" /> },
    { id: 'text', label: 'Text', icon: <FileText className="w-4 h-4" /> },
    { id: 'wifi', label: 'Wi-Fi', icon: <Wifi className="w-4 h-4" /> },
  ];

  const handleTypeChange = (type: QRType) => {
    onUpdateFormState((prev) => ({ ...prev, type }));
  };

  const handleCenterTypeChange = (type: CenterContentType) => {
    onUpdateFormOptions((prev) => ({
      ...prev,
      centerContent: {
        ...prev.centerContent,
        type,
      },
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Please upload a PNG, JPG, or JPEG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onUpdateFormOptions((prev) => ({
        ...prev,
        centerContent: {
          ...prev.centerContent,
          logoDataUrl: result,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    onUpdateFormOptions((prev) => ({
      ...prev,
      centerContent: {
        ...prev.centerContent,
        logoDataUrl: null,
      },
    }));
  };

  return (
    <div className="fixed top-16 sm:top-20 left-3 sm:left-4 md:left-6 z-40 w-[calc(100vw-1.5rem)] sm:w-96 md:w-[410px] max-h-[calc(100dvh-4.5rem)] sm:max-h-[calc(100dvh-6rem)] flex flex-col neu-card rounded-2xl p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-[#15232d] select-none overflow-y-auto animate-in fade-in slide-in-from-top-3 duration-200">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-3.5 mb-3.5 sm:mb-4 border-b border-[#88a3b5]">
        <div>
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-[#0f1b24]">
            Configuration
          </h2>
          <p className="text-[11px] text-[#2c4150]">
            Customize content and generate your QR code
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl neu-btn hover:text-black transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* QR Type Selector */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#223644] block mb-1.5">
            QR Code Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {qrTypes.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTypeChange(item.id)}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  formState.type === item.id
                    ? 'neu-btn-pressed text-[#08121a]'
                    : 'neu-btn text-[#1d2f3d]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3">
          {formState.type === 'url' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1d2f3d] flex justify-between">
                <span>Target URL</span>
                <span className="text-[10px] text-[#3d5466]">https://</span>
              </label>
              <input
                type="url"
                value={formState.url.url}
                onChange={(e) =>
                  onUpdateFormState((prev) => ({
                    ...prev,
                    url: { ...prev.url, url: e.target.value },
                  }))
                }
                placeholder="https://example.com"
                className="w-full px-3 py-2 rounded-xl text-xs text-[#0f1a23] placeholder-[#4f6778] outline-none neu-input"
              />
            </div>
          )}

          {formState.type === 'text' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1d2f3d] flex justify-between">
                <span>Plain Text</span>
                <span className="text-[10px] text-[#3d5466]">
                  {formState.text.text.length} chars
                </span>
              </label>
              <textarea
                rows={3}
                value={formState.text.text}
                onChange={(e) =>
                  onUpdateFormState((prev) => ({
                    ...prev,
                    text: { ...prev.text, text: e.target.value },
                  }))
                }
                placeholder="Enter plain text, notes, or messages..."
                className="w-full px-3 py-2 rounded-xl text-xs text-[#0f1a23] placeholder-[#4f6778] outline-none neu-input resize-none"
              />
            </div>
          )}

          {formState.type === 'wifi' && (
            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-semibold text-[#1d2f3d] block mb-1">
                  Network SSID (Name) *
                </label>
                <input
                  type="text"
                  value={formState.wifi.ssid}
                  onChange={(e) =>
                    onUpdateFormState((prev) => ({
                      ...prev,
                      wifi: { ...prev.wifi, ssid: e.target.value },
                    }))
                  }
                  placeholder="MyHomeNetwork"
                  className="w-full px-3 py-1.5 rounded-xl text-xs text-[#0f1a23] placeholder-[#4f6778] outline-none neu-input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1d2f3d] block mb-1">
                  Security Encryption
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['WPA', 'WEP', 'nopass'] as const).map((enc) => (
                    <button
                      key={enc}
                      type="button"
                      onClick={() =>
                        onUpdateFormState((prev) => ({
                          ...prev,
                          wifi: { ...prev.wifi, encryption: enc },
                        }))
                      }
                      className={`py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                        formState.wifi.encryption === enc
                          ? 'neu-btn-pressed text-[#08121a] font-bold'
                          : 'neu-btn text-[#203444]'
                      }`}
                    >
                      {enc === 'nopass' ? 'Open' : enc}
                    </button>
                  ))}
                </div>
              </div>

              {formState.wifi.encryption !== 'nopass' && (
                <div>
                  <label className="text-xs font-semibold text-[#1d2f3d] block mb-1">
                    Password *
                  </label>
                  <input
                    type="text"
                    value={formState.wifi.password}
                    onChange={(e) =>
                      onUpdateFormState((prev) => ({
                        ...prev,
                        wifi: { ...prev.wifi, password: e.target.value },
                      }))
                    }
                    placeholder="Network password"
                    className="w-full px-3 py-1.5 rounded-xl text-xs text-[#0f1a23] placeholder-[#4f6778] outline-none neu-input"
                  />
                </div>
              )}

              <label className="flex items-center space-x-2 text-xs text-[#1d2f3d] cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={formState.wifi.hidden}
                  onChange={(e) =>
                    onUpdateFormState((prev) => ({
                      ...prev,
                      wifi: { ...prev.wifi, hidden: e.target.checked },
                    }))
                  }
                  className="rounded text-[#203444] focus:ring-0"
                />
                <span>Hidden Network (Stealth SSID)</span>
              </label>
            </div>
          )}
        </div>

        {/* Validation Alert */}
        {!validation.isValid && (
          <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-[#cc6666]/30 border border-[#b34444]/40 text-[#541212] text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-[#8a1f1f] shrink-0 mt-0.5" />
            <span>{validation.message}</span>
          </div>
        )}

        {/* Center Content Section */}
        <div className="space-y-2.5 pt-3 border-t border-[#88a3b5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#223644] block">
            Center Content
          </span>

          <div className="grid grid-cols-3 gap-2">
            {(['none', 'text', 'logo'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleCenterTypeChange(type)}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  formOptions.centerContent.type === type
                    ? 'neu-btn-pressed text-[#08121a]'
                    : 'neu-btn text-[#203444]'
                }`}
              >
                {type === 'none' ? 'None' : type === 'text' ? 'Text' : 'Logo'}
              </button>
            ))}
          </div>

          {formOptions.centerContent.type === 'text' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1d2f3d] flex justify-between">
                <span>Badge Text</span>
                <span className="text-[10px] text-[#3d5466]">Max 10 chars</span>
              </label>
              <div className="flex items-center space-x-2">
                <div className="p-1.5 neu-btn rounded-xl text-[#223644]">
                  <Type className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  maxLength={10}
                  value={formOptions.centerContent.text}
                  onChange={(e) =>
                    onUpdateFormOptions((prev) => ({
                      ...prev,
                      centerContent: {
                        ...prev.centerContent,
                        text: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. SCAN, VIP, GO"
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs text-[#0f1a23] placeholder-[#4f6778] outline-none neu-input"
                />
              </div>
            </div>
          )}

          {formOptions.centerContent.type === 'logo' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1d2f3d] block">
                Upload Logo (PNG, JPG)
              </label>
              {formOptions.centerContent.logoDataUrl ? (
                <div className="flex items-center justify-between p-2 neu-input rounded-xl">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={formOptions.centerContent.logoDataUrl}
                      alt="Logo"
                      className="w-8 h-8 object-contain bg-white rounded p-0.5 border border-slate-300"
                    />
                    <span className="text-xs text-[#15232d] font-medium">Logo selected</span>
                  </div>
                  <button
                    onClick={handleRemoveLogo}
                    className="p-1 rounded-lg hover:bg-black/10 text-[#7a1c1c] cursor-pointer"
                    title="Remove Logo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl neu-btn text-xs font-semibold text-[#1d2f3d] cursor-pointer transition-all">
                  <ImageIcon className="w-3.5 h-3.5 text-[#2c4150]" />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Quiet Zone & Resolution Size Controls */}
        <div className="space-y-3 pt-3 border-t border-[#88a3b5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#223644] block">
            Layout Settings
          </span>

          {/* Quiet Zone Margin (Description removed as requested) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[#1d2f3d] font-semibold">
              <span>Quiet Zone</span>
              <span className="font-bold text-[#0c161d]">{formOptions.margin} modules</span>
            </div>
            <input
              type="range"
              min={1}
              max={6}
              value={formOptions.margin}
              onChange={(e) =>
                onUpdateFormOptions((prev) => ({ ...prev, margin: parseInt(e.target.value) }))
              }
              className="w-full accent-[#2b4457] bg-[#7f99ab] rounded cursor-pointer h-1.5"
            />
          </div>

          {/* Resolution Size */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#1d2f3d] font-semibold">
              <span>Export Resolution</span>
              <span className="font-bold text-[#0c161d]">
                {formOptions.size} x {formOptions.size} px
              </span>
            </div>
            <input
              type="range"
              min={256}
              max={1280}
              step={64}
              value={formOptions.size}
              onChange={(e) =>
                onUpdateFormOptions((prev) => ({ ...prev, size: parseInt(e.target.value) }))
              }
              className="w-full accent-[#2b4457] bg-[#7f99ab] rounded cursor-pointer h-1.5"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-[#88a3b5] space-y-2">
        <button
          onClick={onGenerate}
          className="w-full py-2.5 sm:py-3 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold tracking-wider uppercase neu-btn-pressed hover:brightness-105 text-[#08121a] transition-all cursor-pointer touch-manipulation min-h-[44px]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#1b3447]" />
          <span>GENERATE QR</span>
        </button>

        <button
          onClick={onDownloadPNG}
          className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold neu-btn text-[#1d2f3d] transition-all cursor-pointer touch-manipulation min-h-[40px]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PNG ({formOptions.size}px)</span>
        </button>
      </div>
    </div>
  );
};
