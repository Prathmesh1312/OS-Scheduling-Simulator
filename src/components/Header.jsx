import React from 'react';
import './Header.css';
import { Cpu, Github } from 'lucide-react';

const Header = () => (
    <header className="app-header">
        <div className="header-brand">
            <div className="brand-icon">
                <Cpu size={20} />
            </div>
            <div className="brand-text">
                <h1>OS Scheduler</h1>
                <span>CPU Scheduling Algorithm Visualizer</span>
            </div>
        </div>
        <div className="header-right">
            <div className="header-badges">
                <span className="badge badge-os">Operating Systems</span>
                <span className="badge badge-project">Course Project</span>
            </div>
        </div>
    </header>
);

export default Header;
