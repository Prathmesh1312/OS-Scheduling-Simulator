import React from 'react';
import { Info, AlertTriangle, Lightbulb, BookOpen, Clock, Activity, Target } from 'lucide-react';
import './InsightsPanel.css';

const InsightsPanel = ({ simResult, selectedAlg, taskes, sysParams }) => {
    if (!simResult) {
        return (
            <div className="insights-empty">
                Run a simulation to generate educational insights and execution logs.
            </div>
        );
    }

    const { stats, result, gantt } = simResult;
    const insights = [];
    const { cores, contextSwitchTime, agingRate } = sysParams;

    // ── Generate Educational Insights ──

    // 1. Context Switch Overhead
    const totalCS = gantt.filter(b => b.state === 'context-switch').length;
    if (totalCS > 0 && contextSwitchTime > 0) {
        const csTime = totalCS * contextSwitchTime;
        const csPercentage = ((csTime / stats.totalTime) * 100).toFixed(1);
        insights.push({
            type: csPercentage > 15 ? 'warning' : 'info',
            icon: <Activity size={16} />,
            title: 'Context Switch Overhead',
            message: `The CPU spent ${csTime}ms (${csPercentage}%) of its total time just switching between tasks. High context switch times reduce real throughput.`
        });
    }

    // 2. Multiprocessing Efficiency
    if (cores > 1) {
        // Calculate core usage
        const coreActiveTimes = Array(cores).fill(0);
        gantt.forEach(b => {
            if (b.state === 'active' && b.pid !== 'idle') {
                coreActiveTimes[b.core] += (b.end - b.start);
            }
        });
        const maxActive = Math.max(...coreActiveTimes);
        const minActive = Math.min(...coreActiveTimes);
        
        if (maxActive > 0 && minActive / maxActive < 0.5) {
            insights.push({
                type: 'warning',
                icon: <Target size={16} />,
                title: 'Load Imbalance',
                message: `Core utilization is uneven. Some cores are significantly busier than others. In a real OS, load balancing mechanisms would try to migrate tasks between cores.`
            });
        } else {
            insights.push({
                type: 'success',
                icon: <Target size={16} />,
                title: 'Multiprocessing Load',
                message: `Tasks were distributed across ${cores} cores. Notice how parallel execution reduces the overall schedule length compared to a single core.`
            });
        }
    }

    // 3. I/O Bound vs CPU Bound
    const ioTasks = taskes.filter(t => t.taskType === 'IO_BOUND');
    const cpuTasks = taskes.filter(t => t.taskType === 'CPU_BOUND');
    
    if (ioTasks.length > 0 && cpuTasks.length > 0 && cores === 1) {
        insights.push({
            type: 'info',
            icon: <BookOpen size={16} />,
            title: 'I/O & CPU Mix',
            message: `You mixed I/O-bound and CPU-bound tasks. In a uniprocessor system, allowing I/O tasks to run first can keep both the CPU and I/O devices busy simultaneously, improving utilization.`
        });
    }

    // 4. Algorithm-specific insights
    if (selectedAlg === 'FCFS') {
        const firstTask = result.find(t => t.startTime === 0);
        const longFirst = firstTask && firstTask.burstTime > (stats.avgTurnaround * 0.8);
        if (longFirst) {
            insights.push({
                type: 'warning',
                icon: <AlertTriangle size={16} />,
                title: 'Convoy Effect Detected',
                message: `A CPU-heavy task (${firstTask.id}) arrived early, forcing shorter tasks to wait in a "convoy". This drastically increased average waiting time.`
            });
        }
    } else if (selectedAlg.includes('SJF') || selectedAlg.includes('SRTF')) {
        insights.push({
            type: 'info',
            icon: <Lightbulb size={16} />,
            title: 'Optimal Average Wait',
            message: `Shortest Job First algorithms theoretically provide the minimum average waiting time. Compare this result to FCFS with the same tasks!`
        });
    } else if (selectedAlg === 'RR') {
        insights.push({
            type: 'info',
            icon: <Clock size={16} />,
            title: 'Fairness vs. Overhead',
            message: `Round Robin provides excellent response time and fairness. However, if the time quantum is too small, context switch overhead will dominate.`
        });
    }

    // 5. Starvation & Aging
    if (selectedAlg === 'PRIORITY' || selectedAlg === 'PREEMPTIVE_PRIORITY') {
        const starvedTask = result.find(t => t.waitingTime > stats.totalTime * 0.5); // waited for more than half the total sim length
        if (starvedTask) {
            if (agingRate === 0) {
                insights.push({
                    type: 'warning',
                    icon: <AlertTriangle size={16} />,
                    title: 'Starvation Detected',
                    message: `Task ${starvedTask.id} experienced severe starvation, waiting ${starvedTask.waitingTime}ms due to low priority. Try increasing the Aging Rate to gradually boost its priority!`
                });
            } else {
                 insights.push({
                    type: 'success',
                    icon: <Lightbulb size={16} />,
                    title: 'Aging in Action',
                    message: `Task ${starvedTask.id} had a long wait, but priority aging ensured it eventually executed instead of starving completely.`
                });
            }
        }
    }

    // ── Generate Logs ──
    const generateLogs = () => {
        // We'll reconstruct a simple timeline of events from the Gantt array
        // Since gantt contains state 'active' and 'context-switch', we can map it.
        const logs = [];
        let time = 0;
        
        // Sort gantt by start time, then by core
        const sortedGantt = [...gantt].sort((a, b) => a.start === b.start ? a.core - b.core : a.start - b.start);
        
        sortedGantt.forEach(b => {
            if (b.state === 'context-switch') {
                logs.push({ t: b.start, core: b.core, msg: `Core ${b.core} swapping context...` });
            } else if (b.state === 'active' && b.pid !== 'idle') {
                logs.push({ t: b.start, core: b.core, msg: `Task ${b.pid} started executing on Core ${b.core}` });
                logs.push({ t: b.end, core: b.core, msg: `Task ${b.pid} stopped executing (burst/quantum/preempt)` });
            } else if (b.pid === 'idle' || b.state === 'idle') {
                logs.push({ t: b.start, core: b.core, msg: `Core ${b.core} became idle` });
            }
        });
        
        // simple dedup/sort
        return logs.sort((a, b) => a.t === b.t ? a.core - b.core : a.t - b.t);
    };

    const logs = generateLogs();

    return (
        <div className="insights-panel">
            <div className="insights-header">
                <h3>Educational Insights</h3>
                <p>Learn how the OS is handling your task workload under the hood.</p>
            </div>
            
            <div className="insights-list">
                {insights.length === 0 && (
                    <div className="insight-card info">
                        <div className="insight-icon"><Info size={16} /></div>
                        <div className="insight-content">
                            <h4>Standard Execution</h4>
                            <p>Simulation completed without any notable scheduling anomalies or bottlenecks.</p>
                        </div>
                    </div>
                )}
                {insights.map((insight, i) => (
                    <div key={i} className={`insight-card ${insight.type}`}>
                        <div className="insight-icon">{insight.icon}</div>
                        <div className="insight-content">
                            <h4>{insight.title}</h4>
                            <p>{insight.message}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="execution-logs-wrapper">
                <h4>Execution Log Trace</h4>
                <div className="execution-logs">
                    {logs.map((log, i) => (
                        <div key={i} className="log-entry">
                            <span className="log-time">[{String(log.t).padStart(3, '0')}]</span>
                            <span className="log-core">[C{log.core}]</span>
                            <span className="log-msg">{log.msg}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InsightsPanel;
