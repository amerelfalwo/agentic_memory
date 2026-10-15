'use client';

import React from 'react';
import { EditorialMemoryGraph } from '../../components/graph/EditorialMemoryGraph';

export default function MemoryGraphPage() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-53px)] bg-[#F6F6F0]">
      <EditorialMemoryGraph />
    </div>
  );
}
