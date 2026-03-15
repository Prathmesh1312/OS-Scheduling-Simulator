import React from 'react';
import './TaskTable.css';
import { TASK_COLORS, createTask, generateId } from '../utils/taskUtils';
import { Plus, Trash2, Shuffle, Info, Activity } from 'lucide-react';

const TaskTable = ({ taskes, setTaskes, showPriority }) => {
    const addTask = () => {
        const newTask = createTask(taskes.length);
        newTask.id = generateId(taskes.length);
        setTaskes([...taskes, newTask]);
    };

    const removeTask = (id) => {
        if (taskes.length <= 1) return;
        setTaskes(taskes.filter(p => p.id !== id));
    };

    const updateTask = (id, field, value) => {
        setTaskes(taskes.map(p => {
            if (p.id !== id) return p;
            
            if (field === 'name' || field === 'taskType' || field === 'color') {
                return { ...p, [field]: value };
            }
            
            return { ...p, [field]: Math.max(0, Number(value)) };
        }));
    };

    const randomize = () => {
        const randomized = taskes.map(p => ({
            ...p,
            arrivalTime: Math.floor(Math.random() * 8),
            burstTime: Math.floor(Math.random() * 8) + 2,
            priority: Math.floor(Math.random() * 5) + 1,
            ioBurstTime: Math.random() > 0.6 ? Math.floor(Math.random() * 4) + 1 : 0,
            taskType: Math.random() > 0.7 ? 'I/O' : 'CPU'
        }));
        setTaskes(randomized);
    };

    return (
        <div className="task-table-container">
            <div className="table-header">
                <h3>Task Input</h3>
                <div className="table-actions">
                    <button className="btn-icon" onClick={randomize} title="Randomize values">
                        <Shuffle size={14} />
                        Randomize
                    </button>
                    <button className="btn-primary" onClick={addTask} disabled={taskes.length >= 10}>
                        <Plus size={14} />
                        Add Task
                    </button>
                </div>
            </div>

            <div className="table-scroll">
                <table className="task-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Arrival</th>
                            <th>CPU Burst</th>
                            <th>I/O Burst <Info size={11} title="Time spent waiting for I/O after initial CPU burst" /></th>
                            {showPriority && <th>Priority <Info size={11} /></th>}
                            <th>Color</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {taskes.map((p, idx) => (
                            <tr key={p.id} className="task-row" style={{ '--task-color': p.color }}>
                                <td>
                                    <span className="task-badge" style={{ backgroundColor: p.color }}>
                                        {p.id}
                                    </span>
                                </td>
                                <td>
                                    <input
                                        className="table-input"
                                        value={p.name}
                                        onChange={e => updateTask(p.id, 'name', e.target.value)}
                                        maxLength={15}
                                        style={{ minWidth: '80px' }}
                                    />
                                </td>
                                <td>
                                    <select
                                        className="table-input"
                                        value={p.taskType || 'CPU'}
                                        onChange={e => updateTask(p.id, 'taskType', e.target.value)}
                                        style={{ minWidth: '70px', padding: '0.25rem' }}
                                    >
                                        <option value="CPU">CPU</option>
                                        <option value="I/O">I/O</option>
                                    </select>
                                </td>
                                <td>
                                    <input
                                        className="table-input number-input"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={p.arrivalTime}
                                        onChange={e => updateTask(p.id, 'arrivalTime', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <input
                                        className="table-input number-input"
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={p.burstTime}
                                        onChange={e => updateTask(p.id, 'burstTime', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <input
                                        className="table-input number-input"
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={p.ioBurstTime || 0}
                                        onChange={e => updateTask(p.id, 'ioBurstTime', e.target.value)}
                                        style={{ opacity: (p.ioBurstTime || 0) === 0 ? 0.5 : 1 }}
                                    />
                                </td>
                                {showPriority && (
                                    <td>
                                        <input
                                            className="table-input number-input"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={p.priority}
                                            onChange={e => updateTask(p.id, 'priority', e.target.value)}
                                        />
                                    </td>
                                )}
                                <td>
                                    <select
                                        className="color-select"
                                        value={p.color}
                                        onChange={e => updateTask(p.id, 'color', e.target.value)}
                                        style={{ backgroundColor: p.color }}
                                    >
                                        {TASK_COLORS.map(c => (
                                            <option key={c} value={c} style={{ backgroundColor: c }}>{c}</option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <button
                                        className="btn-danger"
                                        onClick={() => removeTask(p.id)}
                                        disabled={taskes.length <= 1}
                                        title="Remove task"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showPriority && (
                <p className="priority-info">
                    <Info size={12} /> Lower priority number = Higher priority (1 is highest)
                </p>
            )}
        </div>
    );
};

export default TaskTable;
