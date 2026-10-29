import React from 'react';
import { Layers, Droplets, Sun, AlertTriangle, Skull, CheckCircle2 } from 'lucide-react';

const STAGES = [
  {
    stage: 0,
    name: 'Oligotrophic',
    status: 'Normal / Healthy',
    color: 'emerald',
    icon: CheckCircle2,
    desc: 'Clear water, low nutrients, balanced oxygen and healthy aquatic biodiversity.'
  },
  {
    stage: 1,
    name: 'Nutrient Influx',
    status: 'Early Loading',
    color: 'blue',
    icon: Droplets,
    desc: 'Agricultural or runoff nutrient surge detected (soil runoff + moisture elevation).'
  },
  {
    stage: 2,
    name: 'Algal Bloom',
    status: 'Proliferation',
    color: 'amber',
    icon: Sun,
    desc: 'Rapid phytoplankton growth causing elevated turbidity and light blockage.'
  },
  {
    stage: 3,
    name: 'Decomposition',
    status: 'Bacterial Decay',
    color: 'orange',
    icon: AlertTriangle,
    desc: 'Dead biomass settles; microbial decomposition drastically depletes dissolved O2.'
  },
  {
    stage: 4,
    name: 'Hypoxia / Anoxia',
    status: 'Critical Die-off',
    color: 'rose',
    icon: Skull,
    desc: 'Severe oxygen depletion leads to fish stress/kill; acoustic silence, ecosystem collapse.'
  }
];

export default function CascadeIndicator({ currentStage = 0 }) {
  const stageNum = Math.min(Math.max(Number(currentStage) || 0, 0), 4);
  const activeStage = STAGES[stageNum];

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-lake-500/10 text-lake-500 dark:bg-lake-400/10 dark:text-lake-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-base">
              Eutrophication Cascade Stage
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              5-Phase Ecological Progression Model
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          stageNum === 0
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/30'
            : stageNum <= 2
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-500/30'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/30 animate-pulse'
        }`}>
          Stage {stageNum}: {activeStage.name}
        </div>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-5 gap-2 my-4">
        {STAGES.map((s, idx) => {
          const isPassed = idx < stageNum;
          const isCurrent = idx === stageNum;
          const Icon = s.icon;

          return (
            <div key={s.stage} className="flex flex-col gap-1.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-lake-500 to-aqua-400 shadow-md ring-2 ring-lake-400/40 ring-offset-1 dark:ring-offset-surface-900'
                    : isPassed
                    ? 'bg-lake-400/70 dark:bg-lake-600/70'
                    : 'bg-slate-200 dark:bg-slate-700/60'
                }`}
              />
              <div className="flex items-center gap-1">
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isCurrent
                      ? 'text-lake-500 dark:text-aqua-400 font-bold'
                      : isPassed
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium truncate ${
                    isCurrent
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {s.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Description of current stage */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
        <activeStage.icon className="w-5 h-5 flex-shrink-0 text-lake-500 dark:text-aqua-400 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {activeStage.status}:
          </span>{' '}
          {activeStage.desc}
        </div>
      </div>
    </div>
  );
}
