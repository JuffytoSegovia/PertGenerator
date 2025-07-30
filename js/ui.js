function addRow() {
    const tbody = document.querySelector('#activitiesTable tbody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" class="activity-name"></td>
        <td><input type="number" class="activity-duration"></td>
        <td><input type="text" class="activity-predecessors"></td>
        <td><button class="btn btn-danger" onclick="removeRow(this)">X</button></td>
    `;
    tbody.appendChild(newRow);
}

function removeRow(button) {
    const row = button.closest('tr');
    const tbody = row.closest('tbody');
    if (tbody.children.length > 1) {
        row.remove();
    } else {
        alert('Debe haber al menos una actividad.');
    }
}

function removeAllRows() {
    const tbody = document.querySelector('#activitiesTable tbody');
    tbody.innerHTML = `
        <tr>
            <td><input type="text" class="activity-name"></td>
            <td><input type="number" class="activity-duration"></td>
            <td><input type="text" class="activity-predecessors"></td>
            <td><button class="btn btn-danger" onclick="removeRow(this)">X</button></td>
        </tr>
    `;
}

function displayResults(activityMap, criticalPath, projectDuration) {
    // Mostrar tabla de resultados
    const resultsSection = document.getElementById('resultsSection');
    const resultsBody = document.getElementById('resultsTableBody');
    
    resultsBody.innerHTML = '';
    
    activities.forEach(activity => {
        const act = activityMap[activity.name];
        const row = document.createElement('tr');
        if (act.isCritical) {
            row.style.backgroundColor = '#ffebee';
            row.style.fontWeight = 'bold';
        }
        
        row.innerHTML = `
            <td>${activity.name}</td>
            <td>${activity.duration}</td>
            <td>${activity.predecessors.join(', ') || '-'}</td>
            <td>${act.te}</td>
            <td>${act.tf}</td>
            <td>${act.tl}</td>
            <td>${act.ti}</td>
            <td>${act.slack.toFixed(2)}</td>
            <td>${act.isCritical ? 'SÍ' : 'NO'}</td>
        `;
        
        resultsBody.appendChild(row);
    });
    
    resultsSection.style.display = 'block';
    
    // Mostrar ruta crítica
    const criticalPathInfo = document.getElementById('criticalPathInfo');
    const criticalPathText = document.getElementById('criticalPathText');
    const projectDurationSpan = document.getElementById('projectDuration');
    
    criticalPathText.textContent = criticalPath.join(' → ');
    projectDurationSpan.textContent = projectDuration;
    criticalPathInfo.style.display = 'block';
}

// Hacer funciones globales para onclick
window.addRow = addRow;
window.removeRow = removeRow;
window.removeAllRows = removeAllRows;

export { addRow, removeRow, removeAllRows, displayResults };