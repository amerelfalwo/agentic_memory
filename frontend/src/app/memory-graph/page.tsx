'use client';

import React from 'react';
import { EditorialMemoryGraph } from '../../components/graph/EditorialMemoryGraph';

export default function MemoryGraphPage() {
  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#F6F6F0] overflow-hidden">
      <EditorialMemoryGraph />
    </div>
  );
}
