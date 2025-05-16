// Gestion des fenêtres
document.getElementById('open-control-btn').addEventListener('click', () => {
  document.getElementById('monitoring-window').classList.add('hidden');
  document.getElementById('control-window').classList.remove('hidden');
});

document.getElementById('open-monitoring-btn').addEventListener('click', () => {
  document.getElementById('control-window').classList.add('hidden');
  document.getElementById('monitoring-window').classList.remove('hidden');
});

document.getElementById('open-graph-btn').addEventListener('click', function() {
  document.getElementById('monitoring-window').classList.add('hidden');
  document.getElementById('graph-window').classList.remove('hidden');
});

document.getElementById('open-monitoring-btn2').addEventListener('click', () => {
  document.getElementById('graph-window').classList.add('hidden');
  document.getElementById('monitoring-window').classList.remove('hidden');
});

document.getElementById('open-simulation-btn').addEventListener('click', () => {
  document.getElementById('monitoring-window').classList.add('hidden');
  document.getElementById('simulation-window').classList.remove('hidden');
});

document.getElementById('open-monitoring-btn3').addEventListener('click', () => {
  document.getElementById('simulation-window').classList.add('hidden');
  document.getElementById('monitoring-window').classList.remove('hidden');
});

// Variables pour les données historiques
const voltageHistory = [];
const currentHistory = [];
const timeLabels = [];
const MAX_DATA_POINTS = 60;

// Variables pour la simulation
let simulationData = [];
let simulationInterval = null;
let currentSimulationIndex = 0;
let simulationStartTime = null;
let simulationChart = null;

// Initialisation des graphiques
const voltageCtx = document.getElementById('voltageChart').getContext('2d');
const currentCtx = document.getElementById('currentChart').getContext('2d');
const simulationCtx = document.getElementById('simulationChart').getContext('2d');

const voltageChart = new Chart(voltageCtx, {
  type: 'line',
  data: {
    labels: timeLabels,
    datasets: [{
      label: 'Tension (V)',
      data: voltageHistory,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false
      }
    }
  }
});

const currentChart = new Chart(currentCtx, {
  type: 'line',
  data: {
    labels: timeLabels,
    datasets: [{
      label: 'Courant (A)',
      data: currentHistory,
      tension: 0.1,
      borderColor: 'rgb(255, 99, 132)'
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amps (A)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Temps'
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`
        }
      }
    }
  }
});

// Initialisation du graphique de simulation
function initSimulationChart() {
  simulationChart = new Chart(simulationCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Tension (V)',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          yAxisID: 'y',
          tension: 0.1,
          pointBackgroundColor: [],
          pointRadius: []
        },
        {
          label: 'Courant (A)',
          data: [],
          borderColor: 'rgb(255, 99, 132)',
          yAxisID: 'y1',
          tension: 0.1,
          pointBackgroundColor: [],
          pointRadius: []
        },
        {
          label: 'Puissance (W)',
          data: [],
          borderColor: 'rgb(153, 102, 255)',
          yAxisID: 'y2',
          tension: 0.1,
          pointBackgroundColor: [],
          pointRadius: []
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Tension (V)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: 'Courant (A)'
          }
        },
        y2: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: 'Puissance (W)'
          }
        }
      }
    }
  });
}

// Mise à jour du statut de connexion
function updateConnectionStatus(connected) {
  const statusIndicator = document.getElementById('status-indicator');
  statusIndicator.className = connected ? 
    'status-indicator status-connected' : 
    'status-indicator status-disconnected';
}

// Mise à jour des affichages
function updateDisplays(data) {
  const voltageEl = document.getElementById('voltage-display');
  voltageEl.textContent = data.voltage.toFixed(2) + ' V';
  voltageEl.style.color = data.voltage > 30 ? 'var(--danger-color)' : 'inherit';

  const currentEl = document.getElementById('current-display');
  currentEl.textContent = data.current.toFixed(3) + ' A';
  if (data.current > 5) {
    currentEl.classList.add('pulse');
  } else {
    currentEl.classList.remove('pulse');
  }
  
  document.getElementById('power-display').textContent = data.power.toFixed(2) + ' W';
  document.getElementById('mode-display').textContent = data.mode === 0 ? 'CV' : 'CC';
  
  updateCharts(data.voltage, data.current);
}

// Fonction pour mettre à jour les graphiques
function updateCharts(voltage, current) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (timeLabels.length >= MAX_DATA_POINTS) {
    timeLabels.shift();
    voltageHistory.shift();
    currentHistory.shift();
  }

  timeLabels.push(timeStr);
  voltageHistory.push(voltage);
  currentHistory.push(current);

  voltageChart.data.labels = timeLabels;
  voltageChart.data.datasets[0].data = voltageHistory;
  voltageChart.update('none');

  currentChart.data.labels = timeLabels;
  currentChart.data.datasets[0].data = currentHistory;
  currentChart.update('none');
}

// Fonction pour analyser le fichier JSON
function parseJSON(content) {
  try {
    const jsonData = JSON.parse(content);
    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      throw new Error("Format JSON invalide: propriété 'data' manquante ou incorrecte");
    }
    
    return jsonData.data.map(item => ({
      time: item.time,
      voltage: item.voltage,
      current: item.current,
      power: item.power || (item.voltage * item.current)
    }));
  } catch (error) {
    console.error("Erreur d'analyse JSON:", error);
    throw new Error("Erreur lors de la lecture du fichier JSON: " + error.message);
  }
}

// Gestionnaire de fichier JSON
document.getElementById('csv-file').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      resetSimulation(); // Réinitialiser avant de charger un nouveau fichier
      
      const content = e.target.result;
      simulationData = parseJSON(content);
      
      // Préparer le graphique de simulation
      if (!simulationChart) {
        initSimulationChart();
      }
      
      // Mettre à jour les labels et données
      const labels = simulationData.map(item => item.time.toFixed(1) + 's');
      const voltages = simulationData.map(item => item.voltage);
      const currents = simulationData.map(item => item.current);
      const powers = simulationData.map(item => item.power);
      
      simulationChart.data.labels = labels;
      simulationChart.data.datasets[0].data = voltages;
      simulationChart.data.datasets[1].data = currents;
      simulationChart.data.datasets[2].data = powers;
      
      // Initialiser les points du graphique
      simulationChart.data.datasets.forEach(dataset => {
        dataset.pointBackgroundColor = dataset.data.map(() => 'rgba(0, 0, 0, 0)');
        dataset.pointRadius = dataset.data.map(() => 0);
      });
      
      simulationChart.update();
      
      // Mettre à jour l'interface
      updateSimulationUI();
    } catch (error) {
      alert(error.message);
    }
  };
  reader.readAsText(file);
});

// Fonction pour réinitialiser complètement la simulation
function resetSimulation() {
  stopSimulation();
  currentSimulationIndex = 0;
  simulationStartTime = null;
  updateSimulationUI();
  
  if (simulationChart) {
    simulationChart.data.labels = [];
    simulationChart.data.datasets.forEach(dataset => {
      dataset.data = [];
      dataset.pointBackgroundColor = [];
      dataset.pointRadius = [];
    });
    simulationChart.update();
  }
}

// Fonction pour mettre à jour l'interface de simulation
function updateSimulationUI() {
  document.getElementById('simulation-point').textContent = `0/${simulationData.length}`;
  document.getElementById('simulation-progress').textContent = '0%';
  document.getElementById('simulation-time').textContent = '00:00';
}

// Fonction pour envoyer un point de données à l'alimentation
async function sendSimulationDataPoint() {
  const dataPoint = simulationData[currentSimulationIndex];
  
  try {
    // Envoyer les valeurs à l'alimentation
    await window.electron.serial.writeRegister('V_SET', Math.round(dataPoint.voltage * 100));
    await window.electron.serial.writeRegister('I_SET', Math.round(dataPoint.current * 100));
    
    // Mettre à jour l'interface
    const progress = Math.round((currentSimulationIndex + 1) / simulationData.length * 100);
    document.getElementById('simulation-progress').textContent = `${progress}%`;
    document.getElementById('simulation-point').textContent = `${currentSimulationIndex + 1}/${simulationData.length}`;
    
    // Calculer le temps écoulé
    const elapsedSeconds = Math.floor((new Date() - simulationStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
    document.getElementById('simulation-time').textContent = `${minutes}:${seconds}`;
    
    // Mettre en évidence le point actuel sur le graphique
    highlightCurrentDataPoint();
  } catch (error) {
    console.error('Erreur lors de l\'envoi des données:', error);
    stopSimulation();
    alert(`Erreur lors de l'envoi des données: ${error.message}`);
  }
}

// Fonction pour mettre en évidence le point actuel sur le graphique
function highlightCurrentDataPoint() {
  if (!simulationChart) return;
  
  // Réinitialiser tous les points
  simulationChart.data.datasets.forEach(dataset => {
    dataset.pointBackgroundColor = dataset.data.map(() => 'rgba(0, 0, 0, 0)');
    dataset.pointRadius = dataset.data.map(() => 0);
  });
  
  // Mettre en évidence le point actuel
  simulationChart.data.datasets[0].pointBackgroundColor[currentSimulationIndex] = 'rgb(75, 192, 192)';
  simulationChart.data.datasets[0].pointRadius[currentSimulationIndex] = 5;
  
  simulationChart.data.datasets[1].pointBackgroundColor[currentSimulationIndex] = 'rgb(255, 99, 132)';
  simulationChart.data.datasets[1].pointRadius[currentSimulationIndex] = 5;
  
  simulationChart.data.datasets[2].pointBackgroundColor[currentSimulationIndex] = 'rgb(153, 102, 255)';
  simulationChart.data.datasets[2].pointRadius[currentSimulationIndex] = 5;
  
  simulationChart.update();
}

// Démarrer la simulation
document.getElementById('start-simulation-btn').addEventListener('click', function() {
  if (simulationData.length === 0) {
    alert('Veuillez charger un fichier JSON de simulation');
    return;
  }
  
  currentSimulationIndex = 0;
  simulationStartTime = new Date();
  
  document.getElementById('start-simulation-btn').disabled = true;
  document.getElementById('stop-simulation-btn').disabled = false;
  
  // Envoyer immédiatement le premier point
  sendSimulationDataPoint();
  
  // Configurer l'intervalle pour les points suivants (1 seconde)
  simulationInterval = setInterval(() => {
    currentSimulationIndex++;
    if (currentSimulationIndex >= simulationData.length) {
      stopSimulation();
      return;
    }
    sendSimulationDataPoint();
  }, 1000);
});

// Arrêter et réinitialiser la simulation
document.getElementById('stop-simulation-btn').addEventListener('click', function() {
  resetSimulation();
});

function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  
  document.getElementById('start-simulation-btn').disabled = false;
  document.getElementById('stop-simulation-btn').disabled = true;
}

// Fonction pour détecter les ports série
async function refreshPortList() {
  const portSelect = document.getElementById('port-select');
  portSelect.innerHTML = '<option value="">Sélectionnez un port</option>';
  
  try {
    const ports = await window.electron.serial.listPorts();
    
    ports.forEach(port => {
      const option = document.createElement('option');
      option.value = port.path;
      option.textContent = port.path;
      if (port.path === 'COM5') {
        option.selected = true;
      }
      portSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Erreur lors de la détection des ports:', error);
  }
}

// Détection initiale des ports et mise à jour automatique
window.electron.onPortsUpdate((ports) => {
  const portSelect = document.getElementById('port-select');
  const selectedValue = portSelect.value;
  
  portSelect.innerHTML = '<option value="">Sélectionnez un port</option>';
  
  ports.forEach(port => {
    const option = document.createElement('option');
    option.value = port.path;
    option.textContent = port.path;
    if (port.path === selectedValue || port.path === 'COM5') {
      option.selected = true;
    }
    portSelect.appendChild(option);
  });
});

// Connexion au port
document.getElementById('connect-btn').addEventListener('click', async () => {
  const portSelect = document.getElementById('port-select');
  const selectedPort = portSelect.value;
  
  if (!selectedPort) {
    alert('Veuillez sélectionner un port');
    return;
  }
  
  try {
    const result = await window.electron.serial.connect(selectedPort);
    
    if (result.success) {
      updateConnectionStatus(true);
    } else {
      updateConnectionStatus(false);
      alert('Échec de la connexion: ' + result.error);
    }
  } catch (error) {
    console.error('Erreur de connexion:', error);
    updateConnectionStatus(false);
    alert('Échec de la connexion: ' + error.message);
  }
});

// Mise à jour des valeurs pour RD6012
window.electron.onUpdate((data) => {
  updateDisplays(data);
});

// Contrôles pour les réglages
document.getElementById('voltage-set').addEventListener('change', async (e) => {
  const value = parseFloat(e.target.value);
  if (!isNaN(value) && value >= 0 && value <= 60) {
    const intValue = Math.round(value * 100);
    await window.electron.serial.writeRegister('V_SET', intValue);
  }
});

document.getElementById('current-set').addEventListener('change', async (e) => {
  const value = parseFloat(e.target.value);
  if (!isNaN(value) && value >= 0 && value <= 12) {
    const intValue = Math.round(value * 100);
    await window.electron.serial.writeRegister('I_SET', intValue);
  }
});

document.getElementById('output-toggle').addEventListener('change', async (e) => {
  const value = e.target.checked ? 1 : 0;
  await window.electron.serial.writeRegister('OUTPUT', value);
});

// Initialisation
refreshPortList();