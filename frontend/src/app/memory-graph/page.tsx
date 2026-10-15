'use client';

import React from 'react';
import { EditorialMemoryGraph } from '../../components/graph/EditorialMemoryGraph';

export default function MemoryGraphPage() {
  return (
    <div className="w-full h-[calc(100vh-53px)] min-h-[600px] flex flex-col bg-[#F6F6F0] overflow-hidden">
      <EditorialMemoryGraph />
    </div>
  );
}
