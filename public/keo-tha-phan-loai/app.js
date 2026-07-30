const themes = [
  {
    name: "Động vật",
    mission: "Bé hãy kéo con vật vào đúng nơi sống nhé!",
    zones: [
      {
        id: "water",
        label: "DƯỚI NƯỚC",
        icon: "≈",
        color: "#219ee6",
        background: "#c9f0ff",
        sceneClass: "water-scene"
      },
      {
        id: "land",
        label: "TRÊN CẠN",
        icon: "⌂",
        color: "#3eb34b",
        background: "#e2f7b5",
        sceneClass: "land-scene"
      }
    ],
    items: [
      { id: "fish", name: "Cá", category: "water" },
      { id: "dolphin", name: "Cá heo", category: "water" },
      { id: "octopus", name: "Bạch tuộc", category: "water" },
      { id: "crab", name: "Cua", category: "water" },
      { id: "cat", name: "Mèo", category: "land" },
      { id: "dog", name: "Chó", category: "land" },
      { id: "elephant", name: "Voi", category: "land" },
      { id: "rabbit", name: "Thỏ", category: "land" }
    ]
  },
  {
    name: "Phương tiện",
    mission: "Bé hãy kéo phương tiện vào đúng nhóm nhé!",
    zones: [
      {
        id: "road",
        label: "ĐƯỜNG BỘ",
        icon: "▰",
        color: "#3eaa3e",
        background: "#d9f4ce",
        sceneClass: "road-scene"
      },
      {
        id: "waterway",
        label: "ĐƯỜNG THỦY",
        icon: "≈",
        color: "#168ed5",
        background: "#c7efff",
        sceneClass: "waterway-scene"
      }
    ],
    items: [
      { id: "car", name: "Ô tô", category: "road" },
      { id: "bus", name: "Xe buýt", category: "road" },
      { id: "bike", name: "Xe đạp", category: "road" },
      { id: "truck", name: "Xe tải", category: "road" },
      { id: "ship", name: "Tàu thủy", category: "waterway" },
      { id: "boat", name: "Thuyền", category: "waterway" },
      { id: "canoe", name: "Ca nô", category: "waterway" },
      { id: "ferry", name: "Phà", category: "waterway" }
    ]
  },
  {
    name: "Rau quả",
    mission: "Bé hãy kéo rau củ và trái cây vào đúng nhóm nhé!",
    zones: [
      {
        id: "vegetable",
        label: "RAU CỦ",
        icon: "♣",
        color: "#50b941",
        background: "#e4f8bf",
        sceneClass: "vegetable-scene"
      },
      {
        id: "fruit",
        label: "TRÁI CÂY",
        icon: "●",
        color: "#f1a624",
        background: "#fff0b9",
        sceneClass: "fruit-scene"
      }
    ],
    items: [
      { id: "carrot", name: "Cà rốt", category: "vegetable" },
      { id: "cabbage", name: "Rau xanh", category: "vegetable" },
      { id: "cucumber", name: "Dưa leo", category: "vegetable" },
      { id: "corn", name: "Bắp", category: "vegetable" },
      { id: "apple", name: "Táo", category: "fruit" },
      { id: "banana", name: "Chuối", category: "fruit" },
      { id: "watermelon", name: "Dưa hấu", category: "fruit" },
      { id: "orange", name: "Cam", category: "fruit" }
    ]
  },
  {
    name: "Hình dạng",
    mission: "Bé hãy kéo hình vào đúng nhóm theo hình dạng nhé!",
    zones: [
      {
        id: "circle",
        label: "HÌNH TRÒN",
        icon: "○",
        color: "#61bf40",
        background: "#e7f7c3",
        sceneClass: "plain-scene"
      },
      {
        id: "triangle",
        label: "HÌNH TAM GIÁC",
        icon: "△",
        color: "#f06a92",
        background: "#ffe1ec",
        sceneClass: "plain-scene"
      }
    ],
    items: [
      { id: "ball", name: "Quả bóng", category: "circle" },
      { id: "clock", name: "Đồng hồ", category: "circle" },
      { id: "cookie", name: "Bánh tròn", category: "circle" },
      { id: "donut", name: "Bánh vòng", category: "circle" },
      { id: "pizza", name: "Pizza", category: "triangle" },
      { id: "warning", name: "Biển báo", category: "triangle" },
      { id: "tent", name: "Lều", category: "triangle" },
      { id: "mountain", name: "Núi", category: "triangle" }
    ]
  }
];

const zonesEl = document.querySelector("#zones");
const trayEl = document.querySelector("#itemsTray");
const missionText = document.querySelector("#missionText");
const themeButton = document.querySelector("#themeButton");
const scoreValue = document.querySelector("#scoreValue");
const correctValue = document.querySelector("#correctValue");
const totalValue = document.querySelector("#totalValue");
const feedback = document.querySelector("#feedback");
const soundButton = document.querySelector("#soundButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const guideButton = document.querySelector("#guideButton");
const startOverlay = document.querySelector("#startOverlay");
const startButton = document.querySelector("#startButton");
const startGuideButton = document.querySelector("#startGuideButton");
const startSoundButton = document.querySelector("#startSoundButton");
const startFullscreenButton = document.querySelector("#startFullscreenButton");
const startAchievementButton = document.querySelector("#startAchievementButton");
const startTipText = document.querySelector("#startTipText");
const celebration = document.querySelector("#celebration");
const finalScore = document.querySelector("#finalScore");

let themeIndex = 1;
let score = 0;
let correct = 0;
let muted = false;
let audioContext;
let activeDrag = null;
const victoryAudio = new Audio("assets/sounds/victory.mp3");
victoryAudio.preload = "auto";
const guideAudio = new Audio("assets/sounds/guide.wav");
guideAudio.preload = "auto";

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function imagePath(id) {
  return `assets/icons/${id}.png`;
}

function renderTheme() {
  const theme = themes[themeIndex];
  stopVictorySound();
  score = 0;
  correct = 0;
  activeDrag = null;
  missionText.textContent = theme.mission;
  themeButton.textContent = theme.name;
  scoreValue.textContent = score;
  correctValue.textContent = correct;
  totalValue.textContent = theme.items.length;
  feedback.textContent = "Sẵn sàng chơi nào!";
  celebration.hidden = true;

  zonesEl.innerHTML = "";
  trayEl.innerHTML = "";

  theme.zones.forEach((zone) => {
    const zoneEl = document.createElement("article");
    zoneEl.className = "drop-zone";
    zoneEl.dataset.category = zone.id;
    zoneEl.style.setProperty("--zone-color", zone.color);
    zoneEl.style.setProperty("--zone-bg", zone.background);
    zoneEl.innerHTML = `
      <div class="zone-label"><span class="zone-label-icon">${zone.icon}</span>${zone.label}</div>
      <div class="zone-scene ${zone.sceneClass}" aria-hidden="true"></div>
      <div class="placed-items"></div>
    `;
    zonesEl.append(zoneEl);
  });

  shuffle(theme.items).forEach((item) => trayEl.append(createItemCard(item)));
}

function createItemCard(item) {
  const card = document.createElement("button");
  card.className = "item-card";
  card.type = "button";
  card.dataset.id = item.id;
  card.dataset.category = item.category;
  card.setAttribute("aria-label", `${item.name}, kéo vào nhóm đúng`);
  card.innerHTML = `
    <span class="item-picture">
      <img class="item-image" src="${imagePath(item.id)}" alt="">
    </span>
    <span class="item-name">${item.name}</span>
  `;
  card.addEventListener("pointerdown", startDrag);
  return card;
}

function startDrag(event) {
  const card = event.currentTarget;
  if (card.classList.contains("placed")) {
    return;
  }

  unlockAudio();
  event.preventDefault();

  const rect = card.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.style.width = `${rect.width}px`;
  placeholder.style.height = `${rect.height}px`;
  placeholder.dataset.placeholder = card.dataset.id;
  card.parentElement.insertBefore(placeholder, card);

  card.classList.add("dragging");
  document.body.append(card);
  moveCard(card, event.clientX, event.clientY);
  card.setPointerCapture?.(event.pointerId);

  activeDrag = {
    card,
    placeholder,
    pointerId: event.pointerId
  };

  window.addEventListener("pointermove", dragMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", cancelDrag);
}

function dragMove(event) {
  if (!activeDrag) {
    return;
  }

  moveCard(activeDrag.card, event.clientX, event.clientY);
  document.querySelectorAll(".drop-zone").forEach((zone) => zone.classList.remove("drag-over"));

  const target = getDropZoneAt(event.clientX, event.clientY);
  if (target) {
    target.classList.add("drag-over");
  }
}

function endDrag(event) {
  if (!activeDrag) {
    return;
  }

  const { card, placeholder } = activeDrag;
  const target = getDropZoneAt(event.clientX, event.clientY);
  document.querySelectorAll(".drop-zone").forEach((zone) => zone.classList.remove("drag-over"));

  if (target && target.dataset.category === card.dataset.category) {
    placeCard(card, target, placeholder);
  } else {
    returnCard(card, placeholder);
  }

  cleanupDrag();
}

function cancelDrag() {
  if (!activeDrag) {
    return;
  }
  returnCard(activeDrag.card, activeDrag.placeholder);
  cleanupDrag();
}

function cleanupDrag() {
  window.removeEventListener("pointermove", dragMove);
  window.removeEventListener("pointerup", endDrag);
  window.removeEventListener("pointercancel", cancelDrag);
  activeDrag = null;
}

function getDropZoneAt(x, y) {
  const dragged = activeDrag?.card;
  if (dragged) {
    dragged.style.visibility = "hidden";
  }
  const element = document.elementFromPoint(x, y);
  if (dragged) {
    dragged.style.visibility = "";
  }
  return element?.closest(".drop-zone") ?? null;
}

function moveCard(card, x, y) {
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
}

function placeCard(card, zone, placeholder) {
  placeholder.remove();
  card.classList.remove("dragging");
  card.classList.add("placed");
  card.style.left = "";
  card.style.top = "";
  card.disabled = true;
  zone.querySelector(".placed-items").append(card);

  score += 10;
  correct += 1;
  scoreValue.textContent = score;
  correctValue.textContent = correct;
  feedback.textContent = randomMessage(["Đúng rồi!", "Giỏi quá!", "Chính xác!", "Tuyệt lắm!"]);
  pulse(zone);
  playCorrectSound();
  burstConfetti(18);

  if (correct === themes[themeIndex].items.length) {
    setTimeout(showCelebration, 450);
  }
}

function returnCard(card, placeholder) {
  card.classList.remove("dragging");
  card.style.left = "";
  card.style.top = "";
  placeholder.replaceWith(card);
  feedback.textContent = randomMessage(["Thử lại nhé!", "Chưa đúng rồi!", "Bé kéo sang nhóm khác nhé!"]);
  card.classList.add("shake-bad");
  setTimeout(() => card.classList.remove("shake-bad"), 420);
  playWrongSound();
}

function pulse(element) {
  element.classList.add("pulse-good");
  setTimeout(() => element.classList.remove("pulse-good"), 460);
}

function randomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function showCelebration() {
  finalScore.textContent = `Bé đạt ${score} điểm. Tặng bé thật nhiều sao!`;
  celebration.hidden = false;
  burstConfetti(80);
  playWinSound();
}

function burstConfetti(count) {
  const colors = ["#ff5c8a", "#ffc93d", "#34b4ff", "#5fd45f", "#8b6dff", "#ff8a3d"];
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.25}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    document.body.append(piece);
    setTimeout(() => piece.remove(), 1700);
  }
}

function unlockAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function tone(frequency, start, duration, type = "sine", gain = 0.12) {
  if (muted || !audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + start);
  volume.gain.setValueAtTime(gain, audioContext.currentTime + start);
  volume.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + start + duration);
  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + start);
  oscillator.stop(audioContext.currentTime + start + duration);
}

function playCorrectSound() {
  unlockAudio();
  tone(660, 0, 0.11, "sine", 0.13);
  tone(880, 0.08, 0.14, "sine", 0.11);
}

function playWrongSound() {
  unlockAudio();
  tone(220, 0, 0.18, "triangle", 0.11);
  tone(170, 0.12, 0.16, "triangle", 0.08);
}

function playWinSoundSynthesized() {
  unlockAudio();
  [523, 659, 784, 1046].forEach((note, index) => {
    tone(note, index * 0.1, 0.16, "sine", 0.12);
  });
}

function playWinSound() {
  if (muted) {
    return;
  }

  unlockAudio();
  victoryAudio.volume = 1;
  victoryAudio.currentTime = 0;
  victoryAudio.play().catch(() => playWinSoundSynthesized());
}

function stopVictorySound() {
  victoryAudio.pause();
  victoryAudio.currentTime = 0;
}

function playGuideSound() {
  if (muted) {
    return;
  }

  unlockAudio();
  stopVictorySound();
  guideAudio.volume = 1;
  guideAudio.currentTime = 0;
  guideAudio.play().catch(() => {
    feedback.textContent = "Bé hãy kéo hình vào đúng nhóm nhé!";
  });
}

function stopGuideSound() {
  guideAudio.pause();
  guideAudio.currentTime = 0;
}

function changeTheme(direction) {
  themeIndex = (themeIndex + direction + themes.length) % themes.length;
  renderTheme();
}

function toggleSound() {
  muted = !muted;
  soundButton.textContent = muted ? "🔇" : "🔊";
  const startSoundIcon = startSoundButton?.querySelector("span");
  if (startSoundIcon) {
    startSoundIcon.textContent = muted ? "🔇" : "🔊";
  }
  feedback.textContent = muted ? "Đã tắt âm thanh" : "Đã bật âm thanh";
  if (muted) {
    stopVictorySound();
    stopGuideSound();
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

document.querySelector("#prevTheme").addEventListener("click", () => changeTheme(-1));
document.querySelector("#nextTheme").addEventListener("click", () => changeTheme(1));
document.querySelector("#resetButton").addEventListener("click", renderTheme);
document.querySelector("#nextRoundButton").addEventListener("click", () => changeTheme(1));
guideButton.addEventListener("click", playGuideSound);
startGuideButton.addEventListener("click", playGuideSound);
startSoundButton.addEventListener("click", toggleSound);
startFullscreenButton.addEventListener("click", toggleFullscreen);
startAchievementButton.addEventListener("click", () => {
  startTipText.textContent = "Bé hoàn thành đủ 8 hình đúng sẽ nhận sao, cúp và âm thanh chiến thắng!";
  feedback.textContent = "Hoàn thành màn chơi để nhận sao thưởng!";
});
startButton.addEventListener("click", () => {
  startOverlay.classList.add("is-hidden");
  playGuideSound();
});
soundButton.addEventListener("click", toggleSound);
fullscreenButton.addEventListener("click", toggleFullscreen);

renderTheme();

if (window.location.hash === "#play") {
  startOverlay.classList.add("is-hidden");
}
