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
      output.scrollTop = output.scrollHeight;
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

  // Click anywhere to focus input
  document.addEventListener('click', function () {
    input.focus();
  });

  async function processInput(text) {
    appendPlayerInput(text);
    commandHistory.push(text);
    if (commandHistory.length > 100) commandHistory.shift();
    localStorage.setItem('voidtransit_history', JSON.stringify(commandHistory));
    historyIndex = -1;
    input.value = '';

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
    // Check if we have an existing session
    if (sessionId) {
      try {
        const res = await fetch('/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, input: 'look' })
        });

        if (res.ok) {
          const data = await res.json();
          appendMeta('Session resumed.');
          handleResponse(data);
          return;
        }
      } catch {
        // Session expired or server restarted
      }
    }

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
