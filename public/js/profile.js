/**
 * Profile Calendar Logic - Enhanced with Time Ranges
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const calendarApp = document.getElementById('calendarApp');
  if (!calendarApp) return;

  const calMonthYear = document.getElementById('calMonthYear');
  const calGrid = document.getElementById('calGrid');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const calToday = document.getElementById('calToday');
  const calendarForm = document.getElementById('calendarForm');
  const daysJsonInput = document.getElementById('daysJsonInput');

  // Modal Elements
  let dayModal;
  try {
    dayModal = new bootstrap.Modal(document.getElementById('dayModal'));
  } catch (err) {
    console.error("Bootstrap Modal failed to init:", err);
    alert("Error: Calendar Modal could not be loaded. Please refresh.");
  }
  const modalTitle = document.getElementById('dayModalTitle');
  const modalDateInput = document.getElementById('modalDate');

  // Fix for sticky backdrop
  const modalEl = document.getElementById('dayModal');
  if (modalEl) {
    modalEl.addEventListener('hidden.bs.modal', () => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    });
  }
  const radioFree = document.getElementById('statusFree');
  const radioBusy = document.getElementById('statusBusy');
  const timeSlotsSection = document.getElementById('timeSlotsSection');
  const slotsContainer = document.getElementById('slotsContainer');
  const addSlotBtn = document.getElementById('addSlotBtn');
  const saveDayBtn = document.getElementById('saveDayBtn');

  // State
  let currentDate = new Date();
  // Map: "YYYY-MM-DD" -> { date, status, timeSlots: [{start, end}] }
  let availabilityMap = new Map();

  const isOwner = window.IS_OWNER === true;

  // Debug Helper
  function logToUI(msg) {
    const debugDiv = document.getElementById('debug-output');
    if (debugDiv) {
      debugDiv.innerHTML += `\n${msg}`;
    }
    console.log(msg);
  }

  function normalizeKey(dateStr) {
    if (!dateStr) return "";
    return dateStr.trim();
  }

  // --- Initialization ---

  function init() {
    console.log("[Calendar] Init. Owner:", isOwner);

    // Load existing data
    if (window.EXISTING_DAYS && Array.isArray(window.EXISTING_DAYS)) {
      logToUI(`[DEBUG] raw EXISTING_DAYS length: ${window.EXISTING_DAYS.length}`);
      window.EXISTING_DAYS.forEach(day => {
        if (day.date) {
          const key = normalizeKey(day.date);
          logToUI(`[DEBUG] Mapping date: ${key} -> status: ${day.status}`);
          availabilityMap.set(key, {
            date: key,
            status: day.status || 'free',
            timeSlots: day.timeSlots || []
          });
        }
      });
    }
    logToUI(`[DEBUG] Availability Map size: ${availabilityMap.size}`);

    renderCalendar(currentDate);

    // Navigation Listeners
    if (calPrev) calPrev.addEventListener('click', () => changeMonth(-1));
    if (calNext) calNext.addEventListener('click', () => changeMonth(1));
    if (calToday) calToday.addEventListener('click', () => {
      currentDate = new Date();
      renderCalendar(currentDate);
    });

    // Grid Click (Event Delegation)
    if (calGrid) {
      calGrid.addEventListener('click', (e) => {
        // Target any element with a date (the cell)
        const cell = e.target.closest('[data-date]');
        if (!cell) return;

        const dateStr = cell.dataset.date;
        if (!dateStr) return;

        if (dateStr) {
          openModal(dateStr);
        }
      });
    }
    // Modal Listeners
    radioFree.addEventListener('change', toggleTimeSlotsVisibility);
    radioBusy.addEventListener('change', toggleTimeSlotsVisibility);
    addSlotBtn.addEventListener('click', addTimeSlotInput);
    saveDayBtn.addEventListener('click', saveModalData);

    // Form Submission
    if (calendarForm) {
      calendarForm.addEventListener('submit', handleFormSubmit);
    }
  }

  // --- Rendering ---

  function renderCalendar(date) {
    calGrid.innerHTML = '';
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    calMonthYear.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    // Padding
    for (let i = 0; i < startDayOfWeek; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calGrid.appendChild(empty);
    }

    const todayStr = normalizeKey(toIsoString(new Date()));

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = normalizeKey(toIsoString(d));

      const cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = day;
      cell.dataset.date = dateStr;

      const data = availabilityMap.get(dateStr);
      const status = data ? data.status : 'free';
      if (data) {
        logToUI(`[DEBUG] Render match: ${dateStr} -> ${status}`);
        if (status === 'busy') {
          cell.innerHTML += '<span style="font-size: 20px; line-height: 0; position: absolute; bottom: 2px;">•</span>';
        }
      }
      cell.classList.add(status);

      if (dateStr === todayStr) cell.classList.add('today');
      cell.classList.add('clickable'); // Allow everyone to click

      calGrid.appendChild(cell);
    }
  }

  // --- Modal Logic ---

  function openModal(dateStr) {
    modalTitle.textContent = `Edit Availability: ${dateStr}`;
    modalDateInput.value = dateStr;

    const key = normalizeKey(dateStr);
    const data = availabilityMap.get(key) || { status: 'free', timeSlots: [] };

    // Set Status
    if (data.status === 'busy') {
      radioBusy.checked = true;
    } else {
      radioFree.checked = true;
    }
    toggleTimeSlotsVisibility();

    // Render Slots
    slotsContainer.innerHTML = '';
    if (data.timeSlots && data.timeSlots.length > 0) {
      data.timeSlots.forEach(slot => addTimeSlotInput(slot));
    } else {
      // Add one empty slot by default if busy? No, let user add.
    }

    dayModal.show();
  }

  function toggleTimeSlotsVisibility() {
    if (radioBusy.checked) {
      timeSlotsSection.classList.remove('d-none');
    } else {
      timeSlotsSection.classList.add('d-none');
    }
  }

  function addTimeSlotInput(slotData = { start: '', end: '' }) {
    const div = document.createElement('div');
    div.className = 'input-group mb-2 slot-row';
    div.innerHTML = `
            <span class="input-group-text">From</span>
            <input type="time" class="form-control start-time" value="${slotData.start || ''}">
            <span class="input-group-text">To</span>
            <input type="time" class="form-control end-time" value="${slotData.end || ''}">
            <button type="button" class="btn btn-outline-danger remove-slot"><i class="fa-solid fa-trash"></i></button>
        `;

    div.querySelector('.remove-slot').addEventListener('click', () => div.remove());
    slotsContainer.appendChild(div);
  }

  function saveModalData() {
    const dateStr = normalizeKey(modalDateInput.value);
    const status = radioBusy.checked ? 'busy' : 'free';
    let timeSlots = [];

    if (status === 'busy') {
      const rows = slotsContainer.querySelectorAll('.slot-row');
      rows.forEach(row => {
        const start = row.querySelector('.start-time').value;
        const end = row.querySelector('.end-time').value;
        if (start && end) {
          timeSlots.push({ start, end });
        }
      });
    }

    // Update Map
    availabilityMap.set(dateStr, { date: dateStr, status, timeSlots });

    // Update UI
    renderCalendar(currentDate); // Re-render to show color change
    dayModal.hide();
  }

  // --- Logic ---

  function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar(currentDate);
  }

  function handleFormSubmit(e) {
    const daysArray = Array.from(availabilityMap.values());
    daysJsonInput.value = JSON.stringify(daysArray);
    console.log("[Calendar] Submitting:", daysArray);
  }

  function toIsoString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  init();
});
