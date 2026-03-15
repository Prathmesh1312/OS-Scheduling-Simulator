/**
 * OS Scheduling Algorithms Engine - Discrete Event Simulator
 * 
 * Simulates OS Process Scheduling with support for:
 * - Multiple CPU Cores (SMP)
 * - I/O Blocking and Device Queues
 * - Context Switch Overhead
 * - Priority Aging
 */

// Helper: Calculate average and format
const avg = (arr, key) => arr.length > 0 ? arr.reduce((sum, item) => sum + item[key], 0) / arr.length : 0;

/**
 * Core Generic Discrete Event Simulator
 * 
 * @param {Array} tasks - Array of task objects
 * @param {Object} sysParams - { cores: number, contextSwitchTime: number, agingRate: number }
 * @param {Object} algorithmLogic - Object containing specific algorithm hooks (e.g., getNextTask, checkPreemption)
 * @param {number} quantum - Time quantum for RR (optional)
 */
export function simulateDiscreteEvent(tasksInput, sysParams, algorithmLogic, quantum = null) {
    const { cores = 1, contextSwitchTime = 0, agingRate = 0 } = sysParams || {};

    // Initialize Tasks
    const tasks = tasksInput.map(t => ({
        ...t,
        id: t.id,
        originalPriority: t.priority,
        priority: t.priority, // Current priority (can age)
        remainingCpu: t.burstTime,
        remainingIo: t.ioBurstTime || 0,
        
        // Tracking metrics
        state: 'NEW', // NEW, READY, RUNNING, WAITING, DONE
        startTime: null,
        endTime: null,
        firstCpuTime: null,
        waitingTime: 0,
        turnaroundTime: 0,
        responseTime: 0,
        
        // State tracking for this simulation tick
        ageWaitTicks: 0,
    }));

    let time = 0;
    let completedTasks = 0;
    
    // System State
    const readyQueue = [];
    const ioQueue = [];
    
    // CPU Cores State
    // cpus = [{ id: 0, currentTask: null, contextSwitchRemaining: 0, activeTime: 0, idleTime: 0, quantumUsed: 0 }]
    const cpus = Array.from({ length: cores }, (_, i) => ({
        id: i,
        currentTask: null, // holding task object reference
        contextSwitchRemaining: 0, // time left for CS
        activeTime: 0, // total time doing actual work
        idleTime: 0, // total time idle
        quantumUsed: 0 // for RR/MLFQ
    }));

    // Output tracking
    const gantt = []; // { pid, start, end, core, state: 'context-switch' | 'active', color }
    const log = []; // execution log

    const addToGantt = (pid, start, end, core, state = 'active', color = null) => {
         if (start >= end) return;
         
         if (gantt.length > 0) {
             // Try to merge if possible
             const last = gantt[gantt.length - 1];
             if (last.pid === pid && last.core === core && last.state === state && last.end === start) {
                 last.end = end;
                 return;
             }
         }
         gantt.push({ pid, start, end, core, state, color });
    };

    // --- Main Simulation Loop ---
    // Safety break to prevent infinite loops during dev
    let maxTicks = tasks.reduce((acc, t) => acc + t.burstTime + (t.ioBurstTime || 0), 0) + tasks.length * 100 * (contextSwitchTime+1) + 1000;
    let tickCount = 0;

    while (completedTasks < tasks.length && tickCount < maxTicks) {
        tickCount++;
        let eventsThisTick = []; // For detailed logging if needed

        // 1. New Arrivals -> Ready Queue
        const newArrivals = tasks.filter(t => t.state === 'NEW' && t.arrivalTime === time);
        for (const task of newArrivals) {
            task.state = 'READY';
            readyQueue.push(task);
            if (algorithmLogic.onArrival) {
                algorithmLogic.onArrival(task, readyQueue); // Keep queue sorted if needed
            }
        }

        // 2. Process I/O Queue (Waiting to Ready)
        for (let i = ioQueue.length - 1; i >= 0; i--) {
            const task = ioQueue[i];
            if (task.remainingIo > 0) {
                task.remainingIo--;
                if (task.remainingIo === 0) {
                    if (task.remainingCpu === 0) {
                        // Task fully complete after I/O
                        task.state = 'DONE';
                        task.endTime = time + 1;
                        task.turnaroundTime = task.endTime - task.arrivalTime;
                        task.waitingTime = task.turnaroundTime - task.burstTime - (task.ioBurstTime || 0);
                        completedTasks++;
                    } else {
                        // I/O Finished, back to ready queue for remaining CPU burst
                        task.state = 'READY';
                        readyQueue.push(task);
                        if (algorithmLogic.onArrival) {
                            algorithmLogic.onArrival(task, readyQueue); // Re-sort
                        }
                    }
                    ioQueue.splice(i, 1);
                }
            }
        }

        // 3. Dispatch tasks to Idle CPUs
        for (const cpu of cpus) {
            // Only assign if CPU is empty AND not in a context switch
            if (!cpu.currentTask && cpu.contextSwitchRemaining === 0 && readyQueue.length > 0) {
                
                // If the algorithm needs to pick specifically (e.g. Priority), do it here. 
                // Default is picking the first in ready queue (FCFS behavior, assuming queue sorting handled by onArrival/onTick)
                let selectedTaskIndex = 0;
                if (algorithmLogic.selectNextTaskIndex) {
                    selectedTaskIndex = algorithmLogic.selectNextTaskIndex(readyQueue);
                }

                if(selectedTaskIndex >= 0 && selectedTaskIndex < readyQueue.length) {
                    const taskToRun = readyQueue.splice(selectedTaskIndex, 1)[0];
                    taskToRun.state = 'RUNNING';
                    
                    if (taskToRun.firstCpuTime === null) {
                        taskToRun.firstCpuTime = time;
                        taskToRun.responseTime = time - taskToRun.arrivalTime;
                    }

                    cpu.currentTask = taskToRun;
                    cpu.quantumUsed = 0; // Reset quantum for new task
                }
            }
        }

        // 4. Process CPUs (Running -> Done, Running -> I/O, Preemption)
        for (const cpu of cpus) {
            // Handle Context Switch Overhead
            if (cpu.contextSwitchRemaining > 0) {
                cpu.contextSwitchRemaining--;
                addToGantt('CS', time, time + 1, cpu.id, 'context-switch', '#9ca3af'); // CS color
                continue; // Cannot do work while context switching
            }

            if (cpu.currentTask) {
                const task = cpu.currentTask;
                
                // Do work!
                task.remainingCpu--;
                cpu.activeTime++;
                cpu.quantumUsed++;
                addToGantt(task.id, time, time + 1, cpu.id, 'active', task.color);

                let preempt = false;
                let moveToIo = false;
                let finished = false;

                // Fire I/O interrupt midway through CPU burst
                let isHalfway = task.burstTime > 1 ? task.remainingCpu === Math.floor(task.burstTime / 2) : task.remainingCpu === 0;

                if (task.remainingIo > 0 && task.taskType === 'I/O' && isHalfway) {
                     moveToIo = true;
                } else if (task.remainingCpu === 0) {
                     finished = true;
                } else if (algorithmLogic.checkPreemption) {
                    // E.g., for RR checking quantum, or SRTF checking if new task is shorter
                    preempt = algorithmLogic.checkPreemption(task, readyQueue, cpu.quantumUsed, quantum);
                }

                if (finished) {
                    task.state = 'DONE';
                    task.endTime = time + 1;
                    task.turnaroundTime = task.endTime - task.arrivalTime;
                    // Waiting time = Turnaround - (Original Burst + Original IO)
                    task.waitingTime = task.turnaroundTime - task.burstTime - (task.ioBurstTime || 0); 
                    completedTasks++;
                    cpu.currentTask = null;
                    if(contextSwitchTime > 0) cpu.contextSwitchRemaining = contextSwitchTime;

                } else if (moveToIo) {
                    task.state = 'WAITING';
                    ioQueue.push(task);
                    cpu.currentTask = null;
                     if(contextSwitchTime > 0) cpu.contextSwitchRemaining = contextSwitchTime;

                } else if (preempt) {
                     task.state = 'READY';
                     readyQueue.push(task);
                     if (algorithmLogic.onArrival) {
                        algorithmLogic.onArrival(task, readyQueue);
                    }
                    cpu.currentTask = null;
                    if(contextSwitchTime > 0) cpu.contextSwitchRemaining = contextSwitchTime;
                }
            } else {
                cpu.idleTime++;
                addToGantt('Idle', time, time + 1, cpu.id, 'idle', 'transparent');
            }
        }

        // 5. Aging implementation (Increase Priority of waiting tasks)
        if (agingRate > 0 && readyQueue.length > 0) {
            for (const task of readyQueue) {
                task.ageWaitTicks++;
                // If it has waited enough ticks, increase its priority (lower the number)
                // For example, every `10 / agingRate` ticks, decrease priority by 1 (max 1)
                const ticksToIncrease = Math.max(1, Math.floor(20 / agingRate));
                if (task.ageWaitTicks >= ticksToIncrease && task.priority > 1) {
                     task.priority--;
                     task.ageWaitTicks = 0; // Reset
                }
            }
            // If algorithm requires sorting by priority, re-sort the ready queue here
            if (algorithmLogic.onArrival) {
                 // HACK: Re-sort by simulating an arrival. A dedicated `onTick` or `sort` method is better.
                 algorithmLogic.onArrival(null, readyQueue);
            }
        }

        time++;
    }

    // Prepare Output
    const result = tasks.map(t => ({
        ...t,
        startTime: t.firstCpuTime, // Note: For Gantt UI consistency
        endTime: t.endTime,
        turnaroundTime: t.turnaroundTime,
        waitingTime: t.waitingTime,
        responseTime: t.responseTime
    }));

    // Cleanup gantt consecutive identical states
    const mergedGantt = mergeGanttWithCore(gantt);

    const totalBurstSum = tasks.reduce((sum, t) => sum + t.burstTime, 0);
    // Over all cores, what percentage of capacity was used for actual work?
    const totalCpuCapacity = time * cores;
    const cpuUtilization = totalCpuCapacity > 0 ? (totalBurstSum / totalCpuCapacity) * 100 : 0;
    const throughput = time > 0 ? (tasks.length / time) * 1000 : 0; // Tasks per 1000 ms = Tasks/sec if 1 tick = 1ms

    return {
        gantt: mergedGantt,
        result,
        stats: {
            avgWaiting: avg(result, 'waitingTime'),
            avgTurnaround: avg(result, 'turnaroundTime'),
            avgResponse: avg(result, 'responseTime'),
            cpuUtilization,
            throughput,
            totalTime: time
        }
    };
}

// ─── Gantt Merging for Multi-Core ──────────────────────────────────────────────
function mergeGanttWithCore(ganttBlocks) {
    if (!ganttBlocks || ganttBlocks.length === 0) return [];
    
    // Sort by core, then by start time so we can merge contiguous blocks per CPU
    ganttBlocks.sort((a, b) => {
        if (a.core !== b.core) return a.core - b.core;
        return a.start - b.start;
    });

    const merged = [];
    let currentBlock = null;

    for (const block of ganttBlocks) {
        if (!currentBlock) {
            currentBlock = { ...block };
            continue;
        }

        if (
            currentBlock.core === block.core &&
            currentBlock.pid === block.pid &&
            currentBlock.state === block.state &&
            currentBlock.end === block.start
        ) {
            // Contiguous blocks of the same type on the same core -> Merge
            currentBlock.end = block.end;
        } else {
            // Push old block, start new
            merged.push(currentBlock);
            currentBlock = { ...block };
        }
    }
    
    if (currentBlock) {
        merged.push(currentBlock);
    }

    return merged;
}

// ─── Algorithm Implementations using the Engine ────────────────────────────────

export function simulateFCFS(taskes, sysParams) {
    return simulateDiscreteEvent(taskes, sysParams, {
        onArrival: (newTask, queue) => {
             // FCFS: Keep queue sorted by arrival time (Usually natural append is fine if time ticks logically)
        }
    });
}

export function simulateSJF(taskes, sysParams) {
    return simulateDiscreteEvent(taskes, sysParams, {
        onArrival: (newTask, queue) => {
            // SJF (Non-Preemptive): Sort ready queue by burst time
            // If burst times are equal, fall back to arrival time order (natural order in array if we don't shuffle equal bursts)
            queue.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime);
        }
    });
}

export function simulateSRTF(taskes, sysParams) {
    return simulateDiscreteEvent(taskes, sysParams, {
        onArrival: (newTask, queue) => {
             // SRTF: Sort by **remaining** burst time
             queue.sort((a, b) => a.remainingCpu - b.remainingCpu || a.arrivalTime - b.arrivalTime);
        },
        checkPreemption: (runningTask, readyQueue) => {
             // Preempt if there exists a task in the ready queue with strictly less remaining time
             if (readyQueue.length === 0) return false;
             return readyQueue[0].remainingCpu < runningTask.remainingCpu;
        }
    });
}

export function simulateRoundRobin(taskes, quantum, sysParams) {
    return simulateDiscreteEvent(taskes, sysParams, {
        onArrival: (newTask, queue) => {
             // Standard RR pushes to the back of the queue.
             // (We handle 'moveToIo' and 'preempt' inside the loop by pushing to end of queue naturally).
        },
        checkPreemption: (runningTask, readyQueue, quantumUsed, quantumLimit) => {
            // Preempt if quantum fully used and there are tasks waiting
            // (Even if 0 waiting tasks, context switch might technically happen to itself, but we'll optimize to not preempt if queue is empty)
            return quantumUsed >= quantumLimit && readyQueue.length > 0;
        }
    }, quantum);
}

export function simulatePriority(taskes, sysParams) {
    return simulateDiscreteEvent(taskes, sysParams, {
        onArrival: (newTask, queue) => {
            // Non-Preemptive Priority: Lower number = higher priority
            queue.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
        }
    });
}

export function simulatePreemptivePriority(taskes, sysParams) {
    return simulateDiscreteEvent(taskes, sysParams, {
        onArrival: (newTask, queue) => {
            // Sort by priority
            queue.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
        },
        checkPreemption: (runningTask, readyQueue) => {
             if (readyQueue.length === 0) return false;
             // Lower number = higher priority
             return readyQueue[0].priority < runningTask.priority;
        }
    });
}


// ─── Multi-Level Queue Implementations ─────────────────────────────────────────

export function simulateMLQ(taskes, sysParams) {
    // MLQ: 3 queues based on task priority.
    // Q1 (priority 1): RR(q=2)
    // Q2 (priority 2): RR(q=4)
    // Q3 (priority 3+): FCFS
    
    // We will simulate this by sorting the ready queue strictly by priority first.
    // Within the same priority, we apply the specific queue's scheduling strategy.

    return simulateDiscreteEvent(taskes, sysParams, {
        onArrival: (newTask, queue) => {
            // Sort primarily by priority (lower is higher)
            queue.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                // If same priority, fall back to arrival time
                return a.arrivalTime - b.arrivalTime;
            });
        },
        checkPreemption: (runningTask, readyQueue, quantumUsed) => {
            if (readyQueue.length === 0) return false;
            
            // Higher priority arrived?
            if (readyQueue[0].priority < runningTask.priority) return true;

            // Otherwise, check quantum for the specific queue it belongs to
            if (runningTask.priority === 1 && quantumUsed >= 2) return true; // Q1 is RR(2)
            if (runningTask.priority === 2 && quantumUsed >= 4) return true; // Q2 is RR(4)
            // Q3 is FCFS, never preempts due to quantum
            
            return false;
        }
    });
}

export function simulateMLFQ(taskes, sysParams) {
    // MLFQ: 3 queues. All start in Q1 (q=2). If quantum expires, demote to Q2 (q=4). Then Q3 (FCFS).
    
    // We need to initialize the initial queue level for all tasks.
    const tasksWithLevel = taskes.map(t => ({ ...t, queueLevel: 1 }));

    return simulateDiscreteEvent(tasksWithLevel, sysParams, {
        onArrival: (newTask, queue) => {
             // New arrivals (or returning from I/O) maintain their queue level or can be promoted.
             // We'll just maintain their demoted level for simplicity.
             queue.sort((a, b) => {
                 if (a.queueLevel !== b.queueLevel) return a.queueLevel - b.queueLevel;
                 return a.arrivalTime - b.arrivalTime;
             });
        },
        checkPreemption: (runningTask, readyQueue, quantumUsed) => {
            if (readyQueue.length === 0) {
                 // Even if queue is empty, we must enforce quantum for MLFQ demotion
                 // But wait, if queue is empty, demotion just means it stays in CPU but at lower level?
                 // Actually, if queue is empty, context switch is wasted. But the rule says: if burst > quantum, demote.
                 // We will handle demotion in the 'onPreempt' or here.
            }
            
            let shouldPreempt = false;
            let quantumLimit = runningTask.queueLevel === 1 ? 2 : (runningTask.queueLevel === 2 ? 4 : Infinity);

            if (readyQueue.length > 0 && readyQueue[0].queueLevel < runningTask.queueLevel) {
                shouldPreempt = true; // preempted by higher queue
            } else if (quantumUsed >= quantumLimit) {
                shouldPreempt = true; // preempted by quantum expiration
                if (runningTask.queueLevel < 3) {
                    runningTask.queueLevel++; // Demote!
                }
            }

            return shouldPreempt;
        }
    });
}


// ─── Export Directory ────────────────────────────────────────────────────────

export const ALGORITHMS = {
  FCFS: { name: 'FCFS', fullName: 'First Come First Served', simulate: simulateFCFS, hasQuantum: false },
  SJF: { name: 'SJF', fullName: 'Shortest Job First (Non-Preemptive)', simulate: simulateSJF, hasQuantum: false },
  SRTF: { name: 'SRTF', fullName: 'Shortest Remaining Time First (Preemptive)', simulate: simulateSRTF, hasQuantum: false },
  RR: { name: 'Round Robin', fullName: 'Round Robin', simulate: simulateRoundRobin, hasQuantum: true },
  PRIORITY: { name: 'Priority', fullName: 'Priority Scheduling (Non-Preemptive)', simulate: simulatePriority, hasQuantum: false, hasPriority: true },
  PREEMPTIVE_PRIORITY: { name: 'Preemptive Priority', fullName: 'Priority Scheduling (Preemptive)', simulate: simulatePreemptivePriority, hasQuantum: false, hasPriority: true },
  MLQ: { name: 'MLQ', fullName: 'Multilevel Queue', simulate: simulateMLQ, hasQuantum: false, hasPriority: true },
  MLFQ: { name: 'MLFQ', fullName: 'Multilevel Feedback Queue', simulate: simulateMLFQ, hasQuantum: false }
};
