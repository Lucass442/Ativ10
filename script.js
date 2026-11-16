// Conexão WebSocket com o broker público HiveMQ
const brokerUrl = 'ws://broker.hivemq.com:8000/mqtt';
const topicTelemetria = 'cooperativa/silo01/telemetria';
const topicComando = 'cooperativa/silo01/exaustor/comando';

const client = mqtt.connect(brokerUrl, {
  clientId: 'WebDashboard_Agro_' + Math.random().toString(16).substr(2, 8)
});

function addLog(msg) {
  const box = document.getElementById('log-box');
  const time = new Date().toLocaleTimeString();
  box.innerHTML += `<div>[${time}] ${msg}</div>`;
  box.scrollTop = box.scrollHeight;
}

client.on('connect', () => {
  const badge = document.getElementById('conn-status');
  badge.textContent = 'Conectado ao HiveMQ';
  badge.classList.add('connected');
  addLog('Conectado com sucesso ao broker HiveMQ.');

  client.subscribe(topicTelemetria, (err) => {
    if (!err) {
      addLog(`Inscrito no tópico: ${topicTelemetria}`);
    }
  });
});

client.on('offline', () => {
  const badge = document.getElementById('conn-status');
  badge.textContent = 'Desconectado';
  badge.classList.remove('connected');
  addLog('Conexão perdida com o broker HiveMQ. Tentando reconectar...');
});

client.on('message', (topic, message) => {
  if (topic === topicTelemetria) {
    try {
      const data = JSON.parse(message.toString());
      atualizarInterface(data);
    } catch (e) {
      console.error('Erro ao processar JSON recebido:', e);
    }
  }
});

function atualizarInterface(data) {
  document.getElementById('temp-val').textContent = `${data.temperatura.toFixed(1)} °C`;
  document.getElementById('umid-val').textContent = `${data.umidade.toFixed(1)} %`;

  const exaustorEl = document.getElementById('exaustor-val');
  exaustorEl.textContent = data.exaustor;
  exaustorEl.style.color = data.exaustor === 'LIGADO' ? '#10b981' : '#ef4444';

  document.getElementById('modo-val').textContent = `Modo de Operação: ${data.modo}`;

  // Regras visuais de alerta na interface web
  const cardTemp = document.getElementById('card-temp');
  const cardUmid = document.getElementById('card-umid');
  const banner = document.getElementById('alert-banner');

  if (data.temperatura > 30.0) {
    cardTemp.classList.add('critical');
  } else {
    cardTemp.classList.remove('critical');
  }

  if (data.umidade > 70.0) {
    cardUmid.classList.add('critical');
  } else {
    cardUmid.classList.remove('critical');
  }

  if (data.critico) {
    banner.style.display = 'block';
    // Regra automatizada na plataforma web: reforça acionamento em caso crítico
    if (data.modo === 'AUTO' && data.exaustor === 'DESLIGADO') {
      addLog('Regra Web: Condição crítica detectada! Solicitando acionamento do exaustor...');
      client.publish(topicComando, 'ON');
    }
  } else {
    banner.style.display = 'none';
  }
}

function enviarComando(cmd) {
  if (client.connected) {
    client.publish(topicComando, cmd);
    addLog(`Comando enviado para o ESP32: ${cmd}`);
  } else {
    addLog('Erro: Painel desconectado do broker MQTT.');
  }
}