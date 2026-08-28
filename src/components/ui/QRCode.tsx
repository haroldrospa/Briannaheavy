import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
  fgColor?: string;
  bgColor?: string;
}

export default function QRCode({
  value,
  size = 110,
  level = 'M',
  includeMargin = false,
  className = '',
  fgColor = '#000000',
  bgColor = '#ffffff',
}: QRCodeProps) {
  if (!value) return null;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        includeMargin={includeMargin}
        fgColor={fgColor}
        bgColor={bgColor}
      />
    </div>
  );
}
