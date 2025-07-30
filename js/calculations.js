import { activities } from './data.js';

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

    console.log('=== CÁLCULO PERT COMPLETADO ===');
    console.log('Resultado final:', activityMap);

    return { activityMap, projectDuration };
}

export { calculatePERT };