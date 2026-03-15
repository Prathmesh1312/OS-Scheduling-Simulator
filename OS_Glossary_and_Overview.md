# OS Process Scheduling Simulator: Overview & Technical Glossary

This document explains what this project is, what it does, and provides a comprehensive glossary of every Operating System (OS) technical term used within the simulator.

---

## 🚀 What Does This Project Do?

This project is an **Advanced Operating System Process Scheduling Simulator** built with React. 
In a real computer, you have many programs (processes) running at the same time, but you might only have a few CPU cores. The Operating System has a component called the **Scheduler** that decides *which* program gets to use the CPU at any given millisecond.

**This simulator allows you to:**
1. **Visualize inside the OS:** It provides a dynamic X-ray into how an OS CPU scheduler makes decisions.
2. **Experiment with Algorithms:** You can test famous CPU scheduling algorithms like Round Robin, Shortest Job First, or Multilevel Feedback Queues to see which handles a specific workload better.
3. **Simulate Real-World Conditions:** Unlike simple calculators, this simulator uses a "Discrete Event Simulation Engine". This means it accurately mimics reality by supporting:
   - **Multiprocessing (SMP):** Simulating laptops with multiple CPU Cores (e.g., 2, 4 cores).
   - **I/O Blocking:** Programs don't just use the CPU; they pause to read from disks (I/O). The simulator handles this.
   - **Context Switching Overhead:** Swapping programs takes time. The simulator visually penalizes the system for swapping too much.
4. **Learn through Educational Insights:** The system analyzes the results of your simulation and detects architectural problems like the *Convoy Effect* or *Starvation*, explaining what went wrong in plain English.

---

## 📚 Technical Glossary

Use this glossary to understand the terms shown in the UI, headers, and statistics panel.

### 1. Basic Process Terms
*   **Process / Task:** A program in active execution (e.g., Chrome, Spotify).
*   **Arrival Time:** The exact clock tick/millisecond when a process enters the system and asks for CPU time.
*   **CPU Burst (Burst Time):** The amount of uninterrupted time a process needs to compute data on the CPU.
*   **I/O Burst (Input/Output Time):** Time a process spends waiting for external devices (like reading a file from a hard drive or waiting for a network request). During this time, the process *does not* use the CPU.
*   **CPU-Bound vs. I/O-Bound:**
    *   **CPU-Bound:** A process that spends most of its time doing math/computations (e.g., video rendering).
    *   **I/O-Bound:** A process that spends most of its time waiting for data (e.g., a web browser waiting for user clicks).

### 2. Time Metrics (Statistics)
*   **Response Time:** The time taken from when a process *arrives* to the *very first time* it is assigned to the CPU. (Crucial for interactive UI responsiveness).
*   **Waiting Time:** The total accumulated time a process spends waiting in the "Ready Queue" doing nothing.
*   **Turnaround Time:** The total time from the process's arrival to its complete termination. *(Turnaround Time = Burst Time + I/O Wait + Waiting Time).*
*   **Throughput:** The number of tasks the CPU completes per unit of time (e.g., 50 tasks per 1000ms).
*   **CPU Utilization:** The percentage of time the CPU was actually doing work versus sitting "Idle".

### 3. Simulation & Architecture Terms
*   **Ready Queue:** The waiting line in the OS where processes sit when they are ready to run but the CPUs are currently busy.
*   **Waiting Queue (I/O Queue):** The line where processes are placed while they wait for an I/O operation to finish. They are blocked from using the CPU here.
*   **Context Switch:** The act of pausing the currently running process, saving its physical state, and loading the state of the next process. This takes a tiny amount of time where no actual user work is done (called *Overhead*).
*   **Preemption:** When the OS forcibly interrupts and pauses a currently running process to give the CPU to a different process (usually because a higher-priority task arrived or a time limit expired).
*   **Time Quantum (Time Slice):** A strict time limit given to a process. Used in Round Robin. Once the limit expires, the process is preempted.

### 4. Common Scheduling Problems
*   **Convoy Effect:** A problem that occurs in FCFS where many short, fast processes get stuck waiting behind one massive, slow CPU-bound process. It drastically ruins average waiting times.
*   **Starvation:** A problem in Priority scheduling where a low-priority process never gets to run because a constant stream of high-priority processes keeps arriving and stealing the CPU.
*   **Aging:** The primary solution to Starvation. The OS gradually increases the priority of a process the longer it is left waiting in the Ready Queue, guaranteeing it will eventually run.

### 5. The Scheduling Algorithms
*   **FCFS (First Come First Served):** The simplest algorithm. Processes are executed exactly in the order they arrive. Non-preemptive.
*   **SJF (Shortest Job First):** The OS looks at the Ready Queue and picks the process with the smallest Burst Time. Provides the mathematically lowest average waiting time, but can cause Starvation. Non-preemptive.
*   **SRTF (Shortest Remaining Time First):** The preemptive version of SJF. If a new process arrives that is shorter than the *remaining* time of the running process, the running process is kicked out.
*   **RR (Round Robin):** Focuses on fairness. Every process gets a strict "Time Quantum". If it doesn't finish, it is preempted and put at the back of the line.
*   **Priority Scheduling:** The highest priority process (lowest number = highest priority) runs first.
*   **MLQ (Multilevel Queue):** Partitions the Ready Queue into several separate queues (e.g., System, Interactive, Background) that each have their own scheduling rule.
*   **MLFQ (Multilevel Feedback Queue):** The most complex and realistic algorithm. Maps multiple queues but allows processes to move between them based on behavior. A task that uses too much CPU gets demoted to a lower queue, while interactive tasks stay high.
