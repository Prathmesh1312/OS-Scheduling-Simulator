import React, { useState } from 'react';
import './SimulatorPage.css';
import { ALGORITHMS } from '../algorithms/schedulingAlgorithms';
import TaskTable from './TaskTable';
import GanttChart from './GanttChart';
import StatsPanel from './StatsPanel';
import CompareView from './CompareView';
import AnimatedView from './AnimatedView';
import InsightsPanel from './InsightsPanel';
import { DEFAULT_TASKES } from '../utils/taskUtils';
import {
    Play, RotateCcw, ChevronDown, Info, SlidersHorizontal, GitCompare,
    Activity, BarChart3, Clock, Tv2, Lightbulb
} from 'lucide-react';

const TABS = [
    { id: 'simulate', label: 'Simulator', icon: Play },
    { id: 'animate', label: 'Live Animate', icon: Tv2 },
    { id: 'compare', label: 'Compare All', icon: GitCompare },
];

const ALG_OPTIONS = [
    { key: 'FCFS', label: 'FCFS', desc: 'First Come First Served - Simple non-preemptive algorithm' },
    { key: 'SJF', label: 'SJF (Non-Preemptive)', desc: 'Shortest Job First - Minimizes average waiting time' },
    { key: 'SRTF', label: 'SRTF (Preemptive SJF)', desc: 'Shortest Remaining Time - Preemptive version of SJF' },
    { key: 'RR', label: 'Round Robin', desc: 'Time-sliced scheduling with configurable quantum' },
    { key: 'PRIORITY', label: 'Priority (Non-Preemptive)', desc: 'Executes highest priority task first' },
    { key: 'PREEMPTIVE_PRIORITY', label: 'Priority (Preemptive)', desc: 'Preempts current task if higher priority arrives' },
    { key: 'MLQ', label: 'Multilevel Queue (MLQ)', desc: 'Multiple priority queues with fixed scheduling per queue' },
    { key: 'MLFQ', label: 'Multilevel Feedback Queue (MLFQ)', desc: 'Tasks move between queues based on CPU burst behavior' },
];

const SimulatorPage = () => {
    const [taskes, setTaskes] = useState(DEFAULT_TASKES);
    const [selectedAlg, setSelectedAlg] = useState('FCFS');
    const [quantum, setQuantum] = useState(2);
    // New System Parameters
    const [cores, setCores] = useState(1);
    const [contextSwitch, setContextSwitch] = useState(0);
    const [agingRate, setAgingRate] = useState(0);
    
    const [activeTab, setActiveTab] = useState('simulate');
    const [simResult, setSimResult] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [algOpen, setAlgOpen] = useState(false);

    const currentAlg = ALGORITHMS[selectedAlg];
    const hasPriority = selectedAlg.includes('PRIORITY');
    const selectedAlgInfo = ALG_OPTIONS.find(a => a.key === selectedAlg);

    const runSimulation = () => {
        setIsRunning(true);
        setTimeout(() => {
            try {
                // Pass new system parameters to the simulations
                const sysParams = { cores, contextSwitchTime: contextSwitch, agingRate };
                const result = selectedAlg === 'RR'
                    ? currentAlg.simulate(taskes, quantum, sysParams)
                    : currentAlg.simulate(taskes, sysParams);
                setSimResult(result);
            } catch (err) {
                console.error(err);
            }
            setIsRunning(false);
        }, 300);
    };

    const resetSimulation = () => setSimResult(null);

    // The configuration + task-input sidebar (shared across all tabs that need it)
    const leftPanel = (
        <div className="sim-left">
            {/* Algorithm selector */}
            <div className="panel">
                <div className="panel-title">
                    <SlidersHorizontal size={15} />
                    Algorithm Settings
                </div>

                <div className="alg-selector" onClick={() => setAlgOpen(!algOpen)}>
                    <span className="alg-current">{selectedAlgInfo?.label}</span>
                    <ChevronDown size={14} className={`chevron ${algOpen ? 'open' : ''}`} />
                </div>

                {algOpen && (
                    <div className="alg-dropdown">
                        {ALG_OPTIONS.map(a => (
                            <div
                                key={a.key}
                                className={`alg-option ${selectedAlg === a.key ? 'active' : ''}`}
                                onClick={() => { setSelectedAlg(a.key); setAlgOpen(false); resetSimulation(); }}
                            >
                                <span className="alg-name">{a.label}</span>
                                <span className="alg-desc">{a.desc}</span>
                            </div>
                        ))}
                    </div>
                )}

                {selectedAlg === 'RR' && (
                    <div className="system-param-row">
                        <label>
                            <Clock size={13} />
                            Time Quantum
                        </label>
                        <div className="param-input-wrap">
                            <input
                                type="range" min="1" max="10" value={quantum}
                                onChange={e => { setQuantum(Number(e.target.value)); resetSimulation(); }}
                                className="param-slider"
                            />
                            <span className="param-val">{quantum}ms</span>
                        </div>
                    </div>
                )}

                {/* System Parameters */}
                <div className="system-param-row">
                    <label>CPU Cores</label>
                    <div className="param-input-wrap">
                         <input
                                type="range" min="1" max="4" value={cores}
                                onChange={e => { setCores(Number(e.target.value)); resetSimulation(); }}
                                className="param-slider"
                            />
                            <span className="param-val">{cores}</span>
                    </div>
                </div>

                <div className="system-param-row">
                    <label>Context Switch Time</label>
                    <div className="param-input-wrap">
                         <input
                                type="range" min="0" max="5" value={contextSwitch}
                                onChange={e => { setContextSwitch(Number(e.target.value)); resetSimulation(); }}
                                className="param-slider"
                            />
                            <span className="param-val">{contextSwitch}ms</span>
                    </div>
                </div>

                 {hasPriority && (
                     <div className="system-param-row">
                        <label>Priority Aging Rate</label>
                        <div className="param-input-wrap">
                            <input
                                    type="range" min="0" max="5" value={agingRate}
                                    onChange={e => { setAgingRate(Number(e.target.value)); resetSimulation(); }}
                                    className="param-slider"
                                />
                                <span className="param-val">{agingRate}</span>
                        </div>
                    </div>
                 )}

                <div className="alg-info">
                    <Info size={12} />
                    {selectedAlgInfo?.desc}
                </div>
            </div>

            {/* Task input */}
            <div className="panel">
                <div className="panel-title">
                    <Activity size={15} />
                    Tasks
                </div>
                <TaskTable
                    taskes={taskes}
                    setTaskes={p => { setTaskes(p); resetSimulation(); }}
                    showPriority={hasPriority}
                />
            </div>

            {/* Run button */}
            <div className="run-controls">
                <button
                    className={`run-btn ${isRunning ? 'running' : ''}`}
                    onClick={runSimulation}
                    disabled={isRunning || taskes.length === 0}
                >
                    {isRunning ? (
                        <><div className="spinner" />Simulating...</>
                    ) : (
                        <><Play size={15} />Run Simulation</>
                    )}
                </button>
                <button className="reset-btn" onClick={resetSimulation} title="Reset">
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="sim-page">
            {/* Tab bar */}
            <div className="tab-bar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                        {tab.id === 'animate' && <span className="tab-new-badge">NEW</span>}
                    </button>
                ))}
            </div>

            {/* ── Simulator tab ── */}
            {activeTab === 'simulate' && (
                <div className="sim-layout">
                    {leftPanel}
                    <div className="sim-right">
                        <div className="panel">
                            <div className="panel-title">
                                <BarChart3 size={15} />
                                Gantt Chart
                                {simResult && (
                                    <span className="panel-badge">
                                        {selectedAlgInfo?.label}{selectedAlg === 'RR' ? ` (q=${quantum})` : ''}
                                    </span>
                                )}
                            </div>
                            <GanttChart gantt={simResult?.gantt} taskes={taskes} />
                        </div>
                        <div className="panel">
                            <div className="panel-title"><Activity size={15} />Statistics</div>
                            <StatsPanel result={simResult?.result} stats={simResult?.stats} />
                        </div>
                        <div className="panel">
                            <div className="panel-title"><Lightbulb size={15} />Insights & Logs</div>
                            <InsightsPanel
                                simResult={simResult}
                                selectedAlg={selectedAlg}
                                taskes={taskes}
                                sysParams={{ cores, contextSwitchTime: contextSwitch, agingRate }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Live Animate tab ── */}
            {activeTab === 'animate' && (
                <div className="sim-layout">
                    {leftPanel}
                    <div className="sim-right">
                        {!simResult ? (
                            <div className="panel animate-empty">
                                <div className="animate-empty-inner">
                                    <div className="ae-icon">
                                        <Tv2 size={32} />
                                    </div>
                                    <h3>Ready to Animate</h3>
                                    <p>Configure your taskes and algorithm on the left, then click <strong>Run Simulation</strong> to start the live animation.</p>
                                    <button className="run-btn" onClick={runSimulation} disabled={isRunning}>
                                        {isRunning ? <><div className="spinner" />Simulating...</> : <><Play size={15} />Run Simulation</>}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="panel">
                                <div className="panel-title">
                                    <Tv2 size={15} />
                                    Live CPU Animation
                                    <span className="panel-badge">
                                        {selectedAlgInfo?.label}{selectedAlg === 'RR' ? ` (q=${quantum})` : ''}
                                    </span>
                                </div>
                                <AnimatedView
                                    gantt={simResult.gantt}
                                    taskes={taskes}
                                    result={simResult.result}
                                    stats={simResult.stats}
                                    algorithm={selectedAlg}
                                    quantum={quantum}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Compare tab ── */}
            {activeTab === 'compare' && (
                <div className="compare-outer panel">
                    <div className="panel-title">
                        <GitCompare size={15} />
                        Compare All Algorithms
                        <span className="panel-badge">Live Comparison</span>
                    </div>
                    <CompareView taskes={taskes} quantum={quantum} />
                </div>
            )}
        </div>
    );
};

export default SimulatorPage;
