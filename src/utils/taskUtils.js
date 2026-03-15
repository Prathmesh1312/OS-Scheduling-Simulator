// Task color palette
export const TASK_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
];

export const generateId = (index) => `P${index + 1}`;

export const createTask = (index) => ({
  id: generateId(index),
  name: `Task ${index + 1}`,
  arrivalTime: 0,
  burstTime: Math.floor(Math.random() * 8) + 2,
  priority: Math.floor(Math.random() * 5) + 1,
  ioBurstTime: 0,
  taskType: 'CPU', // 'CPU' or 'I/O'
  deadline: null,
  color: TASK_COLORS[index % TASK_COLORS.length],
});

export const DEFAULT_TASKES = [
  { id: 'P1', name: 'Task 1', arrivalTime: 0, burstTime: 6, priority: 3, ioBurstTime: 2, taskType: 'CPU', deadline: null, color: TASK_COLORS[0] },
  { id: 'P2', name: 'Task 2', arrivalTime: 2, burstTime: 4, priority: 1, ioBurstTime: 0, taskType: 'CPU', deadline: 10, color: TASK_COLORS[1] },
  { id: 'P3', name: 'Task 3', arrivalTime: 4, burstTime: 2, priority: 4, ioBurstTime: 1, taskType: 'I/O', deadline: null, color: TASK_COLORS[2] },
  { id: 'P4', name: 'Task 4', arrivalTime: 6, burstTime: 5, priority: 2, ioBurstTime: 0, taskType: 'CPU', deadline: null, color: TASK_COLORS[3] },
];

export const formatTime = (t) => `${t}ms`;
export const formatPercent = (v) => `${v.toFixed(1)}%`;
export const formatAvg = (v) => `${v.toFixed(2)}`;
