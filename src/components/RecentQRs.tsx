import React from 'react';
import {
  X,
  Trash2,
  ExternalLink,
  Globe,
  FileText,
  Wifi,
  Clock,
  QrCode,
} from 'lucide-react';
import type { RecentQRItem, QRType } from '../types/qr';

interface RecentQRsProps {
  isOpen: boolean;
  onClose: () => void;
  items: RecentQRItem[];
  onSelect: (item: RecentQRItem) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export const RecentQRs: React.FC<RecentQRsProps> = ({
  isOpen,
  onClose,
  items,
  onSelect,
  onRemove,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const getTypeIcon = (type: QRType) => {
    switch (type) {
      case 'url':
        return <Globe className="w-4 h-4 text-[#204058]" />;
      case 'text':
        return <FileText className="w-4 h-4 text-[#204058]" />;
      case 'wifi':
        return <Wifi className="w-4 h-4 text-[#204058]" />;
      default:
        return <QrCode className="w-4 h-4 text-[#204058]" />;
    }
  };

  const formatTimestamp = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/25 backdrop-blur-[6px] select-none animate-in fade-in duration-200">
      {/* Authentic Frosted Glassmorphism Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.22)] flex flex-col max-h-[85vh] max-h-[85dvh] overflow-hidden text-[#14232e] pb-[env(safe-area-inset-bottom)]"
        style={{
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.65)',
          boxShadow: '0 20px 45px rgba(25, 45, 65, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
        }}
      >
        {/* Glass Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
            background: 'rgba(255, 255, 255, 0.25)',
          }}
        >
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            <Clock className="w-4 h-4 text-[#204058]" />
            <h2 className="text-sm font-bold tracking-tight text-[#0f1d29]">
              Recent Generations
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/40 text-[#253948] transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Glass Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <QrCode className="w-8 h-8 mx-auto text-[#4b667a]" />
              <p className="text-sm font-semibold text-[#182b3a]">No saved QR codes.</p>
              <p className="text-xs text-[#3a5468]">
                Click Generate to save your QR codes in local history.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                style={{
                  background: 'rgba(255, 255, 255, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.55)',
                }}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <div className="flex items-start space-x-3 min-w-0 pr-2">
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.6)',
                    }}
                  >
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#0c1822] truncate">
                        {item.title || item.rawPayload}
                      </span>
                      <span
                        className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded font-mono"
                        style={{
                          background: 'rgba(255, 255, 255, 0.5)',
                          color: '#1a3347',
                        }}
                      >
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1 text-[11px] text-[#344d60]">
                      <span>{formatTimestamp(item.timestamp)}</span>
                      <span>•</span>
                      <span>Margin: {item.options?.margin || 2}</span>
                      {item.options?.centerContent && item.options.centerContent.type !== 'none' && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{item.options.centerContent.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    className="p-1.5 rounded-lg text-[#6b2828] hover:bg-red-500/20 transition-colors cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="p-1.5 rounded-lg text-[#1b3d57] hover:bg-white/50 transition-colors cursor-pointer"
                    title="Load into generator"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Glass Footer */}
        {items.length > 0 && (
          <div
            className="flex items-center justify-between px-5 py-3 text-xs"
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.4)',
              background: 'rgba(255, 255, 255, 0.25)',
            }}
          >
            <span className="text-[#344d60] font-medium">
              {items.length} saved code{items.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={onClearAll}
              className="text-[#962626] font-semibold hover:underline flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
