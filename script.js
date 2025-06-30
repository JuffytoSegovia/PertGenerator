let activities = [];
let nodes = {};
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };

function addRow() {
    const tbody = document.querySelector('#activitiesTable tbody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" value="" class="activity-name" oninput="convertToUpperCase(this)"></td>
        <td><input type="number" value="" class="activity-duration"></td>
        <td><input type="text" value="" class="activity-predecessors" oninput="convertToUpperCase(this)"></td>
        <td><button class="btn btn-danger" onclick="removeRow(this)">X</button></td>
    `;
    tbody.appendChild(newRow);
}

function removeRow(button) {
    const tbody = document.querySelector('#activitiesTable tbody');
    const rows = tbody.querySelectorAll('tr');
    
    if (rows.length <= 1) {
        alert('Debe mantener al menos una fila para agregar actividades.');
        return;
    }
    
    button.closest('tr').remove();
}

function convertToUpperCase(input) {
    const cursorPosition = input.selectionStart;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(cursorPosition, cursorPosition);
}

function clearAll() {
    if (confirm('¿Estás seguro de que quieres limpiar todos los datos?')) {
        const rows = document.querySelectorAll('#activitiesTable tbody tr');
        rows.forEach(row => {
            row.querySelector('.activity-name').value = '';
            row.querySelector('.activity-duration').value = '';
            row.querySelector('.activity-predecessors').value = '';
        });
        
        document.getElementById('diagramContainer').style.display = 'none';
        document.getElementById('criticalPathInfo').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
    }
}

function removeAllRows() {
    if (confirm('¿Estás seguro de que quieres eliminar todas las filas excepto la primera?')) {
        const tbody = document.querySelector('#activitiesTable tbody');
        const rows = tbody.querySelectorAll('tr');
        
        for (let i = rows.length - 1; i > 0; i--) {
            rows[i].remove();
        }
        
        const firstRow = tbody.querySelector('tr');
        firstRow.querySelector('.activity-name').value = '';
        firstRow.querySelector('.activity-duration').value = '';
        firstRow.querySelector('.activity-predecessors').value = '';
        
        document.getElementById('diagramContainer').style.display = 'none';
        document.getElementById('criticalPathInfo').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
    }
}

function collectActivities() {
    activities = [];
    const rows = document.querySelectorAll('#activitiesTable tbody tr');
    const activityNames = new Set();
    const errors = [];
    
    rows.forEach((row, index) => {
        const name = row.querySelector('.activity-name').value.trim().toUpperCase();
        const duration = parseInt(row.querySelector('.activity-duration').value) || 0;
        const predecessorsText = row.querySelector('.activity-predecessors').value.trim().toUpperCase();
        const predecessors = predecessorsText ? predecessorsText.split(',').map(p => p.trim()).filter(p => p) : [];
        
        if (name) {
            // CAMBIO: Permitir duración >= 0 (incluyendo 0 para hitos/nodos ficticios)
            if (duration < 0) {
                errors.push(`La actividad "${name}" no puede tener duración negativa.`);
                return;
            }
            
            if (activityNames.has(name)) {
                errors.push(`La actividad "${name}" está duplicada.`);
                return;
            }
            
            if (predecessors.includes(name)) {
                errors.push(`La actividad "${name}" no puede ser predecesora de sí misma.`);
                return;
            }
            
            activityNames.add(name);
            activities.push({ name, duration, predecessors });
        }
    });
    
    activities.forEach(activity => {
        activity.predecessors.forEach(pred => {
            if (!activityNames.has(pred)) {
                errors.push(`La actividad predecesora "${pred}" de "${activity.name}" no existe.`);
            }
        });
    });
    
    if (hasCyclicDependencies()) {
        errors.push('Se detectaron dependencias cíclicas en las actividades.');
    }
    
    if (errors.length > 0) {
        alert('Errores encontrados:\n\n' + errors.join('\n'));
        return false;
    }
    
    console.log('Actividades recolectadas:', activities);
    return true;
}

function hasCyclicDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    
    function dfs(activity) {
        if (recursionStack.has(activity.name)) {
            return true;
        }
        
        if (visited.has(activity.name)) {
            return false;
        }
        
        visited.add(activity.name);
        recursionStack.add(activity.name);
        
        for (let predName of activity.predecessors) {
            const predActivity = activities.find(act => act.name === predName);
            if (predActivity && dfs(predActivity)) {
                return true;
            }
        }
        
        recursionStack.delete(activity.name);
        return false;
    }
    
    for (let activity of activities) {
        if (dfs(activity)) {
            return true;
        }
    }
    
    return false;
}

function calculatePERT() {
    console.log('=== INICIANDO CÁLCULO PERT ===');
    const activityMap = {};
    
    // Inicializar actividades
    activities.forEach(activity => {
        activityMap[activity.name] = {
            ...activity,
            te: 0, // Tiempo temprano de inicio
            tf: 0, // Tiempo temprano de fin
            tl: -1, // Tiempo tardío de fin (inicializar en -1 para detectar no calculados)
            ti: 0, // Tiempo tardío de inicio
            slack: 0,
            isCritical: false
        };
    });

    console.log('Actividades inicializadas:', activityMap);

    // FORWARD PASS: Calcular TE y TF
    console.log('--- FORWARD PASS ---');
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 100) {
        changed = false;
        iterations++;
        
        activities.forEach(activity => {
            const act = activityMap[activity.name];
            let maxPredFinish = 0;
            
            activity.predecessors.forEach(predName => {
                if (activityMap[predName]) {
                    maxPredFinish = Math.max(maxPredFinish, activityMap[predName].tf);
                }
            });
            
            const newTE = maxPredFinish;
            const newTF = newTE + activity.duration;
            
            if (newTE !== act.te || newTF !== act.tf) {
                act.te = newTE;
                act.tf = newTF;
                changed = true;
                console.log(`${activity.name}: TE=${newTE}, TF=${newTF}`);
            }
        });
    }
    
    console.log('Forward pass completado en', iterations, 'iteraciones');

    // Encontrar duración total del proyecto
    const projectDuration = Math.max(...activities.map(a => activityMap[a.name].tf));
    console.log('Duración total del proyecto:', projectDuration);

    // BACKWARD PASS: Calcular TL y TI
    console.log('--- BACKWARD PASS ---');
    
    // Inicializar TL para actividades sin sucesoras
    activities.forEach(activity => {
        const hasSuccessors = activities.some(act => 
            act.predecessors.includes(activity.name)
        );
        
        if (!hasSuccessors) {
            activityMap[activity.name].tl = projectDuration;
            console.log(`${activity.name} no tiene sucesoras, TL = ${projectDuration}`);
        }
    });

    // Calcular TL para las demás actividades
    changed = true;
    iterations = 0;
    while (changed && iterations < 100) {
        changed = false;
        iterations++;
        
        activities.forEach(activity => {
            const act = activityMap[activity.name];
            
            if (act.tl === -1) {
                const successors = activities.filter(a => 
                    a.predecessors.includes(activity.name)
                );
                
                if (successors.length > 0) {
                    const successorTLs = successors.map(s => {
                        const succAct = activityMap[s.name];
                        return succAct.tl !== -1 ? succAct.tl - s.duration : Infinity;
                    });
                    
                    if (!successorTLs.includes(Infinity)) {
                        const minTL = Math.min(...successorTLs);
                        act.tl = minTL;
                        changed = true;
                        console.log(`${activity.name}: TL = ${minTL}`);
                    }
                }
            }
        });
    }

    console.log('Backward pass completado en', iterations, 'iteraciones');

    // Calcular TI, Holgura e identificar ruta crítica
    activities.forEach(activity => {
        const act = activityMap[activity.name];
        act.ti = act.tl - activity.duration;
        act.slack = act.ti - act.te;
        act.isCritical = Math.abs(act.slack) < 0.0001;
        
        console.log(`${activity.name}: TI=${act.ti}, Slack=${act.slack}, Crítica=${act.isCritical}`);
    });

    // Calcular tiempos PERT (To, Tm, Tp, σ, Varianza)
    activities.forEach(activity => {
        const act = activityMap[activity.name];
        
        // Cálculos PERT
        act.to = Math.max(1, activity.duration - 1);  // Tiempo optimista (mínimo 1)
        act.tm = activity.duration;                    // Tiempo más probable
        act.tp = activity.duration + 2;                // Tiempo pesimista
        act.te = activity.duration;                    // Tiempo esperado (ya lo teníamos)
        
        // Desviación estándar y varianza
        act.sigma = (act.tp - act.to) / 6;
        act.variance = Math.pow(act.sigma, 2);
        
        console.log(`${activity.name}: To=${act.to}, Tm=${act.tm}, Tp=${act.tp}, σ=${act.sigma.toFixed(2)}, Var=${act.variance.toFixed(2)}`);
    });

    console.log('=== CÁLCULO PERT COMPLETADO ===');
    console.log('Resultado final:', activityMap);

    return { activityMap, projectDuration };
}

function findCriticalPath(activityMap) {
    const criticalActivities = activities.filter(act => activityMap[act.name].isCritical);
    criticalActivities.sort((a, b) => activityMap[a.name].te - activityMap[b.name].te);
    return criticalActivities.map(act => act.name);
}

function createLegend() {
    const legendHtml = `
        <div id="legendContainer" style="position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 350px;">
            <div id="legendToggle" style="background: #667eea; color: white; padding: 10px 15px; border-radius: 8px 8px 0 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold;">📊 Leyenda PERT</span>
                <span id="toggleIcon" style="font-size: 18px;">▼</span>
            </div>
            <div id="legendContent" style="background: white; border: 2px solid #667eea; border-top: none; border-radius: 0 0 8px 8px; padding: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); max-height: 70vh; overflow-y: auto;">
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <!-- Nodo Normal -->
                    <div style="display: flex; align-items: center; gap: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="48" fill="#e3f2fd" stroke="#1976d2" stroke-width="3"/>
                            <text x="50" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#1a1a1a">Act</text>
                            <line x1="15" y1="35" x2="85" y2="35" stroke="#666" stroke-width="1"/>
                            <text x="25" y="50" text-anchor="middle" font-size="10" font-weight="600">TE</text>
                            <text x="50" y="50" text-anchor="middle" font-size="10" font-weight="600">Dur</text>
                            <text x="75" y="50" text-anchor="middle" font-size="10" font-weight="600">TF</text>
                            <line x1="15" y1="60" x2="85" y2="60" stroke="#666" stroke-width="1"/>
                            <text x="25" y="75" text-anchor="middle" font-size="10" font-weight="600">TI</text>
                            <text x="50" y="75" text-anchor="middle" font-size="10" font-weight="600">Hol</text>
                            <text x="75" y="75" text-anchor="middle" font-size="10" font-weight="600">TL</text>
                        </svg>
                        <div style="flex: 1;">
                            <p style="font-weight: bold; margin: 0 0 5px 0; color: #1976d2;">Nodo Normal</p>
                            <p style="font-size: 11px; margin: 2px 0;"><b>TE:</b> Tiempo temprano inicio</p>
                            <p style="font-size: 11px; margin: 2px 0;"><b>TF:</b> Tiempo temprano fin</p>
                            <p style="font-size: 11px; margin: 2px 0;"><b>TI:</b> Tiempo tardío inicio</p>
                            <p style="font-size: 11px; margin: 2px 0;"><b>TL:</b> Tiempo tardío fin</p>
                            <p style="font-size: 11px; margin: 2px 0;"><b>Dur:</b> Duración</p>
                            <p style="font-size: 11px; margin: 2px 0;"><b>Hol:</b> Holgura</p>
                        </div>
                    </div>
                    
                    <!-- Nodo Crítico -->
                    <div style="display: flex; align-items: center; gap: 15px; padding: 10px; background: #ffebee; border-radius: 8px;">
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="48" fill="#ffebee" stroke="#d32f2f" stroke-width="4"/>
                            <text x="50" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#d32f2f">Act</text>
                            <line x1="15" y1="35" x2="85" y2="35" stroke="#d32f2f" stroke-width="1"/>
                            <text x="25" y="50" text-anchor="middle" font-size="10" font-weight="600" fill="#d32f2f">TE</text>
                            <text x="50" y="50" text-anchor="middle" font-size="10" font-weight="600" fill="#d32f2f">Dur</text>
                            <text x="75" y="50" text-anchor="middle" font-size="10" font-weight="600" fill="#d32f2f">TF</text>
                            <line x1="15" y1="60" x2="85" y2="60" stroke="#d32f2f" stroke-width="1"/>
                            <text x="25" y="75" text-anchor="middle" font-size="10" font-weight="600" fill="#d32f2f">TI</text>
                            <text x="50" y="75" text-anchor="middle" font-size="10" font-weight="600" fill="#d32f2f">0</text>
                            <text x="75" y="75" text-anchor="middle" font-size="10" font-weight="600" fill="#d32f2f">TL</text>
                        </svg>
                        <div style="flex: 1;">
                            <p style="font-weight: bold; margin: 0 0 5px 0; color: #d32f2f;">Nodo Crítico</p>
                            <p style="font-size: 11px; margin: 2px 0; color: #d32f2f;"><b>Holgura = 0</b></p>
                            <p style="font-size: 11px; margin: 2px 0;">Parte de la ruta crítica</p>
                            <p style="font-size: 11px; margin: 2px 0;">Sin margen de retraso</p>
                        </div>
                    </div>
                    
                    <!-- Nodos Especiales -->
                    <div style="display: flex; align-items: center; gap: 15px; padding: 10px; background: #f3e5f5; border-radius: 8px;">
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="48" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="3"/>
                            <text x="50" y="40" text-anchor="middle" font-size="12" font-weight="bold" fill="#7b1fa2">INICIO</text>
                            <text x="50" y="60" text-anchor="middle" font-size="12" font-weight="bold" fill="#7b1fa2">FIN</text>
                        </svg>
                        <div style="flex: 1;">
                            <p style="font-weight: bold; margin: 0 0 5px 0; color: #7b1fa2;">Nodos INICIO/FIN</p>
                            <p style="font-size: 11px; margin: 2px 0;">Duración = 0</p>
                            <p style="font-size: 11px; margin: 2px 0;">Marcan límites del proyecto</p>
                            <p style="font-size: 11px; margin: 2px 0;">No movibles</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar el HTML al body en lugar del contenedor del diagrama
    const existingLegend = document.getElementById('legendContainer');
    if (existingLegend) {
        existingLegend.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', legendHtml);
    
    // Agregar funcionalidad de colapsar/expandir
    const toggleBtn = document.getElementById('legendToggle');
    const content = document.getElementById('legendContent');
    const icon = document.getElementById('toggleIcon');
    
    toggleBtn.addEventListener('click', () => {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.textContent = '▼';
        } else {
            content.style.display = 'none';
            icon.textContent = '▶';
        }
    });
    
    return ''; // Retornar string vacío porque ya no va dentro del diagrama
}

function createNode(activity, activityData, x, y, isStartEnd = false) {
    const node = document.createElement('div');
    node.className = `node ${activityData.isCritical ? 'critical' : ''} ${isStartEnd ? 'start-end' : ''}`;
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node.id = `node-${activity}`;
    
    node.innerHTML = `
        <div class="node-activity">${activity}</div>
        <div class="node-separator"></div>
        <div class="node-row">
            <span>${activityData.te}</span>
            <span>${activityData.duration}</span>
            <span>${activityData.tf}</span>
        </div>
        <div class="node-row">
            <span>${activityData.ti}</span>
            <span>${activityData.slack}</span>
            <span>${activityData.tl}</span>
        </div>
    `;
    
    if (!isStartEnd) {
        node.addEventListener('mousedown', startDrag);
    } else {
        node.style.cursor = 'default';
    }
    
    return node;
}

function startDrag(e) {
    draggedNode = e.currentTarget;
    const rect = draggedNode.getBoundingClientRect();
    const containerRect = document.getElementById('diagramContainer').getBoundingClientRect();
    const container = document.getElementById('diagramContainer');
    
    // Considerar el scroll del contenedor
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    draggedNode.style.zIndex = '1000';
    e.preventDefault();
}

function drag(e) {
    if (!draggedNode) return;
    
    const container = document.getElementById('diagramContainer');
    const containerRect = container.getBoundingClientRect();
    
    // Calcular posición considerando el scroll del contenedor
    const x = e.clientX - containerRect.left - dragOffset.x + container.scrollLeft;
    const y = e.clientY - containerRect.top - dragOffset.y + container.scrollTop;
    
    // Límites considerando el área total scrolleable
    const maxX = container.scrollWidth - 120;
    const maxY = container.scrollHeight - 120;
    
    // Asegurar que el nodo no se salga de los límites
    const finalX = Math.max(0, Math.min(x, maxX));
    const finalY = Math.max(0, Math.min(y, maxY));
    
    draggedNode.style.left = finalX + 'px';
    draggedNode.style.top = finalY + 'px';
    
    updateArrows();
}

function stopDrag() {
    if (draggedNode) {
        draggedNode.style.zIndex = '10';
        draggedNode = null;
    }
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

function drawArrow(fromNode, toNode, isCritical = false) {
    const svg = document.getElementById('arrowsSvg');
    
    const fromX = parseFloat(fromNode.style.left) + 60;
    const fromY = parseFloat(fromNode.style.top) + 60;
    const toX = parseFloat(toNode.style.left) + 60;
    const toY = parseFloat(toNode.style.top) + 60;
    
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const radius = 60;
    
    const startX = fromX + Math.cos(angle) * radius;
    const startY = fromY + Math.sin(angle) * radius;
    const endX = toX - Math.cos(angle) * radius;
    const endY = toY - Math.sin(angle) * radius;
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('stroke', isCritical ? '#d32f2f' : '#333');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', isCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)');
    
    svg.appendChild(line);
}

function updateArrows() {
    const svg = document.getElementById('arrowsSvg');
    const container = document.getElementById('diagramContainer');
    
    // Asegurar que el SVG cubra toda el área scrolleable
    svg.style.width = Math.max(container.scrollWidth, container.clientWidth) + 'px';
    svg.style.height = Math.max(container.scrollHeight, container.clientHeight) + 'px';
    
    svg.innerHTML = `
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
            </marker>
            <marker id="arrowhead-critical" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#d32f2f" />
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

function generateDiagram() {
    if (!collectActivities()) {
        return;
    }
    
    if (activities.length === 0) {
        alert('Por favor, añade al menos una actividad.');
        return;
    }
    
    const { activityMap, projectDuration } = calculatePERT();
    const criticalPath = findCriticalPath(activityMap);
    
    nodes = activityMap;
    
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

    // Crear leyenda (ahora se agrega al body)
    createLegend();

    // Limpiar contenedor del diagrama y configurar SVG
    container.innerHTML = '<svg id="arrowsSvg" style="position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;"></svg>';  
    container.style.display = 'block';
    
    // Calcular dimensiones necesarias para el contenedor
    const positions = calculateNodePositions(projectDuration);
    
    // Encontrar las dimensiones máximas necesarias
    let maxX = 0;
    let maxY = 0;
    
    Object.values(positions).forEach(pos => {
        maxX = Math.max(maxX, pos.x + 150);
        maxY = Math.max(maxY, pos.y + 150 + 120);
    });
    
    // Configurar dimensiones del contenedor para scroll adecuado
    const containerWidth = Math.max(maxX + 200, 1200); // Mínimo 1200px de ancho
    const containerHeight = Math.max(maxY + 200, 800);  // Mínimo 800px de alto
    
    // Configurar el contenedor sin restricciones de altura máxima
    container.style.width = '100%';
    container.style.height = 'auto';
    container.style.minHeight = '600px';
    container.style.overflowX = 'auto';
    container.style.overflowY = 'auto';
    
    // Crear un div interno que contenga todo el diagrama con las dimensiones reales
    const innerContent = document.createElement('div');
    innerContent.style.position = 'relative';
    innerContent.style.width = containerWidth + 'px';
    innerContent.style.height = containerHeight + 'px';
    innerContent.style.minWidth = containerWidth + 'px';
    innerContent.style.minHeight = containerHeight + 'px';
    
    // Mover el SVG al contenedor interno
    const svg = container.querySelector('#arrowsSvg');
    container.removeChild(svg);
    innerContent.appendChild(svg);
    container.appendChild(innerContent);
    
    // Crear nodo INICIO
    const startNode = createNode('INICIO', nodes['INICIO'], positions['INICIO'].x, positions['INICIO'].y + 150, true);
    innerContent.appendChild(startNode);
    
    // Crear nodos de actividades
    activities.forEach((activity) => {
        const pos = positions[activity.name];
        const node = createNode(activity.name, activityMap[activity.name], pos.x, pos.y + 150);
        innerContent.appendChild(node);
    });
    
    // Crear nodo FIN
    const endNode = createNode('FIN', nodes['FIN'], positions['FIN'].x, positions['FIN'].y + 150, true);
    innerContent.appendChild(endNode);
    
    // Dibujar flechas después de que los nodos estén en el DOM
    setTimeout(() => {
        updateArrows();
    }, 100);
    
    // Mostrar información de ruta crítica
    document.getElementById('criticalPathText').textContent = 'INICIO → ' + criticalPath.join(' → ') + ' → FIN';
    document.getElementById('projectDuration').textContent = projectDuration;
    document.getElementById('criticalPathInfo').style.display = 'block';
    
    // Mostrar tabla de resultados
    displayResultsTable(activityMap);
}

function calculateNodePositions(projectDuration) {
    const positions = {};
    const levels = {};
    
    activities.forEach(activity => {
        if (activity.predecessors.length === 0) {
            levels[activity.name] = 1;
        }
    });
    
    let maxLevel = 1;
    let changed = true;
    while (changed) {
        changed = false;
        activities.forEach(activity => {
            if (levels[activity.name] === undefined) {
                let maxPredLevel = 0;
                let allPredsHaveLevel = true;
                
                activity.predecessors.forEach(pred => {
                    if (levels[pred] === undefined) {
                        allPredsHaveLevel = false;
                    } else {
                        maxPredLevel = Math.max(maxPredLevel, levels[pred]);
                    }
                });
                
                if (allPredsHaveLevel && maxPredLevel >= 0) {
                    levels[activity.name] = maxPredLevel + 1;
                    maxLevel = Math.max(maxLevel, levels[activity.name]);
                    changed = true;
                }
            }
        });
    }
    
    levels['INICIO'] = 0;
    levels['FIN'] = maxLevel + 1;
    
    const levelCounts = {};
    Object.values(levels).forEach(level => {
        levelCounts[level] = (levelCounts[level] || 0) + 1;
    });
    
    const levelPositions = {};
    const minVerticalSpacing = 180;
    
    // Calcular posiciones de actividades con mejor distribución vertical
    Object.keys(levels).forEach(activityName => {
        if (activityName === 'INICIO' || activityName === 'FIN') return;
        
        const level = levels[activityName];
        if (!levelPositions[level]) {
            levelPositions[level] = 0;
        }
        
        const x = 50 + level * 250; // Aumentar espaciado horizontal
        
        // Mejorar el cálculo de Y para evitar superposiciones
        const nodesInLevel = levelCounts[level];
        const totalHeight = Math.max(500, (nodesInLevel - 1) * minVerticalSpacing);
        const startY = 50 + (700 - totalHeight) / 2; // Ajustar para mayor altura
        const y = startY + levelPositions[level] * minVerticalSpacing;
        
        positions[activityName] = { x, y };
        levelPositions[level]++;
    });
    
    // Separar nodos críticos y no críticos en el mismo nivel
    Object.keys(levelCounts).forEach(level => {
        level = parseInt(level);
        if (level === 0 || level === maxLevel + 1) return;
        
        const activitiesInLevel = activities.filter(act => levels[act.name] === level);
        if (activitiesInLevel.length <= 1) return;
        
        const criticalInLevel = activitiesInLevel.filter(act => nodes[act.name]?.isCritical);
        const nonCriticalInLevel = activitiesInLevel.filter(act => !nodes[act.name]?.isCritical);
        
        if (criticalInLevel.length > 0 && nonCriticalInLevel.length > 0) {
            const totalNodes = activitiesInLevel.length;
            const totalHeight = Math.max(500, (totalNodes - 1) * minVerticalSpacing);
            const startY = 50 + (700 - totalHeight) / 2;
            
            criticalInLevel.forEach((activity, index) => {
                positions[activity.name].y = startY + index * minVerticalSpacing;
            });
            
            nonCriticalInLevel.forEach((activity, index) => {
                positions[activity.name].y = startY + (criticalInLevel.length + index) * minVerticalSpacing;
            });
        }
    });
    
    // Calcular Y promedio de actividades críticas para alinear INICIO y FIN
    const criticalActivities = activities.filter(act => nodes[act.name]?.isCritical);
    let avgCriticalY = 350; // valor por defecto centrado
    
    if (criticalActivities.length > 0) {
        const criticalYPositions = criticalActivities.map(act => positions[act.name].y);
        avgCriticalY = criticalYPositions.reduce((sum, y) => sum + y, 0) / criticalYPositions.length;
    }
    
    // Posicionar INICIO y FIN alineados con la ruta crítica
    positions['INICIO'] = { x: 50, y: avgCriticalY };
    positions['FIN'] = { x: 50 + (maxLevel + 1) * 250, y: avgCriticalY };
    
    return positions;
}

function displayResultsTable(activityMap) {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';
    
    activities.forEach(activity => {
        const data = activityMap[activity.name];
        const row = document.createElement('tr');
        if (data.isCritical) {
            row.style.backgroundColor = '#ffebee';
        }
        row.innerHTML = `
            <td>${activity.name}</td>
            <td>${activity.duration}</td>
            <td>${activity.predecessors.join(', ') || '-'}</td>
            <td>${data.te}</td>
            <td>${data.tf}</td>
            <td>${data.tl}</td>
            <td>${data.ti}</td>
            <td>${data.slack.toFixed(2)}</td>
            <td style="color: ${data.isCritical ? '#d32f2f' : '#666'}; font-weight: ${data.isCritical ? 'bold' : 'normal'}">
                ${data.isCritical ? 'SÍ' : 'NO'}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    const resultsSection = document.getElementById('resultsSection');
    
    // Verificar si ya existe la tabla PERT y eliminarla si es así
    const existingPertTable = document.getElementById('pertTableContainer');
    if (existingPertTable) {
        existingPertTable.remove();
    }
    
    const existingStats = document.getElementById('projectStats');
    if (existingStats) {
        existingStats.remove();
    }
    
    // Crear tabla PERT adicional
    const pertTableHtml = `
        <div id="pertTableContainer" style="margin-top: 30px;">
            <h3>Tabla de Tiempos PERT</h3>
            <div class="table-container">
                <table id="pertTable">
                    <thead>
                        <tr>
                            <th>Actividad</th>
                            <th>To (Optimista)</th>
                            <th>Tm (Más Probable)</th>
                            <th>Tp (Pesimista)</th>
                            <th>Te (Esperado)</th>
                            <th>σ (Desv. Estándar)</th>
                            <th>σ² (Varianza)</th>
                        </tr>
                    </thead>
                    <tbody id="pertTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;

    resultsSection.insertAdjacentHTML('beforeend', pertTableHtml);

    // Llenar tabla PERT
    const pertBody = document.getElementById('pertTableBody');
    activities.forEach(activity => {
        const act = activityMap[activity.name];
        const row = document.createElement('tr');
        if (act.isCritical) {
            row.style.backgroundColor = '#ffebee';
            row.style.fontWeight = 'bold';
        }
        
        row.innerHTML = `
            <td>${activity.name}</td>
            <td>${act.to}</td>
            <td>${act.tm}</td>
            <td>${act.tp}</td>
            <td>${act.te}</td>
            <td>${act.sigma.toFixed(3)}</td>
            <td>${act.variance.toFixed(3)}</td>
        `;
        
        pertBody.appendChild(row);
    });

    // Calcular y mostrar estadísticas del proyecto
    const criticalActivities = activities.filter(act => activityMap[act.name].isCritical);
    const projectVariance = criticalActivities.reduce((sum, act) => sum + activityMap[act.name].variance, 0);
    const projectSigma = Math.sqrt(projectVariance);
    const projectDuration = Math.max(...activities.map(a => activityMap[a.name].tf));

    const statsHtml = `
        <div id="projectStats" style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; border: 2px solid #1976d2;">
            <h4 style="margin-bottom: 10px; color: #1565c0;">Estadísticas del Proyecto</h4>
            <p><strong>Varianza total del proyecto (ruta crítica):</strong> ${projectVariance.toFixed(3)}</p>
            <p><strong>Desviación estándar del proyecto:</strong> ${projectSigma.toFixed(3)}</p>
            <p><strong>Rango de duración esperada:</strong></p>
            <ul>
                <li>68% de probabilidad: ${(projectDuration - projectSigma).toFixed(1)} - ${(projectDuration + projectSigma).toFixed(1)} días</li>
                <li>95% de probabilidad: ${(projectDuration - 2*projectSigma).toFixed(1)} - ${(projectDuration + 2*projectSigma).toFixed(1)} días</li>
                <li>99.7% de probabilidad: ${(projectDuration - 3*projectSigma).toFixed(1)} - ${(projectDuration + 3*projectSigma).toFixed(1)} días</li>
            </ul>
        </div>
    `;

    resultsSection.insertAdjacentHTML('beforeend', statsHtml);
    
    resultsSection.style.display = 'block';
}

window.addEventListener('load', function() {
    const activityInputs = document.querySelectorAll('.activity-name, .activity-predecessors');
    activityInputs.forEach(input => {
        input.addEventListener('input', function() {
            convertToUpperCase(this);
        });
    });
});


// Función para manejar la carga de archivos
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
        handleCSVFile(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        handleExcelFile(file);
    } else {
        alert('Por favor, selecciona un archivo CSV o Excel (.xlsx, .xls)');
    }
    
    // Limpiar el input para permitir cargar el mismo archivo de nuevo
    event.target.value = '';
}

// Manejar archivos CSV
function handleCSVFile(file) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processImportedData(results.data);
        },
        error: function(error) {
            alert('Error al leer el archivo CSV: ' + error.message);
        }
    });
}

// Manejar archivos Excel
function handleExcelFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Tomar la primera hoja
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convertir a JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Procesar datos
            if (jsonData.length > 0) {
                const headers = jsonData[0];
                const dataRows = jsonData.slice(1).filter(row => row.length > 0);
                
                const formattedData = dataRows.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index] || '';
                    });
                    return obj;
                });
                
                processImportedData(formattedData);
            }
        } catch (error) {
            alert('Error al leer el archivo Excel: ' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Procesar los datos importados
function processImportedData(data) {
    if (!data || data.length === 0) {
        alert('El archivo está vacío o no contiene datos válidos.');
        return;
    }
    
    // Verificar que existan las columnas necesarias
    const firstRow = data[0];
    const requiredColumns = ['Actividad', 'Duración', 'Predecesoras'];
    
    // Intentar encontrar las columnas con diferentes variaciones
    const columnMapping = {};
    requiredColumns.forEach(col => {
        const variations = [
            col,
            col.toLowerCase(),
            col.toUpperCase(),
            col.replace('ó', 'o'),
            'Duracion',
            'Duration'
        ];
        
        for (let key in firstRow) {
            if (variations.some(v => key.includes(v))) {
                columnMapping[col] = key;
                break;
            }
        }
    });
    
    // Verificar que se encontraron todas las columnas
    const missingColumns = requiredColumns.filter(col => !columnMapping[col]);
    if (missingColumns.length > 0) {
        alert('El archivo no contiene las columnas requeridas: ' + missingColumns.join(', '));
        return;
    }
    
    // Limpiar la tabla actual
    const tbody = document.querySelector('#activitiesTable tbody');
    tbody.innerHTML = '';
    
    // Agregar los datos a la tabla
    data.forEach((row, index) => {
        const actividad = row[columnMapping['Actividad']] || '';
        const duracion = row[columnMapping['Duración']] || '';
        const predecesoras = row[columnMapping['Predecesoras']] || '';
        
        // Solo agregar filas con actividad no vacía
        if (actividad.trim()) {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" class="activity-name" value="${actividad}"></td>
                <td><input type="number" class="activity-duration" value="${duracion}"></td>
                <td><input type="text" class="activity-predecessors" value="${predecesoras}"></td>
                <td><button class="btn btn-danger" onclick="removeRow(this)">X</button></td>
            `;
            tbody.appendChild(newRow);
        }
    });
    
    // Mostrar mensaje de éxito
    const rowCount = tbody.children.length;
    alert(`Se importaron exitosamente ${rowCount} actividades del archivo.`);
}

// Función para autoajustar nodos de manera más compacta
function autoAdjustNodes() {
    const container = document.getElementById('diagramContainer');
    const innerContent = container.querySelector('div');
    
    if (!container || !innerContent || activities.length === 0) {
        alert('Primero genera el diagrama PERT');
        return;
    }

    // Recalcular posiciones con espaciado más compacto
    const compactPositions = calculateCompactNodePositions();
    
    // Aplicar las nuevas posiciones a los nodos existentes
    Object.keys(compactPositions).forEach(nodeId => {
        const node = document.getElementById(`node-${nodeId}`);
        if (node) {
            const pos = compactPositions[nodeId];
            node.style.left = pos.x + 'px';
            node.style.top = pos.y + 'px';
        }
    });

    // Ajustar el tamaño del contenedor interno a las nuevas dimensiones
    let maxX = 0;
    let maxY = 0;
    
    Object.values(compactPositions).forEach(pos => {
        maxX = Math.max(maxX, pos.x + 120);
        maxY = Math.max(maxY, pos.y + 120);
    });
    
    // Ajustar dimensiones del contenedor interno
    const newWidth = maxX + 200;
    const newHeight = maxY + 200;
    
    innerContent.style.width = newWidth + 'px';
    innerContent.style.height = newHeight + 'px';
    innerContent.style.minWidth = newWidth + 'px';
    innerContent.style.minHeight = newHeight + 'px';
    
    // Actualizar flechas después del reposicionamiento
    setTimeout(() => {
        updateArrows();
    }, 100);
}

// Función para calcular posiciones más compactas
function calculateCompactNodePositions() {
    const positions = {};
    const levels = {};
    
    // Calcular niveles (igual que antes)
    activities.forEach(activity => {
        if (activity.predecessors.length === 0) {
            levels[activity.name] = 1;
        }
    });
    
    let maxLevel = 1;
    let changed = true;
    while (changed) {
        changed = false;
        activities.forEach(activity => {
            if (levels[activity.name] === undefined) {
                let maxPredLevel = 0;
                let allPredsHaveLevel = true;
                
                activity.predecessors.forEach(pred => {
                    if (levels[pred] === undefined) {
                        allPredsHaveLevel = false;
                    } else {
                        maxPredLevel = Math.max(maxPredLevel, levels[pred]);
                    }
                });
                
                if (allPredsHaveLevel && maxPredLevel >= 0) {
                    levels[activity.name] = maxPredLevel + 1;
                    maxLevel = Math.max(maxLevel, levels[activity.name]);
                    changed = true;
                }
            }
        });
    }
    
    levels['INICIO'] = 0;
    levels['FIN'] = maxLevel + 1;
    
    const levelCounts = {};
    Object.values(levels).forEach(level => {
        levelCounts[level] = (levelCounts[level] || 0) + 1;
    });
    
    const levelPositions = {};
    const compactVerticalSpacing = 140; // Espaciado vertical más compacto
    const compactHorizontalSpacing = 180; // Espaciado horizontal más compacto
    
    // Calcular posiciones compactas
    Object.keys(levels).forEach(activityName => {
        if (activityName === 'INICIO' || activityName === 'FIN') return;
        
        const level = levels[activityName];
        if (!levelPositions[level]) {
            levelPositions[level] = 0;
        }
        
        const x = 50 + level * compactHorizontalSpacing;
        
        // Distribución vertical más compacta
        const nodesInLevel = levelCounts[level];
        const totalHeight = Math.max(200, (nodesInLevel - 1) * compactVerticalSpacing);
        const startY = 50 + Math.max(0, (400 - totalHeight) / 2);
        const y = startY + levelPositions[level] * compactVerticalSpacing;
        
        positions[activityName] = { x, y };
        levelPositions[level]++;
    });
    
    // Separar nodos críticos y no críticos con espaciado compacto
    Object.keys(levelCounts).forEach(level => {
        level = parseInt(level);
        if (level === 0 || level === maxLevel + 1) return;
        
        const activitiesInLevel = activities.filter(act => levels[act.name] === level);
        if (activitiesInLevel.length <= 1) return;
        
        const criticalInLevel = activitiesInLevel.filter(act => nodes[act.name]?.isCritical);
        const nonCriticalInLevel = activitiesInLevel.filter(act => !nodes[act.name]?.isCritical);
        
        if (criticalInLevel.length > 0 && nonCriticalInLevel.length > 0) {
            const totalNodes = activitiesInLevel.length;
            const totalHeight = Math.max(200, (totalNodes - 1) * compactVerticalSpacing);
            const startY = 50 + Math.max(0, (400 - totalHeight) / 2);
            
            criticalInLevel.forEach((activity, index) => {
                positions[activity.name].y = startY + index * compactVerticalSpacing;
            });
            
            nonCriticalInLevel.forEach((activity, index) => {
                positions[activity.name].y = startY + (criticalInLevel.length + index) * compactVerticalSpacing;
            });
        }
    });
    
    // Calcular Y promedio de actividades críticas para INICIO y FIN
    const criticalActivities = activities.filter(act => nodes[act.name]?.isCritical);
    let avgCriticalY = 250; // valor por defecto
    
    if (criticalActivities.length > 0) {
        const criticalYPositions = criticalActivities.map(act => positions[act.name].y);
        avgCriticalY = criticalYPositions.reduce((sum, y) => sum + y, 0) / criticalYPositions.length;
    }
    
    // Posicionar INICIO y FIN
    positions['INICIO'] = { x: 50, y: avgCriticalY };
    positions['FIN'] = { x: 50 + (maxLevel + 1) * compactHorizontalSpacing, y: avgCriticalY };
    
    return positions;
}

// Funciones mejoradas para manejo de descarga
function showDownloadOptions() {
    const container = document.getElementById('diagramContainer');
    if (!container || container.style.display === 'none' || activities.length === 0) {
        alert('Primero genera el diagrama PERT para poder descargarlo');
        return;
    }
    
    document.getElementById('downloadModal').style.display = 'block';
}

function closeDownloadModal() {
    document.getElementById('downloadModal').style.display = 'none';
}

function downloadDiagram(format) {
    const container = document.getElementById('diagramContainer');
    const innerContent = container.querySelector('div');
    
    if (!container || !innerContent) {
        alert('No hay diagrama para descargar');
        return;
    }

    // Ocultar temporalmente la leyenda
    const legend = document.getElementById('legendContainer');
    const legendWasVisible = legend && legend.style.display !== 'none';
    if (legend && legendWasVisible) {
        legend.style.display = 'none';
    }

    // Mostrar indicador de carga
    const loadingDiv = createLoadingIndicator();
    document.body.appendChild(loadingDiv);

    // Usar método directo de canvas en lugar de html2canvas
    setTimeout(() => {
        try {
            createDiagramCanvas(innerContent, format, loadingDiv, legend, legendWasVisible);
        } catch (error) {
            console.error('Error en captura directa:', error);
            tryHtml2Canvas(innerContent, format, loadingDiv, legend, legendWasVisible);
        }
    }, 500);
}

function createLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 3000; text-align: center; max-width: 300px;">
            <div style="margin-bottom: 20px; font-size: 18px; font-weight: 600; color: #333;">📸 Creando imagen...</div>
            <div style="margin-bottom: 15px; color: #666;">Procesando diagrama PERT</div>
            <div style="border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    return loadingDiv;
}

function createDiagramCanvas(innerContent, format, loadingDiv, legend, legendWasVisible) {
    // Obtener dimensiones del contenido
    const width = innerContent.offsetWidth;
    const height = innerContent.offsetHeight;
    
    // Crear canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Configurar canvas con alta resolución
    const scale = 2; // Para mejor calidad
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(scale, scale);
    
    // Fondo
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    
    // Obtener todos los nodos
    const nodes = innerContent.querySelectorAll('.node');
    
    // Dibujar conexiones primero (flechas)
    drawConnectionsOnCanvas(ctx, nodes);
    
    // Dibujar nodos encima
    nodes.forEach(node => {
        drawDetailedNodeOnCanvas(ctx, node);
    });
    
    // Procesar resultado
    processCanvasResult(canvas, format, loadingDiv, legend, legendWasVisible);
}

function drawConnectionsOnCanvas(ctx, nodes) {
    // Configurar estilo de líneas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Dibujar flechas desde INICIO
    const startNode = Array.from(nodes).find(node => node.id === 'node-INICIO');
    if (startNode) {
        activities.forEach(activity => {
            if (activity.predecessors.length === 0) {
                const toNode = Array.from(nodes).find(node => node.id === `node-${activity.name}`);
                if (toNode) {
                    const isCritical = nodes[activity.name]?.isCritical;
                    drawCanvasArrow(ctx, startNode, toNode, isCritical);
                }
            }
        });
    }
    
    // Dibujar flechas entre actividades
    activities.forEach(activity => {
        activity.predecessors.forEach(predName => {
            const fromNode = Array.from(nodes).find(node => node.id === `node-${predName}`);
            const toNode = Array.from(nodes).find(node => node.id === `node-${activity.name}`);
            if (fromNode && toNode) {
                const isCritical = nodes[predName]?.isCritical && nodes[activity.name]?.isCritical;
                drawCanvasArrow(ctx, fromNode, toNode, isCritical);
            }
        });
    });
    
    // Dibujar flechas hacia FIN
    const endNode = Array.from(nodes).find(node => node.id === 'node-FIN');
    if (endNode) {
        activities.forEach(activity => {
            const hasSuccessors = activities.some(act => act.predecessors.includes(activity.name));
            if (!hasSuccessors) {
                const fromNode = Array.from(nodes).find(node => node.id === `node-${activity.name}`);
                if (fromNode) {
                    const isCritical = nodes[activity.name]?.isCritical;
                    drawCanvasArrow(ctx, fromNode, endNode, isCritical);
                }
            }
        });
    }
}

function drawCanvasArrow(ctx, fromNode, toNode, isCritical = false) {
    const fromX = parseInt(fromNode.style.left) + 60;
    const fromY = parseInt(fromNode.style.top) + 60;
    const toX = parseInt(toNode.style.left) + 60;
    const toY = parseInt(toNode.style.top) + 60;
    
    // Calcular puntos en el borde de los círculos
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const radius = 60;
    
    const startX = fromX + Math.cos(angle) * radius;
    const startY = fromY + Math.sin(angle) * radius;
    const endX = toX - Math.cos(angle) * radius;
    const endY = toY - Math.sin(angle) * radius;
    
    // Configurar estilo
    ctx.strokeStyle = isCritical ? '#d32f2f' : '#333333';
    ctx.lineWidth = 3;
    
    // Dibujar línea
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Dibujar punta de flecha
    const headLength = 12;
    const headAngle = Math.PI / 6;
    
    ctx.fillStyle = isCritical ? '#d32f2f' : '#333333';
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - headLength * Math.cos(angle - headAngle),
        endY - headLength * Math.sin(angle - headAngle)
    );
    ctx.lineTo(
        endX - headLength * Math.cos(angle + headAngle),
        endY - headLength * Math.sin(angle + headAngle)
    );
    ctx.closePath();
    ctx.fill();
}

function drawDetailedNodeOnCanvas(ctx, node) {
    const x = parseInt(node.style.left);
    const y = parseInt(node.style.top);
    const radius = 60;
    const centerX = x + radius;
    const centerY = y + radius;
    
    // Determinar colores según el tipo de nodo
    let fillColor = '#e3f2fd';
    let strokeColor = '#1976d2';
    let strokeWidth = 4;
    
    if (node.classList.contains('critical')) {
        fillColor = '#ffebee';
        strokeColor = '#d32f2f';
        strokeWidth = 5;
    } else if (node.classList.contains('start-end')) {
        fillColor = '#f3e5f5';
        strokeColor = '#7b1fa2';
    }
    
    // Dibujar círculo principal
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - strokeWidth/2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Configurar texto
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Nombre de la actividad
    const activityName = node.querySelector('.node-activity').textContent;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(activityName, centerX, y + 20); // Subir más el nombre
    
    // Líneas divisoras
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    
    // Línea superior - ajustar posición
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 32); // Ajustar para que quede dentro del círculo
    ctx.lineTo(x + 102, y + 32);
    ctx.stroke();
    
    // Línea inferior - ajustar posición
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 88); // Subir para que quede dentro del círculo
    ctx.lineTo(x + 102, y + 88);
    ctx.stroke();
    
    // Datos del nodo
    const rows = node.querySelectorAll('.node-row');
    ctx.font = 'bold 11px Arial'; // Reducir un poco el tamaño
    
    if (rows.length >= 2) {
        // Primera fila: TE, Duración, TF - ajustar posición Y
        const firstRow = rows[0].querySelectorAll('span');
        if (firstRow.length >= 3) {
            ctx.fillText(firstRow[0].textContent, x + 27, y + 50); // TE - subir
            ctx.fillText(firstRow[1].textContent, x + 60, y + 50); // Duración - subir
            ctx.fillText(firstRow[2].textContent, x + 93, y + 50); // TF - subir
        }
        
        // Segunda fila: TI, Holgura, TL - ajustar posición Y
        const secondRow = rows[1].querySelectorAll('span');
        if (secondRow.length >= 3) {
            ctx.fillText(secondRow[0].textContent, x + 27, y + 75); // TI - subir considerablemente
            ctx.fillText(secondRow[1].textContent, x + 60, y + 75); // Holgura - subir considerablemente
            ctx.fillText(secondRow[2].textContent, x + 93, y + 75); // TL - subir considerablemente
        }
    }
    
    // Líneas verticales para separar columnas - ajustar posiciones
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    
    // Primera línea vertical
    ctx.beginPath();
    ctx.moveTo(x + 43, y + 32); // Ajustar inicio
    ctx.lineTo(x + 43, y + 88); // Ajustar fin
    ctx.stroke();
    
    // Segunda línea vertical
    ctx.beginPath();
    ctx.moveTo(x + 77, y + 32); // Ajustar inicio
    ctx.lineTo(x + 77, y + 88); // Ajustar fin
    ctx.stroke();
}

function processCanvasResult(canvas, format, loadingDiv, legend, legendWasVisible) {
    try {
        // Remover indicador de carga
        if (loadingDiv && loadingDiv.parentNode) {
            document.body.removeChild(loadingDiv);
        }
        
        // Restaurar leyenda
        if (legend && legendWasVisible) {
            legend.style.display = 'block';
        }
        
        if (format === 'png') {
            downloadCanvasPNG(canvas);
        } else if (format === 'pdf') {
            downloadCanvasPDF(canvas);
        }
        
        closeDownloadModal();
    } catch (error) {
        console.error('Error al procesar canvas:', error);
        handleDownloadFailure(loadingDiv, legend, legendWasVisible);
    }
}

function downloadCanvasPNG(canvas) {
    try {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.download = `diagrama-pert-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        // Forzar descarga
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('PNG descargado exitosamente');
    } catch (error) {
        console.error('Error al descargar PNG:', error);
        alert('Error al descargar PNG. Intenta con el método alternativo.');
    }
}

function downloadCanvasPDF(canvas) {
    try {
        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;
        
        // Dimensiones en mm para PDF
        const imgWidth = canvas.width / 4; // Reducir escala
        const imgHeight = canvas.height / 4;
        
        // Determinar orientación
        const isLandscape = imgWidth > imgHeight;
        
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Calcular dimensiones para ajustar a la página
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);
        
        let finalWidth = imgWidth;
        let finalHeight = imgHeight;
        
        // Escalar si es necesario
        if (finalWidth > maxWidth) {
            const ratio = maxWidth / finalWidth;
            finalWidth = maxWidth;
            finalHeight = finalHeight * ratio;
        }
        
        if (finalHeight > maxHeight) {
            const ratio = maxHeight / finalHeight;
            finalHeight = maxHeight;
            finalWidth = finalWidth * ratio;
        }
        
        // Centrar imagen
        const xPos = (pageWidth - finalWidth) / 2;
        const yPos = (pageHeight - finalHeight) / 2;
        
        pdf.addImage(imgData, 'PNG', xPos, yPos, finalWidth, finalHeight);
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        pdf.save(`diagrama-pert-${timestamp}.pdf`);
        
        console.log('PDF descargado exitosamente');
    } catch (error) {
        console.error('Error al descargar PDF:', error);
        alert('Error al descargar PDF. Intenta con el método alternativo.');
    }
}

function tryHtml2Canvas(innerContent, format, loadingDiv, legend, legendWasVisible) {
    // Método de respaldo usando html2canvas
    const options = {
        backgroundColor: '#f8fafc',
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: innerContent.offsetWidth,
        height: innerContent.offsetHeight,
        onclone: function(clonedDoc) {
            // Mejorar elementos clonados
            const clonedNodes = clonedDoc.querySelectorAll('.node');
            clonedNodes.forEach(node => {
                node.style.position = 'absolute';
                node.style.display = 'flex';
            });
        }
    };

    html2canvas(innerContent, options).then(canvas => {
        processCanvasResult(canvas, format, loadingDiv, legend, legendWasVisible);
    }).catch(error => {
        console.error('html2canvas también falló:', error);
        handleDownloadFailure(loadingDiv, legend, legendWasVisible);
    });
}

function handleDownloadFailure(loadingDiv, legend, legendWasVisible) {
    // Remover indicador de carga
    if (loadingDiv && loadingDiv.parentNode) {
        document.body.removeChild(loadingDiv);
    }
    
    // Restaurar leyenda
    if (legend && legendWasVisible) {
        legend.style.display = 'block';
    }
    
    // Mostrar modal con alternativas
    const alternativeModal = document.createElement('div');
    alternativeModal.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 3000; text-align: center; max-width: 450px;">
            <h3 style="margin-bottom: 20px; color: #d32f2f;">⚠️ Error de Captura Automática</h3>
            <p style="margin-bottom: 20px; color: #666; line-height: 1.5;">No se pudo generar automáticamente la imagen. Prueba estas alternativas:</p>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <button onclick="openPrintView()" style="padding: 12px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">🖨️ Abrir vista de impresión optimizada</button>
                <button onclick="showScreenshotInstructions()" style="padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">📸 Ver instrucciones de captura manual</button>
                <button onclick="exportToSVG()" style="padding: 12px; background: #17a2b8; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">📄 Exportar datos del diagrama</button>
                <button onclick="closeAlternativeModal()" style="padding: 12px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">Cerrar</button>
            </div>
        </div>
    `;
    alternativeModal.id = 'alternativeModal';
    alternativeModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2999;';
    
    document.body.appendChild(alternativeModal);
    closeDownloadModal();
}

function openPrintView() {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    const diagramContainer = document.getElementById('diagramContainer');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Diagrama PERT - Vista de Impresión</title>
            <style>
                body { 
                    margin: 0; 
                    padding: 20px; 
                    font-family: Arial, sans-serif; 
                    background: white;
                }
                .diagram-container { 
                    border: 2px solid #ccc !important; 
                    overflow: visible !important; 
                    max-height: none !important;
                    background: #f8fafc !important;
                    position: relative !important;
                }
                .node { 
                    position: absolute !important;
                    background: #e3f2fd !important;
                    border: 4px solid #1976d2 !important;
                    border-radius: 50% !important;
                    width: 120px !important;
                    height: 120px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: center !important;
                    font-size: 12px !important;
                    font-weight: bold !important;
                    color: #000000 !important;
                }
                .node.critical {
                    background: #ffebee !important;
                    border-color: #d32f2f !important;
                }
                .node.start-end {
                    background: #f3e5f5 !important;
                    border-color: #7b1fa2 !important;
                }
                @media print {
                    body { margin: 0; }
                    .diagram-container { overflow: visible !important; }
                }
                .instructions {
                    background: #e3f2fd;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    border-left: 4px solid #1976d2;
                }
            </style>
        </head>
        <body>
            <div class="instructions">
                <h3>📋 Instrucciones para guardar como imagen:</h3>
                <p><strong>Opción 1:</strong> Usa Ctrl+P y selecciona "Guardar como PDF"</p>
                <p><strong>Opción 2:</strong> Haz clic derecho sobre el diagrama → "Guardar imagen como..."</p>
                <p><strong>Opción 3:</strong> Usa la herramienta de captura de tu navegador o sistema operativo</p>
            </div>
            <h1>Diagrama PERT</h1>
            ${diagramContainer.outerHTML}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    closeAlternativeModal();
}

function showScreenshotInstructions() {
    alert(`📸 INSTRUCCIONES PARA CAPTURA MANUAL:

🖥️ Windows:
• Presiona Windows + Shift + S
• Selecciona el área del diagrama
• La imagen se copiará al portapapeles

🍎 Mac:
• Presiona Cmd + Shift + 4
• Selecciona el área del diagrama
• La imagen se guardará en el escritorio

🌐 Navegador:
• Clic derecho → "Inspeccionar elemento"
• Encuentra el elemento del diagrama
• Clic derecho → "Capturar nodo como imagen"

💡 Tip: Usa el botón "Autoajustar nodos" antes de capturar para obtener una imagen más compacta.`);
    closeAlternativeModal();
}

function exportToSVG() {
    try {
        const container = document.getElementById('diagramContainer');
        const data = {
            activities: activities,
            nodes: nodes,
            timestamp: new Date().toISOString(),
            projectInfo: {
                duration: document.getElementById('projectDuration').textContent,
                criticalPath: document.getElementById('criticalPathText').textContent
            }
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.download = `diagrama-pert-datos-${timestamp}.json`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
        alert('✅ Datos del diagrama exportados exitosamente en formato JSON');
    } catch (error) {
        console.error('Error al exportar datos:', error);
        alert('❌ Error al exportar los datos del diagrama');
    }
    closeAlternativeModal();
}

function closeAlternativeModal() {
    const modal = document.getElementById('alternativeModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Hacer funciones globales
window.openPrintView = openPrintView;
window.showScreenshotInstructions = showScreenshotInstructions;
window.exportToSVG = exportToSVG;
window.closeAlternativeModal = closeAlternativeModal;

