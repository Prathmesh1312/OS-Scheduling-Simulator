import React from 'react';
import './GanttChart.css';

const GanttChart = ({ gantt, taskes }) => {
    if (!gantt || gantt.length === 0) {
        return (
            <div className="gantt-empty">
                <p>Run simulation to see Gantt chart</p>
            </div>
        );
    }

    const totalTime = Math.max(...gantt.map(b => b.end));
    const taskMap = {};
    taskes.forEach(p => { taskMap[p.id] = p; });

    // Group blocks by core
    const coreBlocks = {};
    gantt.forEach(block => {
        const coreId = block.core !== undefined ? block.core : 0;
        if (!coreBlocks[coreId]) coreBlocks[coreId] = [];
        coreBlocks[coreId].push(block);
    });

    const cores = Object.keys(coreBlocks).sort((a, b) => Number(a) - Number(b));

    // Get unique time markers
    const timeSet = new Set();
    gantt.forEach(b => {
        timeSet.add(b.start);
        timeSet.add(b.end);
    });
    const timeMarkers = Array.from(timeSet).sort((a, b) => a - b);

    return (
        <div className="gantt-wrapper">
            <div className="gantt-cores-container">
                {cores.map(coreId => (
                    <div key={coreId} className="gantt-core-row">
                        {cores.length > 1 && (
                             <div className="core-label">Core {Number(coreId)}</div>
                        )}
                        <div className="gantt-chart">
                            {coreBlocks[coreId].map((block, idx) => {
                                const width = ((block.end - block.start) / totalTime) * 100;
                                const left = (block.start / totalTime) * 100;
                                const isIdle = block.state === 'idle' || block.pid === 'idle' || block.pid === 'Idle';
                                const isCS = block.state === 'context-switch';
                                const task = taskMap[block.pid];
                                
                                let bgColor = task ? task.color : '#374151';
                                let borderColor = task ? task.color : '#374151';
                                let label = task ? block.pid : block.pid;

                                if (isIdle) {
                                    bgColor = 'var(--bg-tertiary)';
                                    borderColor = 'var(--border)';
                                    label = 'Idle';
                                } else if (isCS) {
                                    bgColor = '#94a3b8'; // CS slate color
                                    borderColor = '#64748b';
                                    label = 'CS';
                                }

                                return (
                                    <div
                                        key={idx}
                                        className={`gantt-block ${isIdle ? 'gantt-idle' : ''} ${isCS ? 'gantt-cs' : ''}`}
                                        style={{
                                            width: `${width}%`,
                                            left: `${left}%`,
                                            backgroundColor: bgColor,
                                            borderColor: borderColor,
                                        }}
                                        title={`${label}: ${block.start} → ${block.end} (${block.end - block.start} units)`}
                                    >
                                        <span className="gantt-label">
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Time markers (shared across all cores at the bottom) */}
            <div className="gantt-timeline">
                {timeMarkers.map((time, idx) => {
                     // Only show labels for some to avoid crowding if too many
                     const showLabel = timeMarkers.length < 20 || idx === 0 || idx === timeMarkers.length - 1 || idx % Math.ceil(timeMarkers.length / 10) === 0;
                     if (!showLabel && time !== totalTime) return null;

                     return (
                        <div
                            key={time}
                            className="gantt-time-marker"
                            style={{ left: `${(time / totalTime) * 100}%` }}
                        >
                            <span>{time}</span>
                        </div>
                    );
                })}
            </div>

            {/* Task legend */}
            <div className="gantt-legend">
                {taskes.map(p => (
                    <div key={p.id} className="gantt-legend-item">
                        <div className="legend-color" style={{ backgroundColor: p.color }} />
                        <span>{p.id}: {p.name}</span>
                    </div>
                ))}
                <div className="gantt-legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#94a3b8', border: '1px solid #64748b' }} />
                    <span>Context Switch</span>
                </div>
                <div className="gantt-legend-item">
                    <div className="legend-idle-color" />
                    <span>Idle</span>
                </div>
            </div>
        </div>
    );
};

export default GanttChart;
