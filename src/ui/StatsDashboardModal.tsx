import React, { useState, useEffect, useMemo } from 'react';
import { MatchAnalysisReport } from '../stats/matchStatsCalculator';
import { exportMatchCSV, exportMatchSummaryCard, printOrExportPDF } from '../stats/exportService';
import { generateRuleBasedInsights, generateLLMCoachingSummary, CoachingInsight } from '../stats/coachingEngine';
import { HeatmapCanvas } from './HeatmapCanvas';
import { CompletedRally } from '../game/rallyStateMachine';
import { BrandLogo } from './BrandLogo';
import {
  X,
  Trophy,
  Activity,
  Flame,
  Award,
  Download,
  Share2,
  Printer,
  TrendingUp,
  MapPin,
  Zap,
  Footprints,
  Users,
  Compass,
  Sparkles,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

interface StatsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MatchAnalysisReport;
  rallies: CompletedRally[];
  teamAName: string;
  teamBName: string;
  finalScoreText: string;
  isDoubles?: boolean;
}

export const StatsDashboardModal: React.FC<StatsDashboardModalProps> = ({
  isOpen,
  onClose,
  report,
  rallies,
  teamAName,
  teamBName,
  finalScoreText,
  isDoubles = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'shots' | 'heatmaps' | 'movement' | 'momentum' | 'coaching' | 'doubles'>('overview');
  const [heatmapType, setHeatmapType] = useState<'players' | 'landings' | 'smashes' | 'errors'>('players');
  const [apiKey, setApiKey] = useState<string>('');
  const [llmSummary, setLlmSummary] = useState<string | null>(null);
  const [isGeneratingLLM, setIsGeneratingLLM] = useState<boolean>(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const savedKey = localStorage.getItem('smashsense_gemini_key') || '';
      setApiKey(savedKey);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smashsense_gemini_key', key.trim());
    }
  };

  const handleGenerateLLM = async () => {
    if (!apiKey.trim()) {
      setLlmError('Please enter a valid Gemini API key.');
      return;
    }
    setIsGeneratingLLM(true);
    setLlmError(null);
    try {
      const summary = await generateLLMCoachingSummary(report, apiKey.trim());
      setLlmSummary(summary);
    } catch (err: any) {
      setLlmError(err.message || 'Failed to generate AI coaching advice.');
    } finally {
      setIsGeneratingLLM(false);
    }
  };

  const ruleInsights: CoachingInsight[] = useMemo(() => {
    return generateRuleBasedInsights(report);
  }, [report]);

  if (!isOpen) return null;

  const playerList = Object.values(report.players);
  const playerA = playerList.find((p) => p.team === 'A') || playerList[0];
  const playerB = playerList.find((p) => p.team === 'B') || playerList[1] || playerList[0];

  // Radar chart data comparing Team A vs Team B / Player A vs Player B
  const radarData = [
    { subject: 'Winners', A: playerA?.winners || 0, B: playerB?.winners || 0, fullMark: 30 },
    { subject: 'Smash Acc %', A: playerA?.smashSuccessRate || 0, B: playerB?.smashSuccessRate || 0, fullMark: 100 },
    { subject: 'Court Cov %', A: playerA?.courtCoveragePercent || 0, B: playerB?.courtCoveragePercent || 0, fullMark: 100 },
    { subject: 'Clutch Win %', A: report.pressureStats.pressureWinRateA, B: report.pressureStats.pressureWinRateB, fullMark: 100 },
    { subject: 'Serve Win %', A: playerA?.serveWinRate || 50, B: playerB?.serveWinRate || 50, fullMark: 100 },
    { subject: 'Defense', A: Math.max(10, 100 - (playerA?.unforcedErrors || 0) * 8), B: Math.max(10, 100 - (playerB?.unforcedErrors || 0) * 8), fullMark: 100 },
  ];

  // Bar chart comparison
  const barData = [
    { name: 'Points Won', [teamAName]: playerA?.pointsWon || 0, [teamBName]: playerB?.pointsWon || 0 },
    { name: 'Winners', [teamAName]: playerA?.winners || 0, [teamBName]: playerB?.winners || 0 },
    { name: 'Unforced Err', [teamAName]: playerA?.unforcedErrors || 0, [teamBName]: playerB?.unforcedErrors || 0 },
    { name: 'Smashes Won', [teamAName]: playerA?.smashesWon || 0, [teamBName]: playerB?.smashesWon || 0 },
    { name: 'Drops Made', [teamAName]: playerA?.dropsAttempted - playerA?.dropErrors || 0, [teamBName]: playerB?.dropsAttempted - playerB?.dropErrors || 0 },
  ];

  // Momentum timeline data
  const momentumChartData = report.momentumTimeline.map((m) => ({
    rally: `R${m.rallyIndex}`,
    scoreDiff: m.diff,
    score: `${m.scoreA}-${m.scoreB}`,
    reason: m.reason,
  }));

  const handleDownloadCSV = () => {
    exportMatchCSV(rallies);
  };

  const handleShareCard = () => {
    exportMatchSummaryCard(report, teamAName, teamBName, finalScoreText);
  };

  const handlePrintPDF = () => {
    printOrExportPDF();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} showText={false} />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                SmashSense Match Analytics & Report
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {finalScoreText || 'Live Match'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {teamAName} vs {teamBName} • {report.totalRallies} Rallies Analyzed
              </p>
            </div>
          </div>

          {/* Action buttons (CSV, Share, PDF) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
              title="Download CSV of all match rallies"
            >
              <Download size={13} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={handleShareCard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-900/30"
              title="Generate and download shareable image card"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">Share Card</span>
            </button>
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
              title="Print executive PDF report"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-950/40 text-xs overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Awards', icon: <Trophy size={13} /> },
            { id: 'shots', label: 'Shots & Strokes', icon: <Zap size={13} /> },
            { id: 'heatmaps', label: 'Court Heatmaps', icon: <MapPin size={13} /> },
            { id: 'movement', label: 'Movement & Fatigue', icon: <Footprints size={13} /> },
            { id: 'momentum', label: 'Momentum & Clutch', icon: <TrendingUp size={13} /> },
            { id: 'coaching', label: 'Smart Coaching', icon: <Sparkles size={13} /> },
            ...(isDoubles ? [{ id: 'doubles', label: 'Doubles Pair Synergy', icon: <Users size={13} /> }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* TAB 1: OVERVIEW & AWARDS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Award Badges: MVP, Most Improved, Needs Work */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {report.awards.map((award, i) => {
                  const isMvp = award.type === 'MVP';
                  const isNeedsWork = award.type === 'NEEDS_WORK';

                  return (
                    <div
                      key={i}
                      className={`rounded-2xl p-4 border relative overflow-hidden flex flex-col justify-between ${
                        isMvp
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                          : isNeedsWork
                          ? 'bg-rose-950/30 border-rose-500/40'
                          : 'bg-sky-950/30 border-sky-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isMvp
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isNeedsWork
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                            }`}
                          >
                            {award.badgeLabel}
                          </span>
                          {isMvp && <Award className="text-yellow-400 w-5 h-5" />}
                        </div>
                        <h4 className="text-base font-bold text-white">{award.playerName}</h4>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{award.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Side-by-Side Player Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerList.map((p) => {
                  const isTeamA = p.team === 'A';
                  const color = isTeamA ? 'text-sky-400' : 'text-orange-400';
                  const borderColor = isTeamA ? 'border-sky-500/30' : 'border-orange-500/30';

                  return (
                    <div
                      key={p.role}
                      className={`bg-slate-950/60 border ${borderColor} rounded-2xl p-5 space-y-4`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <span className={`text-xs font-mono font-bold block ${color}`}>
                            {p.team === 'A' ? 'TEAM A' : 'TEAM B'} • {p.role}
                          </span>
                          <h3 className="text-lg font-bold text-white">{p.name}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black font-mono text-white">
                            {p.pointsWon}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Points ({p.winPercentage}%)
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Winners</span>
                          <span className="text-base font-bold text-emerald-400 font-mono">
                            {p.winners}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Unforced Err</span>
                          <span className="text-base font-bold text-rose-400 font-mono">
                            {p.unforcedErrors}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Top Smash</span>
                          <span className="text-base font-bold text-yellow-400 font-mono">
                            {p.topSmashSpeedKmh} km/h
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Smash Acc</span>
                          <span className="text-sm font-bold text-slate-100 font-mono">
                            {p.smashSuccessRate}%
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Distance</span>
                          <span className="text-sm font-bold text-slate-100 font-mono">
                            {p.distanceCoveredMeters}m
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-[10px] block">Max Run</span>
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            {p.maxScoringStreak} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recharts Comparison Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Radar Skill Profile */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Compass size={14} className="text-emerald-400" />
                    Skill & Performance Radar
                  </h4>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis stroke="#475569" angle={30} domain={[0, 100]} />
                        <Radar name={teamAName} dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} />
                        <Radar name={teamBName} dataKey="B" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar Chart Breakdown */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity size={14} className="text-sky-400" />
                    Points, Winners & Errors Comparison
                  </h4>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                        <Bar dataKey={teamAName} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={teamBName} fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHOTS & STROKES */}
          {activeTab === 'shots' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerList.map((p) => (
                  <div key={p.role} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
                      <span>{p.name} Shot Performance</span>
                      <span className="text-xs font-mono text-slate-400">{p.role}</span>
                    </h4>

                    {/* Smashes */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Smash Conversion</span>
                        <span className="font-mono font-bold text-yellow-300">
                          {p.smashesWon} / {p.smashesAttempted} ({p.smashSuccessRate}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${p.smashSuccessRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Drops */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Drop Shot Success</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {p.dropsAttempted - p.dropErrors} / {p.dropsAttempted} ({p.dropSuccessRate}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-2 rounded-full"
                          style={{ width: `${p.dropSuccessRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Rally length splits */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 block mb-2">
                        Rally Length Win Splits:
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block">Short (&lt;4)</span>
                          <span className="font-mono font-bold text-white">{p.pointsWonShortRally} pts</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block">Medium (4-7)</span>
                          <span className="font-mono font-bold text-white">{p.pointsWonMediumRally} pts</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block">Long (&ge;8)</span>
                          <span className="font-mono font-bold text-white">{p.pointsWonLongRally} pts</span>
                        </div>
                      </div>
                    </div>

                    {/* Miss & Error breakdown */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 block mb-2">
                        Error & Miss Breakdown:
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between bg-slate-900/60 p-2 rounded-lg">
                          <span className="text-slate-400">Missed Returns:</span>
                          <span className="font-mono font-bold text-rose-400">{p.missedReturns}</span>
                        </div>
                        <div className="flex justify-between bg-slate-900/60 p-2 rounded-lg">
                          <span className="text-slate-400">Unreached Shuttles:</span>
                          <span className="font-mono font-bold text-rose-400">{p.shuttlesLeftUnreached}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: HEATMAPS */}
          {activeTab === 'heatmaps' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Select Heatmap Visualization:</span>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'players', label: 'Player Positions' },
                    { id: 'landings', label: 'Shuttle Landings' },
                    { id: 'smashes', label: 'Smash Vectors' },
                    { id: 'errors', label: 'Error Clusters' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setHeatmapType(btn.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        heatmapType === btn.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <HeatmapCanvas
                  type={heatmapType}
                  playerPositions={report.heatmaps.playerPositions}
                  shuttleLandings={report.heatmaps.shuttleLandings}
                  smashVectors={report.heatmaps.smashVectors}
                  errorLocations={report.heatmaps.errorLocations}
                  width={340}
                  height={580}
                />
              </div>
            </div>
          )}

          {/* TAB 4: MOVEMENT & FATIGUE */}
          {activeTab === 'movement' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerList.map((p) => (
                  <div key={p.role} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
                      <span>{p.name} Physical Tracking</span>
                      <span className="text-xs font-mono text-emerald-400">{p.courtCoveragePercent}% Court Covered</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">Distance Run</span>
                        <span className="text-lg font-mono font-bold text-sky-300">{p.distanceCoveredMeters} m</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">Avg Speed</span>
                        <span className="text-lg font-mono font-bold text-white">{p.avgSpeedKmh} km/h</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">Max Sprint</span>
                        <span className="text-lg font-mono font-bold text-yellow-300">{p.maxSpeedKmh} km/h</span>
                      </div>
                    </div>

                    {/* Fatigue Indicator */}
                    <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Activity size={13} className="text-rose-400" />
                          Fatigue Indicator (Speed Drop)
                        </span>
                        <span className="font-mono font-bold text-rose-300">
                          {p.fatigueIndexPercent}% Drop in 2nd Half
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full ${
                            p.fatigueIndexPercent > 25 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, p.fatigueIndexPercent * 2.5)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {p.fatigueIndexPercent > 20
                          ? 'Noticeable stamina decay detected in later rallies. Recovery time increasing.'
                          : 'Exceptional cardiovascular stamina maintained consistently across all games.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: MOMENTUM & PRESSURE */}
          {activeTab === 'momentum' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={15} className="text-emerald-400" />
                    Match Momentum & Lead Trajectory
                  </h4>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-sky-400">
                      <span className="w-2.5 h-2.5 bg-sky-400 rounded-sm" />
                      <span>{teamAName} (+Lead)</span>
                    </div>
                    <div className="flex items-center gap-1 text-orange-400">
                      <span className="w-2.5 h-2.5 bg-orange-400 rounded-sm" />
                      <span>{teamBName} (-Lead)</span>
                    </div>
                  </div>
                </div>

                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={momentumChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="rally" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Area
                        type="monotone"
                        dataKey="scoreDiff"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pressure Points (18-18 and deuce) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h5 className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame size={14} className="text-amber-400" />
                    Pressure Point Performance (&ge;18-18 & Deuce)
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-center pt-1">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{teamAName}</span>
                      <span className="text-lg font-mono font-bold text-sky-400">
                        {report.pressureStats.pressureWinRateA}% ({report.pressureStats.pointsWonTeamA} pts)
                      </span>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{teamBName}</span>
                      <span className="text-lg font-mono font-bold text-orange-400">
                        {report.pressureStats.pressureWinRateB}% ({report.pressureStats.pointsWonTeamB} pts)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comebacks */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <h5 className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={14} className="text-yellow-400" />
                    Comeback Surges (Overcoming &ge;3 pt Deficit)
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-center pt-1">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{teamAName}</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {report.pressureStats.comebacksTeamA} Surges
                      </span>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{teamBName}</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {report.pressureStats.comebacksTeamB} Surges
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOUBLES SYNERGY */}
          {activeTab === 'doubles' && report.doublesAnalysis && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['teamA', 'teamB'].map((tKey) => {
                  const pair = (report.doublesAnalysis as any)[tKey];
                  if (!pair) return null;
                  const isA = tKey === 'teamA';

                  return (
                    <div key={tKey} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="text-sm font-bold text-white">{pair.partnerNames}</h4>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {pair.synergyScore}% Synergy
                        </span>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs text-slate-400 block">Rotation Efficiency</span>
                        <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full ${isA ? 'bg-sky-400' : 'bg-orange-500'}`}
                            style={{ width: `${pair.rotationEfficiencyPercent}%` }}
                          />
                        </div>
                        <span className="text-right text-[11px] font-mono text-slate-300 block">
                          {pair.rotationEfficiencyPercent}% front-back / side-by-side transition speed
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <span className="text-xs font-bold text-slate-300 block">Zone Coverage Split:</span>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-900 p-2 rounded-xl">
                            <span className="text-slate-400 text-[10px] block">Forecourt</span>
                            <span className="font-bold text-white font-mono">
                              {pair.forecourtCoveragePercent.player1}% / {pair.forecourtCoveragePercent.player2}%
                            </span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-xl">
                            <span className="text-slate-400 text-[10px] block">Midcourt</span>
                            <span className="font-bold text-white font-mono">
                              {pair.midcourtCoveragePercent.player1}% / {pair.midcourtCoveragePercent.player2}%
                            </span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-xl">
                            <span className="text-slate-400 text-[10px] block">Rearcourt</span>
                            <span className="font-bold text-white font-mono">
                              {pair.rearcourtCoveragePercent.player1}% / {pair.rearcourtCoveragePercent.player2}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 7: Smart Coaching & Insights */}
          {activeTab === 'coaching' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-slate-900 to-transparent border border-purple-500/30 flex items-start gap-3">
                <Lightbulb className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-extrabold text-white mb-1">
                    Smart Coaching Insights &amp; Tactical Diagnostics
                  </h3>
                  <p className="text-xs text-slate-300">
                    Deterministic plain-language advice derived from stroke accuracy, drop error rates, fatigue drops, and rally lengths.
                  </p>
                </div>
              </div>

              {/* Rule-Based Insights Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Algorithmic Match Findings ({ruleInsights.length})
                </h4>

                {ruleInsights.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                    No statistical anomalies detected. Play additional rallies to generate deeper tactical findings!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ruleInsights.map((insight) => {
                      const isWarning = insight.severity === 'warning';
                      const isPositive = insight.severity === 'positive';
                      return (
                        <div
                          key={insight.id}
                          className={`p-4 rounded-2xl border flex flex-col justify-between ${
                            isWarning
                              ? 'bg-rose-950/20 border-rose-500/30'
                              : isPositive
                              ? 'bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-slate-950/60 border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                                  isWarning
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : isPositive
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-yellow-500/20 text-yellow-300'
                                }`}
                              >
                                {insight.category}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                {insight.metricEvidence}
                              </span>
                            </div>

                            <h5 className="text-sm font-bold text-white mb-1">{insight.title}</h5>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional LLM Gemini Coaching Integration */}
              <div className="bg-slate-950/60 p-5 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      AI Coach Summary (Gemini 1.5 Flash)
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Zero Video Sent • Stats Only
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    placeholder="Enter Gemini API Key (stored locally)..."
                    value={apiKey}
                    onChange={(e) => handleSaveApiKey(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <button
                    onClick={handleGenerateLLM}
                    disabled={isGeneratingLLM || !apiKey.trim()}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isGeneratingLLM || !apiKey.trim()
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40'
                    }`}
                  >
                    <Sparkles size={13} className={isGeneratingLLM ? 'animate-spin' : ''} />
                    <span>{isGeneratingLLM ? 'Generating Advice...' : 'Generate AI Report'}</span>
                  </button>
                </div>

                {llmError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{llmError}</span>
                  </div>
                )}

                {llmSummary && (
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans shadow-inner">
                    {llmSummary}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>SmashSense AI Match Intelligence • Powered by Client-Side Computer Vision</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
