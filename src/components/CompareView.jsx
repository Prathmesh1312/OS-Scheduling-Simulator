import React, { useMemo } from 'react';
import './CompareView.css';
import { ALGORITHMS } from '../algorithms/schedulingAlgorithms';
import GanttChart from './GanttChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ALG_LIST = [
    { key: 'FCFS', label: 'FCFS' },
    { key: 'SJF', label: 'SJF' },
    { key: 'SRTF', label: 'SRTF' },
    { key: 'RR', label: 'Round Robin' },
    { key: 'PRIORITY', label: 'Priority' },
    { key: 'PREEMPTIVE_PRIORITY', label: 'Preemptive Priority' },
];

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

const CompareView = ({ taskes, quantum, cores, contextSwitch, agingRate }) => {
    const results = useMemo(() => {
        const sysParams = { cores, contextSwitchTime: contextSwitch, agingRate };
        
        return ALG_LIST.map(alg => {
            try {
                const algo = ALGORITHMS[alg.key];
                const simResult = alg.key === 'RR'
                    ? algo.simulate(taskes, quantum, sysParams)
                    : algo.simulate(taskes, sysParams);
                return { key: alg.key, label: alg.label, ...simResult };
            } catch (e) {
                console.error(e);
                return { key: alg.key, label: alg.label, error: true };
            }
        });
    }, [taskes, quantum, cores, contextSwitch, agingRate]);

    const barData = results.map((r, i) => ({
        name: r.label,
        'Avg Waiting': r.stats ? +r.stats.avgWaiting.toFixed(2) : 0,
        'Avg Turnaround': r.stats ? +r.stats.avgTurnaround.toFixed(2) : 0,
        fill: CHART_COLORS[i],
    }));

    const cpuData = results.map((r, i) => ({
        name: r.label,
        'CPU %': r.stats ? +r.stats.cpuUtilization.toFixed(1) : 0,
        fill: CHART_COLORS[i],
    }));

    const best = results.reduce((b, r) => r.stats && r.stats.avgWaiting < (b.stats?.avgWaiting ?? Infinity) ? r : b, results[0]);

    return (
        <div className="compare-view">
            <div className="compare-banner">
                <span className="best-label">🏆 Best Algorithm (Least Avg Waiting):</span>
                <span className="best-name">{best?.label ?? '—'}</span>
                {best?.stats && <span className="best-stat">Avg Waiting: {best.stats.avgWaiting.toFixed(2)}ms</span>}
            </div>

            {/* Summary table */}
            <div className="compare-table-scroll">
                <table className="compare-table">
                    <thead>
                        <tr>
                            <th>Algorithm</th>
                            <th>Avg Waiting</th>
                            <th>Avg Turnaround</th>
                            <th>CPU Utilization</th>
                            <th>Throughput</th>
                            <th>Total Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((r, i) => (
                            <tr key={r.key} className={r.key === best?.key ? 'best-row' : ''}>
                                <td>
                                    <span className="alg-badge" style={{ backgroundColor: CHART_COLORS[i] }}>
                                        {r.label}
                                    </span>
                                </td>
                                <td><code>{r.stats ? r.stats.avgWaiting.toFixed(2) : '—'}</code></td>
                                <td><code>{r.stats ? r.stats.avgTurnaround.toFixed(2) : '—'}</code></td>
                                <td>
                                    <div className="cpu-bar-wrap">
                                        <div
                                            className="cpu-bar"
                                            style={{
                                                width: `${r.stats?.cpuUtilization ?? 0}%`,
                                                backgroundColor: CHART_COLORS[i]
                                            }}
                                        />
                                        <span>{r.stats ? r.stats.cpuUtilization.toFixed(1) + '%' : '—'}</span>
                                    </div>
                                </td>
                                <td><code>{r.stats ? r.stats.throughput.toFixed(3) : '—'}</code></td>
                                <td><code>{r.stats ? r.stats.totalTime : '—'}</code></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Bar charts */}
            <div className="compare-charts">
                <div className="chart-card">
                    <h4>Waiting & Turnaround Time Comparison</h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barData} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                                labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                                itemStyle={{ color: '#475569' }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="Avg Waiting" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Avg Turnaround" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <h4>CPU Utilization</h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={cpuData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
                            <Tooltip
                                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                                labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                                itemStyle={{ color: '#475569' }}
                            />
                            <Bar dataKey="CPU %" fill="#10b981" radius={[4, 4, 0, 0]}
                                label={{ fill: '#475569', fontSize: 10, position: 'top', formatter: v => v + '%' }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gantt charts for each algorithm */}
            <h4 className="gantt-compare-title">Gantt Charts Comparison</h4>
            <div className="mini-gantt-grid">
                {results.map((r, i) => (
                    <div key={r.key} className="mini-gantt-card">
                        <div className="mini-gantt-header">
                            <span className="alg-badge" style={{ backgroundColor: CHART_COLORS[i] }}>{r.label}</span>
                            {r.stats && (
                                <span className="mini-stat">WT: {r.stats.avgWaiting.toFixed(1)} | TAT: {r.stats.avgTurnaround.toFixed(1)}</span>
                            )}
                        </div>
                        <GanttChart gantt={r.gantt} taskes={taskes} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CompareView;
