import { activities, nodes } from './data.js';

function createLegend() {
    const legendSvg = `
        <div style="background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: #495057;">Leyenda del Diagrama PERT:</h4>
            <div style="display: flex; align-items: center; gap: 30px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="58" fill="#e3f2fd" stroke="#1976d2" stroke-width="4"/>
                        <text x="60" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#1a1a1a">A</text>
                        <line x1="20" y1="45" x2="100" y2="45" stroke="#666" stroke-width="1"/>
                        <text x="30" y="60" text-anchor="middle" font-size="11" font-weight="600">TE</text>
                        <text x="60" y="60" text-anchor="middle" font-size="11" font-weight="600">Dur</text>
                        <text x="90" y="60" text-anchor="middle" font-size="11" font-weight="600">TF</text>
                        <line x1="20" y1="70" x2="100" y2="70" stroke="#666" stroke-width="1"/>
                        <text x="30" y="85" text-anchor="middle" font-size="11" font-weight="600">TI</text>
                        <text x="60" y="85" text-anchor="middle" font-size="11" font-weight="600">Hol</text>
                        <text x="90" y="85" text-anchor="middle" font-size="11" font-weight="600">TL</text>
                    </svg>
                    <div>
                        <p><strong>Nodo Normal</strong></p>
                        <p style="font-size: 12px; margin: 5px 0;">• TE: Tiempo temprano inicio</p>
                        <p style="font-size: 12px; margin: 5px 0;">• TF: Tiempo temprano fin</p>
                        <p style="font-size: 12px; margin: 5px 0;">• TI: Tiempo tardío inicio</p>
                        <p style="font-size: 12px; margin: 5px 0;">• TL: Tiempo tardío fin</p>
                        <p style="font-size: 12px; margin: 5px 0;">• Dur: Duración</p>
                        <p style="font-size: 12px; margin: 5px 0;">• Hol: Holgura</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="58" fill="#ffebee" stroke="#d32f2f" stroke-width="5"/>
                        <text x="60" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#d32f2f">B</text>
                        <line x1="20" y1="45" x2="100" y2="45" stroke="#d32f2f" stroke-width="1"/>
                        <text x="30" y="60" text-anchor="middle" font-size="11" font-weight="600" fill="#d32f2f">TE</text>
                        <text x="60" y="60" text-anchor="middle" font-size="11" font-weight="600" fill="#d32f2f">Dur</text>
                        <text x="90" y="60" text-anchor="middle" font-size="11" font-weight="600" fill="#d32f2f">TF</text>
                        <line x1="20" y1="70" x2="100" y2="70" stroke="#d32f2f" stroke-width="1"/>
                        <text x="30" y="85" text-anchor="middle" font-size="11" font-weight="600" fill="#d32f2f">TI</text>
                        <text x="60" y="85" text-anchor="middle" font-size="11" font-weight="600" fill="#d32f2f">0</text>
                        <text x="90" y="85" text-anchor="middle" font-size="11" font-weight="600" fill="#d32f2f">TL</text>
                    </svg>
                    <div>
                        <p><strong style="color: #d32f2f;">Nodo Crítico</strong></p>
                        <p style="font-size: 12px; margin: 5px 0; color: #d32f2f;">• Holgura = 0</p>
                        <p style="font-size: 12px; margin: 5px 0; color: #d32f2f;">• Parte de la ruta crítica</p>
                        <p style="font-size: 12px; margin: 5px 0; color: #d32f2f;">• Borde más grueso</p>
                        <p style="font-size: 12px; margin: 5px 0; color: #d32f2f;">• Color rojo</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="58" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="4"/>
                        <text x="60" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#7b1fa2">INICIO</text>
                        <line x1="20" y1="45" x2="100" y2="45" stroke="#7b1fa2" stroke-width="1"/>
                        <text x="60" y="60" text-anchor="middle" font-size="11" font-weight="600" fill="#7b1fa2">0</text>
                        <text x="60" y="85" text-anchor="middle" font-size="11" font-weight="600" fill="#7b1fa2">0</text>
                    </svg>
                    <div>
                        <p><strong style="color: #7b1fa2;">Nodos INICIO/FIN</strong></p>
                        <p style="font-size: 12px; margin: 5px 0; color: #7b1fa2;">• Duración = 0</p>
                        <p style="font-size: 12px; margin: 5px 0; color: #7b1fa2;">• No movibles</p>
                        <p style="font-size: 12px; margin: 5px 0; color: #7b1fa2;">• Color morado</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    return legendSvg;
}

function createNode(activity, activityData, x, y, isStartEnd = false) {
    const node = document.createElement('div');
    node.className = `node ${activityData.isCritical ? 'critical' : ''} ${isStartEnd ? 'start-end' : ''}`;
    node.id = `node-${activity}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    
    if (isStartEnd) {
        node.innerHTML = `
            <div class="node-activity">${activity}</div>
            <div class="node-times">${activityData.te}</div>
            <div class="node-times">${activityData.tf}</div>
        `;
    } else {
        node.innerHTML = `
            <div class="node-activity">${activity}</div>
            <div class="node-separator"></div>
            <div class="node-row">
                <span>${activityData.te}</span>
                <span>${activityData.duration}</span>
                <span>${activityData.tf}</span>
            </div>
            <div class="node-separator"></div>
            <div class="node-row">
                <span>${activityData.ti.toFixed(1)}</span>
                <span>${activityData.slack.toFixed(1)}</span>
                <span>${activityData.tl.toFixed(1)}</span>
            </div>
        `;
    }
    
    if (!isStartEnd) {
        makeDraggable(node);
    }
    
    return node;
}

function calculateNodePositions(projectDuration) {
    const positions = {};
    const levels = {};
    const levelHeight = 200;
    const nodeWidth = 150;
    
    // Asignar niveles basados en TE
    activities.forEach(activity => {
        const te = nodes[activity.name].te;
        if (!levels[te]) {
            levels[te] = [];
        }
        levels[te].push(activity.name);
    });
    
    // Posicionar nodos
    Object.keys(levels).forEach(te => {
        const teNum = parseFloat(te);
        const x = 100 + (teNum / projectDuration) * 900;
        
        levels[te].forEach((actName, index) => {
            positions[actName] = {
                x: x,
                y: 100 + index * levelHeight
            };
        });
    });
    
    // Posiciones para INICIO y FIN
    positions['INICIO'] = { x: 50, y: 250 };
    positions['FIN'] = { x: 1100, y: 250 };
    
    return positions;
}

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        updateArrows();
    }
    
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function drawArrow(fromNode, toNode, isCritical = false) {
    const svg = document.getElementById('arrowsSvg');
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const containerRect = svg.parentElement.getBoundingClientRect();
    
    // Calcular puntos de conexión
    const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
    const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
    const toX = toRect.left + toRect.width / 2 - containerRect.left;
    const toY = toRect.top + toRect.height / 2 - containerRect.top;
    
    // Calcular el punto donde la flecha toca el círculo
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const nodeRadius = 60;
    
    const adjustedFromX = fromX + nodeRadius * Math.cos(angle);
    const adjustedFromY = fromY + nodeRadius * Math.sin(angle);
    const adjustedToX = toX - nodeRadius * Math.cos(angle);
    const adjustedToY = toY - nodeRadius * Math.sin(angle);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', adjustedFromX);
    line.setAttribute('y1', adjustedFromY);
    line.setAttribute('x2', adjustedToX);
    line.setAttribute('y2', adjustedToY);
    line.setAttribute('stroke', isCritical ? '#d32f2f' : '#333');
    line.setAttribute('stroke-width', isCritical ? '4' : '2');
    line.setAttribute('marker-end', isCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)');
    
    svg.appendChild(line);
}

function updateArrows() {
    const svg = document.getElementById('arrowsSvg');
    const container = document.getElementById('diagramContainer');
    
    svg.style.width = container.scrollWidth + 'px';
    svg.style.height = container.scrollHeight + 'px';
    
    svg.innerHTML = `
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
            </marker>
            <marker id="arrowhead-critical" markerWidth="12" markerHeight="8" 
                    refX="10" refY="4" orient="auto">
                <polygon points="0 0, 12 4, 0 8" fill="#d32f2f" />
            </marker>
        </defs>
    `;
    
    // Flechas desde INICIO
    const startNode = document.getElementById('node-INICIO');
    if (startNode) {
        activities.forEach(activity => {
            if (activity.predecessors.length === 0) {
                const toNode = document.getElementById(`node-${activity.name}`);
                if (toNode) {
                    drawArrow(startNode, toNode, nodes[activity.name]?.isCritical);
                }
            }
        });
    }
    
    // Flechas entre actividades
    activities.forEach(activity => {
        activity.predecessors.forEach(predName => {
            const fromNode = document.getElementById(`node-${predName}`);
            const toNode = document.getElementById(`node-${activity.name}`);
            if (fromNode && toNode) {
                const isCritical = nodes[predName]?.isCritical && nodes[activity.name]?.isCritical;
                drawArrow(fromNode, toNode, isCritical);
            }
        });
    });
    
    // Flechas hacia FIN
    const endNode = document.getElementById('node-FIN');
    if (endNode) {
        activities.forEach(activity => {
            const hasSuccessors = activities.some(act => act.predecessors.includes(activity.name));
            if (!hasSuccessors) {
                const fromNode = document.getElementById(`node-${activity.name}`);
                if (fromNode) {
                    drawArrow(fromNode, endNode, nodes[activity.name]?.isCritical);
                }
            }
        });
    }
}

function renderDiagram(activityMap, projectDuration) {
    // Agregar nodos INICIO y FIN
    nodes['INICIO'] = {
        name: 'INICIO',
        duration: 0,
        predecessors: [],
        te: 0,
        tf: 0,
        ti: 0,
        tl: 0,
        slack: 0,
        isCritical: true
    };
    
    nodes['FIN'] = {
        name: 'FIN',
        duration: 0,
        predecessors: [],
        te: projectDuration,
        tf: projectDuration,
        ti: projectDuration,
        tl: projectDuration,
        slack: 0,
        isCritical: true
    };
    
    // Limpiar y crear contenedor del diagrama con leyenda
    const container = document.getElementById('diagramContainer');
    container.innerHTML = createLegend() + '<svg id="arrowsSvg" style="position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;"></svg>';
    container.style.display = 'block';
    
    // Crear nodos con posicionamiento automático
    const positions = calculateNodePositions(projectDuration);
    
    // Crear nodo INICIO
    const startNode = createNode('INICIO', nodes['INICIO'], positions['INICIO'].x, positions['INICIO'].y + 150, true);
    container.appendChild(startNode);
    
    // Crear nodos de actividades
    activities.forEach((activity) => {
        const pos = positions[activity.name];
        const node = createNode(activity.name, activityMap[activity.name], pos.x, pos.y + 150);
        container.appendChild(node);
    });
    
    // Crear nodo FIN
    const endNode = createNode('FIN', nodes['FIN'], positions['FIN'].x, positions['FIN'].y + 150, true);
    container.appendChild(endNode);
    
    // Dibujar flechas después de un pequeño delay para asegurar que los nodos estén renderizados
    setTimeout(updateArrows, 100);
}

export { renderDiagram, updateArrows };