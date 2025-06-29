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
                console.log(`${activity.name}: TE ${act.te}->${newTE}, TF ${act.tf}->${newTF}`);
                act.te = newTE;
                act.tf = newTF;
                changed = true;
            }
        });
    }

    const projectDuration = Math.max(...Object.values(activityMap).map(act => act.tf));
    console.log('Duración total del proyecto:', projectDuration);

    // BACKWARD PASS CORREGIDO
    console.log('--- BACKWARD PASS ---');
    
    // Paso 1: Identificar actividades finales
    const finalActivities = activities.filter(activity => {
        return !activities.some(act => act.predecessors.includes(activity.name));
    });
    
    console.log('Actividades finales:', finalActivities.map(act => act.name));
    
    // Inicializar TL para actividades finales
    finalActivities.forEach(activity => {
        activityMap[activity.name].tl = projectDuration;
        console.log(`${activity.name} es actividad final, TL = ${projectDuration}`);
    });

    // Paso 2: Propagar hacia atrás
    changed = true;
    iterations = 0;
    while (changed && iterations < 100) {
        changed = false;
        iterations++;
        
        activities.forEach(activity => {
            const act = activityMap[activity.name];
            
            // Si ya tiene TL calculado, saltar
            if (act.tl >= 0) return;
            
            // Buscar todos los sucesores
            const successors = activities.filter(succ => 
                succ.predecessors.includes(activity.name)
            );
            
            if (successors.length > 0) {
                // Verificar si TODOS los sucesores tienen TL calculado
                const allSuccessorsCalculated = successors.every(succ => 
                    activityMap[succ.name].tl >= 0
                );
                
                if (allSuccessorsCalculated) {
                    // CORRECCIÓN: TL = MÍNIMO de los TE (no TI) de todos los sucesores
                    const successorTEs = successors.map(succ => {
                        const succData = activityMap[succ.name];
                        console.log(`  Sucesor ${succ.name}: TE=${succData.te}`);
                        return succData.te;
                    });
                    
                    const minTE = Math.min(...successorTEs);
                    act.tl = minTE;
                    changed = true;
                    
                    console.log(`${activity.name}: TL = min(${successorTEs.join(',')}) = ${minTE}`);
                }
            }
        });
    }

    console.log('Backward pass completado en', iterations, 'iteraciones');

    // Paso 3: Calcular TI, Holgura e identificar ruta crítica
    activities.forEach(activity => {
        const act = activityMap[activity.name];
        act.ti = act.tl - activity.duration;
        act.slack = act.ti - act.te;
        // CORRECCIÓN: Usar tolerancia mínima para comparación
        act.isCritical = Math.abs(act.slack) < 0.0001;
        
        console.log(`${activity.name}: TI=${act.ti}, Slack=${act.slack}, Crítica=${act.isCritical}`);
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
                        <text x="30" y="85" text-anchor="middle" font-size="11" font-weight="600">TI</text>
                        <text x="60" y="85" text-anchor="middle" font-size="11" font-weight="600">Hol</text>
                        <text x="90" y="85" text-anchor="middle" font-size="11" font-weight="600">TL</text>
                    </svg>
                    <div>
                        <p><strong>Nodo Normal</strong></p>
                        <p style="font-size: 12px; margin: 5px 0;">• <strong>A:</strong> Nombre de la actividad</p>
                        <p style="font-size: 12px; margin: 5px 0;">• <strong>TE:</strong> Tiempo Emprano de Inicio</p>
                        <p style="font-size: 12px; margin: 5px 0;">• <strong>Dur:</strong> Duración de la actividad</p>
                        <p style="font-size: 12px; margin: 5px 0;">• <strong>TF:</strong> Tiempo Temprano de Fin</p>
                        <p style="font-size: 12px; margin: 5px 0;">• <strong>TI:</strong> Tiempo Tardío de Inicio</p>
                        <p style="font-size: 12px; margin: 5px 0;">• <strong>Hol:</strong> Holgura (TI - TE)</p>
                        <p style="font-size: 12px; margin: 5px 0;">• <strong>TL:</strong> Tiempo Tardío de Fin</p>
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
        row.innerHTML = `
            <td>${activity.name}</td>
            <td>${activity.duration}</td>
            <td>${activity.predecessors.join(', ') || '-'}</td>
            <td>${data.te}</td>
            <td>${data.tf}</td>
            <td>${data.tl}</td>
            <td>${data.ti}</td>
            <td>${data.slack}</td>
            <td style="color: ${data.isCritical ? '#d32f2f' : '#666'}; font-weight: ${data.isCritical ? 'bold' : 'normal'}">
                ${data.isCritical ? 'SÍ' : 'NO'}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('resultsSection').style.display = 'block';
}

window.addEventListener('load', function() {
    const activityInputs = document.querySelectorAll('.activity-name, .activity-predecessors');
    activityInputs.forEach(input => {
        input.addEventListener('input', function() {
            convertToUpperCase(this);
        });
    });
});