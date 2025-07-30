import { activities } from './data.js';

// Variables globales de datos
let activities = [];
let nodes = {};

// Función collectActivities (líneas aproximadas 14-86)
function collectActivities() {
    activities = [];
    const rows = document.querySelectorAll('#activitiesTable tbody tr');
    const activityNames = new Set();
    const errors = [];
    
    rows.forEach((row, index) => {
        const name = row.querySelector('.activity-name').value.trim();
        const duration = parseFloat(row.querySelector('.activity-duration').value);
        const predsInput = row.querySelector('.activity-predecessors').value.trim();
        
        if (!name) {
            errors.push(`Fila ${index + 1}: El nombre de la actividad es requerido.`);
            return;
        }
        
        if (activityNames.has(name)) {
            errors.push(`Fila ${index + 1}: La actividad "${name}" está duplicada.`);
            return;
        }
        
        if (isNaN(duration) || duration <= 0) {
            errors.push(`Fila ${index + 1}: La duración debe ser un número positivo.`);
            return;
        }
        
        activityNames.add(name);
        
        const predecessors = predsInput 
            ? predsInput.split(',').map(p => p.trim()).filter(p => p)
            : [];
        
        activities.push({ name, duration, predecessors });
    });
    
    // Validar que todas las predecesoras existan
    activities.forEach((activity, index) => {
        activity.predecessors.forEach(pred => {
            if (!activityNames.has(pred)) {
                errors.push(`Fila ${index + 1}: La predecesora "${pred}" no existe.`);
            }
        });
    });
    
    // Verificar dependencias cíclicas
    if (errors.length === 0 && hasCyclicDependencies()) {
        errors.push('Se detectaron dependencias cíclicas. Por favor, revisa las predecesoras.');
    }
    
    if (errors.length > 0) {
        alert('Errores encontrados:\n\n' + errors.join('\n'));
        return false;
    }
    
    console.log('Actividades recolectadas:', activities);
    return true;
}

// Función hasCyclicDependencies (líneas aproximadas 88-119)
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

// Función findCriticalPath (líneas aproximadas 241-246)
function findCriticalPath(activityMap) {
    const criticalActivities = activities.filter(act => activityMap[act.name].isCritical);
    criticalActivities.sort((a, b) => activityMap[a.name].te - activityMap[b.name].te);
    return criticalActivities.map(act => act.name);
}

// Exportar para uso en otros módulos
export { activities, nodes, collectActivities, hasCyclicDependencies, findCriticalPath };