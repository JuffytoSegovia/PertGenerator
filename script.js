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
    
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    draggedNode.style.zIndex = '1000';
    e.preventDefault();
}

function drag(e) {
    if (!draggedNode) return;
    
    const containerRect = document.getElementById('diagramContainer').getBoundingClientRect();
    const x = e.clientX - containerRect.left - dragOffset.x;
    const y = e.clientY - containerRect.top - dragOffset.y;
    
    const maxX = containerRect.width - 120;
    const maxY = containerRect.height - 120;
    
    draggedNode.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    draggedNode.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    
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

    // Limpiar contenedor del diagrama
    container.innerHTML = '<svg id="arrowsSvg" style="position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;"></svg>';  
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
    
    positions['INICIO'] = { x: 50, y: 200 };
    
    Object.keys(levels).forEach(activityName => {
        if (activityName === 'INICIO' || activityName === 'FIN') return;
        
        const level = levels[activityName];
        if (!levelPositions[level]) {
            levelPositions[level] = 0;
        }
        
        const x = 50 + level * 200;
        const y = 50 + (levelPositions[level] * 180) + (300 - levelCounts[level] * 180) / 2;
        
        positions[activityName] = { x, y };
        levelPositions[level]++;
    });
    
    positions['FIN'] = { x: 50 + (maxLevel + 1) * 200, y: 200 };
    
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

