class PalombeApp {
  constructor() {
    this.audioCtx = null;
    this.activeOscillators = [];
    this.logs = JSON.parse(localStorage.getItem('palombe_logs') || '[]');
    this.init();
  }

  init() {
    this.initNetworkStatus();
    this.initForm();
    this.renderLogs();
    this.registerSW();
  }

  initNetworkStatus() {
    const update = () => {
      const statusEl = document.getElementById('netStatus');
      if (navigator.onLine) {
        statusEl.textContent = 'En ligne';
        statusEl.className = 'badge online';
      } else {
        statusEl.textContent = 'Hors-ligne';
        statusEl.className = 'badge offline';
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  stopAllAudio() {
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch(e){}
    });
    this.activeOscillators = [];
  }

  playCall(type) {
    this.stopAllAudio();
    const ctx = this.getAudioContext();
    const masterVol = parseFloat(document.getElementById('volumeControl').value || '0.8');
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(masterVol, ctx.currentTime);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'pose') {
      // Roucoulement de posé: 5 syllabes typiques "Oo-roo-coo... coo-coo"
      const pattern = [
        { time: 0.0, freq: 320, duration: 0.4 },
        { time: 0.5, freq: 290, duration: 0.3 },
        { time: 0.9, freq: 260, duration: 0.5 },
        { time: 1.6, freq: 280, duration: 0.3 },
        { time: 2.0, freq: 250, duration: 0.4 }
      ];
      pattern.forEach(p => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, now + p.time);
        osc.frequency.exponentialRampToValueAtTime(p.freq - 30, now + p.time + p.duration);
        
        noteGain.gain.setValueAtTime(0, now + p.time);
        noteGain.gain.linearRampToValueAtTime(0.7, now + p.time + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + p.time + p.duration);
        
        osc.connect(noteGain);
        noteGain.connect(gainNode);
        osc.start(now + p.time);
        osc.stop(now + p.time + p.duration);
        this.activeOscillators.push(osc);
      });
    } else if (type === 'vol') {
      // Appel de vol : répétition plus vive et accentuée
      const pattern = [
        { time: 0.0, freq: 360, duration: 0.25 },
        { time: 0.3, freq: 340, duration: 0.25 },
        { time: 0.6, freq: 310, duration: 0.4 },
        { time: 1.1, freq: 350, duration: 0.25 },
        { time: 1.4, freq: 320, duration: 0.4 }
      ];
      pattern.forEach(p => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(p.freq, now + p.time);
        osc.frequency.linearRampToValueAtTime(p.freq - 40, now + p.time + p.duration);
        
        noteGain.gain.setValueAtTime(0, now + p.time);
        noteGain.gain.linearRampToValueAtTime(0.8, now + p.time + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + p.time + p.duration);
        
        osc.connect(noteGain);
        noteGain.connect(gainNode);
        osc.start(now + p.time);
        osc.stop(now + p.time + p.duration);
        this.activeOscillators.push(osc);
      });
    } else if (type === 'seduction') {
      // Chant sourd de roucoulement
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(240, now + 1.0);
      osc.frequency.linearRampToValueAtTime(200, now + 2.0);
      
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.9, now + 0.5);
      noteGain.gain.linearRampToValueAtTime(0.9, now + 1.5);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      
      osc.connect(noteGain);
      noteGain.connect(gainNode);
      osc.start(now);
      osc.stop(now + 2.2);
      this.activeOscillators.push(osc);
    } else if (type === 'ailes') {
      // Simulation d'un claquement d'ailes (bruit blanc filtré en bouffées)
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 3;

      const flapGain = ctx.createGain();
      flapGain.gain.setValueAtTime(0, now);
      // 3 petits coups d'ailes
      [0.0, 0.15, 0.3].forEach(t => {
        flapGain.gain.setValueAtTime(0.9, now + t);
        flapGain.gain.exponentialRampToValueAtTime(0.01, now + t + 0.1);
      });

      noise.connect(filter);
      filter.connect(flapGain);
      flapGain.connect(gainNode);
      noise.start(now);
      noise.stop(now + 0.5);
    }
  }

  initForm() {
    const form = document.getElementById('flightForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const count = parseInt(document.getElementById('birdCount').value, 10);
      const dir = document.getElementById('flightDir').value;
      const attitude = document.getElementById('flightAttitude').value;
      
      if (count > 0) {
        const now = new Date();
        const logItem = {
          id: Date.now(),
          count: count,
          dir: dir,
          attitude: attitude,
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.logs.unshift(logItem);
        this.saveLogs();
        this.renderLogs();
        form.reset();
      }
    });
  }

  saveLogs() {
    localStorage.setItem('palombe_logs', JSON.stringify(this.logs));
  }

  clearLogs() {
    if (confirm('Voulez-vous effacer les passages enregistrés aujourd\'hui ?')) {
      this.logs = [];
      this.saveLogs();
      this.renderLogs();
    }
  }

  renderLogs() {
    const list = document.getElementById('flightList');
    const totalEl = document.getElementById('totalTodayCount');
    list.innerHTML = '';
    
    let total = 0;
    if (this.logs.length === 0) {
      list.innerHTML = '<li style="color: var(--text-secondary); text-align: center; padding: 12px;">Aucun passage enregistré aujourd\'hui.</li>';
    } else {
      this.logs.forEach(item => {
        total += item.count;
        const li = document.createElement('li');
        li.className = 'flight-item';
        li.innerHTML = `
          <div class="flight-info">
            <span class="flight-count">${item.count} palombes</span>
            <span class="flight-details">Direction: ${item.dir} • ${item.attitude}</span>
          </div>
          <span class="flight-time">${item.time}</span>
        `;
        list.appendChild(li);
      });
    }
    totalEl.textContent = total;
  }

  refreshMeteo() {
    const winds = [
      { dir: 'Nord-Est (NE)', angle: 45, speed: '18 km/h', status: 'Très Favorable' },
      { dir: 'Est (E)', angle: 90, speed: '12 km/h', status: 'Favorable' },
      { dir: 'Sud-Ouest (SO)', angle: 225, speed: '25 km/h', status: 'Défavorable' },
      { dir: 'Nord (N)', angle: 0, speed: '15 km/h', status: 'Très Favorable' }
    ];
    const picked = winds[Math.floor(Math.random() * winds.length)];
    
    document.getElementById('compassArrow').style.transform = `rotate(${picked.angle}deg)`;
    document.getElementById('windDirText').textContent = `Vent: ${picked.dir} (${picked.speed})`;
    document.getElementById('valIndex').textContent = picked.status;
  }

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
}

const app = new PalombeApp();