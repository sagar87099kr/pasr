// public/shedule.js (JS)
/**
 * Requirements:
 * - Show 1 month in front (CURRENT month)
 * - Slider includes ALL months of 2026 (Jan..Dec 2026)
 * - Toggle day Free/Busy (no comments)
 * - Initially every day = Free
 * - Submit form POST /shedule/:id with daysJson
 * - Loads existing saved days from server so others see same schedule
 */

const monthsEl = document.getElementById("months");
const monthLabel = document.getElementById("monthLabel");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const todayBtn = document.getElementById("todayBtn");

const scheduleForm = document.getElementById("scheduleForm");
const daysJsonInput = document.getElementById("daysJson");

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad2(n) { return String(n).padStart(2, "0"); }
function toISODate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function monthName(d) { return d.toLocaleString(undefined, { month: "long" }); }
function startOfMonth(y, m) { return new Date(y, m, 1); }

// Months: ALL 2026
const months = Array.from({ length: 12 }, (_, i) => startOfMonth(2026, i));

// Visible month index = CURRENT month IF current year is 2026, else default to Jan 2026
const now = new Date();
let currentIndex = (now.getFullYear() === 2026) ? now.getMonth() : 0;

// scheduleMap: ISO -> "free"|"busy"
let scheduleMap = Object.create(null);

// Initialize all days in 2026 as FREE
function initAllFree() {
  for (const m of months) {
    const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(m.getFullYear(), m.getMonth(), day);
      scheduleMap[toISODate(d)] = "free";
    }
  }
}

// Overlay saved data from server (so everyone sees same schedule)
function overlayExistingDays(existing) {
  if (!Array.isArray(existing)) return;
  for (const e of existing) {
    const date = String(e?.date || "");
    const status = String(e?.status || "free");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!["free", "busy"].includes(status)) continue;
    if (scheduleMap[date] !== undefined) scheduleMap[date] = status;
  }
}

function render() {
  monthsEl.innerHTML = "";
  const m = months[currentIndex];
  monthsEl.appendChild(renderMonth(m));

  monthLabel.textContent = `${monthName(m)} ${m.getFullYear()} (${currentIndex + 1}/12)`;

  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === 11;
}

function renderMonth(m) {
  const monthBox = document.createElement("div");
  monthBox.className = "month";

  const head = document.createElement("div");
  head.className = "month-title";
  head.innerHTML = `
    <div class="name">${monthName(m)}</div>
    <div class="year">${m.getFullYear()}</div>
  `;
  monthBox.appendChild(head);

  const dow = document.createElement("div");
  dow.className = "dow";
  for (const x of DOW) {
    const d = document.createElement("div");
    d.textContent = x;
    dow.appendChild(d);
  }
  monthBox.appendChild(dow);

  const grid = document.createElement("div");
  grid.className = "grid";

  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
  const leading = first.getDay();
  const totalDays = last.getDate();

  for (let i = 0; i < leading; i++) {
    const blank = document.createElement("div");
    blank.className = "day muted";
    grid.appendChild(blank);
  }

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(m.getFullYear(), m.getMonth(), day);
    const key = toISODate(d);
    const status = scheduleMap[key] || "free";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `day ${status}`;
    btn.textContent = String(day);
    btn.dataset.date = key;

    btn.addEventListener("click", () => {
      if (window.IS_OWNER) {
        scheduleMap[key] = (scheduleMap[key] === "busy") ? "free" : "busy";
        render();
      }
    });

    grid.appendChild(btn);
  }

  monthBox.appendChild(grid);
  return monthBox;
}

// Slider controls
prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) { currentIndex--; render(); }
});
nextBtn.addEventListener("click", () => {
  if (currentIndex < 11) { currentIndex++; render(); }
});
todayBtn.addEventListener("click", () => {
  currentIndex = (now.getFullYear() === 2026) ? now.getMonth() : 0;
  render();
});

// Submit form -> send JSON
if (scheduleForm) {
  scheduleForm.addEventListener("submit", () => {
    const days = Object.entries(scheduleMap).map(([date, status]) => ({ date, status }));
    daysJsonInput.value = JSON.stringify(days);
  });
}

// Init
initAllFree();
overlayExistingDays(window.EXISTING_DAYS);
render();
