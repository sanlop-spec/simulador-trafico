interface GraphNode {
    id: number;
    name: string;
    x: number;
    y: number;
    signalPhase: 'NS' | 'EW';
    signalTimer: number;
    isAdaptive: boolean;
}

interface GraphEdge {
    from: number;
    to: number;
    capacity: number;
    baseCapacity: number;
    flow: number;
    freeFlowTime: number;
    isBlocked: boolean;
    hasAccident: boolean;
    isBraessBypass?: boolean;
}

type VehicleType = 'CAR' | 'BUS' | 'TRUCK';

interface Vehicle {
    edgeIndex: number;
    progress: number;
    speed: number;
    type: VehicleType;
    length: number;
    color: string;
    pcuFactor: number;
    stopTimer: number; // Temporizador para paradas de autobús
}

type RoutingStrategy = 'EGOISTIC' | 'SOCIAL_OPTIMAL';

class TrafficSimulator {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    nodes: GraphNode[] = [];
    edges: GraphEdge[] = [];
    vehicles: Vehicle[] = [];
    isRunning: boolean = true;
    currentHour: number = 8.0;

    // Cámara (Pan & Zoom)
    zoom: number = 1.0;
    panX: number = 0;
    panY: number = 0;
    isDragging: boolean = false;
    dragStartX: number = 0;
    dragStartY: number = 0;

    // Modos de Operación
    routingStrategy: RoutingStrategy = 'EGOISTIC';
    isAdaptiveTrafficLights: boolean = false;
    showHeatmap: boolean = false;
    isNightMode: boolean = true;
    isBraessActive: boolean = false;

    originNodeId: number = 0;
    destinationNodeId: number = 10;
    activePathEdges: Set<number> = new Set();

    constructor(canvasId: string) {
        const canvasElem = document.getElementById(canvasId);
        if (!canvasElem || !(canvasElem instanceof HTMLCanvasElement)) {
            throw new Error(`No se encontró el elemento canvas con id '${canvasId}'`);
        }
        this.canvas = canvasElem;
        this.ctx = this.canvas.getContext('2d')!;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.initApizacoGraph();
        this.initFleet(150);
        this.populateODSelectors();
        this.calculateOptimalPath();
        this.setupControls();
        this.setupCameraControls();
        this.loop();
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent ? parent.clientWidth : 900;
        this.canvas.height = parent ? parent.clientHeight : 700;
        if (this.nodes.length > 0) this.initApizacoGraph();
    }

    initApizacoGraph() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padX = w * 0.12;
        const padY = h * 0.12;
        const gridW = (w - padX * 2) / 3;
        const gridH = (h - padY * 2) / 2;

        this.nodes = [
            { id: 0, name: "Salida Tlaxcala / Tec Apizaco", x: padX, y: padY + gridH * 2, signalPhase: 'NS', signalTimer: 0, isAdaptive: false },
            { id: 1, name: "Av. 16 de Sep / Hidalgo", x: padX, y: padY + gridH, signalPhase: 'EW', signalTimer: 15, isAdaptive: false },
            { id: 2, name: "Salida Chignahuapan", x: padX, y: padY, signalPhase: 'NS', signalTimer: 0, isAdaptive: false },
            { id: 3, name: "La Maquinita (Glorieta)", x: padX + gridW, y: padY + gridH, signalPhase: 'NS', signalTimer: 30, isAdaptive: false },
            { id: 4, name: "Mercado Guadalupe", x: padX + gridW, y: padY + gridH * 2, signalPhase: 'EW', signalTimer: 10, isAdaptive: false },
            { id: 5, name: "Av. Cuauhtémoc / 16 de Sep", x: padX + gridW * 2, y: padY + gridH, signalPhase: 'NS', signalTimer: 5, isAdaptive: false },
            { id: 6, name: "Salida Huamantla", x: padX + gridW * 3, y: padY + gridH, signalPhase: 'NS', signalTimer: 0, isAdaptive: false },
            { id: 7, name: "Hospitales IMSS/ISSSTE", x: padX + gridW * 2, y: padY + gridH * 2, signalPhase: 'EW', signalTimer: 20, isAdaptive: false },
            { id: 8, name: "Blvd. Emilio Sánchez Piedras", x: padX + gridW, y: padY, signalPhase: 'NS', signalTimer: 10, isAdaptive: false },
            { id: 9, name: "Zona Comercial Norte", x: padX + gridW * 2, y: padY, signalPhase: 'EW', signalTimer: 25, isAdaptive: false },
            { id: 10, name: "Paso Desnivel Sur", x: padX + gridW * 3, y: padY + gridH * 2, signalPhase: 'NS', signalTimer: 0, isAdaptive: false }
        ];

        const rawEdges = [
            { from: 0, to: 1, cap: 1600, t0: 2.5 },
            { from: 1, to: 2, cap: 1200, t0: 3.0 },
            { from: 1, to: 3, cap: 2200, t0: 1.5 },
            { from: 0, to: 4, cap: 1400, t0: 3.5 },
            { from: 3, to: 8, cap: 1500, t0: 2.0 },
            { from: 8, to: 9, cap: 1300, t0: 2.2 },
            { from: 3, to: 4, cap: 1800, t0: 2.0 },
            { from: 3, to: 5, cap: 2500, t0: 1.8 },
            { from: 4, to: 7, cap: 1600, t0: 2.5 },
            { from: 5, to: 9, cap: 1200, t0: 2.0 },
            { from: 5, to: 6, cap: 2000, t0: 1.5 },
            { from: 5, to: 7, cap: 1700, t0: 2.2 },
            { from: 7, to: 10, cap: 1500, t0: 2.0 },
            { from: 6, to: 10, cap: 1800, t0: 1.8 }
        ];

        this.edges = rawEdges.map(e => ({
            from: e.from,
            to: e.to,
            capacity: e.cap,
            baseCapacity: e.cap,
            flow: e.cap * 0.4,
            freeFlowTime: e.t0,
            isBlocked: false,
            hasAccident: false
        }));

        if (this.isBraessActive) {
            this.addBraessBypass();
        }
    }

    addBraessBypass() {
        // Vía rápida directa entre Salida Tlaxcala (0) y Salida Huamantla (6)
        this.edges.push({
            from: 0,
            to: 6,
            capacity: 3500,
            baseCapacity: 3500,
            flow: 1200,
            freeFlowTime: 1.0,
            isBlocked: false,
            hasAccident: false,
            isBraessBypass: true
        });
    }

    initFleet(count: number) {
        this.vehicles = [];
        for (let i = 0; i < count; i++) {
            const edgeIndex = Math.floor(Math.random() * this.edges.length);
            const randType = Math.random();
            
            let type: VehicleType = 'CAR';
            let length = 12;
            let color = '#3b82f6';
            let pcuFactor = 1.0;

            if (randType > 0.85) {
                type = 'TRUCK';
                length = 20;
                color = '#f59e0b';
                pcuFactor = 2.2;
            } else if (randType > 0.68) {
                type = 'BUS';
                length = 16;
                color = '#ec4899';
                pcuFactor = 1.8;
            }

            this.vehicles.push({
                edgeIndex,
                progress: Math.random(),
                speed: 0.005,
                type,
                length,
                color,
                pcuFactor,
                stopTimer: 0
            });
        }
    }

    populateODSelectors() {
        const selectOrigin = document.getElementById('select-origin') as HTMLSelectElement | null;
        const selectDest = document.getElementById('select-destination') as HTMLSelectElement | null;

        if (selectOrigin && selectDest) {
            selectOrigin.innerHTML = '';
            selectDest.innerHTML = '';

            this.nodes.forEach(node => {
                const opt1 = document.createElement('option');
                opt1.value = node.id.toString();
                opt1.innerText = `${node.id}: ${node.name}`;
                selectOrigin.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = node.id.toString();
                opt2.innerText = `${node.id}: ${node.name}`;
                selectDest.appendChild(opt2);
            });

            selectOrigin.value = this.originNodeId.toString();
            selectDest.value = this.destinationNodeId.toString();

            selectOrigin.addEventListener('change', (e) => {
                this.originNodeId = parseInt((e.target as HTMLSelectElement).value, 10);
                this.calculateOptimalPath();
            });

            selectDest.addEventListener('change', (e) => {
                this.destinationNodeId = parseInt((e.target as HTMLSelectElement).value, 10);
                this.calculateOptimalPath();
            });
        }
    }

    getBPRRatio(flow: number, capacity: number): number {
        return capacity > 0 ? flow / capacity : 999;
    }

    getBPRTime(edge: GraphEdge): number {
        if (edge.isBlocked) return Infinity;
        const ratio = this.getBPRRatio(edge.flow, edge.capacity);
        return edge.freeFlowTime * (1.0 + 0.15 * Math.pow(ratio, 4));
    }

    getMarginalBPRTime(edge: GraphEdge): number {
        if (edge.isBlocked) return Infinity;
        const ratio = this.getBPRRatio(edge.flow, edge.capacity);
        return edge.freeFlowTime * (1.0 + 0.75 * Math.pow(ratio, 4));
    }

    getBPRColor(edge: GraphEdge): string {
        if (edge.isBlocked) return '#30363d';
        if (edge.hasAccident) return '#ff0055';
        if (edge.isBraessBypass) return '#a855f7'; // Púrpura neón para la Paradoja de Braess
        const ratio = this.getBPRRatio(edge.flow, edge.capacity);
        if (ratio < 0.5) return '#2ea043';
        if (ratio < 0.8) return '#d29922';
        return '#f85149';
    }

    calculateOptimalPath() {
        this.activePathEdges.clear();
        if (this.originNodeId === this.destinationNodeId) return;

        const distances: { [key: number]: number } = {};
        const previous: { [key: number]: { node: number, edgeIdx: number } | null } = {};
        const unvisited = new Set<number>();

        this.nodes.forEach(node => {
            distances[node.id] = Infinity;
            previous[node.id] = null;
            unvisited.add(node.id);
        });

        distances[this.originNodeId] = 0;

        while (unvisited.size > 0) {
            let current: number | null = null;
            let minDistance = Infinity;

            unvisited.forEach(nodeId => {
                if (distances[nodeId] < minDistance) {
                    minDistance = distances[nodeId];
                    current = nodeId;
                }
            });

            if (current === null || current === this.destinationNodeId) break;
            unvisited.delete(current);

            this.edges.forEach((edge, edgeIdx) => {
                if (edge.from === current && unvisited.has(edge.to) && !edge.isBlocked) {
                    const weight = this.routingStrategy === 'EGOISTIC' 
                        ? this.getBPRTime(edge) 
                        : this.getMarginalBPRTime(edge);

                    const alt = distances[current!] + weight;
                    if (alt < distances[edge.to]) {
                        distances[edge.to] = alt;
                        previous[edge.to] = { node: current!, edgeIdx };
                    }
                }
            });
        }

        // Reconstruir camino 
        let curr: number | null = this.destinationNodeId; 
        while (curr !== null && previous[curr] !== null && previous[curr] !== undefined) 
            { this.activePathEdges.add(previous[curr]!.edgeIdx); 
                curr = previous[curr]!.node; }
    }

    setupCameraControls() {
        const viewport = document.getElementById('viewport');

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
            const newZoom = Math.max(0.5, Math.min(4.0, this.zoom * zoomFactor));

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
            this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
            this.zoom = newZoom;
        });

        viewport?.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                const rect = this.canvas.getBoundingClientRect();
                const screenX = e.clientX - rect.left;
                const screenY = e.clientY - rect.top;

                const worldX = (screenX - this.panX) / this.zoom;
                const worldY = (screenY - this.panY) / this.zoom;

                let clickedEdge = false;
                this.edges.forEach((edge) => {
                    const n1 = this.nodes[edge.from];
                    const n2 = this.nodes[edge.to];
                    const dist = this.pointToSegmentDistance(worldX, worldY, n1.x, n1.y, n2.x, n2.y);
                    if (dist < 15 / this.zoom) {
                        clickedEdge = true;
                        if (!edge.hasAccident && !edge.isBlocked) {
                            edge.hasAccident = true;
                            edge.capacity = edge.baseCapacity * 0.2;
                        } else if (edge.hasAccident) {
                            edge.hasAccident = false;
                            edge.isBlocked = true;
                            edge.capacity = 0;
                        } else {
                            edge.isBlocked = false;
                            edge.capacity = edge.baseCapacity;
                        }
                        this.recalculateFlows();
                        this.calculateOptimalPath();
                    }
                });

                if (!clickedEdge) {
                    this.isDragging = true;
                    this.dragStartX = e.clientX - this.panX;
                    this.dragStartY = e.clientY - this.panY;
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.panX = e.clientX - this.dragStartX;
                this.panY = e.clientY - this.dragStartY;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }

    recalculateFlows() {
        let divertedFlow = 0;
        const activeEdges: number[] = [];

        this.edges.forEach((edge, idx) => {
            if (edge.isBlocked) {
                divertedFlow += edge.flow;
                edge.flow = 0;
            } else {
                activeEdges.push(idx);
            }
        });

        if (activeEdges.length > 0 && divertedFlow > 0) {
            const extraPerEdge = divertedFlow / activeEdges.length;
            activeEdges.forEach(idx => {
                this.edges[idx].flow += extraPerEdge;
            });
        }
    }

    // Actualizar flujo por Hora del Día (Reloj Circadiano)
    updateHourlyDemand() {
        let hourMultiplier = 1.0;
        const peakElem = document.getElementById('peak-status');

        if (this.currentHour >= 7 && this.currentHour <= 9) {
            hourMultiplier = 2.2; // Hora Pico Matutina
            if (peakElem) peakElem.innerText = "🔥 Hora Pico Matutina (Escuelas / Trabajo)";
        } else if (this.currentHour >= 13 && this.currentHour <= 15) {
            hourMultiplier = 1.8; // Hora Pico Mediodía
            if (peakElem) peakElem.innerText = "⚠️ Hora Pico Mediodía (Salida Escolar / Mercado)";
        } else if (this.currentHour >= 18 && this.currentHour <= 20) {
            hourMultiplier = 2.0; // Hora Pico Vespertina
            if (peakElem) peakElem.innerText = "🌆 Hora Pico Vespertina (Regreso Residencia)";
        } else {
            hourMultiplier = 0.6; // Valle / Tráfico Fluido
            if (peakElem) peakElem.innerText = "🟢 Horario Valle (Tráfico Regulado)";
        }

        const baseDemand = 1200;
        const dynamicFlow = baseDemand * hourMultiplier;

        this.edges.forEach((edge, idx) => {
            if (!edge.isBlocked) {
                edge.flow = dynamicFlow * (0.4 + (idx % 4) * 0.2);
            }
        });
    }

    setupControls() {
        const timeSlider = document.getElementById('time-slider') as HTMLInputElement | null;
        const timeDisplay = document.getElementById('time-display') as HTMLSpanElement | null;
        const btnStep = document.getElementById('btn-step') as HTMLButtonElement | null;
        const btnClear = document.getElementById('btn-clear-events') as HTMLButtonElement | null;
        const btnEgo = document.getElementById('btn-mode-ego') as HTMLButtonElement | null;
        const btnIA = document.getElementById('btn-mode-ia') as HTMLButtonElement | null;
        const btnBraess = document.getElementById('btn-braess') as HTMLButtonElement | null;
        const btnSemFixed = document.getElementById('btn-sem-fixed') as HTMLButtonElement | null;
        const btnSemAdaptive = document.getElementById('btn-sem-adaptive') as HTMLButtonElement | null;
        const chkNight = document.getElementById('chk-night') as HTMLInputElement | null;
        const chkHeatmap = document.getElementById('chk-heatmap') as HTMLInputElement | null;
        const btnExport = document.getElementById('btn-export-csv') as HTMLButtonElement | null;

        if (timeSlider && timeDisplay) {
            timeSlider.addEventListener('input', (e) => {
                this.currentHour = parseFloat((e.target as HTMLInputElement).value);
                const hrs = Math.floor(this.currentHour);
                const mins = (this.currentHour % 1) === 0 ? "00" : "30";
                const period = hrs >= 12 ? "PM" : "AM";
                const displayHrs = hrs > 12 ? hrs - 12 : hrs;
                timeDisplay.innerText = `${displayHrs.toString().padStart(2, '0')}:${mins} ${period}`;
                
                this.updateHourlyDemand();
                this.calculateOptimalPath();
            });
        }

        if (btnStep) {
            btnStep.addEventListener('click', () => {
                this.isRunning = !this.isRunning;
                btnStep.innerText = this.isRunning ? "Pausar Simulación" : "Reanudar Simulación";
            });
        }

        if (btnClear) {
            btnClear.addEventListener('click', () => {
                this.edges.forEach(edge => {
                    edge.isBlocked = false;
                    edge.hasAccident = false;
                    edge.capacity = edge.baseCapacity;
                });
                this.recalculateFlows();
                this.calculateOptimalPath();
            });
        }

        if (btnBraess) {
            btnBraess.addEventListener('click', () => {
                this.isBraessActive = !this.isBraessActive;
                btnBraess.innerText = this.isBraessActive ? "🧪 Quitar Vía Exprés (Braess)" : "🧪 Activar Paradoja de Braess (Vía Exprés)";
                this.initApizacoGraph();
                this.calculateOptimalPath();
            });
        }

        if (btnEgo && btnIA) {
            btnEgo.addEventListener('click', () => {
                this.routingStrategy = 'EGOISTIC';
                btnEgo.classList.add('active');
                btnIA.classList.remove('active');
                this.calculateOptimalPath();
            });

            btnIA.addEventListener('click', () => {
                this.routingStrategy = 'SOCIAL_OPTIMAL';
                btnIA.classList.add('active');
                btnEgo.classList.remove('active');
                this.calculateOptimalPath();
            });
        }

        if (btnSemFixed && btnSemAdaptive) {
            btnSemFixed.addEventListener('click', () => {
                this.isAdaptiveTrafficLights = false;
                btnSemFixed.classList.add('active');
                btnSemAdaptive.classList.remove('active');
            });

            btnSemAdaptive.addEventListener('click', () => {
                this.isAdaptiveTrafficLights = true;
                btnSemAdaptive.classList.add('active');
                btnSemFixed.classList.remove('active');
            });
        }

        if (chkNight) {
            chkNight.addEventListener('change', (e) => {
                this.isNightMode = (e.target as HTMLInputElement).checked;
            });
        }

        if (chkHeatmap) {
            chkHeatmap.addEventListener('change', (e) => {
                this.showHeatmap = (e.target as HTMLInputElement).checked;
            });
        }

        if (btnExport) {
            btnExport.addEventListener('click', () => this.exportCSVReport());
        }
    }

    exportCSVReport() {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID_Origen,ID_Destino,Nombre_Tramo,Flujo_vh,Capacidad_vh,Ratio_vc,Tiempo_BPR_min,Nivel_Servicio_LOS\n";

        this.edges.forEach((edge) => {
            const n1 = this.nodes[edge.from];
            const n2 = this.nodes[edge.to];
            const ratio = this.getBPRRatio(edge.flow, edge.capacity);
            const tBPR = this.getBPRTime(edge);
            
            let los = "A";
            if (ratio > 1.0) los = "F";
            else if (ratio > 0.85) los = "E";
            else if (ratio > 0.70) los = "D";
            else if (ratio > 0.55) los = "C";
            else if (ratio > 0.40) los = "B";

            csvContent += `${edge.from},${edge.to},"${n1.name} -> ${n2.name}",${Math.round(edge.flow)},${edge.capacity},${ratio.toFixed(2)},${tBPR === Infinity ? 'BLOCKED' : tBPR.toFixed(2)},LOS ${los}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `apizaco_traffic_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    updateTrafficLights() {
        this.nodes.forEach(node => {
            node.signalTimer++;
            
            if (this.isAdaptiveTrafficLights) {
                const incomingEdges = this.edges.filter(e => e.to === node.id);
                let totalRatio = 0;
                incomingEdges.forEach(e => totalRatio += this.getBPRRatio(e.flow, e.capacity));
                const avgRatio = incomingEdges.length > 0 ? totalRatio / incomingEdges.length : 0.5;

                const dynamicThreshold = 30 + Math.floor(avgRatio * 40);
                if (node.signalTimer > dynamicThreshold) {
                    node.signalTimer = 0;
                    node.signalPhase = node.signalPhase === 'NS' ? 'EW' : 'NS';
                }
            } else {
                if (node.signalTimer > 60) {
                    node.signalTimer = 0;
                    node.signalPhase = node.signalPhase === 'NS' ? 'EW' : 'NS';
                }
            }
        });
    }

    updateMetrics() {
        let totalTravelTime = 0;
        let totalFlow = 0;
        let totalCapacity = 0;
        let validEdges = 0;

        this.edges.forEach(edge => {
            if (!edge.isBlocked) {
                totalTravelTime += this.getBPRTime(edge);
                totalFlow += edge.flow;
                totalCapacity += edge.capacity;
                validEdges++;
            }
        });

        const avgTime = validEdges > 0 ? totalTravelTime / validEdges : 0;
        const globalSaturation = totalCapacity > 0 ? (totalFlow / totalCapacity) * 100 : 100;
        const avgDelay = this.isAdaptiveTrafficLights ? 8.2 : 18.5;

        const avgTimeElem = document.getElementById('metric-avg-time');
        const saturationElem = document.getElementById('metric-saturation');
        const delayElem = document.getElementById('metric-delay');
        const losElem = document.getElementById('metric-los');

        if (avgTimeElem) avgTimeElem.innerText = `${avgTime.toFixed(2)} min`;
        if (saturationElem) saturationElem.innerText = `${globalSaturation.toFixed(1)}%`;
        if (delayElem) delayElem.innerText = `${avgDelay.toFixed(1)} s`;

        if (losElem) {
            if (globalSaturation < 40) {
                losElem.innerText = "LOS A";
                losElem.style.color = "#2ea043";
            } else if (globalSaturation < 60) {
                losElem.innerText = "LOS B";
                losElem.style.color = "#2ea043";
            } else if (globalSaturation < 75) {
                losElem.innerText = "LOS C";
                losElem.style.color = "#d29922";
            } else if (globalSaturation < 90) {
                losElem.innerText = "LOS D";
                losElem.style.color = "#d29922";
            } else {
                losElem.innerText = "LOS F";
                losElem.style.color = "#f85149";
            }
        }
    }

    updateVehicles() {
        this.vehicles.forEach(vehicle => {
            const edge = this.edges[vehicle.edgeIndex];
            
            // Si es un Autobús y está haciendo parada en estación
            if (vehicle.type === 'BUS' && vehicle.stopTimer > 0) {
                vehicle.stopTimer--;
                return;
            }

            if (edge.isBlocked) {
                const possibleEdges = this.edges
                    .map((e, index) => ({ edge: e, index }))
                    .filter(item => !item.edge.isBlocked);

                if (possibleEdges.length > 0) {
                    vehicle.edgeIndex = possibleEdges[Math.floor(Math.random() * possibleEdges.length)].index;
                    vehicle.progress = 0;
                }
                return;
            }

            const ratio = this.getBPRRatio(edge.flow, edge.capacity);
            const baseSpeed = 0.008;
            const bprFactor = 1.0 / (1.0 + 0.15 * Math.pow(ratio, 4));
            vehicle.speed = Math.max(0.0004, (baseSpeed / vehicle.pcuFactor) * bprFactor);

            vehicle.progress += vehicle.speed;

            if (vehicle.progress >= 1.0) {
                vehicle.progress = 0;
                const nextNode = edge.to;

                // Parada de autobús aleatoria en Mercado Guadalupe (4) o La Maquinita (3)
                if (vehicle.type === 'BUS' && (nextNode === 4 || nextNode === 3) && Math.random() > 0.5) {
                    vehicle.stopTimer = 80; // Detener 80 frames
                }

                const possibleEdges = this.edges
                    .map((e, index) => ({ edge: e, index }))
                    .filter(item => item.edge.from === nextNode && !item.edge.isBlocked);

                if (possibleEdges.length > 0) {
                    const nextEdgeChoice = possibleEdges[Math.floor(Math.random() * possibleEdges.length)];
                    vehicle.edgeIndex = nextEdgeChoice.index;
                } else {
                    const unblockedEdges = this.edges
                        .map((e, index) => ({ edge: e, index }))
                        .filter(item => !item.edge.isBlocked);
                    if (unblockedEdges.length > 0) {
                        vehicle.edgeIndex = unblockedEdges[Math.floor(Math.random() * unblockedEdges.length)].index;
                    }
                }
            }
        });
    }

    drawHeatmap() {
        this.edges.forEach(edge => {
            if (edge.isBlocked) return;
            const n1 = this.nodes[edge.from];
            const n2 = this.nodes[edge.to];
            const ratio = this.getBPRRatio(edge.flow, edge.capacity);

            const midX = (n1.x + n2.x) / 2;
            const midY = (n1.y + n2.y) / 2;

            const gradient = this.ctx.createRadialGradient(midX, midY, 5, midX, midY, 75);
            
            if (ratio > 0.8) {
                gradient.addColorStop(0, 'rgba(248, 81, 73, 0.35)');
                gradient.addColorStop(1, 'rgba(248, 81, 73, 0)');
            } else if (ratio > 0.5) {
                gradient.addColorStop(0, 'rgba(210, 153, 34, 0.25)');
                gradient.addColorStop(1, 'rgba(210, 153, 34, 0)');
            } else {
                gradient.addColorStop(0, 'rgba(46, 160, 67, 0.15)');
                gradient.addColorStop(1, 'rgba(46, 160, 67, 0)');
            }

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(midX, midY, 75, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    // Renderizado del Auto con Luces y Faros Nocturnos
    drawCar(x: number, y: number, angle: number, vehicle: Vehicle) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // Haces de luz de faros en modo nocturno
        if (this.isNightMode) {
            const headlight = this.ctx.createRadialGradient(8, 0, 1, 28, 0, 18);
            headlight.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
            headlight.addColorStop(1, 'rgba(254, 240, 138, 0)');

            this.ctx.fillStyle = headlight;
            this.ctx.beginPath();
            this.ctx.moveTo(8, -2);
            this.ctx.lineTo(32, -12);
            this.ctx.lineTo(32, 12);
            this.ctx.lineTo(8, 2);
            this.ctx.closePath();
            this.ctx.fill();
        }

        // Chasis
        this.ctx.fillStyle = vehicle.color;
        this.ctx.beginPath();
        this.ctx.roundRect(-vehicle.length / 2, -3.5, vehicle.length, 7, 2);
        this.ctx.fill();

        // Techo
        this.ctx.fillStyle = '#1e293b';
        this.ctx.beginPath();
        this.ctx.roundRect(-2, -2.5, vehicle.length * 0.4, 5, 1);
        this.ctx.fill();

        // Luces traseras Rojas
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(-vehicle.length / 2, -3, 1.5, 1.5);
        this.ctx.fillRect(-vehicle.length / 2, 1.5, 1.5, 1.5);

        this.ctx.restore();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        if (this.showHeatmap) {
            this.drawHeatmap();
        }

        // 1. Dibujar Calles
        this.edges.forEach((edge, idx) => {
            const n1 = this.nodes[edge.from];
            const n2 = this.nodes[edge.to];
            const isPath = this.activePathEdges.has(idx);

            const color = isPath ? '#00f0ff' : this.getBPRColor(edge);

            this.ctx.beginPath();
            this.ctx.moveTo(n1.x, n1.y);
            this.ctx.lineTo(n2.x, n2.y);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = isPath ? 12 : (edge.isBraessBypass ? 10 : 8);
            
            if (isPath) {
                this.ctx.shadowColor = '#00f0ff';
                this.ctx.shadowBlur = 14;
            } else if (edge.hasAccident) {
                this.ctx.shadowColor = '#ff0055';
                this.ctx.shadowBlur = 10;
            } else if (edge.isBraessBypass) {
                this.ctx.shadowColor = '#a855f7';
                this.ctx.shadowBlur = 12;
            }
            
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            const midX = (n1.x + n2.x) / 2;
            const midY = (n1.y + n2.y) / 2;
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px sans-serif';

            if (edge.isBlocked) {
                this.ctx.fillStyle = '#f85149';
                this.ctx.fillText("⛔ CERRADO", midX - 25, midY - 8);
            } else if (edge.hasAccident) {
                this.ctx.fillStyle = '#ff0055';
                this.ctx.fillText("⚠️ ACCIDENTE", midX - 30, midY - 8);
            } else if (edge.isBraessBypass) {
                this.ctx.fillStyle = '#a855f7';
                this.ctx.fillText("⚡ VÍA EXPRÉS BRAESS", midX - 45, midY - 8);
            } else {
                this.ctx.fillText(`${Math.round(edge.flow)}/${edge.capacity} v/h`, midX - 20, midY - 8);
            }
        });

        // 2. Dibujar Vehículos
        this.vehicles.forEach(vehicle => {
            const edge = this.edges[vehicle.edgeIndex];
            if (edge.isBlocked) return;

            const n1 = this.nodes[edge.from];
            const n2 = this.nodes[edge.to];

            const vx = n1.x + (n2.x - n1.x) * vehicle.progress;
            const vy = n1.y + (n2.y - n1.y) * vehicle.progress;
            
            const angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);

            this.drawCar(vx, vy, angle, vehicle);
        });

        // 3. Dibujar Intersecciones y Semáforos
        this.nodes.forEach(node => {
            const isOrigin = node.id === this.originNodeId;
            const isDest = node.id === this.destinationNodeId;

            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 13, 0, Math.PI * 2);
            
            if (isOrigin) {
                this.ctx.fillStyle = '#2ea043';
            } else if (isDest) {
                this.ctx.fillStyle = '#f85149';
            } else {
                this.ctx.fillStyle = '#1f6beb';
            }

            this.ctx.fill();
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Indicador de Semáforo
            this.ctx.beginPath();
            this.ctx.arc(node.x + 10, node.y - 10, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = node.signalPhase === 'NS' ? '#2ea043' : '#f85149';
            this.ctx.fill();

            this.ctx.fillStyle = '#c9d1d9';
            this.ctx.font = '11px sans-serif';
            this.ctx.fillText(node.name, node.x - 35, node.y + 24);
        });

        this.ctx.restore();
    }

    loop = () => {
        if (this.isRunning) {
            this.updateTrafficLights();
            this.updateVehicles();
            this.updateMetrics();
            this.draw();
        }
        requestAnimationFrame(this.loop);
    };
}

window.addEventListener('DOMContentLoaded', () => {
    new TrafficSimulator('traffic-canvas');
});