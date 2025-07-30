import { activities, nodes, collectActivities, findCriticalPath } from './data.js';
import { calculatePERT } from './calculations.js';
import { displayResults } from './ui.js';
import { renderDiagram } from './diagram.js';

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
    
    // Actualizar nodes global
    Object.assign(nodes, activityMap);
    
    // Renderizar diagrama
    renderDiagram(activityMap, projectDuration);
    
    // Mostrar resultados
    displayResults(activityMap, criticalPath, projectDuration);
}

// Hacer función global para onclick
window.generateDiagram = generateDiagram;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('Aplicación PERT Generator inicializada');
});

export { generateDiagram };