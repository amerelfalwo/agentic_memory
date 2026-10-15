'use client';

import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Save,
  Check,
  RefreshCw,
  Edit3,
  ListFilter,
  CheckCircle2,
  FileCode,
  RotateCcw
} from 'lucide-react';
import { fetchProceduralRules, updateProceduralRules } from '../../lib/api';
import { ProceduralRule } from '../../types';

export default function GuidelinesPage() {
  const [rules, setRules] = useState<ProceduralRule[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'raw'>('cards');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadGuidelines();
  }, []);

  const loadGuidelines = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await fetchProceduralRules();
      setRules(data.rules || []);
      setRawText(data.raw_text || '');
    } catch (err: any) {
      setErrorMessage('Failed to load procedural guidelines from backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      const textToSave = viewMode === 'raw' ? rawText : buildRawFromRules(rules);
      const updated = await updateProceduralRules(textToSave);
      setRules(updated.rules || []);
      setRawText(updated.raw_text || '');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setErrorMessage('Failed to save procedural guidelines.');
    } finally {
      setSaving(false);
    }
  };

  const buildRawFromRules = (items: ProceduralRule[]) => {
    return items
      .map((r) => {
        if (r.rationale) return `${r.index}. ${r.instruction} - ${r.rationale}`;
        return `${r.index}. ${r.instruction}`;
      })
      .join('\n');
  };

  const handleRuleChange = (index: number, newInstruction: string) => {
    const updated = rules.map((r) => (r.index === index ? { ...r, instruction: newInstruction } : r));
    setRules(updated);
    setRawText(buildRawFromRules(updated));
  };

  const filteredRules = rules.filter((r) => {
    const search = searchTerm.toLowerCase();
    return (
      r.instruction.toLowerCase().includes(search) ||
      (r.rationale && r.rationale.toLowerCase().includes(search))
    );
  });

  return (
    <div className="flex-1 bg-[#F6F6F0] py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#DFE5DD] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ScrollText className="w-5 h-5 text-[#285943]" />
              <h1 className="text-lg font-bold text-[#242A25] tracking-tight">
                Procedural Guidelines Manager
              </h1>
            </div>
            <p className="text-xs text-[#737B74] mt-1 max-w-xl">
              These guidelines are injected into Mnemos&apos;s system prompt for every interaction. They govern response tone, length, empathetic framing, and active recall.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'cards' ? 'raw' : 'cards')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#F6F6F0] hover:bg-[#E8F0E8] border border-[#DFE5DD] text-xs font-medium text-[#242A25] transition-colors"
            >
              {viewMode === 'cards' ? (
                <>
                  <FileCode className="w-3.5 h-3.5 text-[#285943]" />
                  <span>Raw Text Editor</span>
                </>
              ) : (
                <>
                  <ListFilter className="w-3.5 h-3.5 text-[#285943]" />
                  <span>Structured Cards</span>
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-[#285943] hover:bg-[#1E4433] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saveSuccess ? 'Saved to System' : 'Save Guidelines'}</span>
            </button>
          </div>
        </div>

        {/* Success / Error Notification */}
        {saveSuccess && (
          <div className="p-3 bg-[#E8F0E8] border border-[#285943]/30 rounded-lg text-xs text-[#285943] flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#285943]" />
            <span>Guidelines updated successfully. Active in the next conversation turn.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-[#FFF5F5] border border-[#B54747]/30 rounded-lg text-xs text-[#B54747]">
            {errorMessage}
          </div>
        )}

        {/* Search & Filter Bar (Cards Mode) */}
        {viewMode === 'cards' && (
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737B74]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter guidelines by keywords..."
                className="w-full bg-[#FFFFFF] border border-[#DFE5DD] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#242A25] placeholder-[#737B74] focus:outline-none focus:border-[#285943] focus:ring-1 focus:ring-[#285943] transition-all"
              />
            </div>
            <span className="text-xs text-[#737B74]">
              Showing {filteredRules.length} of {rules.length} guidelines
            </span>
          </div>
        )}

        {/* Content View */}
        {loading ? (
          <div className="bg-[#FFFFFF] p-12 rounded-xl border border-[#DFE5DD] text-center text-xs text-[#737B74]">
            <RefreshCw className="w-6 h-6 text-[#285943] animate-spin mx-auto mb-2" />
            <span>Loading active procedural guidelines...</span>
          </div>
        ) : viewMode === 'raw' ? (
          /* Raw Text Editor */
          <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#DFE5DD] shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-[#737B74]">
              <span className="font-semibold text-[#242A25]">Raw Procedural Directives:</span>
              <span>10 Golden Instructions</span>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={14}
              className="w-full bg-[#F6F6F0] p-4 rounded-lg border border-[#DFE5DD] font-mono text-xs text-[#242A25] leading-relaxed focus:outline-none focus:border-[#285943] focus:ring-1 focus:ring-[#285943] resize-none transition-all"
            />
          </div>
        ) : (
          /* Structured Cards List */
          <div className="space-y-3">
            {filteredRules.length === 0 ? (
              <div className="bg-[#FFFFFF] p-8 rounded-xl border border-[#DFE5DD] text-center text-xs text-[#737B74]">
                No guidelines match "{searchTerm}".
              </div>
            ) : (
              filteredRules.map((rule) => (
                <div
                  key={rule.index}
                  className="bg-[#FFFFFF] p-4 rounded-xl border border-[#DFE5DD] shadow-xs hover:border-[#8DAA91] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <span className="px-2 py-0.5 rounded bg-[#E8F0E8] text-[#285943] font-mono text-xs font-semibold shrink-0">
                        #{rule.index}
                      </span>
                      <div className="space-y-1">
                        <textarea
                          value={rule.instruction}
                          onChange={(e) => handleRuleChange(rule.index, e.target.value)}
                          rows={2}
                          className="w-full bg-transparent text-xs font-medium text-[#242A25] leading-relaxed border-b border-transparent hover:border-[#DFE5DD] focus:border-[#285943] focus:outline-none resize-none"
                        />
                        {rule.rationale && (
                          <div className="text-[11px] text-[#737B74] italic">
                            Rationale: {rule.rationale}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-[#E8F0E8] text-[#285943] text-[10px] font-medium shrink-0">
                      Active
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
