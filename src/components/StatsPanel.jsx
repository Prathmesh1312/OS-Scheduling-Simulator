import React from 'react';
import './StatsPanel.css';
import { Clock, Timer, Cpu, Zap, TrendingUp } from 'lucide-react';

const StatCard = ({ icon, label, value, color, unit }) => (
    <div className="stat-card" style={{ '--card-color': color }}>
        <div className="stat-icon" style={{ color }}>
            {icon}
        </div>
        <div className="stat-content">
            <div className="stat-value">
                {value}
                {unit && <span className="stat-unit">{unit}</span>}
            </div>
            <div className="stat-label">{label}</div>
        </div>
    </div>
);

const StatsPanel = ({ result, stats }) => {
    if (!stats || !result) {
        return (
            <div className="stats-empty">
                <p>Run simulation to see statistics</p>
            </div>
        );
    }

    return (
        <div className="stats-panel">
            <div className="stats-grid">
                <StatCard
                    icon={<Clock size={18} />}
                    label="Avg Waiting Time"
                    value={stats.avgWaiting.toFixed(2)}
                    color="#f59e0b"
                    unit="ms"
                />
                <StatCard
                    icon={<Timer size={18} />}
                    label="Avg Turnaround Time"
                    value={stats.avgTurnaround.toFixed(2)}
                    color="#6366f1"
                    unit="ms"
                />
                <StatCard
                    icon={<Cpu size={18} />}
                    label="CPU Utilization"
                    value={stats.cpuUtilization.toFixed(1)}
                    color="#10b981"
                    unit="%"
                />
                <StatCard
                    icon={<TrendingUp size={18} />}
                    label="Throughput"
                    value={stats.throughput.toFixed(3)}
                    color="#3b82f6"
                    unit="/ms"
                />
                <StatCard
                    icon={<Zap size={18} />}
                    label="Total Time"
                    value={stats.totalTime}
                    color="#ec4899"
                    unit="ms"
                />
            </div>

            {result && result.length > 0 && (
                <div className="result-table-wrapper">
                    <h4>Task Statistics</h4>
                    <div className="result-table-scroll">
                        <table className="result-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Task</th>
                                    <th>Arrival</th>
                                    <th>Burst</th>
                                    <th>I/O Burst</th>
                                    <th>Start</th>
                                    <th>Finish</th>
                                    <th>Response</th>
                                    <th>Turnaround</th>
                                    <th>Waiting</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <span className="task-badge-sm" style={{ backgroundColor: p.color }}>
                                                {p.id}
                                            </span>
                                        </td>
                                        <td>{p.name}</td>
                                        <td><code>{p.arrivalTime}</code></td>
                                        <td><code>{p.burstTime}</code></td>
                                        <td><code>{p.ioBurstTime || 0}</code></td>
                                        <td><code>{p.startTime ?? '—'}</code></td>
                                        <td><code>{p.endTime ?? '—'}</code></td>
                                        <td><code>{p.responseTime ?? '—'}</code></td>
                                        <td>
                                            <span className="highlight turnaround">{p.turnaroundTime ?? '—'}</span>
                                        </td>
                                        <td>
                                            <span className="highlight waiting">{p.waitingTime ?? '—'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsPanel;
