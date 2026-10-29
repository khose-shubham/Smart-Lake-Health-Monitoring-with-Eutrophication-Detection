import React, { useState } from 'react';
import { exportAPI } from '../utils/api';
import {
  FileText,
  Download,
  Calendar,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Award,
  Sparkles
} from 'lucide-react';

export default function Reports() {
  const [formatType, setFormatType] = useState('csv');
  const [rangePreset, setRangePreset] = useState('7d');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      let res;
      const params = { range: rangePreset };

      if (formatType === 'csv') {
        res = await exportAPI.csv(params);
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `AquaSense_Telemetry_${rangePreset}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        res = await exportAPI.pdf(params);
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `AquaSense_Environmental_Audit_${rangePreset}_${Date.now()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error('Export error', err);
      setError('Failed to generate export file. Verify backend export service.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-lake-500/10 text-lake-500">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Telemetry Data Export & Ecological Audit
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Export raw time-series telemetry data or generate structured PDF compliance dossiers for college evaluations and municipal audits.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Export Configuration Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Parameters */}
        <div className="glass-card p-6 space-y-6">
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-lake-500" />
            Export Parameters
          </h4>

          {/* Time Range Preset */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Time Horizon
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '24h', label: 'Last 24h' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'all', label: 'All History' }
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setRangePreset(preset.id)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    rangePreset === preset.id
                      ? 'bg-lake-500/10 dark:bg-lake-400/20 text-lake-600 dark:text-aqua-400 border-lake-500/40'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Output Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setFormatType('csv')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  formatType === 'csv'
                    ? 'border-lake-500 bg-lake-50/50 dark:bg-lake-950/30 ring-2 ring-lake-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <FileSpreadsheet className="w-6 h-6 text-lake-500 mb-2" />
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  CSV Spreadsheet
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Raw telemetry rows, timestamps, NTU, temp, soil, risk index
                </div>
              </div>

              <div
                onClick={() => setFormatType('pdf')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  formatType === 'pdf'
                    ? 'border-aqua-500 bg-aqua-50/50 dark:bg-aqua-950/30 ring-2 ring-aqua-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <FileText className="w-6 h-6 text-aqua-500 mb-2" />
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  PDF Executive Audit
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Styled summary dossier, incident log, and trophic stage ratings
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="btn-primary w-full py-3"
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            {downloading ? 'Compiling File...' : `Download ${formatType.toUpperCase()} Report`}
          </button>
        </div>

        {/* Environmental Quality Standards Compliance Card */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-lake-500" />
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              Limnological Compliance & Classification
            </h4>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Carlson Trophic State Index (TSI) & WHO Inland Water Body Criteria:
          </p>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Class A / Oligotrophic (TSI &lt; 40)
                </span>
                <p className="text-[11px] text-slate-400">Turbidity &lt; 5 NTU, High dissolved oxygen, clear water</p>
              </div>
              <span className="badge-safe">Pristine</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Class B / Mesotrophic (TSI 40–50)
                </span>
                <p className="text-[11px] text-slate-400">Turbidity 5–15 NTU, Moderate biological productivity</p>
              </div>
              <span className="badge-safe">Normal</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Class C / Eutrophic (TSI 50–70)
                </span>
                <p className="text-[11px] text-slate-400">Turbidity 15–30 NTU, Algal blooms, organic nutrient surge</p>
              </div>
              <span className="badge-warning">Attention</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Class D / Hyper-Eutrophic (TSI &gt; 70)
                </span>
                <p className="text-[11px] text-slate-400">Turbidity &gt; 30 NTU, Severe anoxia, aquatic death risks</p>
              </div>
              <span className="badge-critical">Hazard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
