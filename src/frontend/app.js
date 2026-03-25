(function () {
  const output = document.getElementById('output');
  const input = document.getElementById('input');
  const statusLocation = document.getElementById('status-location');
  const statusHealth = document.getElementById('status-health');
  const statusTurn = document.getElementById('status-turn');

  let sessionId = localStorage.getItem('voidtransit_session') || null;
  let commandHistory = JSON.parse(localStorage.getItem('voidtransit_history') || '[]');
  let historyIndex = -1;
  let busy = false;

  // --- Output functions ---

  function appendOutput(html, cssClass) {
    const block = document.createElement('div');
    block.className = 'output-block ' + (cssClass || '');
    block.innerHTML = html;
    output.appendChild(block);
    scrollToBottom();
  }

  function appendNarrative(text) {
    const escaped = escapeHtml(text);
    const formatted = formatMarkdown(escaped);
    appendOutput(`<div class="narrative">${formatted}</div>`);
  }

  function appendPlayerInput(text) {
    appendOutput(`<div class="player-input">${escapeHtml(text)}</div>`, 'instant');
  }

  function appendSystemEvent(evt) {
    const cls = evt.type === 'critical' || evt.type === 'fatal' ? 'system-critical' : 'system-warning';
    appendOutput(`<div class="${cls}">${escapeHtml(evt.message)}</div>`);
  }

  function appendError(text) {
    appendOutput(`<div class="error-text">${escapeHtml(text)}</div>`);
  }

  function appendMeta(text) {
    appendOutput(`<div class="meta-text">${escapeHtml(text)}</div>`);
  }

  function appendIntro(text) {
    appendOutput(`<div class="intro-text">${escapeHtml(text)}</div>`);
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      var inputArea = document.getElementById('input-area');
      if (inputArea) inputArea.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }

  function updateStatus(data) {
    if (data.roomId) {
      const name = data.roomName || data.roomId.replace(/_/g, ' ');
      statusLocation.textContent = name;
    }
    if (data.health !== undefined) {
      statusHealth.textContent = `HP: ${data.health}%`;
      statusHealth.style.color = data.health < 40 ? '#ff3333' : data.health < 70 ? '#ffaa00' : '';
    }
    if (data.turnCount !== undefined) {
      statusTurn.textContent = `Turn: ${data.turnCount}`;
    }
  }

  // --- Input handling ---

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || busy) return;
      processInput(text);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      window.scrollBy(0, -window.innerHeight * 0.85);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      window.scrollBy(0, window.innerHeight * 0.85);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        input.value = commandHistory[commandHistory.length - 1 - historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = commandHistory[commandHistory.length - 1 - historyIndex];
      } else {
        historyIndex = -1;
        input.value = '';
      }
    }
  });

  // Click anywhere to focus input (but not if user is selecting text)
  document.addEventListener('click', function () {
    if (!window.getSelection().toString()) {
      input.focus();
    }
  });

  async function processInput(text) {
    appendPlayerInput(text);
    commandHistory.push(text);
    if (commandHistory.length > 100) commandHistory.shift();
    localStorage.setItem('voidtransit_history', JSON.stringify(commandHistory));
    historyIndex = -1;
    input.value = '';

    // Client-side commands (audio, etc.)
    const lower = text.toLowerCase().trim();
    if (lower === 'audio' || lower === 'mute' || lower === 'sound') {
      if (window.voidAudio) {
        const on = window.voidAudio.toggle();
        appendMeta(on ? 'Audio enabled.' : 'Audio muted.');
      } else {
        appendMeta('Audio not available.');
      }
      return;
    }
    if (lower.startsWith('volume ')) {
      const v = parseFloat(lower.substring(7));
      if (!isNaN(v) && window.voidAudio) {
        window.voidAudio.setVolume(v / 100);
        appendMeta(`Volume: ${Math.round(v)}%`);
      }
      return;
    }

    busy = true;
    input.disabled = true;
    input.placeholder = 'Processing...';

    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, input: text })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Server error' }));
        if (res.status === 404) {
          appendError('No active game. Starting new game...');
          await startNewGame();
          return;
        }
        appendError(err.error || 'Something went wrong.');
        return;
      }

      const data = await res.json();
      handleResponse(data);

    } catch (err) {
      appendError('Connection lost. Is the server running?');
      console.error(err);
    } finally {
      busy = false;
      input.disabled = false;
      input.placeholder = 'What do you do?';
      input.focus();
    }
  }

  function handleResponse(data) {
    if (data.prose) {
      appendNarrative(data.prose);
    }

    // If disambiguation, show numbered choices (clickable or type the number)
    if (data.type === 'disambiguate' && data.candidates) {
      const choiceDiv = document.createElement('div');
      choiceDiv.className = 'disambiguation';
      data.candidates.forEach((c, i) => {
        const btn = document.createElement('div');
        btn.className = 'choice-btn';
        btn.textContent = `  ${i + 1}. ${c.label}`;
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
          choiceDiv.remove();
          processInput(String(i + 1));
        });
        choiceDiv.appendChild(btn);
      });
      const hint = document.createElement('div');
      hint.className = 'meta-text';
      hint.textContent = 'Type a number or click to choose.';
      choiceDiv.appendChild(hint);
      output.appendChild(choiceDiv);
      scrollToBottom();
    }

    // Audio triggers
    if (window.voidAudio) {
      // Room change — crossfade to new theme
      if (data.roomId && data.type === 'move_success') {
        window.voidAudio.setRoom(data.roomId);
        window.voidAudio.sfx('door_open');
      }
      // Item pickup
      if (data.type === 'take_success') {
        window.voidAudio.sfx('item_take');
      }
      // System warnings
      if (data.prose && data.prose.includes('[WARNING]')) {
        window.voidAudio.sfx('warning');
      }
      if (data.prose && (data.prose.includes('[CRITICAL]') || data.prose.includes('[FATAL]'))) {
        window.voidAudio.sfx('critical');
      }
      // Story beats (discovery moments)
      if (data.storyContext && data.storyContext.tension > 6) {
        window.voidAudio.sfx('heartbeat');
      }
    }

    updateStatus({
      roomId: data.roomId,
      roomName: data.roomName,
      health: data.health,
      turnCount: data.turnCount
    });
  }

  // --- Game lifecycle ---

  async function startNewGame() {
    busy = true;
    input.disabled = true;

    try {
      const res = await fetch('/api/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();
      sessionId = data.sessionId;
      localStorage.setItem('voidtransit_session', sessionId);

      output.innerHTML = '';

      if (data.intro) {
        appendIntro(data.intro);
      }

      if (data.description) {
        const roomText = `**${data.roomName}**\n\n${data.description}`;
        if (data.items?.length) {
          appendNarrative(roomText + '\n\nYou can see: ' + data.items.map(i => i.name).join(', ') + '.');
        } else {
          appendNarrative(roomText);
        }
      }

      updateStatus({
        roomId: data.roomId,
        roomName: data.roomName,
        health: 65,
        turnCount: 0
      });

      // Start audio on first room
      if (window.voidAudio && data.roomId) {
        window.voidAudio.setRoom(data.roomId);
      }

    } catch (err) {
      appendError('Failed to start new game. Is the server running?');
      console.error(err);
    } finally {
      busy = false;
      input.disabled = false;
      input.focus();
    }
  }

  // --- Utility ---

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatMarkdown(html) {
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Horizontal rules
    html = html.replace(/^═+$/gm, '<hr style="border-color: var(--border); margin: 8px 0;">');
    return html;
  }

  // --- Init ---

  async function init() {
    // Show version in browser title
    try {
      const vRes = await fetch('/api/version');
      if (vRes.ok) {
        const { version } = await vRes.json();
        document.title = `VOID TRANSIT v${version}`;
      }
    } catch { /* ignore */ }

    // Always start fresh
    sessionId = null;
    localStorage.removeItem('voidtransit_session');

    // No valid session — start new game
    await startNewGame();
  }

  // --- Debug eval polling (for debug console remote JS execution) ---

  async function debugPoll() {
    if (!sessionId) return;
    try {
      const res = await fetch(`/debug/eval-poll/${sessionId}`);
      if (!res.ok) return;
      const tasks = await res.json();
      for (const task of tasks) {
        let result;
        try {
          result = { value: String(eval(task.code)), error: null };
        } catch (e) {
          result = { value: null, error: e.message };
        }
        await fetch(`/debug/eval-result/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: task.id, result })
        });
      }
    } catch { /* debug not available */ }
  }

  setInterval(debugPoll, 2000);

  init();
})();
