import { 
  type ReceiptFontSize, 
  RECEIPT_FONT_SIZES, 
  getReceiptFontSize, 
  saveReceiptFontSize 
} from '../../utils/receiptSettings';

interface ReceiptFontSizePickerProps {
  currentSize: ReceiptFontSize;
  onChange: (size: ReceiptFontSize) => void;
  className?: string;
}

export default function ReceiptFontSizePicker({
  currentSize,
  onChange,
  className = '',
}: ReceiptFontSizePickerProps) {
  const handleSelect = (size: ReceiptFontSize) => {
    saveReceiptFontSize(size);
    onChange(size);
  };

  return (
    <div className={`flex items-center justify-between bg-[#f4f3f1] dark:bg-[#222222] px-3 py-2 rounded-2xl ${className}`}>
      <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 flex items-center gap-1">
        <span>Tamaño de Letra:</span>
      </span>

      <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-1 rounded-xl shadow-2xs border border-gray-100 dark:border-zinc-700/50">
        {(['sm', 'md', 'lg', 'xl'] as const).map((size) => {
          const isSelected = currentSize === size;
          const config = RECEIPT_FONT_SIZES[size];
          return (
            <button
              key={size}
              type="button"
              onClick={() => handleSelect(size)}
              title={`${config.name} (${config.description})`}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#ED1C24] text-white shadow-xs'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { getReceiptFontSize, saveReceiptFontSize };
