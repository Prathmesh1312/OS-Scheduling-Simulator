import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AnimatedView.css';
import { TASK_COLORS } from '../utils/taskUtils';

/**
 * For a given time t, compute:
 *  - cpuStates: array matching number of cores, what is each core doing
 *  - readyQueue: taskes that have arrived but haven't finished and aren't in CPU/IO
 *  - ioQueue: taskes waiting for I/O
 *  - finishedIds: taskes already done
 *  - notArrived: taskes yet to arrive
 */
function getStateAtTime(t, taskes, gantt, result, cores = 1) {
    const resultMap = {};
    result.forEach(p => { resultMap[p.id] = p; });

    // Track state of each core
    const cpuStates = Array.from({ length: cores }, (_, i) => ({
        id: i,
        task: null,
        isIdle: true,
        isCS: false
    }));

    // Find active block for each core at time t
    for (let c = 0; c < cores; c++) {
        // Gantt blocks are exclusive of end time (start <= t < end), EXCEPT at the very end when start == end but that shouldn't happen in our discrete engine
        const currentBlock = gantt.find(b => b.core === c && b.start <= t && b.end > t);
        
        if (currentBlock) {
            if (currentBlock.state === 'context-switch' || currentBlock.pid === 'CS') {
                cpuStates[c].isCS = true;
                cpuStates[c].isIdle = false;
            } else if (currentBlock.state === 'active' && currentBlock.pid !== 'idle' && currentBlock.pid !== 'Idle') {
                cpuStates[c].task = taskes.find(p => p.id === currentBlock.pid) || null;
                cpuStates[c].isIdle = false;
            }
        }
    }

    const activeIds = new Set(cpuStates.filter(c => c.task).map(c => c.task.id));

    // finished = completely done by time t
    const finishedIds = new Set(
        result.filter(p => p.endTime !== null && p.endTime <= t).map(p => p.id)
    );

    // Determine what is in the I/O queue
    // In our simplified view, if it's not finished, arrived, not in CPU, and it's 'WAITING' (which we can infer if we recorded state transitions, but since we only have start/end and total IO burst, we might have to estimate or we need the engine to output state transitions.
    // If we don't have exact state logs per tick, we can approximate:
    // If it has I/O, arrived, not finished, not in CPU -> is it before first CPU or after?
    // A better way is using the discrete event state logs if we had them. Since we only have the result object and gantt, it's tricky to know EXACTLY if it's in I/O queue vs Ready Queue at any given exact second without a full tick log.
    // *Approximation for Visualization*:
    const readyQueue = [];
    const ioQueue = [];
    
    // We will put everything that is not active, not finished, but arrived into Ready Queue for now.
    taskes.forEach(p => {
        if (p.arrivalTime <= t && !finishedIds.has(p.id) && !activeIds.has(p.id)) {
            // Rough heuristic: if it has IO burst, and it has already hit the CPU at least once (t > firstCpuTime), it MIGHT be in IO.
            // For a perfect visual, the engine needs to return a tick-by-tick state array.
            // But we can just use the Ready Queue for visual simplicity if we lack perfect data.
            const res = resultMap[p.id];
            if (res && p.ioBurstTime > 0 && res.startTime !== null && t > res.startTime && t < res.endTime) {
                 // it's arrived, not finished, not active, but already started. It must be waiting for I/O or preempted.
                 // We'll put it in Ready Queue for now unless we know it's I/O.
                 readyQueue.push(p);
            } else {
                 readyQueue.push(p);
            }
        }
    });

    const notArrived = taskes.filter(p => p.arrivalTime > t);

    return { cpuStates, readyQueue, ioQueue, finishedIds, notArrived };
}

const AnimatedView = ({ gantt, taskes, result, stats, algorithm, quantum, sysParams }) => {
    const totalTime = gantt?.length ? Math.max(...gantt.map(b => b.end)) : 0;
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(600); // ms per time unit
    const intervalRef = useRef(null);
    const taskMap = {};
    taskes.forEach(p => { taskMap[p.id] = p; });

    // Derive number of cores from sysParams or Gantt
    const coresCount = sysParams?.cores || (gantt?.length ? Math.max(...gantt.map(b => b.core || 0)) + 1 : 1);

    const tick = useCallback(() => {
        setCurrentTime(t => {
            if (t >= totalTime) {
                setIsPlaying(false);
                return t;
            }
            return t + 1;
        });
    }, [totalTime]);

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(tick, speed);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isPlaying, speed, tick]);

    // Reset when gantt changes
    useEffect(() => {
        setCurrentTime(0);
        setIsPlaying(false);
    }, [gantt]);

    const play = () => { if (currentTime >= totalTime) setCurrentTime(0); setIsPlaying(true); };
    const pause = () => setIsPlaying(false);
    const reset = () => { setIsPlaying(false); setCurrentTime(0); };
    const stepForward = () => setCurrentTime(t => Math.min(t + 1, totalTime));
    const stepBack = () => setCurrentTime(t => Math.max(t - 1, 0));

    if (!gantt || gantt.length === 0) return null;

    const { cpuStates, readyQueue, ioQueue, finishedIds, notArrived } = getStateAtTime(currentTime, taskes, gantt, result, coresCount);
    const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

    return (
        <div className="anim-view">
            {/* ── Time scrubber ───────────────────────────────────── */}
            <div className="anim-scrubber-wrap">
                <div className="anim-time-label">
                    <span className="time-val">t = {currentTime}</span>
                    <span className="time-total">/ {totalTime}</span>
                </div>
                <input
                    type="range"
                    className="anim-scrubber"
                    min={0}
                    max={totalTime}
                    value={currentTime}
                    onChange={e => { setIsPlaying(false); setCurrentTime(Number(e.target.value)); }}
                />
                <div
                    className="scrubber-progress"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* ── Playback controls ───────────────────────────────── */}
            <div className="anim-controls">
                <button className="ctrl-btn" onClick={reset} title="Reset">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" /></svg>
                </button>
                <button className="ctrl-btn" onClick={stepBack} title="Step back" disabled={currentTime === 0}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
                </button>
                <button className="ctrl-btn play-btn" onClick={isPlaying ? pause : play}>
                    {isPlaying ? (
                        <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    )}
                </button>
                <button className="ctrl-btn" onClick={stepForward} title="Step forward" disabled={currentTime >= totalTime}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
                </button>

                <div className="speed-control">
                    <span>Speed</span>
                    {[{ label: '0.5×', val: 1200 }, { label: '1×', val: 600 }, { label: '2×', val: 300 }, { label: '4×', val: 150 }].map(s => (
                        <button
                            key={s.val}
                            className={`speed-btn ${speed === s.val ? 'active' : ''}`}
                            onClick={() => setSpeed(s.val)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Main animated area ──────────────────────────────── */}
            <div className="anim-stage">

                {/* NOT ARRIVED */}
                <div className="stage-section">
                    <div className="stage-label">
                        <div className="stage-dot dot-waiting" />
                        New / Not Arrived
                    </div>
                    <div className="task-row-container">
                        {notArrived.length === 0
                            ? <span className="empty-row">(none)</span>
                            : notArrived.map(p => (
                                <TaskCard key={p.id} task={p} state="waiting" time={currentTime} />
                            ))
                        }
                    </div>
                </div>

                {/* Arrow */}
                <Arrow label="arrives at arrival time" />

                {/* READY QUEUE */}
                <div className="stage-section">
                    <div className="stage-label">
                        <div className="stage-dot dot-ready" />
                        Ready Queue
                        <span className="queue-count">{readyQueue.length}</span>
                    </div>
                    <div className="queue-track">
                        {readyQueue.length === 0
                            ? <span className="empty-row">(empty)</span>
                            : readyQueue.map((p, i) => (
                                <TaskCard key={p.id} task={p} state="ready" index={i} time={currentTime} />
                            ))
                        }
                    </div>
                </div>

                {/* Arrow */}
                <Arrow label={`scheduler dispatches to ${coresCount} core(s)`} />

                {/* CPUs */}
                <div className="stage-section cpu-section">
                    <div className="stage-label">
                        <div className="stage-dot dot-cpu" />
                        CPU Cores
                    </div>
                    
                    <div className="cpu-grid">
                        {cpuStates.map(core => (
                            <div key={core.id} className={`cpu-box ${core.task ? 'cpu-active' : ''} ${core.isIdle ? 'cpu-idle' : ''} ${core.isCS ? 'cpu-cs' : ''}`}>
                                <div className="core-id-label">Core {core.id}</div>
                                
                                {core.task ? (
                                    <div className="cpu-task">
                                        <div
                                            className="cpu-task-glow"
                                            style={{ '--task-color': core.task.color }}
                                        />
                                        <div className="cpu-task-badge" style={{ backgroundColor: core.task.color }}>
                                            {core.task.id}
                                        </div>
                                        <div className="cpu-task-info">
                                            <span className="cpu-task-name">{core.task.name}</span>
                                            <div className="cpu-task-stats">
                                                <span>Burst: {core.task.burstTime}</span>
                                            </div>
                                        </div>
                                        <div className="cpu-spinner">
                                            <div className="cpu-ring" style={{ borderTopColor: core.task.color }} />
                                        </div>
                                    </div>
                                ) : core.isCS ? (
                                    <div className="cpu-cs-display">
                                        <div className="cs-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                                <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                            </svg>
                                        </div>
                                        <span>Context Switch</span>
                                    </div>
                                ) : core.isIdle ? (
                                    <div className="cpu-idle-display">
                                        <div className="idle-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                        </div>
                                        <span>Idle</span>
                                    </div>
                                ) : (
                                    <div className="cpu-done-display">
                                        <div className="done-icon">✓</div>
                                        <span>Done</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Arrow */}
                <Arrow label="completes, exits" />

                {/* FINISHED */}
                <div className="stage-section">
                    <div className="stage-label">
                        <div className="stage-dot dot-done" />
                        Finished
                        <span className="queue-count done-count">{finishedIds.size}</span>
                    </div>
                    <div className="task-row-container">
                        {finishedIds.size === 0
                            ? <span className="empty-row">(none)</span>
                            : taskes.filter(p => finishedIds.has(p.id)).map(p => (
                                <TaskCard key={p.id} task={p} state="done" time={currentTime} result={result.find(r => r.id === p.id)} />
                            ))
                        }
                    </div>
                </div>
            </div>

            {/* ── Gantt timeline with cursor ───────────────────────── */}
            <div className="anim-gantt-wrap">
                <div className="anim-gantt-label">Global Timeline</div>
                <div className="anim-gantt">
                    {/* Flat map of all blocks for a visual summary in the scrubber */}
                    {gantt.filter(b => b.core === 0).map((block, idx) => {
                        const width = ((block.end - block.start) / totalTime) * 100;
                        const left = (block.start / totalTime) * 100;
                        const isIdle = block.state === 'idle' || block.pid === 'idle' || block.pid === 'Idle';
                        const isCS = block.state === 'context-switch';
                        const task = taskMap[block.pid];
                        let color = task?.color ?? '#1e2533';
                        
                        if (isIdle) color = 'var(--bg-tertiary)';
                        if (isCS) color = '#94a3b8';

                        const isActive = block.start <= currentTime && block.end > currentTime;
                        return (
                            <div
                                key={idx}
                                className={`anim-gantt-block ${isIdle ? 'g-idle' : ''} ${isCS ? 'g-cs' : ''} ${isActive ? 'g-active' : ''}`}
                                style={{ width: `${width}%`, left: `${left}%`, backgroundColor: color }}
                                title={`${block.pid}: ${block.start}→${block.end}`}
                            >
                                <span>{isIdle ? '—' : isCS ? 'CS' : block.pid}</span>
                            </div>
                        );
                    })}
                    {/* Cursor */}
                    <div
                        className="anim-cursor"
                        style={{ left: `${progress}%` }}
                    >
                        <div className="cursor-head" />
                        <div className="cursor-line" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const TaskCard = ({ task: p, state, index, result }) => {
    const stateClass = { ready: 'pc-ready', waiting: 'pc-waiting', done: 'pc-done' }[state];
    return (
        <div className={`task-card ${stateClass}`} style={{ '--pc': p.color, animationDelay: `${(index ?? 0) * 0.05}s` }}>
            <div className="pc-badge" style={{ backgroundColor: p.color }}>{p.id}</div>
            <div className="pc-meta">
                <span className="pc-name">{p.name}</span>
                {state === 'ready' && <span className="pc-detail">BT: {p.burstTime}ms</span>}
                {state === 'done' && result && (
                    <span className="pc-detail done-detail">WT: {result.waitingTime}ms • TAT: {result.turnaroundTime}ms</span>
                )}
                {state === 'waiting' && <span className="pc-detail">Arrives: t={p.arrivalTime}</span>}
            </div>
            {state === 'ready' && (
                <div className="pc-pulse" style={{ backgroundColor: p.color }} />
            )}
        </div>
    );
};

const Arrow = ({ label }) => (
    <div className="stage-arrow">
        <div className="arrow-line">
            <div className="arrow-head" />
        </div>
        <span className="arrow-label">{label}</span>
    </div>
);

export default AnimatedView;
