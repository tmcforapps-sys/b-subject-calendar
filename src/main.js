let subjects = [];
let activities = {};
async function saveActivities() {
  try {
    console.log("Saving subjects", subjects);
    console.log("Saving activities", activities);

    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjects, activities })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error("Save failed:", data);
    } else {
      console.log("Saved successfully");
    }
  } catch (err) {
    console.error('Error saving to server', err);
  }
}

async function loadActivities() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('Failed to fetch data from server');
    const data = await res.json();
    subjects = data.subjects || [];
    activities = data.activities || {};
  } catch (err) {
    console.error(err);
    const savedActs = localStorage.getItem('calendarActivities');
    if (savedActs) activities = JSON.parse(savedActs);
    const savedSubs = localStorage.getItem('calendarSubjects');
    if (savedSubs) subjects = JSON.parse(savedSubs);
  }
}

async function init() {
  await loadActivities();

  const yearInput = document.getElementById('yearInput');
  const monthInput = document.getElementById('monthInput');

  if (yearInput && !yearInput.value) yearInput.value = new Date().getFullYear();
  if (monthInput && !monthInput.value) monthInput.value = new Date().getMonth() + 1;

  generateCalendar('yearInput','monthInput');
  generateDraggableList();

  // Event listener ให้ input เปลี่ยนเดือน/ปี สร้างตารางใหม่
  if (yearInput) yearInput.addEventListener('input', () => generateCalendar('yearInput','monthInput'));
  if (monthInput) monthInput.addEventListener('input', () => generateCalendar('yearInput','monthInput'));
}

function getIconHTML(subject) {
  const colorClass = subject.colorClass || 'level-blue';
  const level = subject.level || '';
  return `<span class="level-icon level-${level} ${colorClass}"><span>${level}</span></span>`;
}

function makeDraggable(element, data) {
  element.setAttribute('draggable', true);
  element.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
    element.classList.add('dragging');
  });
  element.addEventListener('dragend', () => element.classList.remove('dragging'));
}

function removeSubject(id) {
  subjects = subjects.filter(s => s.id !== id);
  for (const d in activities) {
    activities[d] = activities[d].filter(a => a.id !== id);
    if (!activities[d].length) delete activities[d];
  }
  saveActivities();
  generateDraggableList();
  generateCalendar('yearInput','monthInput');
}

function removeActivity(dateStr, id) {
  if (activities[dateStr]) {
    activities[dateStr] = activities[dateStr].filter(a => a.id !== id);
    if (!activities[dateStr].length) delete activities[dateStr];
  }
}

function generateDraggableList() {
  const list = document.getElementById('draggableList');
  if (!list) return;
  list.innerHTML = '';

  subjects.forEach(subject => {
    const li = document.createElement('li');
    li.className = 'draggable-item';
    li.dataset.id = subject.id;
    li.innerHTML = `
      ${getIconHTML(subject)}
      <div>
        <div class="title">${subject.title}</div>
        <small>${subject.time}</small>
      </div>
      <button class="delete-btn" title="ลบวิชา">❌</button>
    `;
    makeDraggable(li, subject);

    li.querySelector('.delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      removeSubject(subject.id);
    });

    list.appendChild(li);
  });

  list.addEventListener('dragover', e => e.preventDefault());
  list.addEventListener('drop', e => {
    e.preventDefault();
    const dropped = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
    if (dropped.fromdate) {
      removeActivity(dropped.fromdate, dropped.id);
      saveActivities();
      generateCalendar('yearInput','monthInput');
      generateDraggableList();
    }
  });
}

function updateHeroMonth(year, monthIndex1to12) {
  const m = new Date(year, monthIndex1to12 - 1, 1)
    .toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const heroMonth = document.getElementById('heroMonth');
  if (heroMonth) heroMonth.textContent = m;
}

function generateCalendar(yearInputId, monthInputId) {
  const year = yearInputId ? parseInt(document.getElementById(yearInputId).value, 10) : new Date().getFullYear();
  const month = monthInputId ? parseInt(document.getElementById(monthInputId).value, 10) : new Date().getMonth() + 1;

  updateHeroMonth(year, month);

  const wrap = document.getElementById('calendarDisplay');
  wrap.innerHTML = '';

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    wrap.innerHTML = '<p style="color:#c00">กรุณาป้อนปีและเดือนให้ถูกต้อง</p>';
    return;
  }

  let firstDay = new Date(year, month - 1, 1).getDay();
  firstDay = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const table = document.createElement('table');
  table.className = 'calendar-table';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  ['MON','TUE','WED','THU','FRI','SAT','SUN'].forEach(day => {
    const th = document.createElement('th'); th.textContent = day; trHead.appendChild(th);
  });
  thead.appendChild(trHead); table.appendChild(thead);

  const tbody = document.createElement('tbody');
  let row = document.createElement('tr');

  for (let i = 0; i < firstDay; i++) row.appendChild(document.createElement('td'));

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const td = document.createElement('td');
    td.dataset.date = dateStr;
    td.innerHTML = `<strong>${day}</strong>`;

    if (activities[dateStr]) {
      activities[dateStr].forEach(act => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
          ${getIconHTML(act)}
          <div>
            <div class="title">${act.title}</div>
            <small>${act.time}</small>
          </div>
        `;
        if (document.getElementById('draggableList')) {
          Object.assign(div.dataset, { ...act, fromdate: dateStr });
          makeDraggable(div, { ...act, fromdate: dateStr });
        }
        td.appendChild(div);
      });
    }

    if (document.getElementById('draggableList')) {
      td.addEventListener('dragover', e => { e.preventDefault(); td.classList.add('drag-over'); });
      td.addEventListener('dragleave', () => td.classList.remove('drag-over'));
      td.addEventListener('drop', e => {
        e.preventDefault();
        td.classList.remove('drag-over');
        const dropped = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
        if (dropped.fromdate) removeActivity(dropped.fromdate, dropped.id);
        if (!activities[dateStr]) activities[dateStr] = [];
        if (!activities[dateStr].some(a => a.id === dropped.id)) {
          activities[dateStr].push({
            id: dropped.id, title: dropped.title, level: dropped.level,
            colorClass: dropped.colorClass, time: dropped.time
          });
        }
        saveActivities();
        generateCalendar(yearInputId, monthInputId);
        generateDraggableList();
      });
    }

    row.appendChild(td);
    if ((firstDay + day) % 7 === 0 || day === daysInMonth) {
      tbody.appendChild(row);
      row = document.createElement('tr');
    }
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
}

const addBtn = document.getElementById('addSubjectBtn');
if (addBtn) {
  addBtn.addEventListener('click', () => {
    const title = document.getElementById('newTitle').value.trim();
    const levelRadio = document.querySelector('input[name="level"]:checked');
    const colorRadio = document.querySelector('input[name="color"]:checked');
    const startTime = document.getElementById('newStartTime').value;
    const endTime = document.getElementById('newEndTime').value;

    if (!title) return alert('กรุณาใส่ชื่อวิชา');
    if (!levelRadio) return alert('กรุณาเลือกระดับ');
    if (!colorRadio) return alert('กรุณาเลือกสี/รูปแบบการเรียน');
    if (!startTime || !endTime) return alert('กรุณาใส่เวลาเริ่มและเวลาสิ้นสุด');

    const newId = (subjects.length ? Math.max(...subjects.map(s => +s.id)) : 0) + 1 + '';
    const colorClass = colorRadio.value === 'red' ? 'level-red' : 'level-blue';
    subjects.push({ id: newId, title, level: levelRadio.value, colorClass, time: `${startTime} - ${endTime}` });

    saveActivities();
    generateDraggableList();

    document.getElementById('newTitle').value = '';
    document.getElementById('newStartTime').value = '';
    document.getElementById('newEndTime').value = '';
    document.querySelectorAll('input[name="level"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[name="color"]').forEach(r => r.checked = false);
  });
}

const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    const year = parseInt(document.getElementById('yearInput').value, 10);
    const month = parseInt(document.getElementById('monthInput').value, 10);
    if (!isNaN(year) && !isNaN(month)) {
      const monthPrefix = `${year}-${String(month).padStart(2,'0')}-`;
      for (const dateStr in activities) {
        if (dateStr.startsWith(monthPrefix)) {
          delete activities[dateStr];
        }
      }
      saveActivities();
      generateCalendar('yearInput','monthInput');
      generateDraggableList();
    }
  });
}

const downloadBtn = document.getElementById('downloadBtn');
if (downloadBtn) {
  downloadBtn.addEventListener('click', () => {
    const node = document.getElementById('exportArea');
    html2canvas(node, { backgroundColor:'#fff', scale:2, useCORS:true })
      .then(canvas => {
        const link = document.createElement('a');
        link.download = 'calendar.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
  });
}

document.body.addEventListener('dragover', e => e.preventDefault());
document.body.addEventListener('drop', e => {
  const target = e.target;
  if (!target.closest('.calendar-table') && !target.closest('#draggableList')) {
    const dropped = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
    if (dropped.fromdate) {
      removeActivity(dropped.fromdate, dropped.id);
      saveActivities();
      generateCalendar('yearInput','monthInput');
      generateDraggableList();
    }
  }
});

const yearInput = document.getElementById('yearInput');
const monthInput = document.getElementById('monthInput');
if (yearInput) yearInput.addEventListener('input', () => generateCalendar('yearInput','monthInput'));
if (monthInput) monthInput.addEventListener('input', () => generateCalendar('yearInput','monthInput'));
// ---- banner section ----
const hero = document.querySelector('.hero');

const monthBanners = {
  1: '/banner_jan.jpg',
  2: '/banner_feb.jpg',
  3: '/banner_mar.jpg',
  4: '/banner_apr.jpg',
  5: '/banner_may.jpg',
  6: '/banner_jun.jpg',
  7: '/banner_jul.jpg',
  8: '/banner_aug.jpg',
  9: '/banner_sep.jpg',
  10: '/banner_oct.jpg',
  11: '/banner_nov.jpg',
  12: '/banner_dec.jpg',
};

function updateHeroBanner() {
  const month = parseInt(monthInput.value) || 1;
  if (monthBanners[month]) {
    hero.style.backgroundImage = `url('${monthBanners[month]}')`;
    hero.style.backgroundSize = 'cover';
    hero.style.backgroundPosition = 'center';
  }
}

// เรียกตอนโหลดหน้า
updateHeroBanner();

// เรียกเมื่อผู้ใช้เปลี่ยนเดือน
monthInput.addEventListener('input', updateHeroBanner);


init();
