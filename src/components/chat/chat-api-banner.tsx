'use client';

interface ApiBannerState {
  type: 'info' | 'success' | 'error';
  text: string;
}

interface ChatApiBannerProps {
  banner: ApiBannerState | null;
}

export function ChatApiBanner({ banner }: ChatApiBannerProps) {
  if (!banner) return null;

  const colorMap = {
    success: 'bg-green-50 text-green-800',
    error: 'bg-red-50 text-red-800',
    info: 'bg-blue-50 text-blue-800',
  };

  return (
    <div className={`p-3 text-sm ${colorMap[banner.type]}`}>{banner.text}</div>
  );
}
