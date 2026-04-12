(function() {
  const html = document.documentElement;
  const themeToggle = document.querySelector('[data-theme-toggle]');
  let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  html.setAttribute('data-theme', theme);
  const renderThemeIcon = () => {
    themeToggle.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79"></path></svg>';
  };
  renderThemeIcon();
  themeToggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', theme);
    renderThemeIcon();
  });

  const nameOverlay = document.getElementById('nameOverlay');
  const nameXInput = document.getElementById('nameX');
  const nameOInput = document.getElementById('nameO');
  const startGameBtn = document.getElementById('startGame');

  let gameMode = 'addition';
  let playerNames = { X: 'שחקן X', O: 'שחקן O' };

  const boardEl = document.getElementById('board');
  const turnBadge = document.getElementById('turnBadge');
  const answerInput = document.getElementById('answerInput');
  const submitAnswer = document.getElementById('submitAnswer');
  const messageBox = document.getElementById('messageBox');
  const scoreX = document.getElementById('scoreX');
  const turnName = document.getElementById('turnName');
  const scoreNameX = document.getElementById('scoreNameX');
  const scoreNameO = document.getElementById('scoreNameO');
  const scoreO = document.getElementById('scoreO');
  const resetRoundBtn = document.getElementById('resetRound');
  const resetAllBtn = document.getElementById('resetAll');
  const overlay = document.getElementById('overlay');
  const winnerSymbol = document.getElementById('winnerSymbol');
  const winnerText = document.getElementById('winnerText');
  const playAgain = document.getElementById('playAgain');

  const winningLines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function displayName(symbol){ return playerNames[symbol] || symbol; }
  function coloredName(symbol) {
    const cls = symbol === 'X' ? 'symbol-x' : 'symbol-o';
    return `<span class="${cls}" style="font-weight:800">${displayName(symbol)}</span>`;
  }

  let board = Array(9).fill('');
  let currentPlayer = 'X';
  let scores = { X: 0, O: 0 };
  let locked = false;
  let pendingMove = null;
  let currentProblem = null;

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      [a, b] = [b, a % b];
    }
    return a || 1;
  }

  function simplifyFraction(numerator, denominator) {
    if (denominator === 0) return null;
    const sign = denominator < 0 ? -1 : 1;
    numerator *= sign;
    denominator *= sign;
    const divisor = gcd(numerator, denominator);
    return {
      numerator: numerator / divisor,
      denominator: denominator / divisor
    };
  }

  function fractionToString(frac) {
    return `${frac.numerator}/${frac.denominator}`;
  }

  function parseFraction(input) {
    const clean = input.replace(/\s+/g, '');
    const match = clean.match(/^(-?\d+)\/(-?\d+)$/);
    if (!match) return null;
    const numerator = Number(match[1]);
    const denominator = Number(match[2]);
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) return null;
    return simplifyFraction(numerator, denominator);
  }

  function randomFraction() {
    const denominator = Math.floor(Math.random() * 8) + 2;
    const numerator = Math.floor(Math.random() * (denominator - 1)) + 1;
    return simplifyFraction(numerator, denominator);
  }

  function generateProblem() {
    if (gameMode === 'fractions') return generateFractionProblem();
    return generateNumberProblem();
  }

  function generateFractionProblem() {
    const operations = ['+', '-', '×'];
    let a = randomFraction();
    let b = randomFraction();
    let operation = operations[Math.floor(Math.random() * operations.length)];

    if (operation === '-') {
      const decA = a.numerator / a.denominator;
      const decB = b.numerator / b.denominator;
      if (Math.abs(decA - decB) < 0.00001) {
        operation = Math.random() < 0.5 ? '+' : '×';
      } else if (decA < decB) {
        const tmp = a; a = b; b = tmp;
      }
    }

    let result;
    if (operation === '+') {
      result = simplifyFraction(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
    } else if (operation === '-') {
      result = simplifyFraction(a.numerator * b.denominator - b.numerator * a.denominator, a.denominator * b.denominator);
    } else {
      result = simplifyFraction(a.numerator * b.numerator, a.denominator * b.denominator);
    }

    return {
      text: `${fractionToString(a)} ${operation} ${fractionToString(b)} = ?`,
      answer: fractionToString(result),
      type: 'fraction'
    };
  }

  function generateNumberProblem() {
    let a, b, result, text;

    if (gameMode === 'addition') {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      result = a + b;
      text = `${a} + ${b} = ?`;
    } else if (gameMode === 'subtraction') {
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * (a - 1)) + 1;
      result = a - b;
      text = `${a} − ${b} = ?`;
    } else if (gameMode === 'multiplication') {
      a = Math.floor(Math.random() * 10) + 2;
      b = Math.floor(Math.random() * 10) + 2;
      result = a * b;
      text = `${a} × ${b} = ?`;
    } else {
      b = Math.floor(Math.random() * 9) + 2;
      result = Math.floor(Math.random() * 10) + 2;
      a = b * result;
      text = `${a} ÷ ${b} = ?`;
    }

    return { text, answer: String(result), type: 'number' };
  }

  function setMessage(text, type = 'info') {
    messageBox.textContent = text;
    messageBox.className = `message ${type}`;
  }

  function updateScores() {
    scoreX.textContent = `${scores.X} ניצחונות`;
    scoreO.textContent = `${scores.O} ניצחונות`;
  }

  function switchPlayer() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    turnBadge.textContent = currentPlayer;
    if (turnName) {
      turnName.textContent = displayName("X");
      turnName.className = 'turn-player-name symbol-x';
    }
    if (turnName) {
      turnName.textContent = displayName(currentPlayer);
      turnName.className = 'turn-player-name ' + (currentPlayer === 'X' ? 'symbol-x' : 'symbol-o');
    }
  }

  function renderBoard(highlight = []) {
    boardEl.innerHTML = '';
    board.forEach((value, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'cell-wrapper';

      const inner = document.createElement('div');
      inner.className = 'cell-inner';

      const front = document.createElement('button');
      front.type = 'button';
      front.className = 'cell cell-front';
      front.setAttribute('aria-label', value
        ? `משבצת ${index + 1}, תפוסה על ידי ${value}`
        : `משבצת ${index + 1}, פנויה`);

      if (value) {
        front.classList.add(value === 'X' ? 'symbol-x' : 'symbol-o');
        front.textContent = value;
        front.disabled = true;
      } else if (!locked && pendingMove?.index !== index) {
        front.addEventListener('click', () => chooseCell(index));
      }

      if (highlight.includes(index)) wrapper.classList.add('winning');

      const back = document.createElement('div');
      back.className = 'cell-back';

      if (pendingMove?.index === index && currentProblem) {
        inner.classList.add('flipped');

        const probText = document.createElement('div');
        probText.className = 'cell-problem-text';
        probText.textContent = currentProblem.text;

        const answerRow = document.createElement('div');
        answerRow.className = 'cell-answer-row';

        const cellInput = document.createElement('input');
        cellInput.className = 'cell-answer-input';
        cellInput.type = 'text';
        cellInput.inputMode = 'text';
        cellInput.autocomplete = 'off';
        cellInput.placeholder = currentProblem.type === 'fraction' ? '3/4' : '0';

        const cellBtn = document.createElement('button');
        cellBtn.className = 'cell-answer-btn';
        cellBtn.type = 'button';
        cellBtn.textContent = '✓';

        cellInput.addEventListener('input', () => { answerInput.value = cellInput.value; });
        cellInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitCurrentAnswer(); });
        cellBtn.addEventListener('click', submitCurrentAnswer);

        setTimeout(() => cellInput.focus(), 380);

        answerRow.appendChild(cellInput);
        answerRow.appendChild(cellBtn);
        back.appendChild(probText);
        back.appendChild(answerRow);
      }

      inner.appendChild(front);
      inner.appendChild(back);
      wrapper.appendChild(inner);
      boardEl.appendChild(wrapper);
    });
  }

  function chooseCell(index) {
    if (locked || board[index]) return;
    pendingMove = { index, player: currentPlayer };
    currentProblem = generateProblem();
    answerInput.value = '';
    setMessage(`${displayName(currentPlayer)}, פתרו את התרגיל כדי לזכות במשבצת.`, 'info');
    renderBoard();
  }

  function finalizeMove(targetPlayer) {
    if (!pendingMove) return;
    board[pendingMove.index] = targetPlayer;
    pendingMove = null;
    currentProblem = null;
    answerInput.value = '';

    const winner = getWinner();
    if (winner) {
      scores[winner.player] += 1;
      updateScores();
      renderBoard(winner.line);
      showWinner(winner.player);
      locked = true;
      return;
    }

    if (board.every(Boolean)) {
      renderBoard();
      locked = true;
      setMessage('הלוח מלא, זהו תיקו. פתחו סיבוב חדש.', 'info');
      return;
    }

    switchPlayer();
    renderBoard();
  }

  function getWinner() {
    for (const line of winningLines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[b] === board[c]) {
        return { player: board[a], line };
      }
    }
    return null;
  }

  function showWinner(player) {
    winnerSymbol.textContent = player;
    winnerSymbol.className = `winner-symbol ${player === 'O' ? 'o' : ''}`;
    winnerText.textContent = `${displayName(player)} השלים רצף וניצח בסיבוב.`;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    setMessage(`${displayName(player)} ניצח. לחצו על "משחק נוסף" כדי להמשיך.`, 'success');
  }

  function hideWinner() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function submitCurrentAnswer() {
    if (!currentProblem || !pendingMove || locked) return;
    const current = pendingMove.player;
    const opponent = current === 'X' ? 'O' : 'X';
    let isCorrect = false;

    if (currentProblem.type === 'fraction') {
      const parsed = parseFraction(answerInput.value);
      if (!parsed) {
        setMessage('יש להזין תשובה בפורמט שבר מצומצם, למשל 3/4.', 'error');
        return;
      }
      isCorrect = fractionToString(parsed) === currentProblem.answer;
    } else {
      const val = answerInput.value.trim();
      if (!/^-?\d+$/.test(val)) {
        setMessage('יש להזין מספר שלם בלבד.', 'error');
        return;
      }
      isCorrect = val === currentProblem.answer;
    }

    if (isCorrect) {
      setMessage(`תשובה נכונה. המשבצת נרשמה ל${displayName(current)}.`, 'success');
      finalizeMove(current);
    } else {
      setMessage(`תשובה שגויה. התשובה הנכונה היא ${currentProblem.answer}, ולכן המשבצת עוברת ל${displayName(opponent)}.`, 'error');
      finalizeMove(opponent);
    }
  }

  function resetRound(keepScores = true) {
    if (!keepScores) { scores = { X: 0, O: 0 }; updateScores(); }
    board = Array(9).fill('');
    currentPlayer = 'X';
    locked = false;
    pendingMove = null;
    currentProblem = null;
    turnBadge.textContent = currentPlayer;
    if (turnName) {
      turnName.textContent = displayName("X");
      turnName.className = 'turn-player-name symbol-x';
    }
    answerInput.value = '';
    hideWinner();
    setMessage('סיבוב חדש התחיל. שחקן X פותח.', 'info');
    if (!keepScores) {
      scores = { X: 0, O: 0 };
      updateScores();
    }
    renderBoard();
  }

  const modeLabels = {
    addition:      { icon: '+', label: 'חיבור' },
    subtraction:   { icon: '−', label: 'חיסור' },
    multiplication:{ icon: '×', label: 'כפל' },
    division:      { icon: '÷', label: 'חילוק' },
    fractions:     { icon: '½', label: 'שברים' },
  };

  function updateModeDisplay() {
    const info = modeLabels[gameMode] || modeLabels.fractions;
    const iconEl = document.getElementById('modeDisplayIcon');
    const textEl = document.getElementById('modeDisplayText');
    if (iconEl) iconEl.textContent = info.icon;
    if (textEl) textEl.textContent = info.label;
  }

  const changeModeBtn = document.getElementById('changeModeBtn');
  const modeIndicatorBtn = document.getElementById('modeIndicatorBtn');
  const modeOnlyOverlay = document.getElementById('modeOnlyOverlay');
  const modeGridInGame = document.getElementById('modeGridInGame');
  const saveModeBtn = document.getElementById('saveModeBtn');

  const modeOptions = [
    { mode: 'addition', icon: '+', label: 'חיבור' },
    { mode: 'subtraction', icon: '−', label: 'חיסור' },
    { mode: 'multiplication', icon: '×', label: 'כפל' },
    { mode: 'division', icon: '÷', label: 'חילוק' },
    { mode: 'fractions', icon: '½', label: 'שברים' },
  ];

  function buildInGameModeGrid() {
    modeGridInGame.innerHTML = '';
    modeOptions.forEach(({ mode, icon, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mode-btn' + (gameMode === mode ? ' mode-btn-active' : '');
      btn.dataset.mode = mode;
      btn.innerHTML = `<span class="mode-icon">${icon}</span><span>${label}</span>`;
      btn.addEventListener('click', () => {
        modeGridInGame.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
        btn.classList.add('mode-btn-active');
      });
      modeGridInGame.appendChild(btn);
    });
  }

  function openModeOverlay() {
    buildInGameModeGrid();
    modeOnlyOverlay.classList.add('active');
    modeOnlyOverlay.setAttribute('aria-hidden', 'false');
  }

  if (modeIndicatorBtn) modeIndicatorBtn.addEventListener('click', openModeOverlay);
  if (changeModeBtn) changeModeBtn.addEventListener('click', () => {
    openModeOverlay();
  });

  saveModeBtn.addEventListener('click', () => {
    const active = modeGridInGame.querySelector('.mode-btn-active');
    if (active) {
      gameMode = active.dataset.mode;
      document.querySelectorAll('#modeGrid .mode-btn').forEach(b => {
        b.classList.toggle('mode-btn-active', b.dataset.mode === gameMode);
      });
      const helperEl = document.getElementById('answerHelper');
      if (helperEl) {
        helperEl.textContent = gameMode === 'fractions'
          ? 'יש לכתוב תשובה בפורמט של שבר מצומצם, למשל 5/6.'
          : 'יש להזין מספר שלם בלבד.';
      }
    }
    updateModeDisplay();
    modeOnlyOverlay.classList.remove('active');
    modeOnlyOverlay.setAttribute('aria-hidden', 'true');
  });

  modeOnlyOverlay.addEventListener('click', (e) => {
    if (e.target === modeOnlyOverlay) {
      updateModeDisplay();
      modeOnlyOverlay.classList.remove('active');
      modeOnlyOverlay.setAttribute('aria-hidden', 'true');
    }
  });

  const modeGrid = document.getElementById('modeGrid');
  modeGrid.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modeGrid.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
      btn.classList.add('mode-btn-active');
      gameMode = btn.dataset.mode;
      const helperEl = document.getElementById('answerHelper');
      if (helperEl) {
        helperEl.textContent = gameMode === 'fractions'
          ? 'יש לכתוב תשובה בפורמט של שבר מצומצם, למשל 5/6.'
          : 'יש להזין מספר שלם בלבד.';
      }
    });
  });
  startGameBtn.addEventListener('click', () => {
    playerNames.X = nameXInput.value.trim() || "שחקן X";
    playerNames.O = nameOInput.value.trim() || "שחקן O";
    if (turnName) {
      turnName.textContent = displayName('X');
      turnName.className = 'turn-player-name symbol-x';
    }
    if (scoreNameX) scoreNameX.textContent = displayName('X');
    if (scoreNameO) scoreNameO.textContent = displayName('O');
    updateModeDisplay();
    nameOverlay.classList.remove('active');
    nameOverlay.setAttribute('aria-hidden', 'true');
    setMessage(`${displayName('X')} מתחיל. בחרו משבצת פנויה כדי לקבל תרגיל.`, "info");
  });

  renderBoard();

  submitAnswer.addEventListener('click', submitCurrentAnswer);
  answerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitCurrentAnswer();
  });
  resetRoundBtn.addEventListener('click', () => resetRound(true));
  resetAllBtn.addEventListener('click', () => resetRound(false));
  playAgain.addEventListener('click', () => resetRound(true));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hideWinner();
  });

  updateScores();

  const onlineBtn = document.getElementById('onlineBtn');
  const onlineOverlay = document.getElementById('onlineOverlay');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const roomCodeInput = document.getElementById('roomCodeInput');
  const onlineError = document.getElementById('onlineError');
  const closeOnlineOverlay = document.getElementById('closeOnlineOverlay');
  const waitingOverlay = document.getElementById('waitingOverlay');
  const roomCodeDisplay = document.getElementById('roomCodeDisplay');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const waitingStatus = document.getElementById('waitingStatus');
  const cancelWaitingBtn = document.getElementById('cancelWaitingBtn');
  const connectedOverlay = document.getElementById('connectedOverlay');
  const connectedStatus = document.getElementById('connectedStatus');
  const startOnlineGame = document.getElementById('startOnlineGame');
  const leaveRoomBtn = document.getElementById('leaveRoomBtn');

  let ws = null;
  let peerConnection = null;
  let dataChannel = null;
  let currentRoomCode = null;
  let isHost = false;
  let isOnlineMode = false;
  let wsConnected = false;

  const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  function getWsUrl() {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${loc.host}`;
  }

  function connectWs() {
    return new Promise((resolve, reject) => {
      ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        wsConnected = true;
        resolve();
      };

      ws.onclose = () => {
        wsConnected = false;
        handleWsClose();
      };

      ws.onerror = (err) => {
        reject(err);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWsMessage(msg);
        } catch (err) {
          console.error('Invalid WS message:', err);
        }
      };
    });
  }

  function sendWs(type, payload = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  function handleWsMessage(msg) {
    switch (msg.type) {
      case 'connected':
        break;
      case 'roomCreated':
        currentRoomCode = msg.payload.roomCode;
        roomCodeDisplay.textContent = currentRoomCode;
        openWaitingScreen();
        break;
      case 'roomJoined':
        currentRoomCode = msg.payload.roomCode;
        break;
      case 'error':
        showOnlineError(msg.payload.message);
        break;
      case 'peerConnected':
        waitingStatus.textContent = 'היריב התחבר! מתחילים חיבור...';
        if (isHost) {
          initWebRTC(true);
        } else {
          initWebRTC(false);
        }
        break;
      case 'peerDisconnected':
        handlePeerDisconnect();
        break;
      case 'offer':
      case 'answer':
      case 'iceCandidate':
        handleSignalingMessage(msg);
        break;
      case 'gameState':
        applySyncedState(msg.payload?.state);
        break;
    }
  }

  function showOnlineError(msg) {
    onlineError.textContent = msg;
    onlineError.style.display = 'block';
    setTimeout(() => { onlineError.style.display = 'none'; }, 3000);
  }

  async function createRoom() {
    onlineError.style.display = 'none';
    try {
      await connectWs();
      isHost = true;
      isOnlineMode = true;
      sendWs('createRoom');
    } catch (err) {
      showOnlineError('שגיאת התחברות לשרת');
    }
  }

  async function joinRoom(code) {
    if (!code || code.length < 4) {
      showOnlineError('יש להזין קוד חדר');
      return;
    }
    onlineError.style.display = 'none';
    try {
      await connectWs();
      isHost = false;
      isOnlineMode = true;
      currentRoomCode = code.toUpperCase();
      sendWs('joinRoom', { roomCode: currentRoomCode });
      openWaitingScreen();
    } catch (err) {
      showOnlineError('שגיאת התחברות לשרת');
    }
  }

  function openOnlineOverlay() {
    onlineOverlay.classList.add('active');
    onlineOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeOnlineOverlayFunc() {
    onlineOverlay.classList.remove('active');
    onlineOverlay.setAttribute('aria-hidden', 'true');
    roomCodeInput.value = '';
    onlineError.style.display = 'none';
  }

  function openWaitingScreen() {
    onlineOverlay.classList.remove('active');
    onlineOverlay.setAttribute('aria-hidden', 'true');
    waitingOverlay.classList.add('active');
    waitingOverlay.setAttribute('aria-hidden', 'false');
    waitingStatus.textContent = isHost ? 'ממתין להתחברות יריב...' : 'מתחבר לחדר...';
  }

  function closeWaitingScreen() {
    waitingOverlay.classList.remove('active');
    waitingOverlay.setAttribute('aria-hidden', 'true');
    if (ws) { ws.close(); ws = null; }
    currentRoomCode = null;
    isHost = false;
  }

  function openConnectedScreen() {
    waitingOverlay.classList.remove('active');
    waitingOverlay.setAttribute('aria-hidden', 'true');
    startOnlineGameHandler();
  }

  async function startOnlineGameHandler() {
    if (connectedOverlay.classList.contains('active')) {
      connectedOverlay.classList.remove('active');
      connectedOverlay.setAttribute('aria-hidden', 'true');
    }

    playerNames.X = isHost ? (nameXInput.value.trim() || "שחקן X") : "שחקן X";
    playerNames.O = isHost ? (nameOInput.value.trim() || "שחקן O") : "שחקן O";

    if (turnName) {
      turnName.textContent = displayName('X');
      turnName.className = 'turn-player-name symbol-x';
    }
    if (scoreNameX) scoreNameX.textContent = displayName('X');
    if (scoreNameO) scoreNameO.textContent = displayName('O');

    resetRound(true);
    updateTurnBlocking();
    if (isHost) {
      broadcastState();
    }
    setMessage(`משחק מקוון התחיל! ${displayName('X')} פותח.`, 'info');
  }

  function closeConnectedScreen() {
    connectedOverlay.classList.remove('active');
    connectedOverlay.setAttribute('aria-hidden', 'true');
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    if (ws) { ws.close(); ws = null; }
    currentRoomCode = null;
    isOnlineMode = false;
    isHost = false;
  }

  async function initWebRTC(isInitiator) {
    if (peerConnection) {
      peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(iceServers);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendWs('iceCandidate', { candidate: event.candidate });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        openConnectedScreen();
      }
    };

    if (isInitiator) {
      dataChannel = peerConnection.createDataChannel('game');
      setupDataChannel();

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      sendWs('offer', { sdp: peerConnection.localDescription });
    } else {
      peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel();
      };
    }
  }

  function setupDataChannel() {
    dataChannel.onopen = () => {
      if (!isHost) {
        openConnectedScreen();
      }
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'gameState' && data.state) {
          applySyncedState(data.state);
        }
      } catch (err) {
        console.error('DataChannel error:', err);
      }
    };

    dataChannel.onclose = () => {
      handlePeerDisconnect();
    };
  }

  async function handleSignalingMessage(msg) {
    if (!peerConnection) {
      peerConnection = new RTCPeerConnection(iceServers);

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendWs('iceCandidate', { candidate: event.candidate });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
          openConnectedScreen();
        }
      };

      peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel();
      };
    }

    if (msg.type === 'offer' && msg.payload?.sdp) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      sendWs('answer', { sdp: peerConnection.localDescription });
    } else if (msg.type === 'answer' && msg.payload?.sdp) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
    } else if (msg.type === 'iceCandidate' && msg.payload?.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
    }
  }

  function syncGameState(state) {
    sendWs('gameState', { state });
    if (isOnlineMode) {
      setTimeout(updateTurnBlocking, 200);
    }
  }

  function broadcastState() {
    const state = {
      board,
      currentPlayer,
      scores,
      pendingMove,
      currentProblem,
      locked,
      gameMode
    };
    syncGameState(state);
  }

  function applySyncedState(state) {
    if (!state) return;
    board = state.board || Array(9).fill('');
    currentPlayer = state.currentPlayer || 'X';
    scores = state.scores || { X: 0, O: 0 };
    pendingMove = state.pendingMove || null;
    currentProblem = state.currentProblem || null;
    locked = state.locked || false;

    if (state.gameMode) {
      gameMode = state.gameMode;
      document.querySelectorAll('#modeGrid .mode-btn').forEach(b => {
        b.classList.toggle('mode-btn-active', b.dataset.mode === gameMode);
      });
      updateModeDisplay();
    }

    updateScores();
    turnBadge.textContent = currentPlayer;
    if (turnName) {
      turnName.textContent = displayName(currentPlayer);
      turnName.className = 'turn-player-name ' + (currentPlayer === 'X' ? 'symbol-x' : 'symbol-o');
    }

    const winner = getWinner();
    if (winner) {
      renderBoard(winner.line);
      locked = true;
    } else if (board.every(Boolean)) {
      renderBoard();
      locked = true;
    } else {
      renderBoard();
    }

    if (pendingMove) {
      setMessage(`${displayName(pendingMove.player)}, פתרו את התרגיל כדי לזכות במשבצת.`, 'info');
    } else if (locked) {
      if (winner) {
        setMessage(`${displayName(winner.player)} ניצח!`, 'success');
      } else {
        setMessage('הלוח מלא, זהו תיקו.', 'info');
      }
    }
    if (isOnlineMode) updateTurnBlocking();
  }

  function handleWsClose() {
    if (isOnlineMode) {
      handlePeerDisconnect();
    }
  }

  function handlePeerDisconnect() {
    closeConnectedScreen();
    closeWaitingScreen();
    if (dataChannel) { dataChannel.close(); dataChannel = null; }
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    isOnlineMode = false;
    setMessage('היריב התנתק מהמשחק.', 'error');
  }

  function copyShareLink() {
    const url = `${window.location.origin}${window.location.pathname}?room=${currentRoomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      copyLinkBtn.textContent = 'הועתק!';
      setTimeout(() => { copyLinkBtn.textContent = 'העתקת קישור'; }, 2000);
    }).catch(() => {
      prompt('העתיקו את הקישור:', url);
    });
  }

  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode && roomCode.length >= 4) {
      setTimeout(() => {
        joinRoom(roomCode);
      }, 500);
    }
  }

  onlineBtn.addEventListener('click', openOnlineOverlay);
  createRoomBtn.addEventListener('click', createRoom);
  joinRoomBtn.addEventListener('click', () => joinRoom(roomCodeInput.value));
  roomCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinRoom(roomCodeInput.value); });
  closeOnlineOverlay.addEventListener('click', closeOnlineOverlayFunc);
  onlineOverlay.addEventListener('click', (e) => { if (e.target === onlineOverlay) closeOnlineOverlayFunc(); });
  copyLinkBtn.addEventListener('click', copyShareLink);
  cancelWaitingBtn.addEventListener('click', closeWaitingScreen);
  startOnlineGame.addEventListener('click', startOnlineGameHandler);
  leaveRoomBtn.addEventListener('click', closeConnectedScreen);

  const turnWaitOverlay = document.getElementById('turnWaitOverlay');
  const turnWaitTitle = document.getElementById('turnWaitTitle');
  const turnWaitText = document.getElementById('turnWaitText');

  function updateTurnBlocking() {
    if (!isOnlineMode) {
      turnWaitOverlay.classList.remove('active');
      turnWaitOverlay.setAttribute('aria-hidden', 'true');
      return;
    }
    const myPlayer = isHost ? 'X' : 'O';
    if (currentPlayer !== myPlayer) {
      turnWaitTitle.textContent = currentPlayer === 'X' ? 'תור שחקן X' : 'תור שחקן O';
      const pName = displayName(currentPlayer);
      turnWaitText.textContent = `${pName} עושה את המהלך שלו... המתן בבקשה.`;
      turnWaitOverlay.classList.add('active');
      turnWaitOverlay.setAttribute('aria-hidden', 'false');
    } else {
      turnWaitOverlay.classList.remove('active');
      turnWaitOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  const originalChooseCell = chooseCell;
  chooseCell = function(index) {
    if (isOnlineMode) {
      const myPlayer = isHost ? 'X' : 'O';
      if (currentPlayer !== myPlayer) {
        updateTurnBlocking();
        return;
      }
      turnWaitOverlay.classList.remove('active');
      turnWaitOverlay.setAttribute('aria-hidden', 'true');
    }
    originalChooseCell(index);
    if (isOnlineMode && currentProblem) {
      setTimeout(broadcastState, 100);
    }
  };

  const originalFinalizeMove = finalizeMove;
  finalizeMove = function(targetPlayer) {
    originalFinalizeMove(targetPlayer);
    if (isOnlineMode) {
      setTimeout(broadcastState, 100);
    }
  };

  const originalResetRound = resetRound;
  resetRound = function(keepScores) {
    originalResetRound(keepScores);
    if (isOnlineMode) {
      setTimeout(broadcastState, 100);
    }
  };

  checkUrlParams();
})();