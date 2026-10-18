'use client';

import React, { useState, useEffect } from 'react';
import { ScrollText, Save, Check, RefreshCw } from 'lucide-react';
import { fetchProceduralRules, updateProceduralRules } from '../lib/api';

export const ProceduralEditor: React.FC = () => {
  const [rulesText, setRulesText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await fetchProceduralRules();
      setRulesText(data.raw_text);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProceduralRules(rulesText);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert('Failed to save procedural rules.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ScrollText className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Procedural Memory Guidelines Editor
          </h3>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-3.5 h-3.5 text-white" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{saveSuccess ? 'Saved!' : 'Save Guidelines'}</span>
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <p className="text-xs text-slate-400 mb-2">
          These guidelines are injected into the system prompt for every interaction and automatically adapt as reflections occur.
        </p>
        <textarea
          value={rulesText}
          onChange={(e) => setRulesText(e.target.value)}
          disabled={loading}
          rows={12}
          className="w-full flex-1 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
          placeholder="Loading active procedural rules..."
        />
      </div>
    </div>
  );
};
