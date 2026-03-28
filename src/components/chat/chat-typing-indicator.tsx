'use client';

import { Loader2 } from 'lucide-react';

export function ChatTypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border shadow-sm rounded-lg p-3">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    </div>
  );
}
