/* FitLab member UI rebuilt from the report screenshots, pages 8–11. */
const app = document.getElementById('app');
if (window.Capacitor?.isNativePlatform?.()) app.classList.add('app-native');
let memberProfile = null,
  memberProfileStatus = 'loading';

// Icons and safe HTML helpers
let cloudNotifications = [],
  notificationStatus = 'idle',
  stopNotifications = null,
  notifFilter = 'all',
  isMarkingNotifRead = false,
  notificationRoleMode = '';
const paths = {
  home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  calendar:
    'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2ZM7 3v4m10-4v4M3 10h18M7 14h3m4 0h3m-10 3h3',
  book: 'M6 3h12v18H6zM9 7h6m-6 4h6m-6 4h4',
  rfid: 'M9 9a5 5 0 0 1 0 6m4-9a10 10 0 0 1 0 12m4-15a15 15 0 0 1 0 18M5 11v2',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  lock: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  phone: 'M5 3h4l2 5-3 2a13 13 0 0 0 6 6l2-3 5 2v4c-9 3-20-8-16-16Z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  back: 'm14 6-6 6 6 6',
  arrow: 'm9 6 6 6-6 6',
  check: 'm5 12 5 5L20 7',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Zm5 4h4',
  info: 'M12 10v7m0-11v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  logout: 'M10 4H4v16h6m4-12 5 4-5 4m-6-4h11',
  copy: 'M8 8h13v13H8zM16 8V3H3v13h5',
};
const icon = (name) =>
  /* HTML */ `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="${paths[name] || paths.info}" />
  </svg>`;
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const brand = () => '<div class="brand"><img src="images/logo.png" alt="">FitLab</div>';

// Current member and navigation state
let user = null,
  page = 'login',
  selected = null,
  selectedBooking = null,
  history = false,
  view = 'day';
let selectedDate = new Date(bangkokDateKey() + 'T00:00:00');

// Demo classes and legacy booking display fallback. Real rounds come from Firestore.
let classes = [
  {
    id: 'strength',
    title: 'Strength Basics',
    category: 'เวท',
    time: '18:30',
    end: '19:30',
    trainer: 'โค้ชอาร์ม',
    capacity: 12,
    image: 'images/strength-reference.jpg',
    description: 'เรียนรู้ท่าพื้นฐานสำหรับการยกเวทอย่างปลอดภัยและถูกต้อง',
  },
  {
    id: 'yoga',
    title: 'Yoga Flow',
    category: 'โยคะ',
    time: '09:00',
    end: '10:00',
    trainer: 'โค้ชแนน',
    capacity: 10,
    image: 'images/yoga-reference.jpg',
    description: 'เชื่อมโยงการเคลื่อนไหวและลมหายใจ พร้อมเพิ่มความยืดหยุ่น',
  },
  {
    id: 'hiit',
    title: 'HIIT Training',
    category: 'คาร์ดิโอ',
    time: '10:30',
    end: '11:30',
    trainer: 'โค้ชต้น',
    capacity: 16,
    image: 'images/hiit-reference.jpg',
    description: 'ฝึกความแข็งแรงและความอดทนด้วยการออกกำลังกายแบบสลับช่วง',
  },
  {
    id: 'pilates',
    title: 'Pilates Core',
    category: 'พิลาทิส',
    time: '14:00',
    end: '15:00',
    trainer: 'โค้ชมายด์',
    capacity: 8,
    image: 'images/pilates-reference.jpg',
    description: 'เสริมสร้างกล้ามเนื้อแกนกลางและพัฒนาสมดุลของร่างกาย',
  },
];

// Catalog and scheduled occurrences are shared by Members, Trainers and Admins.
let catalogRows = [],
  cloudSchedules = {},
  catalogStatus = 'idle',
  stopCatalog = null;
let catalogTab = 'classes',
  showInactiveClasses = false,
  editingClassId = null,
  editingScheduleId = null,
  manageDate = bangkokDateKey();
const demoClasses = classes.map((c) => ({ ...c }));
const imageOptions = ['strength', 'yoga', 'hiit', 'pilates'].map(
  (id) => 'images/' + id + '-reference.jpg',
);
function bangkokClock(date) {
  return date.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Bangkok',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displayClock(time) {
  return time.replace(':', '.');
}

function dateAndClock(date, options) {
  const day = date.toLocaleDateString('th-TH', {
    ...options,
    timeZone: 'Asia/Bangkok',
  });
  return day + ' ' + displayClock(bangkokClock(date));
}

function classForDate(id, date) {
  const base = classes.find((c) => c.id === id);
  if (!base) return null;
  const round = !user?.demo && cloudSchedules[date + '_' + id];
  if (!round) return base;
  const time = (t) =>
    bangkokClock(new Date(t.toMillis ? t.toMillis() : t.seconds * 1000));
  return {
    ...base,
    time: time(round.startsAt),
    end: time(round.endsAt),
    capacity: round.capacity,
    location: round.location,
    status: round.status,
    trainerUid: round.trainerUid,
    trainer: round.trainerName || 'ยังไม่มอบหมายผู้สอน',
  };
}
function stopCatalogData() {
  stopCatalog?.();
  stopCatalog = null;
  cloudSchedules = {};
  catalogRows = [];
  catalogStatus = 'idle';
  classes = demoClasses.map((c) => ({ ...c }));
}
async function startCatalogData() {
  const generation = cloudGeneration;
  catalogStatus = 'loading';
  try {
    const store = await window.fitlabStore;
    if (generation !== cloudGeneration) return;
    stopCatalog = store.watchCatalog(
      (state) => {
        if (generation !== cloudGeneration) return;
        catalogRows = state.catalog;
        cloudSchedules = state.schedules;
        catalogStatus = 'ready';
        const all = new Map(demoClasses.map((c) => [c.id, { ...c }]));
        for (const c of catalogRows)
          all.set(c.id, {
            time: '00:00',
            end: '00:00',
            trainer: 'ยังไม่ได้ระบุ',
            capacity: 0,
            ...all.get(c.id),
            ...c,
          });
        classes = [...all.values()];
        if (page === 'detail' && selected)
          selected = classForDate(selected.id, dateKey(selectedDate));
        if (
          !['login', 'register', 'forgot', 'password', 'personal', 'catalog'].includes(
            page,
          )
        )
          render();
        if (
          page === 'catalog' &&
          !app.querySelector('input:focus,select:focus,textarea:focus')
        )
          render();
      },
      () => {
        if (generation !== cloudGeneration) return;
        catalogStatus = 'error';
        cloudSchedules = {};
        if (!['login', 'register', 'forgot'].includes(page)) render();
      },
    );
  } catch {
    catalogStatus = 'error';
  }
}
function catalogScreen() {
  if (!canAdmin()) return staffDenied();
  const field = (name, label, value, type = 'text', extra = '') =>
    `<label class="field"><span>${label}</span><input class="staff-input" name="${name}" type="${type}" value="${esc(value ?? '')}" ${extra} required></label>`;
  const editing = catalogRows.find((c) => c.id === editingClassId && !c.archived),
    round = cloudSchedules[editingScheduleId];
  const c = round && classForDate(round.classId, round.date),
    count = editingScheduleId ? cloudSessions[editingScheduleId]?.bookedCount || 0 : 0;
  const removeRoundButton = round
    ? '<button class="danger" type="button" data-action="remove-round">ลบรอบนี้</button>'
    : '';
  const classesForm = `<form id="classEditor" class="role-card"><h2>${editing ? 'แก้ไขคลาส' : 'เพิ่มคลาส'}</h2>${field('title', 'ชื่อคลาส', editing?.title)}${field('category', 'ประเภทคลาส', editing?.category)}<label class="field"><span>รายละเอียด</span><textarea class="staff-input staff-textarea" name="description" maxlength="1500" required>${esc(editing?.description || '')}</textarea></label><label class="field"><span>รูปภาพ</span><select class="staff-input" name="image">${imageOptions.map((image) => `<option value="${image}" ${editing?.image === image ? 'selected' : ''}>${image.split('/').pop().replace('-reference.jpg', '')}</option>`).join('')}</select></label><label class="field"><span>สถานะ</span><select class="staff-input" name="active"><option value="true">เปิดใช้งาน</option><option value="false" ${editing?.active === false ? 'selected' : ''}>พักคลาส</option></select></label><div class="row"><button class="primary" type="submit">บันทึกคลาส</button>${editing ? '<button class="secondary" type="button" data-action="new-class">ยกเลิกแก้ไข</button>' : ''}</div></form>`;
  const date = round?.date || manageDate;
  const clockInput = 'inputmode="decimal" maxlength="5" pattern="(?:[01][0-9]|2[0-3])[.][0-5][0-9]"';
  const roundsForm = `<form id="scheduleEditor" class="role-card"><h2>${round ? 'แก้ไขรอบเรียน' : 'เพิ่มรอบเรียน'}</h2><p class="settings-hint">หนึ่งรอบต่อคลาสต่อวัน · กรอกเวลารูปแบบ 24 ชั่วโมง เช่น 18.30</p>${
    round
      ? `<input type="hidden" name="classId" value="${esc(round.classId)}"><input type="hidden" name="date" value="${round.date}"><p class="notice">${esc(c.title)} · ${thaiDate(round.date)}</p>`
      : `<label class="field"><span>คลาส</span><select class="staff-input" name="classId" required><option value="">เลือกคลาส</option>${catalogRows
          .filter((c) => c.active)
          .map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`)
          .join(
            '',
          )}</select></label>${field('date', 'วันที่เรียน', date, 'date', `min="${bangkokDateKey()}"`)}`
  }<div class="row">${field('time', 'เวลาเริ่ม', displayClock(c?.time || '09:00'), 'text', clockInput + (count ? ' readonly' : ''))}${field('end', 'เวลาจบ', displayClock(c?.end || '10:00'), 'text', clockInput + (count ? ' readonly' : ''))}</div>${field('capacity', 'จำนวนที่นั่ง', round?.capacity || 10, 'number', `min="${Math.max(1, count)}" max="200" step="1"`)}${field('location', 'สถานที่', round?.location || 'Gym Zone', 'text', count ? 'readonly' : '')}<label class="field"><span>การรับจอง</span><select class="staff-input" name="status"><option value="open">เปิดรับจอง</option><option value="closed" ${round?.status === 'closed' ? 'selected' : ''}>ปิดรับจอง</option></select></label>${count ? `<p class="notice">มีผู้จอง ${count} คนแล้ว เปลี่ยนได้เฉพาะความจุและการรับจอง เวลาและสถานที่จะคงเดิม</p>` : ''}<div class="row"><button class="primary" type="submit">บันทึกรอบเรียน</button>${round ? '<button class="secondary" type="button" data-action="new-schedule">เพิ่มรอบใหม่</button>' : ''}${removeRoundButton}</div></form>`;
  const list =
    catalogTab === 'classes'
      ? catalogRows
          .filter((row) => showInactiveClasses ? !row.active : row.active && !row.archived)
          .map(
            (row) => row.archived
              ? `<div class="role-card"><h3>${esc(row.title)}</h3><p>คลาสนี้ถูกนำออกจากตารางทุกวัน</p><button type="button" class="secondary" data-action="restore-archived-class" data-id="${esc(row.id)}">คืนคลาสเข้าตาราง</button></div>`
              : `<button class="class-card" data-action="edit-class" data-id="${esc(row.id)}"><img src="${esc(row.image)}" alt=""><span class="class-info"><h3>${esc(row.title)}</h3><p>${esc(row.category)}</p><span class="tag">${row.active ? 'เปิดใช้งาน' : 'พักคลาส'}</span></span><span class="arrow">แก้ไข</span></button>`,
          )
          .join('')
      : Object.entries(cloudSchedules)
          .filter(([, r]) => r.date === manageDate && r.status !== 'cancelled')
          .sort(([, a], [, b]) => a.startsAt.toMillis() - b.startsAt.toMillis())
          .map(([id, row]) => {
            const c = classForDate(row.classId, row.date);
            return `<button class="class-card" data-action="edit-schedule" data-id="${esc(id)}"><img src="${esc(c.image)}" alt=""><span class="class-info"><h3>${esc(c.title)}</h3><p>${displayClock(c.time)} – ${displayClock(c.end)} · ${esc(row.location)}</p><p>ผู้จอง ${cloudSessions[id]?.bookedCount || 0} / ${row.capacity} คน</p><span class="tag">${row.status === 'open' ? 'เปิดรับจอง' : 'ปิดรับจอง'}</span></span><span class="arrow">แก้ไข</span></button>`;
          })
          .join('');
  return shell(
    `<div class="settings-content catalog-content"><h1>จัดการคลาสและรอบเรียน</h1><p class="settings-intro">ตารางที่สมาชิกและผู้ฝึกสอนใช้ร่วมกัน</p><div class="tabs"><button data-action="catalog-tab" data-tab="classes" class="${catalogTab === 'classes' ? 'active' : ''}">ข้อมูลคลาส</button><button data-action="catalog-tab" data-tab="schedules" class="${catalogTab === 'schedules' ? 'active' : ''}">รอบเรียน</button></div>${catalogStatus === 'error' ? '<p class="notice">ยังอ่านข้อมูลไม่ได้ กรุณา Publish Firestore Rules ล่าสุด</p>' : ''}${catalogTab === 'classes' ? classesForm : roundsForm}<div class="section-heading" style="margin-top:24px"><h2>${catalogTab === 'classes' ? (showInactiveClasses ? 'คลาสที่หยุดใช้งาน' : 'คลาสที่เปิดใช้งาน') : 'รอบเรียนตามวันที่เลือก'}</h2>${catalogTab === 'classes' ? `<button type="button" class="text-link" data-action="toggle-inactive-classes">${showInactiveClasses ? 'ดูคลาสที่เปิดใช้งาน' : 'ดูคลาสที่หยุดใช้งาน'}</button>` : ''}</div>${catalogTab === 'schedules' ? `<input class="staff-input" id="manage-date" type="date" value="${manageDate}" aria-label="วันที่แสดงรอบเรียน">` : ''}<div class="class-list" style="margin-top:12px">${list || '<p class="empty">ยังไม่มีข้อมูล</p>'}</div><div class="notice"><p>เริ่มต้นจากตารางตัวอย่างเดิมได้ โดยไม่ล้างยอดจองที่มีอยู่</p><button class="secondary" data-action="import-schedule" style="margin-top:10px">นำเข้าตารางเดิม 14 วัน</button></div></div>`,
    'profile',
    backbar('จัดการคลาส', 'profile'),
  );
}
async function submitCatalog(form) {
  if (!canAdmin()) return notify('ไม่มีสิทธิ์จัดการคลาส', 'error', form);
  const button = form.querySelector('[type=submit]'),
    data = new FormData(form);
  button.disabled = true;
  try {
    const store = await window.fitlabStore;
    if (form.id === 'classEditor') {
      await store.saveClass(editingClassId || crypto.randomUUID(), {
        title: data.get('title').trim(),
        category: data.get('category').trim(),
        description: data.get('description').trim(),
        image: data.get('image'),
        active: data.get('active') === 'true',
      });
      editingClassId = null;
    } else {
      const date = data.get('date'),
        time = data.get('time').replace('.', ':'),
        end = data.get('end').replace('.', ':'),
        id = date + '_' + data.get('classId');
      if (!editingScheduleId && cloudSchedules[id] && cloudSchedules[id].status !== 'cancelled')
        throw Error('มีรอบของคลาสนี้ในวันดังกล่าวแล้ว กรุณากดแก้ไขรอบเดิม');
      if (end <= time) throw Error('เวลาจบต้องอยู่หลังเวลาเริ่ม และอยู่ภายในวันเดียวกัน');
      await store.saveSchedule({
        classId: data.get('classId'),
        date,
        time,
        end,
        capacity: Number(data.get('capacity')),
        location: data.get('location').trim(),
        status: data.get('status'),
      });
      editingScheduleId = null;
      manageDate = date;
    }
    render();
    notify('บันทึกข้อมูลแล้ว', 'success', app.querySelector('.catalog-content'));
  } catch (e) {
    notify(cloudError(e), 'error', form);
  } finally {
    button.disabled = false;
  }
}
async function importLegacySchedule(button) {
  if (!canAdmin()) return;
  button.disabled = true;
  button.textContent = 'กำลังนำเข้า…';
  try {
    const store = await window.fitlabStore;
    for (const c of demoClasses)
      await store.saveClass(
        c.id,
        {
          title: c.title,
          category: c.category,
          description: c.description,
          image: c.image,
          active: true,
        },
        true,
      );
    let added = 0;
    for (let i = 0; i < 14; i++) {
      const day = new Date(bangkokDateKey() + 'T12:00:00');
      day.setDate(day.getDate() + i);
      const date = dateKey(day),
        weekday = new Date(date + 'T12:00:00+07:00').getUTCDay();
      for (const id of weeklyTimetable[weekday]) {
        const c = demoClasses.find((c) => c.id === id);
        if (occurrenceStarted(c, date) || cloudSchedules[date + '_' + id]) continue;
        await store.saveSchedule(
          {
            classId: id,
            date,
            time: c.time,
            end: c.end,
            capacity: c.capacity,
            location: 'Gym Zone',
            status: 'open',
          },
          true,
        );
        added++;
      }
    }
    notify(
      'นำเข้ารอบเรียนเรียบร้อย ' + added + ' รอบ โดยเก็บยอดจองเดิมไว้',
      'success',
      app.querySelector('.catalog-content'),
    );
  } catch (e) {
    notify(cloudError(e), 'error', app.querySelector('.catalog-content'));
  } finally {
    button.disabled = false;
    button.textContent = 'นำเข้าตารางเดิม 14 วัน';
  }
}

// Calendar dates, local demo data, and cloud cache
const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const thaiDate = (d, short = false) =>
  new Date(d + 'T00:00:00').toLocaleDateString('th-TH', {
    day: 'numeric',
    month: short ? 'short' : 'long',
    ...(!short ? { year: 'numeric' } : {}),
  });
let cloudBookings = [],
  cloudSessions = {},
  cloudStatus = 'idle',
  stopCloud = null,
  cloudGeneration = 0;
function readBookings() {
  if (user && !user.demo) return cloudBookings;
  try {
    return JSON.parse(localStorage.getItem('fitlab-pdf-bookings:' + user?.uid) || '[]');
  } catch {
    return [];
  }
}
function saveBookings(items) {
  if (user && !user.demo) throw Error('บัญชีจริงต้องบันทึกผ่าน Firestore');
  localStorage.setItem('fitlab-pdf-bookings:' + user.uid, JSON.stringify(items));
}

// One occurrence is identified by the class ID and Bangkok calendar date.

// Booking availability in Bangkok time
function bangkokDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return part('year') + '-' + part('month') + '-' + part('day');
}
function occurrenceStarted(c, date, now = Date.now()) {
  c = classForDate(c.id, date) || c;
  return new Date(date + 'T' + c.time + ':00+07:00').getTime() <= now;
}
// Explicit recurring demo timetable; no invented member counts.
const weeklyTimetable = {
  0: ['yoga', 'pilates'],
  1: ['strength', 'yoga', 'hiit', 'pilates'],
  2: ['strength', 'yoga', 'hiit'],
  3: ['yoga', 'pilates'],
  4: ['strength', 'hiit', 'pilates'],
  5: ['strength', 'yoga', 'hiit'],
  6: ['yoga', 'hiit', 'pilates'],
};
function visibleClassesOnDate(date) {
  const rounds = classesOnDate(date);
  if (!user || user.demo || canAdmin() || canTrainer()) return rounds;
  return rounds.filter((round) => round.active !== false);
}

function classesOnDate(date) {
  if (user && !user.demo)
    return Object.values(cloudSchedules)
      .filter((r) => r.date === date && r.status !== 'cancelled')
      .map((r) => classForDate(r.classId, date))
      .filter(Boolean)
      .sort((a, b) => a.time.localeCompare(b.time));
  const day = new Date(date + 'T12:00:00+07:00').getUTCDay();
  return (weeklyTimetable[day] || [])
    .map((id) => classes.find((c) => c.id === id))
    .sort((a, b) => a.time.localeCompare(b.time));
}
function seatsFor(c, date) {
  if (user && !user.demo) {
    const s = cloudSessions[date + '_' + c.id];
    const booked = s?.bookedCount || 0;
    const capacity = s?.capacity || c.capacity;
    return { booked, capacity, remaining: Math.max(0, capacity - booked) };
  }
  let booked = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('fitlab-pdf-bookings:')) continue;
    try {
      const rows = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(rows))
        booked += rows.filter(
          (b) => !b.cancelled && b.classId === c.id && b.date === date,
        ).length;
    } catch {}
  }
  return { booked, remaining: Math.max(0, c.capacity - booked), capacity: c.capacity };
}
function bookingProblem(c, date) {
  if (user && !user.demo) {
    if (catalogStatus !== 'ready') return 'ยังโหลดตารางคลาสไม่ได้ กรุณารอสักครู่';
    const round = cloudSchedules[date + '_' + c.id],
      catalog = catalogRows.find((item) => item.id === c.id);
    if (!round || round.status !== 'open' || !catalog?.active)
      return 'คลาสนี้ปิดรับการจอง';
    c = classForDate(c.id, date) || c;
  }
  if (user && !user.demo && roleReady && user.role !== 'member')
    return 'บัญชีผู้ฝึกสอนและผู้ดูแลระบบไม่ใช้ที่นั่งผู้เรียน';
  if (user && !user.demo && cloudStatus !== 'ready')
    return cloudStatus === 'error'
      ? 'ยังเชื่อมฐานข้อมูลไม่ได้ กรุณาตรวจสอบ Firestore และสิทธิ์การเข้าถึง'
      : 'กำลังโหลดข้อมูลการจอง';
  if (date < bangkokDateKey()) return 'วันที่นี้ผ่านมาแล้ว ไม่สามารถจองย้อนหลังได้';
  if (!classesOnDate(date).some((item) => item.id === c.id))
    return 'ไม่มีคลาสนี้ในวันที่เลือก กรุณาเลือกจากตารางคลาส';
  if (occurrenceStarted(c, date)) return 'คลาสนี้เริ่มแล้ว ปิดรับการจอง';
  if (seatsFor(c, date).remaining === 0) return 'คลาสเต็มแล้ว กรุณาเลือกคลาสอื่น';
  return '';
}

// Shared navigation, page shell, and form fields
function nav(active) {
  const pendingRounds = adminTrainerAlerts();
  renderedTrainerAlerts = pendingRounds.map((item) => item.id).join(',');
  const unreadCount = notificationsForCurrentRole().filter((n) => !n.read && !(canAdmin() && isRoutineAdminNotification(n))).length + pendingRounds.length;
  const badge = unreadCount
    ? `<span style="position:absolute;top:4px;right:18%;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#e11d48;color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center">${unreadCount > 9 ? '9+' : unreadCount}</span>`
    : '';

  const items = canAdmin()
    ? [
        ['home', 'ภาพรวม', 'home'],
        ['catalog', 'คลาส', 'calendar'],
        ['assignments', 'ผู้ฝึกสอน', 'user'],
        ['notifications', 'แจ้งเตือน', 'bell'],
        ['profile', 'โปรไฟล์', 'user'],
      ]
    : canTrainer()
      ? [
          ['home', 'หน้าหลัก', 'home'],
          ['teaching', 'ตารางสอน', 'calendar'],
          ['notifications', 'แจ้งเตือน', 'bell'],
          ['checkin', 'Check-in', 'rfid'],
          ['profile', 'โปรไฟล์', 'user'],
        ]
      : [
            ['home', 'หน้าหลัก', 'home'],
            ['schedule', 'ตารางคลาส', 'calendar'],
            ['bookings', 'การจอง', 'book'],
            ['checkin', 'Check-in', 'rfid'],
            ['notifications', 'แจ้งเตือน', 'bell'],
            ['profile', 'โปรไฟล์', 'user'],
          ];

  if (canAdmin())
    active = ['home', 'catalog', 'assignments', 'notifications', 'profile'].includes(page)
      ? page
      : page === 'roster' ? 'assignments' : page === 'admin' ? 'profile' : active;

  return /* HTML */ `<nav class="bottom-nav" aria-label="เมนูหลัก">
    ${items
      .map(
        ([id, label, i]) =>
          `<button class="nav-item ${active === id ? 'active' : ''}" data-action="go" data-page="${id}" ${active === id ? 'aria-current="page"' : ''}><span>${icon(i)}</span>${id === 'notifications' ? badge : ''}${label}</button>`,
      )
      .join('')}
  </nav>`;
}
function shell(body, active, header = '') {
  return /* HTML */ `<section class="screen">${header}${body}${nav(active)}</section>`;
}
function field(id, label, placeholder, type = 'text', i = 'user', required = true) {
  return /* HTML */ `<label class="field"
    ><span>${label}</span>
    <div class="input">
      ${icon(i)}<input
        id="${id}"
        name="${id}"
        type="${type}"
        placeholder="${placeholder}"
        ${required ? 'required' : ''}
        ${type === 'password' ? 'minlength="6" autocomplete="current-password"' : ''}
      />${type === 'password'
        ? /* HTML */ `<button
            class="eye"
            type="button"
            data-action="eye"
            data-input="${id}"
            aria-label="แสดงหรือซ่อนรหัสผ่าน"
          >
            ${icon('eye')}
          </button>`
        : ''}
    </div></label
  >`;
}
const backbar = (label, to) =>
  /* HTML */ `<header class="backbar">
    <button class="back" data-action="go" data-page="${to}" aria-label="ย้อนกลับ">
      ${icon('back')}</button
    >${label}
  </header>`;

// Authentication screens
function authScreen() {
  if (page === 'register')
    return /* HTML */ `<section class="auth-screen">
      <div class="auth-card register-card">
        ${brand()}
        <h1 class="auth-title">สมัครสมาชิก</h1>
        <p class="muted auth-sub">สร้างบัญชี Member เพื่อเริ่มดูแลสุขภาพกับ FitLab</p>
        <form id="registerForm">
          <div class="row">
            ${field('thaiName', 'ชื่อจริงภาษาไทย', 'สมชาย')}${field(
              'lastName',
              'นามสกุล',
              'ใจดี',
            )}
          </div>
          ${field('regUsername', 'ชื่อผู้ใช้สมาชิก (Username)', 'msomchai')}${field(
            'regEmail',
            'อีเมล (Email)',
            'name@email.com',
            'email',
            'mail',
          )}${field('phone', 'เบอร์โทรศัพท์', '0812345678', 'tel', 'phone')}${field(
            'regPassword',
            'รหัสผ่าน',
            'อย่างน้อย 6 ตัวอักษร',
            'password',
            'lock',
          )}${field(
            'confirmPassword',
            'ยืนยันรหัสผ่าน',
            'กรอกรหัสผ่านอีกครั้ง',
            'password',
            'lock',
          )}<button class="primary" type="submit">ยืนยันสมัครสมาชิก</button>
        </form>
        <button class="text-link" data-action="go" data-page="login">
          กลับไปเข้าสู่ระบบ
        </button>
      </div>
    </section>`;
  if (page === 'registered')
    return /* HTML */ `<section class="auth-screen">
      <div class="auth-card register-success">
        ${brand()}
        <div class="success-content">
          <div class="success-circle">${icon('check')}</div>
          <h1>สมัครสมาชิกสำเร็จ</h1>
          <p class="muted">บัญชี Member ของคุณพร้อมใช้งานแล้ว</p>
          <div class="username-box">
            <p class="muted">ชื่อที่แสดงของคุณ</p>
            <strong>${esc(user.username)}</strong>
            <p class="muted">เข้าสู่ระบบด้วยอีเมล ${esc(user.email)}</p>
          </div>
          <button class="primary" data-action="go" data-page="home">
            เริ่มใช้งาน FitLab
          </button>
        </div>
      </div>
    </section>`;
  if (page === 'forgot')
    return /* HTML */ `<section class="auth-screen">
      <div class="auth-card">
        ${brand()}
        <h1 class="auth-title">ลืมรหัสผ่าน</h1>
        <p class="muted auth-sub">รับลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล</p>
        <form id="resetForm">
          ${field('resetEmail', 'อีเมล', 'name@email.com', 'email', 'mail')}<button
            class="primary"
            type="submit"
          >
            ส่งลิงก์รีเซ็ตรหัสผ่าน
          </button>
        </form>
        <button class="text-link" data-action="go" data-page="login">
          กลับไปเข้าสู่ระบบ
        </button>
      </div>
    </section>`;
  return /* HTML */ `<section class="auth-screen">
    <div class="auth-card">
      <img class="auth-logo" src="images/logo.png" alt="FitLab" />
      <h1 class="auth-title">เข้าสู่ระบบ</h1>
      <p class="muted auth-sub">เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน</p>
      <form id="loginForm">
        ${field(
          'email',
          'อีเมลสมาชิก (Member Email)',
          'กรอกอีเมลที่ลงทะเบียน',
          'email',
          'user',
        )}${field('password', 'รหัสผ่าน', 'กรอกรหัสผ่าน', 'password', 'lock')}
        <div class="forgot">
          <button type="button" data-action="go" data-page="forgot">ลืมรหัสผ่าน?</button>
        </div>
        <div class="stack">
          <button class="primary" type="submit">เข้าสู่ระบบ</button
          ><button class="secondary" type="button" data-action="go" data-page="register">
            สมัครสมาชิก
          </button>
        </div>
      </form>
      <button class="demo" data-action="demo">ทดลองดูหน้าตาเว็บ · ใช้ข้อมูลจำลอง</button>
    </div>
  </section>`;
}

// Member home overview
function home() {
  if (canAdmin()) return adminDashboard();
  if (canTrainer()) return trainerHome();
  const today = bangkokDateKey(),
    ready = user.demo || cloudStatus === 'ready';
  const rows = readBookings().filter(
    (b) => !b.cancelled && classes.some((c) => c.id === b.classId),
  );
  const upcoming = rows
    .filter((b) => {
      const round = classForDate(b.classId, b.date);
      return round.status !== 'cancelled' && !occurrenceStarted(round, b.date);
    })
    .sort((a, b) =>
      (a.date + classForDate(a.classId, a.date).time).localeCompare(
        b.date + classForDate(b.classId, b.date).time,
      ),
    );
  const next = upcoming[0],
    nextClass = next && classForDate(next.classId, next.date);
  const thisMonth = rows.filter((b) => b.date.slice(0, 7) === today.slice(0, 7)).length;
  const todayClasses = visibleClassesOnDate(today)
    .filter((c) => !occurrenceStarted(c, today))
    .slice(0, 3);
  const nextContent = !ready
    ? '<div class="home-empty"><span class="tile-icon">' +
      icon('calendar') +
      '</span><h3>' +
      (cloudStatus === 'error' ? 'ยังโหลดการจองไม่ได้' : 'กำลังโหลดการจองของคุณ…') +
      '</h3><p>' +
      (cloudStatus === 'error'
        ? 'ลองรีเฟรชหน้าเพื่อเชื่อมข้อมูลอีกครั้ง'
        : 'รอสักครู่ เรากำลังเตรียมข้อมูลให้คุณ') +
      '</p></div>'
    : next
      ? '<button class="next-class" data-action="booking-detail" data-id="' +
        esc(next.id) +
        '"><img src="' +
        nextClass.image +
        '" alt="' +
        esc(nextClass.title) +
        '"><div><span class="tag">จองแล้ว</span><h3>' +
        esc(nextClass.title) +
        '</h3><p>' +
        thaiDate(next.date) +
        ' · ' +
        displayClock(nextClass.time) +
        ' – ' +
        displayClock(nextClass.end) +
        '</p><small>' +
        esc(nextClass.trainer) +
        ' · ' +
        esc(nextClass.location || 'Gym Zone') +
        '</small><span class="next-link">ดูรายละเอียด ' +
        icon('arrow') +
        '</span></div></button>'
      : '<div class="home-empty"><span class="tile-icon">' +
        icon('calendar') +
        '</span><h3>คลาสถัดไป เริ่มจากคุณเลือก</h3><p>ยังไม่มีคลาสที่กำลังจะมาถึง<br>หาคลาสที่เหมาะกับเวลาของคุณได้เลย</p><button class="primary" data-action="go" data-page="schedule">เลือกคลาสออกกำลังกาย</button></div>';
  return shell(
    '<div class="hero"><div class="greeting"><small>' +
      thaiDate(today) +
      '</small><h1>สวัสดี ' +
      esc(user.username) +
      '</h1><p>' +
      (!ready
        ? 'พร้อมดูแลสุขภาพในแบบของคุณ'
        : next
          ? 'มีนัดออกกำลังกายครั้งต่อไปรอคุณอยู่'
          : 'วันนี้เป็นวันที่ดีในการเริ่มดูแลตัวเอง') +
      '</p><span class="home-member">' +
      icon('user') +
      ' สมาชิก FitLab</span></div></div><div class="content home-content"><section aria-labelledby="next-class-title"><div class="section-heading"><h2 id="next-class-title">คลาสถัดไปของคุณ</h2></div>' +
      nextContent +
      '</section><div class="home-stats"><div><span>' +
      icon('calendar') +
      ' กำลังจะมาถึง</span><strong>' +
      (ready ? upcoming.length : '—') +
      '<small>คลาส</small></strong></div><div><span>' +
      icon('book') +
      ' การจองเดือนนี้</span><strong>' +
      (ready ? thisMonth : '—') +
      '<small>คลาส</small></strong></div></div><section aria-labelledby="today-classes-title"><div class="section-heading"><div><h2 id="today-classes-title">คลาสวันนี้</h2><p>เลือกเวลา แล้วมาเจอกันที่ FitLab</p></div><button class="text-link" data-action="today-schedule">ดูทั้งหมด ' +
      icon('arrow') +
      '</button></div><div class="class-list">' +
      (todayClasses.length
        ? todayClasses.map((c) => classCard(c, null, today)).join('')
        : '<div class="today-empty">' +
          icon('calendar') +
          '<p>คลาสวันนี้จบแล้ว<br><span>ดูตารางเพื่อวางแผนวันถัดไปได้เลย</span></p></div>') +
      '</div></section>' +
      (user.demo
        ? '<p class="setup-note">โหมดทดลอง · ข้อมูลบันทึกเฉพาะเบราว์เซอร์นี้</p>'
        : '') +
      '</div>',
    'home',
    '<header class="topbar">' + brand() + '</header>',
  );
}

// Class schedule and booking screens
function classCard(c, booking = null, occurrenceDate = null) {
  c = classForDate(c.id, booking?.date || occurrenceDate || dateKey(selectedDate)) || c;
  const date = booking?.date || occurrenceDate || dateKey(selectedDate),
    seats = seatsFor(c, date),
    closed = occurrenceStarted(c, date) || c.status === 'closed' || c.active === false;
  return /* HTML */ `<button
    class="class-card ${booking ? 'compact' : ''}"
    data-action="${booking ? 'booking-detail' : 'class-detail'}"
    data-id="${booking ? booking.id : c.id}"
    data-date="${date}"
  >
    <img src="${esc(c.image)}" alt="${esc(c.title)}" /><span class="class-info"
      >${!booking ? /* HTML */ `<span class="tag">${esc(c.category)}</span>` : ''}
      <h3>${esc(c.title)}</h3>
      <p>${booking ? thaiDate(booking.date, true) : '◷ ' + displayClock(c.time) + ' – ' + displayClock(c.end)}</p>
      ${booking
        ? /* HTML */ `<p>${displayClock(c.time)} – ${displayClock(c.end)} · ${esc(c.trainer)}</p><span class="tag">${bookingStateLabels[bookingState(booking, c)]}</span>`
        : /* HTML */ `<p class="available ${seats.remaining <= 3 ? 'low' : ''}">
            ${user && !user.demo && cloudStatus !== 'ready'
              ? 'กำลังโหลดที่นั่ง…'
              : closed
                ? 'ปิดรับการจอง'
                : seats.remaining === 0
                  ? 'คลาสเต็ม'
                  : 'เหลือ ' + seats.remaining + ' / ' + seats.capacity + ' ที่นั่ง'}
          </p>`}</span
    ><span class="arrow">${icon('arrow')}</span>
  </button>`;
}
function schedule() {
  const start = new Date(selectedDate);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  let calendar = '';
  if (view === 'month') {
    const days = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0,
    ).getDate();
    calendar = /* HTML */ `<div class="calendar-label">
        <button data-action="month" data-step="-1">‹ เดือนก่อน</button
        ><b
          >${selectedDate.toLocaleDateString('th-TH', {
            month: 'long',
            year: 'numeric',
          })}</b
        ><button data-action="month" data-step="1">เดือนถัดไป ›</button>
      </div>
      <div class="month-grid">
        ${Array.from(
          { length: days },
          (_, i) =>
            /* HTML */ `<button
              data-action="date"
              data-date="${dateKey(
                new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1),
              )}"
              class="${i + 1 === selectedDate.getDate() ? 'active' : ''}"
            >
              ${i + 1}
            </button>`,
        ).join('')}
      </div>`;
  } else
    calendar = /* HTML */ `<div class="calendar-label">
        <button data-action="week" data-step="-1">‹</button><b>7 วันข้างหน้า</b
        ><span>เลื่อนวันเพื่อเลือกคลาส</span
        ><button data-action="week" data-step="1">›</button>
      </div>
      <div class="date-row">
        ${Array.from({ length: 7 }, (_, i) => {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          return /* HTML */ `<button
            class="date-cell ${dateKey(d) === dateKey(selectedDate) ? 'active' : ''}"
            data-action="date"
            data-date="${dateKey(d)}"
          >
            <small>${d.toLocaleDateString('th-TH', { weekday: 'short' })}</small
            >${d.getDate()}<em>•</em>
          </button>`;
        }).join('')}
      </div>`;
  return shell(
    /* HTML */ `<div class="content schedule-content">
      <h1>ตารางคลาส</h1>
      <div class="tabs" role="tablist">
        ${[
          ['day', 'วัน'],
          ['week', 'สัปดาห์'],
          ['month', 'เดือน'],
        ]
          .map(
            ([id, label]) =>
              /* HTML */ `<button
                role="tab"
                aria-selected="${view === id}"
                class="${view === id ? 'active' : ''}"
                data-action="view"
                data-view="${id}"
              >
                ${label}
              </button>`,
          )
          .join('')}
      </div>
      ${calendar}
      <h2 class="class-heading">คลาสวันที่ ${thaiDate(dateKey(selectedDate))}</h2>
      ${dateKey(selectedDate) < bangkokDateKey()
        ? '<p class="booking-date-note">วันที่ผ่านมาแล้ว · ดูตารางได้ แต่ไม่สามารถจองได้</p>'
        : ''}
      <div class="class-list">
        ${visibleClassesOnDate(dateKey(selectedDate))
          .map((c) => classCard(c))
          .join('') ||
        '<p class="empty">' +
          (catalogStatus === 'error'
            ? 'โหลดตารางไม่ได้ กรุณาตรวจสอบสิทธิ์ Firebase'
            : 'ยังไม่มีรอบเรียนในวันที่เลือก') +
          '</p>'}
      </div>
${user.demo ? '<p class="schedule-source">ตารางตัวอย่าง · การจองบันทึกเฉพาะในเบราว์เซอร์นี้</p>' : ''}
    </div>`,
    'schedule',
  );
}
function detail() {
  const date = dateKey(selectedDate),
    problem = bookingProblem(selected, date),
    seats = seatsFor(selected, date);
  return shell(
    /* HTML */ `<img
        class="class-hero"
        src="${esc(selected.image)}"
        alt="${esc(selected.title)}"
      />
      <div class="detail-panel">
        <span class="tag">${esc(selected.category)}</span>
        <h1>${esc(selected.title)}</h1>
        <p>${esc(selected.description)}</p>
        <div class="info-grid">
          <div>
            <small>วันที่</small><strong>${thaiDate(dateKey(selectedDate), true)}</strong>
          </div>
          <div>
            <small>เวลา</small><strong>${displayClock(selected.time)} - ${displayClock(selected.end)}</strong>
          </div>
          <div><small>ผู้สอน</small><strong>${esc(selected.trainer)}</strong></div>
          <div>
            <small>สถานที่</small><strong>${esc(selected.location || 'Gym Zone')}</strong>
          </div>
        </div>
        <p class="seat-summary">
          ${user && !user.demo && cloudStatus !== 'ready'
            ? 'ยังไม่สามารถแสดงยอดที่นั่งได้'
            : 'จองแล้ว ' +
              seats.booked +
              ' / ' +
              seats.capacity +
              ' คน · เหลือ ' +
              seats.remaining +
              ' ที่นั่ง'}
        </p>
        <button class="primary" data-action="book" ${problem ? 'disabled' : ''}>
          ${problem ? 'ปิดรับการจอง' : 'จองคลาสนี้'}</button
        >${problem ? '<p class="booking-date-note">' + problem + '</p>' : ''}
      </div>`,
    'schedule',
    backbar('', 'schedule'),
  );
}
let renderedBookingStates = '';

function bookingState(booking, round, now = Date.now()) {
  if (round?.status === 'cancelled') return 'round_cancelled';
  if (booking.cancelled) return 'cancelled';
  if (round && Date.parse(booking.date + 'T' + round.end + ':00+07:00') <= now) return 'ended';
  if (round && occurrenceStarted(round, booking.date, now)) return 'in_progress';
  return 'upcoming';
}

const bookingStateLabels = {
  round_cancelled: 'รอบเรียนถูกยกเลิก',
  cancelled: 'ยกเลิกการจองแล้ว',
  ended: 'คลาสจบแล้ว',
  in_progress: 'กำลังเรียน',
  upcoming: 'จองสำเร็จ',
};

function bookingStatesOnPage() {
  const bookings = page === 'booking-detail' ? [selectedBooking] : readBookings();
  const now = Date.now();
  return bookings.filter(Boolean).map((booking) =>
    bookingState(booking, classForDate(booking.classId, booking.date), now),
  ).join(',');
}

function bookings() {
  renderedBookingStates = bookingStatesOnPage();
  const items = readBookings()
    .filter((booking) => {
      const round = classForDate(booking.classId, booking.date);
      const state = bookingState(booking, round);
      const current = state === 'upcoming' || state === 'in_progress';
      return history ? !current : current;
    })
    .reverse();
  return shell(
    /* HTML */ `<div class="content">
      <div class="tabs">
        <button
          class="${!history ? 'active' : ''}"
          data-action="history"
          data-history="false"
        >
          รายการปัจจุบัน</button
        ><button
          class="${history ? 'active' : ''}"
          data-action="history"
          data-history="true"
        >
          ประวัติการจอง
        </button>
      </div>
      <div class="class-list">
        ${items.length
          ? items.map((b) => classCard(classForDate(b.classId, b.date), b)).join('')
          : /* HTML */ `<p class="empty">
              ${history ? 'ยังไม่มีประวัติการจอง' : 'ยังไม่มีการจองคลาส'}<br /><button
                class="text-link"
                data-action="go"
                data-page="schedule"
              >
                เลือกดูตารางคลาส
              </button>
            </p>`}
      </div>
    </div>`,
    'bookings',
  );
}
function bookingDetail() {
  renderedBookingStates = bookingStatesOnPage();
  const b = selectedBooking,
    c = classForDate(b.classId, b.date),
    state = bookingState(b, c);
  return shell(
    /* HTML */ `<img class="class-hero" src="${esc(c.image)}" alt="${esc(c.title)}" />
      <div class="detail-panel">
        <h2>${esc(c.title)}</h2>
        <div class="info-rows">
          ${[
            ['สถานะ', bookingStateLabels[state]],
            ['วันที่', thaiDate(b.date)],
            ['เวลา', displayClock(c.time) + ' - ' + displayClock(c.end)],
            ['ผู้สอน', c.trainer],
            ['สถานที่', c.location || 'Gym Zone'],
            ['จำนวนที่นั่ง', '1 ที่นั่ง'],
            ['เลขที่การจอง', 'FL' + b.id.slice(-8).toUpperCase()],
          ]
            .map(
              ([l, v]) =>
                /* HTML */ `<div><span>${l}</span><strong>${esc(v)}</strong></div>`,
            )
            .join('')}
        </div>
        ${state === 'upcoming'
          ? '<button class="danger" data-action="cancel-confirm">ยกเลิกการจอง</button>'
          : ''}
      </div>`,
    'bookings',
    backbar('รายละเอียดการจอง', 'bookings'),
  );
}
function success(kind) {
  const cancelled = kind === 'cancelled',
    b = selectedBooking,
    c = classForDate(b.classId, b.date);
  return shell(
    /* HTML */ `<div class="success-content">
      <div class="success-circle">${icon('check')}</div>
      <h1>${cancelled ? 'ยกเลิกการจองสำเร็จ' : 'จองคลาสสำเร็จ'}</h1>
      <p class="muted">
        ${cancelled
          ? 'คืนที่นั่งให้ผู้เรียนท่านอื่นเรียบร้อยแล้ว'
          : 'เพิ่มคลาสลงในรายการปัจจุบันแล้ว'}
      </p>
      ${classCard(c, b)}
      <div class="stack">
        <button class="primary" data-action="go" data-page="bookings">
          ${cancelled ? 'กลับไปการจองของฉัน' : 'ดูรายการจองของฉัน'}</button
        >${!cancelled
          ? '<button class="secondary" data-action="go" data-page="home">กลับไปหน้าหลัก</button>'
          : ''}
      </div>
      <p class="setup-notice muted" style="margin-top:15px;font-size:10px">
        ${user.demo
          ? 'ข้อมูลทดลอง · บันทึกในเบราว์เซอร์นี้'
          : 'บันทึกการจองใน Firebase แล้ว'}
      </p>
    </div>`,
    'bookings',
  );
}

// RFID simulation screens
let checkinSessionId = null,
  checkinResult = null,
  sessionCheckins = [],
  sessionCheckinStatus = 'idle',
  sessionCheckinWatchVersion = 0,
  watchedCheckinSessionId = null,
  stopSessionCheckinWatch = null,
  checkinScan = null,
  isProcessingCheckin = false;

function ensureSessionCheckinWatch(sessionId, retry = false) {
  if (!retry && watchedCheckinSessionId === sessionId) return;
  const version = ++sessionCheckinWatchVersion;
  stopSessionCheckinWatch?.();
  stopSessionCheckinWatch = null;
  watchedCheckinSessionId = sessionId;
  sessionCheckins = [];
  sessionCheckinStatus = sessionId && !user?.demo ? 'loading' : 'idle';
  if (sessionCheckinStatus !== 'loading') return;

  const generation = cloudGeneration;
  const isCurrent = () => generation === cloudGeneration && version === sessionCheckinWatchVersion;
  const updateStatus = (status) => {
    sessionCheckinStatus = status;
    if (page === 'checkin' || (page === 'roster' && rosterSession === sessionId)) render();
  };
  const fail = () => {
    if (isCurrent()) updateStatus('error');
  };

  Promise.resolve(window.fitlabStore).then((store) => {
    if (!isCurrent()) return;
    if (!store?.watchSessionCheckins) return fail();
    stopSessionCheckinWatch = store.watchSessionCheckins(sessionId, (rows) => {
      if (!isCurrent()) return;
      sessionCheckins = rows;
      updateStatus('ready');
    }, fail);
  }).catch(fail);
}

function stopCheckinScan() {
  clearTimeout(checkinScan?.timer);
  checkinScan?.unsubscribe?.();
  checkinScan = null;
}

async function startCheckinScan() {
  if (!user || user.demo || checkinScan) return;

  const scan = { ready: false, lastKey: null, unsubscribe: null };
  checkinScan = scan;
  checkinResult = null;

  const fail = (error) => {
    if (checkinScan !== scan) return;
    clearTimeout(scan.timer);
    scan.unsubscribe?.();
    scan.unsubscribe = null;
    scan.ready = false;
    scan.failed = true;
    checkinResult = { ok: false, title: 'สแกนบัตรไม่สำเร็จ', message: cloudError(error) };
    if (page === 'checkin') render();
  };

  scan.timer = setTimeout(() => fail(Error('เชื่อมต่อเครื่องอ่านไม่สำเร็จ กรุณากลับเข้าหน้านี้อีกครั้ง หรือแจ้ง Trainer ประจำรอบ')), 30000);

  try {
    const store = await window.fitlabStore;
    if (checkinScan !== scan || scan.failed) return;
    if (!store?.watchLatestRfid) throw Error('ยังไม่ได้ตั้งค่าเครื่องอ่านบัตร');

    scan.unsubscribe = store.watchLatestRfid((data) => {
      if (checkinScan !== scan || scan.failed || page !== 'checkin') return;
      const card = String(data?.rfidUid || '').trim().toUpperCase();
      const key = card ? card + '_' + (data.scanCount ?? data.scannedAt ?? data.updatedAt ?? '') : null;
      if (!scan.ready) {
        clearTimeout(scan.timer);
        scan.lastKey = key;
        scan.ready = true;
        render();
        return;
      }
      if (!card || key === scan.lastKey) return;
      scan.lastKey = key;
      const linkedCard = String(memberProfile?.rfidUid || '').trim().toUpperCase();
      if (card === linkedCard && !isProcessingCheckin) void processRfidClassCheckin(card, scan);
    }, fail, { serverOnly: true });
  } catch (error) {
    fail(error);
  }
}

async function processRfidClassCheckin(rawCardUid, scan) {
  if (isProcessingCheckin) return;
  const cleanCard = String(rawCardUid || '').trim().toUpperCase();
  if (!cleanCard) return;

  const scannedAt = new Date();
  const today = bangkokDateKey(scannedAt);
  const todayRounds = classesOnDate(today);
  isProcessingCheckin = true;
  if (page === 'checkin') render();

  try {
    const store = await window.fitlabStore;
    // 1. ค้นหาเจ้าของบัตรจากเลขรหัส RFID
    const cardOwner = store?.findUserByRfid ? await store.findUserByRfid(cleanCard) : null;

    if (checkinScan !== scan || !cardOwner || cardOwner.uid !== user?.uid) return;
    const ownerName = cardOwner.username || cardOwner.email || 'ผู้ใช้งาน';

    // 2. ค้นหาว่า user คนนี้ได้ลงคลาสไหนในวันนี้ไว้บ้าง (ทั้งในฐานะ Member และ Trainer)
    const teachingRounds = todayRounds.filter(
      (c) => c.trainerUid === cardOwner.uid || (c.trainer && c.trainer === cardOwner.username),
    );

    let memberBookings = [];
    if (cardOwner.uid === user.uid && !canTrainer() && !canAdmin()) {
      memberBookings = readBookings().filter((b) => b.date === today && !b.cancelled);
    } else if (store?.getUserBookings) {
      const allUserBookings = await store.getUserBookings(cardOwner.uid).catch(() => []);
      memberBookings = allUserBookings.filter((b) => b.date === today && !b.cancelled);
    }

    const bookedRounds = todayRounds.filter((c) =>
      memberBookings.some((b) => b.classId === c.id),
    );

    const eligibleRounds = [
      ...teachingRounds.map((c) => ({ round: c, role: 'trainer' })),
      ...bookedRounds
        .filter((c) => !teachingRounds.some((t) => t.id === c.id))
        .map((c) => ({ round: c, role: 'member' })),
    ];

    // 3. กรณีไม่ได้ลงคลาสไหนไว้เลยในวันนี้ -> ขึ้นแจ้งเตือนทันที
    if (!eligibleRounds.length) {
      checkinResult = {
        ok: false,
        cardUid: cleanCard,
        ownerName,
        title: 'ไม่พบรายการลงคลาสในวันนี้',
        message: `บัตร ${maskRfid(cleanCard)} (${ownerName}) ไม่ได้จองคลาสหรือมีตารางสอนในวันที่ ${thaiDate(today)}`,
      };

      store
        ?.addNotification?.({
          targetUid: cardOwner.uid,
          audience: 'user',
          type: 'checkin_mismatch',
          title: 'Check-in ไม่สำเร็จ: ไม่พบคลาสที่ลงไว้',
          message: `แตะบัตร ${maskRfid(cleanCard)} ในวันที่ ${thaiDate(today)} แต่ไม่พบรายการจองหรือตารางสอนในวันนี้`,
          machineName: 'เครื่องอ่านบัตร ESP32-S3',
          matchedBooking: false,
        })
        .catch(() => {});

      store
        ?.addNotification?.({
          targetUid: '',
          audience: 'staff',
          type: 'checkin_mismatch',
          title: `แจ้งเตือน Check-in: ${ownerName} ไม่ได้ลงคลาส`,
          message: `แตะบัตร ${maskRfid(cleanCard)} แต่ไม่พบคลาสที่ลงไว้ในวันที่ ${thaiDate(today)}`,
          machineName: 'เครื่องอ่านบัตร ESP32-S3',
          matchedBooking: false,
        })
        .catch(() => {});

      notify(`⚠️ ${checkinResult.message}`, 'error');
      return;
    }

    const scannedAtMs = scannedAt.getTime();
    const matchedRounds = eligibleRounds.filter(({ round }) => {
      const endsAt = Date.parse(today + 'T' + round.end + ':00+07:00');
      return occurrenceStarted(round, today, scannedAtMs) && scannedAtMs < endsAt;
    });

    if (!matchedRounds.length) {
      const roundTimes = eligibleRounds
        .map(({ round }) => `${round.title} (${displayClock(round.time)}–${displayClock(round.end)} น.)`)
        .join(', ');
      checkinResult = {
        ok: false,
        cardUid: cleanCard,
        title: 'ยังเช็กอินไม่ได้ในเวลานี้',
        message: `ตอนนี้เวลา ${displayClock(bangkokClock(scannedAt))} น. เช็กอินได้เฉพาะช่วงเวลาคลาส ${roundTimes}`,
      };
      notify(checkinResult.title, 'error');
      return;
    }

    // Record attendance only for rounds in progress when the card was scanned.
    const newlyCheckedIn = [];
    const previousCheckins = [];
    for (const item of matchedRounds) {
      const sid = `${today}_${item.round.id}`;
      try {
        const saved = await store.recordClassCheckin({
          sessionId: sid,
          classId: item.round.id,
          date: today,
          uid: cardOwner.uid,
          username: ownerName,
          role: item.role,
          rfidUid: cleanCard,
        });
        if (saved.alreadyCheckedIn) previousCheckins.push({ ...item, checkedInAt: saved.checkedInAt });
        else newlyCheckedIn.push(item);
      } catch (error) {
        try {
          await store.addNotification({
            audience: 'admin',
            type: 'checkin_write_failed',
            sessionId: sid,
            title: `บันทึก Check-in ไม่สำเร็จ · ${item.round.title}`,
            message: `${ownerName} มีสิทธิ์เข้าคลาสวันที่ ${thaiDate(today)} เวลา ${displayClock(item.round.time)} น. แต่บันทึก Check-in ไม่สำเร็จ กรุณาตรวจสอบและให้ผู้ใช้ลองอีกครั้ง`,
            machineName: 'เครื่องอ่านบัตร ESP32-S3',
            matchedBooking: true,
          });
        } catch (notificationError) {
          console.warn('Could not report Check-in failure', notificationError.code);
        }
        throw error;
      }
    }

    const completedAt = new Date();
    const primary = newlyCheckedIn[0] || previousCheckins[0];
    checkinSessionId = `${today}_${primary.round.id}`;
    ensureSessionCheckinWatch(checkinSessionId);

    const classSummary = (newlyCheckedIn.length ? newlyCheckedIn : previousCheckins)
      .map((m) => `${m.round.title} (${displayClock(m.round.time)} – ${displayClock(m.round.end)} น.)`)
      .join(', ');

    checkinResult = {
      ok: true,
      cardUid: cleanCard,
      ownerName,
      roleLabel: primary.role === 'trainer' ? 'ผู้ฝึกสอน (Trainer)' : 'สมาชิก (Member)',
      className: classSummary,
      time: newlyCheckedIn.length ? displayClock(bangkokClock(completedAt)) : checkinClock(primary.checkedInAt),
      title: newlyCheckedIn.length ? 'บันทึกการเข้าคลาสสำเร็จ!' : 'เช็กอินแล้ว',
      message: newlyCheckedIn.length
        ? `บันทึกการเข้าเรียน ${classSummary} แล้ว`
        : `มีรายการ Check-in สำหรับ ${classSummary} อยู่แล้ว`,
    };

    if (!newlyCheckedIn.length) {
      notify(checkinResult.title, 'success');
      return;
    }

    store
      ?.addNotification?.({
        targetUid: cardOwner.uid,
        audience: 'user',
        type: 'checkin_success',
        title: `Check-in เข้าคลาสสำเร็จ (${newlyCheckedIn.length} คลาส)`,
        message: `บันทึกเวลาเข้าเรียนคลาส ${classSummary} วันที่ ${thaiDate(today)} เรียบร้อยแล้ว`,
        machineName: 'เครื่องอ่านบัตร ESP32-S3',
        matchedBooking: true,
      })
      .catch(() => {});
// ส่งแจ้งเตือนตรงไปหา Trainer เจ้าของคลาสนั้น (เมื่อ Member Check-in สำเร็จ)
    for (const item of newlyCheckedIn) {
      if (item.role === 'member' && item.round?.trainerUid) {
        store
          ?.addNotification?.({
            targetUid: item.round.trainerUid,
            sessionId: today + '_' + item.round.id,
            audience: 'trainer',
            type: 'checkin_success',
            title: `สมาชิก Check-in เข้าคลาสของคุณ: ${item.round.title}`,
            message: `${ownerName} แตะบัตร Check-in เข้าเรียนคลาส ${item.round.title} วันที่ ${thaiDate(today)} เรียบร้อยแล้ว`,
            machineName: 'เครื่องอ่านบัตร ESP32-S3',
            matchedBooking: true,
          })
          .catch(() => {});
      }
    }
    store
      ?.addNotification?.({
        targetUid: '',
        audience: 'staff',
        type: 'checkin_success',
        title: `${primary.role === 'trainer' ? 'ผู้สอน' : 'สมาชิก'} Check-in: ${ownerName}`,
        message: `เข้าคลาส ${classSummary} วันที่ ${thaiDate(today)} เรียบร้อยแล้ว`,
        machineName: 'เครื่องอ่านบัตร ESP32-S3',
        matchedBooking: true,
      })
      .catch(() => {});

    notify(`✅ ${checkinResult.message}`, 'success');
  } catch (e) {
    checkinResult = {
      ok: false,
      title: 'เกิดข้อผิดพลาดในการตรวจสอบบัตร',
      message: cloudError(e),
    };
    notify(checkinResult.message, 'error');
  } finally {
    isProcessingCheckin = false;
    if (page === 'checkin') render();
  }
}

function checkinClock(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp.toMillis ? timestamp.toMillis() : timestamp.seconds * 1000);
  return Number.isFinite(date.getTime()) ? displayClock(bangkokClock(date)) : '';
}

function checkin() {
  void startCheckinScan();
  const canScan = checkinScan?.ready && memberProfileStatus === 'ready' && Boolean(memberProfile?.rfidUid);
  const today = bangkokDateKey();
  const activeRound = classesOnDate(today).find((c) => `${today}_${c.id}` === checkinSessionId);

  return shell(
    `<div class="settings-content">
      <div class="section-heading">
        <div>
          <h1>Check-in เข้าคลาส</h1>
          <p class="settings-intro" style="margin:2px 0 0">เช็กอินด้วยบัตร RFID ได้เฉพาะช่วงเวลาของคลาสที่ลงไว้</p>
        </div>
        <span class="role-badge ${canAdmin() ? 'admin' : canTrainer() ? 'trainer' : 'member'}">${canAdmin() ? 'Admin' : canTrainer() ? 'Trainer' : 'Member'}</span>
      </div>

      <div class="checkin-station" data-state="${isProcessingCheckin ? 'processing' : canScan ? 'waiting' : 'idle'}">
        <div class="checkin-station-icon" aria-hidden="true">
          ${icon('rfid')}
        </div>
        <h2 aria-live="polite">${
          isProcessingCheckin ? 'กำลังตรวจสอบข้อมูลบัตร…' : canScan
            ? 'แตะบัตรที่เครื่องอ่านได้เลย' : user.demo
              ? 'สแกนบัตร RFID · โหมดทดลอง' : checkinScan?.failed
                ? 'ยังรับข้อมูลจากเครื่องอ่านไม่ได้' : memberProfileStatus === 'error'
                  ? 'โหลดข้อมูลบัตรของบัญชีไม่ได้' : memberProfileStatus === 'ready' && !memberProfile?.rfidUid
                    ? 'บัญชีนี้ยังไม่ได้ผูกบัตร' : 'กำลังเตรียมสแกนบัตร…'
        }</h2>
        <p>${user.demo ? 'เข้าสู่ระบบด้วยบัญชีจริงเพื่อเช็กอินด้วยบัตร' : 'ใช้บัตรที่ผูกกับบัญชีนี้แตะที่เครื่องอ่าน ESP32-S3'}</p>
      </div>

      ${
        checkinResult
          ? `<div class="role-card" style="margin-top:14px;padding:16px;border:1px solid ${checkinResult.ok ? '#bbf7d0' : '#fecaca'};background:${checkinResult.ok ? '#f0fdf4' : '#fef2f2'}">
              <div style="display:flex;gap:12px;align-items:flex-start">
                <div style="width:38px;height:38px;border-radius:10px;background:${checkinResult.ok ? '#16a34a' : '#dc2626'};color:#fff;display:grid;place-items:center;flex-shrink:0">
                  ${icon(checkinResult.ok ? 'check' : 'info')}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
                    <h3 style="margin:0;font-size:15px;color:${checkinResult.ok ? '#15803d' : '#b91c1c'}">${esc(checkinResult.title)}</h3>
                    ${checkinResult.cardUid ? `<span class="tag" style="background:#fff;color:#334155;border:1px solid #e2e8f0;font-size:11px">${maskRfid(checkinResult.cardUid)}</span>` : ''}
                  </div>
                  <p style="margin:0;font-size:13px;color:${checkinResult.ok ? '#166534' : '#991b1b'};line-height:1.5">${esc(checkinResult.message)}</p>
                  ${
                    checkinResult.roleLabel
                      ? `<div style="margin-top:8px;font-size:12px;color:#15803d">ผู้ใช้งาน: <strong>${esc(checkinResult.ownerName)}</strong> · สิทธิ์: <strong>${esc(checkinResult.roleLabel)}</strong>${checkinResult.time ? ` · Check-in เวลา <strong>${checkinResult.time} น.</strong>` : ''}</div>`
                      : ''
                  }
                </div>
              </div>
            </div>`
          : ''
      }

      ${
        activeRound && sessionCheckins.length
          ? `<div class="role-card" style="margin-top:14px;padding:14px 16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <h3 style="margin:0;font-size:14px">รายชื่อผู้เข้าคลาส ${esc(activeRound.title)}</h3>
                <span class="tag" style="background:#eaf8f1;color:#1f8f67;font-weight:700">${sessionCheckins.length} คน</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${sessionCheckins
                  .map(
                    (c) => {
                      const time = checkinClock(c.checkedInAt);
                      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:10px;background:#f8fafc;font-size:13px">
                      <div>
                        <strong>${esc(c.username)}</strong>
                        <span style="margin-left:6px;font-size:11px;padding:2px 6px;border-radius:6px;background:${c.role === 'trainer' ? '#eff6ff' : '#f3efff'};color:${c.role === 'trainer' ? '#2563eb' : '#6d35e8'}">${c.role === 'trainer' ? 'Trainer' : 'Member'}</span>
                      </div>
                      <span style="color:#1f8f67;font-size:12px;font-weight:600">✓ มาเข้าคลาสแล้ว${time ? ' · ' + time + ' น.' : ''}</span>
                    </div>`;
                    },
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }
    </div>`,
    'checkin',
  );
}
function checkinSuccess() {
  return shell(
    /* HTML */ `<div class="success-content">
      <div class="success-circle">${icon('check')}</div>
      <h1>Check-in สำเร็จ</h1>
      <p class="muted">ยินดีต้อนรับเข้าสู่ FitLab</p>
      <div class="detail-panel" style="margin:24px 0">
        <h3>${esc(user.username)}</h3>
        <p style="margin:5px 0">Member · ${esc(user.email)}</p>
        <p style="margin:0">${dateAndClock(new Date())}</p>
      </div>
      <div class="stack">
        <button class="primary" data-action="go" data-page="home">กลับไปหน้าหลัก</button
        ><button class="secondary" data-action="go" data-page="checkin">
          Check-in อีกครั้ง
        </button>
      </div>
      <p class="setup-notice">ผลจำลองเท่านั้น · ยังไม่มีข้อมูลจากอุปกรณ์จริง</p>
    </div>`,
    'checkin',
  );
}

// Role state is read from Firestore, never from member-editable profile fields.
let roleReady = false,
  roleError = false,
  adminMembers = [],
  adminMemberSearch = '',
  adminStatus = 'idle',
  stopAdmin = null;
const roleNames = { member: 'Member', trainer: 'Trainer', admin: 'Admin' };
function canAdmin() {
  return Boolean(user && !user.demo && roleReady && user.role === 'admin');
}
function roleName() {
  return roleNames[user?.role] || 'Member';
}
function stopAdminData() {
  stopAdmin?.();
  stopAdmin = null;
  adminMembers = [];
  adminMemberSearch = '';
  adminStatus = 'idle';
}
function applyRole(state) {
  const previousStaff = canAdmin() || canTrainer();
  const wasAdmin = canAdmin();
  user.role = ['member', 'trainer', 'admin'].includes(state.role) ? state.role : 'member';
  roleReady = Boolean(state.roleReady);
  roleError = Boolean(state.roleError);
  if (wasAdmin !== canAdmin()) stopNotificationData();
  if (wasAdmin && !canAdmin()) stopAdminData();
  if (canAdmin() && adminStatus === 'idle') startAdminData();
  if (previousStaff && ((!canAdmin() && !canTrainer()) || teachingRole !== user.role))
    stopTeachingData();
  if ((canAdmin() || canTrainer()) && assignmentStatus === 'idle') startTeachingData();
}
async function startAdminData() {
  const generation = cloudGeneration;
  adminStatus = 'loading';
  try {
    const store = await window.fitlabStore;
    if (generation !== cloudGeneration || !canAdmin()) return;
    stopAdmin = store.watchMembers(
      (members) => {
        if (generation !== cloudGeneration || !canAdmin()) return;
        adminMembers = members;
        adminStatus = 'ready';
        if (['home', 'admin', 'assignments'].includes(page)) render();
      },
      () => {
        if (generation !== cloudGeneration || !canAdmin()) return;
        adminStatus = 'error';
        if (['admin', 'assignments'].includes(page)) render();
      },
    );
  } catch {
    adminStatus = 'error';
    if (['admin', 'assignments'].includes(page)) render();
  }
}

// Admin overview uses aggregate counts, not learner reservations for this account.
function adminDashboard() {
  if (!canAdmin()) return staffDenied();
  const today = bangkokDateKey(),
    rounds = Object.entries(cloudSchedules)
      .filter(([, row]) => row.date === today && row.status !== 'cancelled')
      .sort(([, a], [, b]) => a.startsAt.toMillis() - b.startsAt.toMillis());
  const members = adminMembers.filter((m) => m.role === 'member').length,
    trainers = adminMembers.filter((m) => m.role === 'trainer').length;
  const reserved = rounds.reduce(
    (sum, [id]) => sum + (cloudSessions[id]?.bookedCount || 0),
    0,
  );
  const assigned = new Set(teachingAssignments.map((row) => row.id));
  const unassigned = Object.entries(cloudSchedules).filter(
    ([id, row]) =>
      row.status === 'open' && row.startsAt.toMillis() > Date.now() && !assigned.has(id),
  ).length;
  const stats = [
    ['สมาชิกผู้ใช้บริการ', adminStatus === 'ready' ? members : '—', 'คน'],
    ['ผู้ฝึกสอน', adminStatus === 'ready' ? trainers : '—', 'คน'],
    ['รอบเรียนวันนี้', catalogStatus === 'ready' ? rounds.length : '—', 'รอบ'],
    [
      'ที่นั่งที่จองวันนี้',
      catalogStatus === 'ready' && cloudStatus === 'ready' ? reserved : '—',
      'ที่นั่ง',
    ],
  ];
  const list =
    catalogStatus === 'error'
      ? '<div class="home-empty"><p>ยังโหลดรอบเรียนไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ Firebase</p></div>'
      : catalogStatus !== 'ready'
        ? '<div class="home-empty"><p>กำลังโหลดรอบเรียน…</p></div>'
        : rounds.length
          ? rounds
              .slice(0, 4)
              .map(([id, row]) => {
                const c = classForDate(row.classId, row.date);
                if (!c) return '';
                return (
                  '<button class="class-card admin-round-card" data-action="admin-round" data-id="' +
                  esc(id) +
                  '"><img src="' +
                  esc(c.image) +
                  '" alt=""><span class="class-info"><span class="tag">' +
                  (row.status === 'open' ? 'เปิดรับจอง' : 'ปิดรับจอง') +
                  '</span><h3>' +
                  esc(c.title) +
                  '</h3><p>' +
                  displayClock(c.time) +
                  ' – ' +
                  displayClock(c.end) +
                  ' · ' +
                  esc(row.location) +
                  '</p><p>' +
                  esc(row.trainerName || 'ยังไม่ระบุผู้สอน') +
                  '</p><p class="available">ผู้จอง ' +
                  (cloudSessions[id]?.bookedCount || 0) +
                  ' / ' +
                  row.capacity +
                  ' คน</p></span><span class="arrow">' +
                  icon('arrow') +
                  '</span></button>'
                );
              })
              .join('')
          : '<div class="home-empty"><span class="tile-icon">' +
            icon('calendar') +
            '</span><h3>วันนี้ยังไม่มีรอบเรียน</h3><p>เพิ่มรอบเรียนเพื่อให้สมาชิกเลือกจองได้</p><button class="primary" data-action="admin-new-round">เพิ่มรอบเรียน</button></div>';
  return shell(
    '<header class="topbar">' +
      brand() +
      '<span class="tag">Admin</span></header><div class="hero"><div class="greeting"><small>' +
      thaiDate(today) +
      '</small><h1>สวัสดี ' +
      esc(user.username) +
      '</h1><p>ภาพรวมฟิตเนส และตารางที่คุณดูแล</p><span class="home-member">' +
      icon('lock') +
      ' พื้นที่ผู้ดูแลระบบ</span></div></div><div class="content home-content" id="admin-home"><div class="home-stats admin-stats">' +
      stats
        .map(
          ([label, value, unit]) =>
            '<div><span>' +
            label +
            '</span><strong>' +
            value +
            '<small>' +
            unit +
            '</small></strong></div>',
        )
        .join('') +
      '</div>' +
      (catalogStatus === 'ready' && assignmentStatus === 'ready' && unassigned
        ? '<button class="admin-attention" data-action="go" data-page="assignments"><span class="account-icon">' +
          icon('user') +
          '</span><span><strong>มี ' +
          unassigned +
          ' รอบรอมอบหมายผู้สอน</strong><small>เลือก Trainer ให้พร้อมก่อนเริ่มคลาส</small></span><span class="arrow">' +
          icon('arrow') +
          '</span></button>'
        : '') +
      '<section><div class="section-heading"><div><h2>รอบเรียนวันนี้</h2><p>ตารางเรียนและยอดจองจาก Firebase</p></div><button class="text-link" data-action="admin-view-rounds">ดูทั้งหมด ' +
      icon('arrow') +
      '</button></div><div class="class-list">' +
      list +
      '</div></section></div>',
    'home',
  );
}

let latestScannedRfid = '',
  activeRfidTargetUid = null,
  scannedForActiveUser = '',
  isAutoBindingRfid = false,
  rfidStatusMessage = '',
  rfidErrorState = false,
  stopAdminRfidWatch = null;

function maskRfid(uid) {
  const clean = String(uid || '').trim().toUpperCase();
  if (!clean) return '';
  const parts = clean.split(' ');
  return parts[0] + ' XX XX XX';
}

async function bindRfidAutomatically(targetUid, cardUid) {
  const cleanCard = String(cardUid || '').trim().toUpperCase();
  if (!targetUid || !cleanCard || isAutoBindingRfid) return;

  // 1. ตรวจสอบก่อนว่าเลขบัตรนี้มีคนในระบบใช้งานอยู่แล้วหรือไม่
  const duplicateOwner = adminMembers.find(
    (m) => m.uid !== targetUid && String(m.rfidUid || '').trim().toUpperCase() === cleanCard,
  );
  if (duplicateOwner) {
    rfidErrorState = true;
    rfidStatusMessage = `บัตร ${maskRfid(cleanCard)} ถูกใช้งานแล้วโดย "${duplicateOwner.username || duplicateOwner.email}"`;
    if (page === 'admin') render();
    notify(rfidStatusMessage, 'error', app.querySelector('.role-list'));
    return;
  }

  isAutoBindingRfid = true;
  rfidErrorState = false;
  scannedForActiveUser = cleanCard;
  rfidStatusMessage = `กำลังบันทึกบัตร ${maskRfid(cleanCard)}...`;
  if (page === 'admin') render();

  try {
    const store = await window.fitlabStore;
    await store.assignRfidCard(targetUid, cleanCard);
    await store.addNotification?.({
      targetUid,
      audience: 'user',
      type: 'rfid_bind',
      title: 'ผูกบัตรสมาชิก RFID สำเร็จ',
      message: `ผู้ดูแลระบบได้ผูกบัตร ${maskRfid(cleanCard)} เข้ากับบัญชีของคุณเรียบร้อยแล้ว`,
    });
    const targetUser = adminMembers.find((u) => u.uid === targetUid);
    if (targetUser) targetUser.rfidUid = cleanCard;
    activeRfidTargetUid = null;
    scannedForActiveUser = '';
    rfidStatusMessage = '';
    rfidErrorState = false;
    isAutoBindingRfid = false;
    if (page === 'admin') render();
    notify(`ผูกบัตร ${maskRfid(cleanCard)} เรียบร้อยแล้ว!`, 'success', app.querySelector('.role-list'));
  } catch (error) {
    isAutoBindingRfid = false;
    scannedForActiveUser = '';
    rfidErrorState = true;
    rfidStatusMessage = cloudError(error);
    if (page === 'admin') render();
    notify(rfidStatusMessage, 'error', app.querySelector('.role-list'));
  }
}

async function ensureAdminRfidWatch() {
  if (stopAdminRfidWatch) return;
  try {
    const store = await window.fitlabStore;
    if (!store?.watchLatestRfid) return;

    let firstEvent = true;
    stopAdminRfidWatch = store.watchLatestRfid((data) => {
      if (!data?.rfidUid) return;
      const cardUid = String(data.rfidUid).trim().toUpperCase();
      latestScannedRfid = cardUid;

      if (firstEvent) {
        firstEvent = false;
        if (page === 'admin') render();
        return;
      }

      if (activeRfidTargetUid) {
        bindRfidAutomatically(activeRfidTargetUid, cardUid);
        return;
      }

      if (page === 'admin') render();
    });
  } catch (e) {
    console.error('RFID watch error:', e);
  }
}

function memberMatchesSearch(searchText, query) {
  const text = searchText.normalize('NFC').toLowerCase();
  return query.normalize('NFC').toLowerCase().trim().split(/\s+/).every((word) => text.includes(word));
}

app.addEventListener('input', (event) => {
  if (event.target.id !== 'admin-member-search') return;
  adminMemberSearch = event.target.value;
  let hasMatch = false;
  for (const card of app.querySelectorAll('[data-member-search-text]')) {
    const matches = memberMatchesSearch(card.dataset.memberSearchText, adminMemberSearch);
    card.hidden = !matches;
    hasMatch ||= matches;
  }
  app.querySelector('#admin-member-search-empty').hidden = hasMatch;
});

function adminScreen() {
  if (!canAdmin()) return adminDenied();
  ensureAdminRfidWatch();
  const accounts = adminMembers.map((account) => ({
    account,
    searchText: [account.username, account.thaiName, account.lastName, account.email].join(' '),
  }));
  const roleNames = { member: 'Member', trainer: 'Trainer', admin: 'Admin' };

  return shell(
    `<div class="settings-content">
      <div class="section-heading">
        <h1>จัดการสิทธิ์สมาชิก</h1>
        <span class="role-badge admin">Admin</span>
      </div>
      <p class="settings-intro">กำหนดหน้าที่และผูกบัตร RFID ให้แต่ละบัญชี</p>
      <div class="role-legend">
        <span>Member · จองคลาส</span>
        <span>Trainer · ผู้ฝึกสอน</span>
        <span>Admin · ผู้ดูแลระบบ</span>
      </div>

      <!-- Box สถานะเครื่องอ่าน RFID (ดีไซน์เรียบหรู โชว์เลขนำหน้า + XX XX XX) -->
      <div class="role-card" style="margin-bottom:18px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(135deg,#faf8ff 0%,#f3efff 100%);border:1px solid #e5dcfa">
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <div style="width:40px;height:40px;border-radius:12px;background:#fff;display:grid;place-items:center;color:#6d35e8;box-shadow:0 2px 8px rgba(109,53,232,0.1);flex-shrink:0">
            ${icon('rfid')}
          </div>
          <div style="min-width:0">
            <div style="font-size:13px;font-weight:700;color:var(--ink)">เครื่องอ่านบัตร ESP32-S3</div>
            <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${latestScannedRfid ? 'สแกนล่าสุด: <strong style="color:#5b26d6;letter-spacing:0.5px">' + esc(maskRfid(latestScannedRfid)) + '</strong>' : 'พร้อมรับสัญญาณ (แตะบัตรที่เครื่องอ่าน)'}
            </div>
          </div>
        </div>
        <span class="tag" style="flex-shrink:0;padding:5px 10px;border-radius:99px;font-weight:600;background:${latestScannedRfid ? '#e6f7f0' : '#eceef2'};color:${latestScannedRfid ? '#1f8f67' : '#64748b'}">
          ${latestScannedRfid ? '● พร้อมใช้งาน' : '○ สแตนด์บาย'}
        </span>
      </div>

      ${
        accounts.length
          ? `<label class="field" style="margin-bottom:12px">
               <span>ค้นหาสมาชิก</span>
               <input class="staff-input" id="admin-member-search" type="search" value="${esc(adminMemberSearch)}" placeholder="ชื่อหรืออีเมล" autocomplete="off">
             </label>
             <p class="booking-date-note" id="admin-member-search-empty" role="status" ${accounts.some(({ searchText }) => memberMatchesSearch(searchText, adminMemberSearch)) ? "hidden" : ""}>ไม่พบสมาชิกที่ตรงกับคำค้น</p>
             <div class="role-list">${accounts
              .map(({ account, searchText }) => {
                const role = account.role || 'member',
                  self = account.uid === user.uid,
                  currentCard = account.rfidUid || '',
                  isAddingThisUser = activeRfidTargetUid === account.uid;

                return `<div class="role-card" style="padding:18px" data-member-search-text="${esc(searchText)}" ${memberMatchesSearch(searchText, adminMemberSearch) ? "": "hidden"}>
                  <form data-role-form data-uid="${esc(account.uid)}">
                    <div class="role-member">
                      <div class="avatar">${esc((account.username || 'F').slice(0, 1).toUpperCase())}</div>
                      <div style="min-width:0;flex:1">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                          <h3 style="margin:0">${esc(account.username)}</h3>
                          <span class="role-badge ${esc(role)}" style="flex-shrink:0">${roleNames[role] || 'Member'}${self ? ' · คุณ' : ''}</span>
                        </div>
                        <p style="margin:2px 0 0">${esc(account.email || 'ไม่มีอีเมล')}</p>
                      </div>
                    </div>

                    <div class="role-controls" style="margin-top:14px">
                      <label class="field">
                        <span>สิทธิ์การใช้งาน</span>
                        <select name="role" ${self ? 'disabled' : ''}>
                          ${['member', 'trainer', 'admin']
                            .map(
                              (value) =>
                                `<option value="${value}" ${role === value ? 'selected' : ''}>${roleNames[value]}</option>`,
                            )
                            .join('')}
                        </select>
                      </label>
                      <button class="secondary" type="submit" style="width:auto;min-width:96px;padding:0 14px" ${self ? 'disabled' : ''}>บันทึกสิทธิ์</button>
                    </div>
                    ${self ? '<p class="role-note">บัญชีนี้เปลี่ยนสิทธิ์ตัวเองไม่ได้</p>' : ''}
                  </form>

                  <!-- ส่วนจัดการบัตร RFID (จัดสัดส่วนใหม่ ไม่ตกบรรทัด) -->
                  <div style="margin-top:14px;padding-top:14px;border-top:1px solid #f1eef8">
                    <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px">บัตรสมาชิก RFID</div>
                    ${
                      currentCard
                        ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:#f0fbf6;border:1px solid #cceee0">
                            <div style="display:flex;align-items:center;gap:8px;min-width:0">
                              <span style="width:22px;height:22px;border-radius:50%;background:#22a06b;color:#fff;display:grid;place-items:center;font-size:12px;flex-shrink:0">✓</span>
                              <div style="min-width:0">
                                <div style="font-size:12px;font-weight:700;color:#17724d">ผูกบัตรเรียบร้อยแล้ว</div>
                                <div style="font-size:12px;color:#2b8a64;font-family:monospace;letter-spacing:0.5px">${esc(maskRfid(currentCard))}</div>
                              </div>
                            </div>
                            <button type="button" class="rfid-remove-btn" data-uid="${esc(account.uid)}" data-card="${esc(currentCard)}" style="width:auto;flex-shrink:0;background:#fff;color:#dc2626;border:1px solid #fecaca;border-radius:10px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer">
                              ลบบัตร
                            </button>
                          </div>`
                        : isAddingThisUser
                       ? `<div style="padding:12px;border-radius:12px;background:${rfidErrorState ? '#fef2f2' : '#faf8ff'};border:1px solid ${rfidErrorState ? '#fecaca' : '#e5dcfa'}">
                           <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                             <div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:${rfidErrorState ? '#dc2626' : '#6d35e8'}">
                               <span>${rfidErrorState ? '⚠️' : '📡'}</span>
                               <span>${rfidStatusMessage || 'กรุณานำบัตรไปแตะที่เครื่องอ่าน ESP32-S3...'}</span>
                             </div>
                             <button type="button" class="rfid-cancel-btn" style="width:auto;padding:4px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#64748b;font-size:12px;cursor:pointer" ${isAutoBindingRfid ? 'disabled' : ''}>ยกเลิก</button>
                           </div>
                         </div>`
                          : `<button type="button" class="rfid-add-btn" data-uid="${esc(account.uid)}" style="width:100%;height:42px;border-radius:12px;border:1.5px dashed #cbb8f8;background:#faf8ff;color:#6d35e8;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer">
                              <span style="font-size:16px;line-height:1">+</span> เพิ่มบัตร RFID (ยังไม่ได้ผูกบัตร)
                            </button>`
                    }
                  </div>
                </div>`;
              })
              .join('')}</div>`
          : '<div class="booking-date-note">ยังไม่มีบัญชีสมาชิกในระบบ</div>'
      }
    </div>`,
    'admin',
    backbar('ผู้ดูแลระบบ', 'profile'),
  );
}

// Trainer schedules and rosters: only data assigned to this trainer is subscribed.
let teachingAssignments = [],
  assignmentStatus = 'idle',
  stopAssignments = null,
  teachingRole = null;
let rosterRows = [],
  rosterStatus = 'idle',
  stopRoster = null,
  rosterSession = null,
  rosterSyncSignature = null;
let teachingHistory = false,
  assignmentFormDate = bangkokDateKey();
function canTrainer() {
  return Boolean(user && !user.demo && roleReady && user.role === 'trainer');
}
function stopTeachingData() {
  stopAssignments?.();
  stopRoster?.();
  stopAssignments = null;
  stopRoster = null;
  teachingAssignments = [];
  assignmentStatus = 'idle';
  teachingRole = null;
  rosterRows = [];
  rosterSession = null;
  rosterStatus = 'idle';
  rosterSyncSignature = null;
}
async function startTeachingData() {
  assignmentStatus = 'loading';
  teachingRole = user.role;
  const generation = cloudGeneration,
    role = user.role;
  try {
    const store = await window.fitlabStore;
    if (generation !== cloudGeneration || user?.role !== role) return;
    stopAssignments = store.watchAssignments(
      user.uid,
      canAdmin(),
      (rows) => {
        if (generation !== cloudGeneration || user?.role !== role) return;
        teachingAssignments = rows.sort((a, b) =>
          (a.date + a.classId).localeCompare(b.date + b.classId),
        );
        assignmentStatus = 'ready';
        if (rosterSession && !rows.some((r) => r.id === rosterSession)) {
          stopRoster?.();
          stopRoster = null;
          rosterRows = [];
          rosterSession = null;
          rosterStatus = 'denied';
        }
        if (['home', 'teaching', 'assignments', 'roster', 'notifications'].includes(page)) render();
      },
      () => {
        if (generation !== cloudGeneration || user?.role !== role) return;
        assignmentStatus = 'error';
        teachingAssignments = [];
        stopRoster?.();
        rosterRows = [];
        rosterSession = null;
        if (['home', 'teaching', 'assignments', 'roster', 'notifications'].includes(page)) render();
      },
    );
  } catch {
    assignmentStatus = 'error';
    if (['home', 'teaching', 'assignments'].includes(page)) render();
  }
}
function teachingEnded(row) {
  const c = classForDate(row.classId, row.date);
  return !c || c.status === 'cancelled' || Date.parse(row.date + 'T' + c.end + ':00+07:00') <= Date.now();
}
function teachingCard(row) {
  const c = classForDate(row.classId, row.date);
  if (!c) return '';
  const count = cloudSessions[row.id]?.bookedCount || 0;
  return `<button class="class-card teaching-card" data-action="roster" data-id="${esc(row.id)}"><img src="${esc(c.image)}" alt="${esc(c.title)}"><span class="class-info"><span class="tag">${esc(row.trainerName || 'ตารางสอนของฉัน')}</span><h3>${esc(c.title)}</h3><p>${thaiDate(row.date)} · ${displayClock(c.time)} – ${displayClock(c.end)}</p><p class="available">ผู้จอง ${count} / ${row.capacity} คน</p>${c.status === 'cancelled' ? '<p>รอบเรียนถูกยกเลิก</p>' : ''}</span><span class="arrow">${icon('arrow')}</span></button>`;
}
function staffDenied() {
  return shell(
    '<div class="settings-content"><h1>ไม่มีสิทธิ์เข้าถึง</h1><p class="settings-intro">หน้านี้สำหรับผู้ฝึกสอนที่ได้รับมอบหมายหรือผู้ดูแลระบบ</p><button class="secondary" data-action="go" data-page="profile">กลับไปโปรไฟล์</button></div>',
    'profile',
  );
}
// Trainer home is an overview; the Teaching tab contains the complete schedule.
function trainerHome() {
  if (!canTrainer()) return staffDenied();
  const today = bangkokDateKey(),
    ready = assignmentStatus === 'ready';
  const upcoming = teachingAssignments
    .filter((row) => !teachingEnded(row))
    .sort((a, b) => {
      const first = classForDate(a.classId, a.date),
        second = classForDate(b.classId, b.date);
      return (a.date + (first?.time || '')).localeCompare(b.date + (second?.time || ''));
    });
  const next = upcoming[0],
    todayRows = upcoming.filter((row) => row.date === today);
  const nextContent = !ready
    ? '<div class="home-empty"><p>' +
      (assignmentStatus === 'error'
        ? 'ยังโหลดตารางสอนไม่ได้ กรุณาลองรีเฟรชอีกครั้ง'
        : 'กำลังเตรียมข้อมูลการสอน…') +
      '</p></div>'
    : next
      ? teachingCard(next)
      : '<div class="home-empty"><span class="tile-icon">' +
        icon('calendar') +
        '</span><h3>ยังไม่มีคลาสถัดไป</h3><p>คลาสที่ Admin มอบหมายให้คุณ<br>จะแสดงที่นี่</p></div>';
  return shell(
    '<header class="topbar">' +
      brand() +
      '<span class="tag">Trainer</span></header><div class="hero"><div class="greeting"><small>' +
      thaiDate(today) +
      '</small><h1>สวัสดี ' +
      esc(user.username) +
      '</h1><p>ภาพรวมการสอนของคุณในวันนี้</p><span class="home-member">' +
      icon('user') +
      ' ผู้ฝึกสอน FitLab</span></div></div><div class="content home-content" id="trainer-home"><div class="home-stats"><div><span>คลาสที่ยังไม่จบวันนี้</span><strong>' +
      (ready ? todayRows.length : '—') +
      '<small>คลาส</small></strong></div><div><span>คลาสที่กำลังจะมาถึง</span><strong>' +
      (ready ? upcoming.length : '—') +
      '<small>คลาส</small></strong></div></div><section><div class="section-heading"><h2>คลาสถัดไปของคุณ</h2><button class="text-link" data-action="go" data-page="teaching">ตารางสอนทั้งหมด ' +
      icon('arrow') +
      '</button></div>' +
      nextContent +
      '</section><section><div class="section-heading"><h2>เตรียมพร้อมก่อนสอน</h2></div><div class="notice" style="margin:0">เปิดรายละเอียดคลาสเพื่อดูรายชื่อผู้จอง และตรวจสอบเวลาเริ่มสอนของคุณ</div></section></div>',
    'home',
  );
}

function trainerDashboard() {
  if (!canTrainer()) return staffDenied();
  const rows = teachingAssignments.filter((r) => teachingEnded(r) === teachingHistory);
  const body =
    assignmentStatus !== 'ready'
      ? `<div class="home-empty"><p>${assignmentStatus === 'error' ? 'ยังโหลดตารางสอนไม่ได้ กรุณาตรวจสอบ Firestore Rules' : 'กำลังโหลดตารางสอน…'}</p></div>`
      : rows.length
        ? rows.map(teachingCard).join('')
        : '<div class="home-empty"><span class="tile-icon">' +
          icon('calendar') +
          '</span><h3>' +
          (teachingHistory ? 'ยังไม่มีประวัติการสอน' : 'ยังไม่มีคลาสที่ได้รับมอบหมาย') +
          '</h3><p>เมื่อ Admin มอบหมายคลาสให้คุณ<br>ตารางสอนและรายชื่อผู้จองจะแสดงที่นี่</p></div>';
  return shell(
    '<header class="topbar">' +
      brand() +
      '<span class="tag">Trainer</span></header><div class="content home-content" id="trainer-schedule"><section><div class="section-heading"><div><h1>ตารางสอนของฉัน</h1><p>คลาสทั้งหมดที่คุณได้รับมอบหมาย</p></div></div><div class="tabs"><button data-action="teaching-tab" data-history="false" class="' +
      (!teachingHistory ? 'active' : '') +
      '">กำลังจะมาถึง</button><button data-action="teaching-tab" data-history="true" class="' +
      (teachingHistory ? 'active' : '') +
      '">ที่ผ่านมา</button></div><div class="class-list">' +
      body +
      '</div></section></div>',
    'teaching',
  );
}
function assignmentScreen() {
  if (!canAdmin()) return staffDenied();
  const trainers = adminMembers.filter((m) => m.role === 'trainer'),
    available = classesOnDate(assignmentFormDate);
  return shell(
    `<div class="settings-content"><h1>มอบหมายผู้ฝึกสอน</h1><p class="settings-intro">เลือกวัน คลาส และ Trainer ที่รับผิดชอบ</p><form id="assignmentForm" class="role-card"><label class="field"><span>วันที่สอน</span><input class="staff-input" id="assignment-date" name="date" type="date" min="${bangkokDateKey()}" value="${assignmentFormDate}" required></label><label class="field"><span>คลาส</span><select class="staff-input" name="classId" required>${available.map((c) => `<option value="${c.id}">${esc(c.title)} · ${displayClock(c.time)} – ${displayClock(c.end)}</option>`).join('')}</select></label><label class="field"><span>ผู้ฝึกสอน</span><select class="staff-input" name="trainerUid" required><option value="">เลือก Trainer</option>${trainers.map((t) => `<option value="${esc(t.uid)}">${esc(t.username || t.email)}</option>`).join('')}</select></label>${!trainers.length ? '<p class="notice">กำหนดบัญชีเป็น Trainer ในหน้าจัดการสิทธิ์ก่อน</p>' : ''}<button class="primary" type="submit" ${!trainers.length ? 'disabled' : ''}>บันทึกการมอบหมาย</button><p class="settings-hint">หากรอบนี้มีผู้สอนแล้ว การบันทึกจะเปลี่ยนผู้รับผิดชอบ</p></form><div class="section-heading" style="margin-top:25px"><h2>รอบที่มอบหมายแล้ว</h2></div><div class="class-list">${assignmentStatus === 'error' ? '<p class="notice">โหลดไม่ได้ กรุณา Publish Firestore Rules ล่าสุด</p>' : assignmentStatus !== 'ready' ? '<p class="muted">กำลังโหลด…</p>' : teachingAssignments.map(teachingCard).join('') || '<p class="empty">ยังไม่มีการมอบหมาย</p>'}</div></div>`,
    'profile',
    backbar('มอบหมายคลาส', 'profile'),
  );
}
async function openRoster(id) {
  if ((!canTrainer() && !canAdmin()) || !teachingAssignments.some((r) => r.id === id))
    return notify('ไม่มีสิทธิ์เปิดรายชื่อคลาสนี้', 'error');
  stopRoster?.();
  rosterRows = [];
  rosterSession = id;
  rosterStatus = 'loading';
  go('roster');
  const generation = cloudGeneration;
  try {
    const store = await window.fitlabStore;
    if (generation !== cloudGeneration || rosterSession !== id) return;
    stopRoster = store.watchRoster(
      id,
      (rows) => {
        if (generation !== cloudGeneration || rosterSession !== id) return;
        rosterRows = rows;
        rosterStatus = 'ready';
        if (page === 'roster') render();
      },
      () => {
        if (rosterSession !== id) return;
        rosterRows = [];
        rosterStatus = 'error';
        if (page === 'roster') render();
      },
    );
  } catch {
    rosterStatus = 'error';
    render();
  }
}
function rosterScreen() {
  const row = teachingAssignments.find((r) => r.id === rosterSession);
  const c =
    classForDate(row?.classId, row?.date) ||
    (canAdmin() && rosterSession
      ? classForDate(rosterSession.split('_')[1], rosterSession.split('_')[0])
      : null);
  const roundDate = row?.date || (rosterSession ? rosterSession.split('_')[0] : '');
  if ((!canTrainer() && !canAdmin()) || !c) return staffDenied();
  const rows = rosterRows.filter((r) => !r.cancelled);
  const count = cloudSessions[rosterSession]?.bookedCount ?? rows.length;
  const attendance = new Map(
    (watchedCheckinSessionId === rosterSession ? sessionCheckins : []).map((entry) => [entry.uid, entry]),
  );
  const canCheckInManually = sessionCheckinStatus === 'ready' && canTrainer() && row?.trainerUid === user.uid && c.status !== 'cancelled';

  return shell(
    `<div class="settings-content">
      <span class="tag">${esc(row?.trainerName || c.trainer || user.username)}</span>
      <h1 style="margin-top:10px">${esc(c.title)}</h1>
      <p class="settings-intro">${thaiDate(roundDate)} · ${displayClock(c.time)} – ${displayClock(c.end)} น. · จองแล้ว ${count}/${c.capacity} ที่นั่ง</p>
      ${sessionCheckinStatus === "loading" ? '<p class="notice" role="status">กำลังโหลดสถานะเช็กอิน…</p>' : ""}
      ${sessionCheckinStatus === "error" ? '<div class="notice" role="status">โหลดสถานะเช็กอินไม่สำเร็จ <button type="button" class="text-link" data-action="retry-roster-checkins">ลองใหม่</button></div>' : ""}
      ${
        rosterStatus === 'loading'
          ? '<div class="home-empty"><p>กำลังโหลดรายชื่อสมาชิก…</p></div>'
          : rosterStatus === 'error'
            ? '<div class="notice">โหลดรายชื่อสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>'
            : rows.length
              ? `<div class="class-list">${rows
                  .map(
                    (member) => {
                      const checkedIn = attendance.get(member.uid);
                      const time = checkinClock(checkedIn?.checkedInAt);
                      return `<div class="role-card" style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
                      <div>
                        <strong style="font-size:15px">${esc(member.username || 'สมาชิก')}</strong>
                        <div style="font-size:12px;color:var(--muted);margin-top:2px">UID: ${esc(member.uid.slice(0, 8))}…</div>
                      </div>
                      <div class="stack">
                      ${checkedIn
                        ? `<span class="tag roster-attendance">${icon("check")} เช็กอินแล้ว${time ? " " + time + " น." : ""}</span>`
                        : canCheckInManually ? `<button type="button" class="secondary" data-action="manual-checkin" data-uid="${esc(member.uid)}">เช็กอินสำรอง</button>` : ""}
                      <button
                        type="button"
                        data-action="remove-member-booking"
                        data-session-id="${esc(rosterSession)}"
                        data-uid="${esc(member.uid)}"
                        data-name="${esc(member.username || 'สมาชิก')}"
                        data-class-title="${esc(c.title)}"
                        data-date="${esc(roundDate)}"
                        style="width:auto;padding:7px 12px;border-radius:10px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0"
                      >
                        ลบออกจากคลาส
                      </button>
                      </div>
                    </div>`;
                    },
                  )
                  .join('')}</div>`
              : '<div class="home-empty"><h3>ยังไม่มีสมาชิกจองคลาสนี้</h3><p>เมื่อสมาชิกกดจองคลาส รายชื่อจะปรากฏที่นี่</p></div>'
      }
    </div>`,
    'teaching',
    backbar('รายชื่อสมาชิก', canAdmin() ? 'assignments' : 'teaching'),
  );
}
app.addEventListener('change', (event) => {
  if (event.target.id === 'manage-date') {
    manageDate = event.target.value;
    render();
    return;
  }
  if (event.target.id === 'assignment-date') {
    assignmentFormDate = event.target.value;
    render();
  }
});
app.addEventListener('click', async (event) => {
  const addRfidBtn = event.target.closest('.rfid-add-btn');
  if (addRfidBtn) {
    activeRfidTargetUid = addRfidBtn.dataset.uid;
    scannedForActiveUser = '';
    render();
    return;
  }

  if (event.target.closest('.rfid-cancel-btn')) {
    activeRfidTargetUid = null;
    scannedForActiveUser = '';
    render();
    return;
  }

  const removeRfidBtn = event.target.closest('.rfid-remove-btn');
  if (removeRfidBtn) {
    const targetUid = removeRfidBtn.dataset.uid;
    const oldCard = removeRfidBtn.dataset.card;
    removeRfidBtn.disabled = true;
    try {
      const store = await window.fitlabStore;
      await store.removeRfidCard(targetUid, oldCard);
      const targetUser = adminMembers.find((u) => u.uid === targetUid);
      if (targetUser) delete targetUser.rfidUid;
      render();
      notify('ลบบัตร RFID ออกจากบัญชีเรียบร้อยแล้ว', 'success');
    } catch (error) {
      notify(cloudError(error), 'error');
      removeRfidBtn.disabled = false;
    }
    return;
  }

  const button = event.target.closest('[data-action="teaching-tab"]');
  if (button) {
    teachingHistory = button.dataset.history === 'true';
    render();
  }
});

// Member profile
// A shared row keeps staff tools and account settings visually consistent.
function profileRow({
  title,
  subtitle,
  iconName,
  action = 'go',
  target = '',
  extraClass = '',
}) {
  return /* HTML */ `<button
    class="account-row ${extraClass}"
    data-action="${action}"
    ${target ? 'data-page="' + target + '"' : ''}
  >
    <span class="account-icon">${icon(iconName)}</span>
    <span class="account-row-copy"
      ><span class="account-row-title">${title}</span>${subtitle
        ? '<small>' + subtitle + '</small>'
        : ''}</span
    >
    <span class="account-chevron">${icon('arrow')}</span>
  </button>`;
}
function profile() {
  const staffTools = canAdmin() ? [{
    title: 'สิทธิ์สมาชิก',
    subtitle: 'จัดการ Member, Trainer และ Admin',
    iconName: 'lock',
    target: 'admin',
    extraClass: 'admin-entry',
  }] : [];
  const accountTools = [
    { title: 'ข้อมูลส่วนตัว', iconName: 'user', action: 'personal' },
    { title: 'เปลี่ยนรหัสผ่าน', iconName: 'lock', action: 'password-reset' },
    { title: 'เกี่ยวกับ FitLab', iconName: 'info', action: 'about' },
  ];
  return shell(
    /* HTML */ `<div class="account-page">
      <header class="profile-header account-header">
        <div class="avatar account-avatar">
          ${esc(user.username.slice(0, 1).toLocaleUpperCase())}
        </div>
        <div class="account-identity">
          <span class="account-eyebrow">บัญชีของคุณ</span>
          <h1>${esc(user.username)}</h1>
          <p>${esc(user.email)}</p>
          <strong class="account-role">${roleName()}</strong>
        </div>
      </header>
      <div class="account-content">
        ${staffTools.length
          ? '<section class="account-section" aria-labelledby="staff-tools-title"><h2 id="staff-tools-title">' +
            'พื้นที่ผู้ดูแลระบบ' +
            '</h2><div class="account-group staff-group">' +
            staffTools.map(profileRow).join('') +
            '</div></section>'
          : ''}
        ${roleError
          ? '<p class="notice">ยังตรวจสอบสิทธิ์ไม่ได้ กรุณาตรวจสอบการตั้งค่า Firebase</p>'
          : ''}
        <section class="account-section" aria-labelledby="account-settings-title">
          <h2 id="account-settings-title">การตั้งค่าบัญชี</h2>
          <div class="account-group">${accountTools.map(profileRow).join('')}</div>
        </section>
        <div class="account-group account-signout">
          ${profileRow({ title: 'ออกจากระบบ', iconName: 'logout', action: 'logout' })}
        </div>
      </div>
    </div>`,
    'profile',
  );
}

// Screen rendering and navigation


function startNotificationData() {
  if (stopNotifications || !user || user.demo) return;
  const generation = cloudGeneration;
  const adminMode = canAdmin();
  notificationStatus = 'loading';
  window.fitlabStore
    .then((store) => {
      if (generation !== cloudGeneration || adminMode !== canAdmin() || !store?.watchNotifications) return;
      stopNotifications = store.watchNotifications(
        user.uid,
        adminMode,
        (rows) => {
          if (generation !== cloudGeneration) return;
          cloudNotifications = rows;
          notificationStatus = 'ready';
          if (
            page === 'notifications' ||
            ['home', 'profile', 'admin', 'teaching', 'bookings'].includes(page)
          ) {
            render();
          }
        },
        () => {
          if (generation !== cloudGeneration) return;
          notificationStatus = 'error';
          if (page === 'notifications') render();
        },
      );
    })
    .catch(() => {
      notificationStatus = 'error';
    });
}

function stopNotificationData() {
  stopNotifications?.();
  stopNotifications = null;
  cloudNotifications = [];
  notificationStatus = 'idle';
  notificationRoleMode = '';
  isMarkingNotifRead = false;
}

function formatNotifTime(ts) {
  if (!ts) return 'เมื่อสักครู่';
  const ms = ts.toMillis ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : Number(ts);
  if (!Number.isFinite(ms)) return 'เมื่อสักครู่';
  return dateAndClock(new Date(ms), { day: 'numeric', month: 'short' });
}

let renderedTrainerAlerts = '';

function adminTrainerAlerts(now = Date.now()) {
  if (!canAdmin() || user?.demo || catalogStatus !== 'ready' || assignmentStatus !== 'ready') return [];
  const assigned = new Set(teachingAssignments.map((row) => row.id));
  return Object.entries(cloudSchedules)
    .filter(([id, round]) => {
      const remaining = round.startsAt?.toMillis() - now;
      return round.status !== 'cancelled' && remaining > 0 && remaining <= 60 * 60 * 1000 && !assigned.has(id);
    })
    .sort(([, a], [, b]) => a.startsAt.toMillis() - b.startsAt.toMillis())
    .map(([id, round]) => {
      const title = classes.find((item) => item.id === round.classId)?.title || round.classId;
      return {
        id,
        type: 'trainer_needed',
        title: `ยังไม่มี Trainer · ${title}`,
        message: `เริ่มวันที่ ${thaiDate(round.date)} เวลา ${displayClock(bangkokClock(new Date(round.startsAt.toMillis())))} น.`,
      };
    });
}

function isRoutineAdminNotification(notification) {
  return notification.audience === 'admin' &&
    ['booking_created', 'booking_cancelled', 'checkin_success'].includes(notification.type);
}

function notificationsForCurrentRole() {
  if (!user) return [];
  const currentRole = canAdmin() ? 'admin' : canTrainer() ? 'trainer' : 'member';

  // แยกการแจ้งเตือนตาม Role ปัจจุบันแบบเด็ดขาด ไม่ปนกัน
  return cloudNotifications.filter((n) => {
    if (currentRole === 'admin') {
      return n.audience === 'admin' || (n.targetUid === user.uid && n.audience === 'system');
    }
    if (currentRole === 'trainer') {
      return n.targetUid === user.uid && (
        ['trainer', 'system'].includes(n.audience) ||
        (n.audience === 'user' && ['trainer_assigned', 'system'].includes(n.type))
      );
    }
    // โหมด Member: เห็นเฉพาะแจ้งเตือนของ Member เท่านั้น
    return n.targetUid === user.uid && (!n.audience || ['member', 'user', 'system'].includes(n.audience));
  });
}

function notificationsScreen() {
  const currentRole = canAdmin() ? 'admin' : canTrainer() ? 'trainer' : 'member';
  const pendingRounds = adminTrainerAlerts();
  const roleScopedNotifications = notificationsForCurrentRole();
  const isAdminView = currentRole === 'admin';
  const actionable = isAdminView
    ? roleScopedNotifications.filter((item) => !isRoutineAdminNotification(item))
    : roleScopedNotifications;
  const unreadItems = actionable.filter((n) => !n.read);
  if (!user.demo && unreadItems.length && !isMarkingNotifRead) {
    isMarkingNotifRead = true;
    window.fitlabStore
      ?.then((store) => store?.markNotificationsRead?.(unreadItems))
      .finally(() => {
        isMarkingNotifRead = false;
      });
  }

  const roleLabel = currentRole === 'admin' ? 'Admin' : currentRole === 'trainer' ? 'Trainer' : 'Member';
  const notifications = [...pendingRounds, ...actionable];
  const source = isAdminView && notifFilter !== 'all'
    ? [...pendingRounds, ...roleScopedNotifications]
    : notifications;
  const rows = source.filter((n) => {
    if (notifFilter === 'booking')
      return ['booking_created', 'booking_cancelled', 'trainer_assigned', 'member_removed', 'trainer_needed', 'round_cancelled'].includes(n.type);
    if (notifFilter === 'rfid')
      return ['checkin_success', 'checkin_mismatch', 'checkin_write_failed', 'rfid_bind'].includes(n.type);
    return true;
  });

  const typeStyle = (type) => {
    if (type === 'booking_created')
      return { bg: '#eaf8f1', color: '#1f8f67', iconName: 'calendar', tag: 'การจองคลาส' };
    if (type === 'booking_cancelled' || type === 'member_removed')
      return { bg: '#fef2f2', color: '#dc2626', iconName: 'calendar', tag: type === 'member_removed' ? 'นำออกจากคลาส' : 'ยกเลิกการจอง' };
    if (type === 'round_cancelled')
      return { bg: '#fef2f2', color: '#b91c1c', iconName: 'calendar', tag: 'ยกเลิกรอบเรียน' };
    if (type === 'trainer_assigned')
      return { bg: '#eff6ff', color: '#2563eb', iconName: 'user', tag: 'ตารางสอน' };
    if (type === 'checkin_success')
      return { bg: '#eaf8f1', color: '#1f8f67', iconName: 'check', tag: 'Check-in สำเร็จ' };
    if (type === 'checkin_mismatch')
      return { bg: '#fff4e5', color: '#c26d00', iconName: 'info', tag: 'ไม่ตรงกับคลาสที่จอง' };
    if (type === 'trainer_needed')
      return { bg: '#fff4e5', color: '#a84d00', iconName: 'calendar', tag: 'รอมอบหมาย Trainer' };
    if (type === 'checkin_write_failed')
      return { bg: '#fef2f2', color: '#b91c1c', iconName: 'info', tag: 'Check-in ต้องตรวจสอบ' };
    if (type === 'rfid_bind')
      return { bg: '#f3efff', color: '#6d35e8', iconName: 'rfid', tag: 'บัตร RFID' };
    return { bg: '#f1f5f9', color: '#475569', iconName: 'bell', tag: 'ระบบ' };
  };

  return shell(
    `<div class="settings-content">
      <div class="section-heading">
        <div>
          <h1>ประวัติการแจ้งเตือน</h1>
          <p class="settings-intro" style="margin:2px 0 0">แจ้งเตือนเฉพาะสิทธิ์ ${roleLabel}</p>
        </div>
        <span class="role-badge ${currentRole}">${roleLabel}</span>
      </div>

      <div class="tabs" style="margin-top:14px">
        <button data-action="notif-filter" data-filter="all" class="${notifFilter === 'all' ? 'active' : ''}">${isAdminView ? 'ต้องตรวจสอบ' : 'ทั้งหมด'} (${notifications.length})</button>
        <button data-action="notif-filter" data-filter="booking" class="${notifFilter === 'booking' ? 'active' : ''}">การจองคลาส</button>
        <button data-action="notif-filter" data-filter="rfid" class="${notifFilter === 'rfid' ? 'active' : ''}">RFID & ระบบ</button>
      </div>

      ${
        user.demo
          ? '<div class="home-empty"><p>โหมดทดลองยังไม่มีประวัติการแจ้งเตือนจาก Firebase</p></div>'
          : notificationStatus === 'error'
            ? '<div class="notice">ยังโหลดประวัติการแจ้งเตือนไม่ได้ กรุณา Publish Firestore Rules ล่าสุด</div>'
            : notificationStatus === 'loading' && !rows.length
              ? '<div class="home-empty"><p>กำลังโหลดประวัติการแจ้งเตือน…</p></div>'
              : rows.length
                ? `<div class="class-list" style="margin-top:12px">${rows
                    .map((item) => {
                      const st = typeStyle(item.type);
                      return `<div class="role-card" style="padding:14px 16px;display:flex;gap:12px;align-items:flex-start">
                        <div style="width:38px;height:38px;border-radius:12px;background:${st.bg};color:${st.color};display:grid;place-items:center;flex-shrink:0">
                          ${icon(st.iconName)}
                        </div>
                        <div style="flex:1;min-width:0">
                          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">
                            <span class="tag" style="background:${st.bg};color:${st.color};font-weight:600">${st.tag}</span>
                            <small style="color:var(--muted);font-size:11px;flex-shrink:0">${item.type === 'trainer_needed' ? 'เริ่มภายใน 1 ชั่วโมง' : formatNotifTime(item.createdAt)}</small>
                          </div>
                          <h3 style="margin:0 0 4px;font-size:14px">${esc(item.title)}</h3>
                          <p style="margin:0;font-size:13px;color:var(--muted);line-height:1.5">${esc((item.message ?? '').replace(/\b((?:[01][0-9]|2[0-3]):[0-5][0-9])( – )((?:[01][0-9]|2[0-3]):[0-5][0-9])\b/g, (_, start, separator, end) => displayClock(start) + separator + displayClock(end)))}</p>
                          ${
                            item.type === 'trainer_needed'
                              ? '<button class="secondary" style="margin-top:8px" data-action="go" data-page="assignments">ไปหน้ามอบหมายผู้ฝึกสอน</button>'
                              : item.machineName
                              ? `<div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px;color:#334155">
                                  <span>📍 เครื่องอ่าน:</span><strong>${esc(item.machineName)}</strong>
                                </div>`
                              : ''
                          }
                        </div>
                      </div>`;
                    })
                    .join('')}</div>`
                : `<div class="home-empty">
                    <span class="tile-icon">${icon('bell')}</span>
                    <h3>${isAdminView && notifFilter === 'all' ? 'ยังไม่มีรายการที่ต้องตรวจสอบ' : 'ยังไม่มีรายการในหมวดนี้'}</h3>
                    <p>${isAdminView && notifFilter === 'all'
                      ? 'รายการจะขึ้นเมื่อมีรอบที่เริ่มภายใน 1 ชั่วโมงแต่ยังไม่มี Trainer หรือเมื่อระบบได้รับรายงานว่าบันทึก Check-in ไม่สำเร็จ ดูประวัติจองและยกเลิกได้ในแท็บการจองคลาส'
                      : `แจ้งเตือนสำหรับสิทธิ์ ${roleLabel} จะแสดงที่นี่`}</p>
                  </div>`
      }
    </div>`,
    'notifications',
  );
}
function render() {
  rememberScreen();
  const publicPages = ['login', 'register', 'forgot'];
  if (!user && !publicPages.includes(page)) page = 'login';

  const screens = {
  login: authScreen,
  register: authScreen,
  forgot: authScreen,
  registered: authScreen,
  home,
  schedule,
  detail,
  bookings,
  'booking-detail': bookingDetail,
  booked: () => success('booked'),
  cancelled: () => success('cancelled'),
  checkin,
  'checkin-success': checkinSuccess,
  password: settingsPage,
  personal: settingsPage,
  about: settingsPage,
  profile,
  admin: adminScreen,
  notifications: notificationsScreen,
  catalog: catalogScreen,
  teaching: trainerDashboard,
  assignments: assignmentScreen,
  roster: rosterScreen,
};
  const renderScreen = screens[page] || profile;
  app.innerHTML = renderScreen();
  window.scrollTo(0, 0);
}

function go(target) {
  if (target !== 'checkin') stopCheckinScan();
  page = target;
  ensureSessionCheckinWatch(target === 'roster' ? rosterSession : target === 'checkin' ? checkinSessionId : null);
  if (target === 'bookings') history = false;
  render();
}

// Firestore subscriptions and account lifecycle
function cloudError(e) {
  if (e.code === 'permission-denied')
    return 'ยังไม่มีสิทธิ์เข้าถึงข้อมูล กรุณาติดตั้ง Firestore Rules ของ FitLab';
  if (e.code === 'unavailable' || e.code === 'not-found')
    return 'เชื่อมฐานข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตและสร้าง Cloud Firestore ก่อน';
  return e.message || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่';
}
function disconnectCloud() {
  stopCheckinScan();
  ensureSessionCheckinWatch(null);
  checkinSessionId = null;
  stopNotificationData();
  memberProfile = null;
  memberProfileStatus = 'loading';
  stopCatalogData();
  stopTeachingData();
  stopAdminData();
  roleReady = false;
  roleError = false;
  cloudGeneration++;
  stopCloud?.();
  stopCloud = null;
  cloudBookings = [];
  cloudSessions = {};
  cloudStatus = 'idle';
}
async function connectCloud(profile) {
  disconnectCloud();
  if (!user || user.demo) return;
  const generation = cloudGeneration,
    uid = user.uid;
  cloudStatus = 'loading';
  startCatalogData();
  try {
    const store = await window.fitlabStore;
    if (!store) throw Error('ยังไม่ได้ตั้งค่า Firebase');
    if (generation !== cloudGeneration) return;
    stopCloud = store.watch(
      uid,
      (state) => {
        if (generation !== cloudGeneration) return;
        memberProfile = state.profile || null;
        memberProfileStatus = state.profileStatus || 'ready';
        cloudBookings = state.bookings;
        cloudSessions = state.sessions;
        cloudStatus = 'ready';
        applyRole(state);
        if (roleReady && notificationStatus === 'idle') startNotificationData();
        const signature = JSON.stringify([
          user.role,
          state.bookings.map((b) => [b.id, b.cancelled]),
        ]);
        if (signature !== rosterSyncSignature) {
          rosterSyncSignature = signature;
          const sync =
            canTrainer() || canAdmin()
              ? Promise.all(
                  state.bookings
                    .filter((b) => !b.cancelled)
                    .map((b) => store.cancel(uid, b)),
                )
              : store.syncRoster?.(uid, state.bookings);
          sync?.catch(() => {
            rosterSyncSignature = null;
          });
        }
        if (!['login', 'register', 'forgot', 'password'].includes(page)) render();
      },
      (e) => {
        if (generation !== cloudGeneration) return;
        cloudStatus = 'error';
        render();
        notify(
          cloudError(e),
          'error',
          app.querySelector('.content') || app.querySelector('.profile-menu') || app,
        );
      },
    );
    await store.saveProfile(
      uid,
      profile || { username: user.username, email: user.email },
    );
  } catch (e) {
    if (generation === cloudGeneration) {
      cloudStatus = 'error';
      render();
      notify(cloudError(e), 'error', app.querySelector('.content') || app);
    }
  }
}

async function service() {
  const s = await window.fitlabFirebase;
  if (!s) throw Error('ยังไม่ได้เชื่อม Firebase กรุณาใช้ปุ่มทดลองดูหน้าตาเว็บ');
  return s;
}

// Inline feedback and settings screens
let feedbackAnchor = null;
function notify(message, type = 'info', anchor = feedbackAnchor) {
  const old = document.getElementById('fitlab-feedback');
  if (old) old.remove();
  const box = document.createElement('div');
  box.id = 'fitlab-feedback';
  box.className = 'inline-feedback';
  box.dataset.type = type;
  box.setAttribute('role', type === 'error' ? 'alert' : 'status');
  box.innerHTML =
    '<span class="feedback-icon">' +
    icon(type === 'error' ? 'info' : 'check') +
    '</span><span class="feedback-copy"></span>';
  box.querySelector('.feedback-copy').textContent = message;
  const target = anchor?.isConnected
    ? anchor
    : app.querySelector('form') ||
      app.querySelector('.content') ||
      app.querySelector('.profile-menu') ||
      app;
  if (target === app) app.append(box);
  else target.insertAdjacentElement('afterend', box);
  box.scrollIntoView({
    block: 'nearest',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
  });
}
function settingsPage() {
  if (page === 'password')
    return shell(
      '<div class="settings-content"><div class="settings-symbol">' +
        icon('lock') +
        '</div><h1>เปลี่ยนรหัสผ่าน</h1><p class="settings-intro">เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่<br>ไปยังอีเมลของคุณ</p><form id="profileResetForm"><label class="field"><span>อีเมลของคุณ</span><div class="input">' +
        icon('mail') +
        '<input type="email" value="' +
        esc(user.email) +
        '" readonly aria-label="อีเมลของคุณ"></div></label><button class="primary" type="submit">ส่งลิงก์เปลี่ยนรหัสผ่าน</button></form><p class="settings-hint">หากไม่พบอีเมล ลองตรวจสอบในโฟลเดอร์สแปม</p></div>',
      'profile',
      backbar('เปลี่ยนรหัสผ่าน', 'profile'),
    );
  if (page === 'personal') {
    const value = (field) => {
      if (!user.demo && memberProfileStatus === 'loading') return 'กำลังโหลด…';
      if (!user.demo && memberProfileStatus === 'error') return 'ยังโหลดข้อมูลไม่ได้';
      return String(memberProfile?.[field] ?? '').trim() || 'ยังไม่ได้ระบุ';
    };
    const details = [
      ['ชื่อ', value('thaiName')],
      ['นามสกุล', value('lastName')],
      ['เบอร์โทรศัพท์', value('phone')],
      ['ชื่อผู้ใช้', user.username],
      ['อีเมล', user.email],
      ['ประเภทบัญชี', roleName()],
    ];
    return shell(
      /* HTML */ `<div class="settings-content">
        <h1>ข้อมูลส่วนตัว</h1>
        <p class="settings-intro">ข้อมูลบัญชี FitLab ของคุณ</p>
        <div class="account-details">
          ${details
            .map(
              ([label, value]) =>
                '<div><span>' +
                label +
                '</span><strong>' +
                esc(value) +
                '</strong></div>',
            )
            .join('')}
        </div>
        ${memberProfileStatus === 'error'
          ? '<p class="notice">เชื่อมข้อมูลส่วนตัวไม่ได้ กรุณาลองรีเฟรชอีกครั้ง</p>'
          : ''}
      </div>`,
      'profile',
      backbar('ข้อมูลสมาชิก', 'profile'),
    );
  }
  return shell(
    '<div class="settings-content">' +
      brand() +
      '<h1 style="margin-top:24px">ดูแลสุขภาพ ในเวลาของคุณ</h1><p class="settings-intro">เลือกคลาส จัดการการจอง และเตรียมพร้อมสำหรับการออกกำลังกายครั้งต่อไป</p><div class="account-details"><div><span>สถานะระบบ</span><strong>เวอร์ชันทดลอง</strong></div></div><p class="settings-hint">การจองบันทึกในเบราว์เซอร์นี้<br>RFID Check-in ยังเป็นการจำลอง</p></div>',
    'profile',
    backbar('เกี่ยวกับ FitLab', 'profile'),
  );
}

// Accessible cancellation confirmation
function askManualCheckinReason(name) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'fitlab-dialog manual-checkin-dialog';
    dialog.setAttribute('aria-labelledby', 'manual-checkin-title');
    dialog.innerHTML = `<form method="dialog">
      <span class="dialog-symbol">${icon("check")}</span>
      <h2 id="manual-checkin-title">เช็กอินสำรอง</h2>
      <p>บันทึกการเข้าเรียนให้ <strong>${esc(name)}</strong></p>
      <label class="field"><span>เหตุผล</span>
        <textarea class="staff-input staff-textarea" name="reason" maxlength="200" rows="3" placeholder="เช่น บัตรสมาชิกเสีย" required autofocus></textarea>
      </label>
      <div class="stack">
        <button class="primary" value="save">บันทึกเช็กอิน</button>
        <button class="secondary" value="cancel" formnovalidate>ยกเลิก</button>
      </div>
    </form>`;
    const reason = dialog.querySelector('textarea');
    reason.addEventListener('input', () => reason.setCustomValidity(''));
    dialog.addEventListener('submit', (event) => {
      if (event.submitter?.value !== 'save' || reason.value.trim()) return;
      event.preventDefault();
      reason.setCustomValidity('กรุณาระบุเหตุผล');
      reason.reportValidity();
    });
    dialog.addEventListener('close', () => {
      const value = dialog.returnValue === 'save' ? reason.value.trim() : null;
      dialog.remove();
      if (previous?.isConnected) previous.focus();
      resolve(value);
    }, { once: true });
    document.body.append(dialog);
    dialog.showModal();
  });
}

function askCancel() {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'fitlab-dialog';
    dialog.setAttribute('aria-labelledby', 'cancel-dialog-title');
    dialog.setAttribute('aria-describedby', 'cancel-dialog-description');
    dialog.innerHTML =
      '<form method="dialog"><span class="dialog-symbol">' +
      icon('calendar') +
      '</span><h2 id="cancel-dialog-title">ยกเลิกการจองคลาส?</h2><p id="cancel-dialog-description">ที่นั่งของคุณจะถูกยกเลิก คุณสามารถกลับมาจองใหม่ได้หากยังมีที่ว่าง</p><div class="stack"><button class="danger" value="yes">ยืนยันยกเลิกการจอง</button><button class="secondary" value="no" autofocus>เก็บการจองไว้</button></div></form>';
    dialog.addEventListener(
      'close',
      () => {
        const accepted = dialog.returnValue === 'yes';
        dialog.remove();
        if (previous?.isConnected) previous.focus();
        resolve(accepted);
      },
      { once: true },
    );
    document.body.append(dialog);
    dialog.showModal();
  });
}

function authError(e) {
  const map = {
    'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/email-already-in-use': 'อีเมลนี้มีบัญชีแล้ว',
    'auth/weak-password': 'กรุณาใช้รหัสผ่านอย่างน้อย 6 ตัวอักษร',
    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
  };
  notify(map[e.code] || e.message || 'ดำเนินการไม่สำเร็จ', 'error');
}

// User actions
app.addEventListener('click', async (event) => {
  const addRfidBtn = event.target.closest('.rfid-add-btn');
if (addRfidBtn) {
activeRfidTargetUid = addRfidBtn.dataset.uid;
scannedForActiveUser = '';
rfidStatusMessage = '';
rfidErrorState = false;
isAutoBindingRfid = false;
render();
return;
}

if (event.target.closest('.rfid-cancel-btn')) {
activeRfidTargetUid = null;
scannedForActiveUser = '';
rfidStatusMessage = '';
rfidErrorState = false;
isAutoBindingRfid = false;
render();
return;
}


  const removeRfidBtn = event.target.closest('.rfid-remove-btn');
  if (removeRfidBtn) {
    const targetUid = removeRfidBtn.dataset.uid;
    const oldCard = removeRfidBtn.dataset.card;
    removeRfidBtn.disabled = true;
    try {
      const store = await window.fitlabStore;
      await store.removeRfidCard(targetUid, oldCard);
      const targetUser = adminMembers.find((u) => u.uid === targetUid);
      if (targetUser) delete targetUser.rfidUid;
      render();
      notify('ลบบัตร RFID ออกจากบัญชีเรียบร้อยแล้ว', 'success');
    } catch (error) {
      notify(cloudError(error), 'error');
      removeRfidBtn.disabled = false;
    }
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const a = button.dataset.action;

  if (a === 'retry-roster-checkins') {
    if (page === 'roster' && rosterSession) {
      ensureSessionCheckinWatch(rosterSession, true);
      render();
    }
    return;
  }

  if (a === 'manual-checkin') {
    if (sessionCheckinStatus !== 'ready') return;
    const round = teachingAssignments.find((item) => item.id === rosterSession);
    const member = rosterRows.find((item) => item.uid === button.dataset.uid && !item.cancelled);
    if (!canTrainer() || round?.trainerUid !== user.uid || !member) return;
    const reason = await askManualCheckinReason(member.username || 'สมาชิก');
    if (reason === null || page !== 'roster' || rosterSession !== round.id) return;
    if (!reason || reason.length > 200) return notify('กรุณาระบุเหตุผล 1–200 ตัวอักษร', 'error', button);
    button.disabled = true;
    try {
      const store = await window.fitlabStore;
      const saved = await store.recordClassCheckin({
        sessionId: round.id, classId: round.classId, date: round.date,
        uid: member.uid, username: member.username, role: 'member', method: 'manual', reason,
      });
      const time = checkinClock(saved.checkedInAt);
      notify(saved.alreadyCheckedIn ? (time ? `เช็กอินแล้ว เวลา ${time} น.` : 'เช็กอินแล้ว') : 'บันทึก Check-in สำรองแล้ว', 'success');
    } catch (error) {
      const message = error.code === 'permission-denied' ? 'เช็กอินได้เฉพาะระหว่างคลาสและสำหรับสมาชิกที่ยังจองรอบนี้อยู่' : cloudError(error);
      notify(message, 'error', button);
    } finally {
      button.disabled = false;
    }
    return;
  }

  if (a === 'remove-member-booking') {
    if (!canTrainer() && !canAdmin()) return;
    const {
      sessionId,
      uid: targetMemberUid,
      name: memberName,
      classTitle,
      date: roundDate,
    } = button.dataset;
    if (!confirm(`ต้องการลบ "${memberName}" ออกจากคลาส ${classTitle} ใช่หรือไม่?`)) return;

    button.disabled = true;
    try {
      const store = await window.fitlabStore;
      await store.removeMemberFromSession(sessionId, targetMemberUid);

      store
        .addNotification?.({
          targetUid: targetMemberUid,
          audience: 'member',
          type: 'member_removed',
          title: `คุณถูกนำออกจากคลาส ${classTitle}`,
          message: `${canAdmin() ? 'ผู้ดูแลระบบ' : 'ผู้ฝึกสอน'} ได้นำรายชื่อของคุณออกจากรอบวันที่ ${thaiDate(roundDate)} เรียบร้อยแล้ว`,
        })
        .catch(() => {});

      notify(`ลบ ${memberName} ออกจากคลาสแล้ว`, 'success');
      if (typeof openRoster === 'function') await openRoster(sessionId);
      else render();
    } catch (e) {
      button.disabled = false;
      notify(cloudError(e), 'error');
    }
    return;
  }

  if (a === 'notif-filter') {
    notifFilter = button.dataset.filter;
    render();
    return;
  }
  if (['admin-round', 'admin-new-round', 'admin-view-rounds'].includes(a)) {
    if (!canAdmin()) return;
    catalogTab = 'schedules';
    manageDate = bangkokDateKey();
    editingScheduleId = a === 'admin-round' ? button.dataset.id : null;
    go('catalog');
    return;
  }
  if (a === 'catalog-tab') {
    catalogTab = button.dataset.tab;
    render();
    return;
  }
  if (a === 'toggle-inactive-classes') {
    showInactiveClasses = !showInactiveClasses;
    editingClassId = null;
    render();
    return;
  }
  if (a === 'remove-round' || a === 'restore-archived-class') {
    if (!canAdmin()) return notify('ไม่มีสิทธิ์จัดการคลาส', 'error', button);
    const restoring = a === 'restore-archived-class';
    const roundId = editingScheduleId;
    const round = cloudSchedules[roundId];
    const entry = restoring && catalogRows.find((row) => row.id === button.dataset.id && row.archived);
    if (restoring ? !entry : !round || round.status === 'cancelled') return;
    const c = restoring ? null : classForDate(round.classId, round.date);
    if (!restoring) {
      if (!confirm(`ลบรอบ ${c.title} วันที่ ${thaiDate(round.date)} เวลา ${displayClock(c.time)} น.? สมาชิกที่จองแล้วจะเห็นว่ารอบนี้ถูกยกเลิก`)) return;
    }
    button.disabled = true;
    try {
      const store = await window.fitlabStore;
      let recipientCount = 0;
      if (restoring) {
        await store.restoreArchivedClass(entry.id);
      } else {
        recipientCount = await store.cancelSchedule(roundId, {
          title: `ยกเลิกรอบเรียน · ${c.title}`,
          message: `รอบวันที่ ${thaiDate(round.date)} เวลา ${displayClock(c.time)}–${displayClock(c.end)} น. ถูกยกเลิกแล้ว`,
        });
        editingScheduleId = null;
      }
      render();
      notify(restoring ? 'คืนคลาสเข้าตารางแล้ว' : `ลบรอบเรียนแล้ว${recipientCount ? ' · แจ้งเตือน ' + recipientCount + ' บัญชี' : ''}`, 'success', app.querySelector('.catalog-content'));
    } catch (error) {
      notify(cloudError(error), 'error', button);
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (a === 'edit-class') {
    editingClassId = button.dataset.id;
    render();
    return;
  }
  if (a === 'new-class') {
    editingClassId = null;
    render();
    return;
  }
  if (a === 'edit-schedule') {
    editingScheduleId = button.dataset.id;
    render();
    return;
  }
  if (a === 'new-schedule') {
    editingScheduleId = null;
    render();
    return;
  }
  if (a === 'import-schedule') {
    await importLegacySchedule(button);
    return;
  }
  feedbackAnchor = button;
  if (a === 'roster') {
    openRoster(button.dataset.id);
    return;
  }
  if (a === 'go') go(button.dataset.page);
  else if (a === 'demo') {
    sessionStorage.setItem('fitlab-demo-session', 'true');
    disconnectCloud();
    user = {
      uid: 'demo',
      username: 'สมาชิกทดลอง',
      email: 'demo@example.com',
      demo: true,
    };
    go('home');
  } else if (a === 'eye') {
    const input = document.getElementById(button.dataset.input);
    input.type = input.type === 'password' ? 'text' : 'password';
  } else if (a === 'view') {
    view = button.dataset.view;
    render();
  } else if (a === 'date') {
    selectedDate = new Date(button.dataset.date + 'T00:00:00');
    render();
  } else if (a === 'week' || a === 'month') {
    if (a === 'week')
      selectedDate.setDate(selectedDate.getDate() + 7 * Number(button.dataset.step));
    else
      selectedDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + Number(button.dataset.step),
        1,
      );
    render();
  } else if (a === 'today-schedule') {
    selectedDate = new Date(bangkokDateKey() + 'T00:00:00');
    go('schedule');
  } else if (a === 'class-detail') {
    if (button.dataset.date) selectedDate = new Date(button.dataset.date + 'T00:00:00');
    selected = classForDate(button.dataset.id, dateKey(selectedDate));
    go('detail');
  } else if (a === 'history') {
    history = button.dataset.history === 'true';
    render();
  } else if (a === 'booking-detail') {
    selectedBooking = readBookings().find((b) => b.id === button.dataset.id);
    go('booking-detail');
  } else if (a === 'book') {
    const date = dateKey(selectedDate),
      problem = bookingProblem(selected, date);
    if (problem) {
      render();
      return notify(problem, 'error', app.querySelector('[data-action="book"]'));
    }
    button.disabled = true;
    try {
      if (user.demo) {
        const items = readBookings();
        if (
          items.some((b) => !b.cancelled && b.date === date && b.classId === selected.id)
        )
          throw Error('คุณจองคลาสนี้แล้ว');
        selectedBooking = {
          id: crypto.randomUUID(),
          classId: selected.id,
          date,
          cancelled: false,
        };
        items.push(selectedBooking);
        saveBookings(items);
      } else {
        const store = await window.fitlabStore;
        selectedBooking = await store.book(user.uid, selected, date);
        cloudBookings = [
          ...cloudBookings.filter((b) => b.id !== selectedBooking.id),
          selectedBooking,
        ];

        // ส่งแจ้งเตือนเข้าบัญชี Member และทีมงาน (Admin / Trainer)
        // 1. แจ้งเตือนเข้าบัญชี Member
        store
          .addNotification?.({
            targetUid: user.uid,
            audience: 'member',
            type: 'booking_created',
            title: `จองคลาส ${selected.title} สำเร็จ`,
            message: `วันที่ ${thaiDate(date)} เวลา ${displayClock(selected.time)} – ${displayClock(selected.end)} น. · ผู้สอน: ${selected.trainer || 'ยังไม่ระบุ'} · สถานที่: ${selected.location || 'Gym Zone'}`,
          })
          .catch(() => {});

        // 2. ส่งไปที่ Trainer เจ้าของคลาสนั้นคนเดียว (เฉพาะคลาสที่มี Trainer แล้วเท่านั้น)
        if (selected.trainerUid) {
          store
            .addNotification?.({
              targetUid: selected.trainerUid,
              sessionId: selectedBooking.id,
              audience: 'trainer',
              type: 'booking_created',
              title: `สมาชิกเข้าร่วมคลาสของคุณ: ${selected.title}`,
              message: `${user.username} จองรอบวันที่ ${thaiDate(date)} (${displayClock(selected.time)} – ${displayClock(selected.end)} น.)`,
            })
            .catch(() => {});
        }

        // 3. แจ้งเตือนภาพรวมเข้า Admin
        store
          .addNotification?.({
            targetUid: '',
            audience: 'admin',
            type: 'booking_created',
            title: `มีการจองคลาสใหม่: ${selected.title}`,
            message: `${user.username} จองรอบวันที่ ${thaiDate(date)} (${displayClock(selected.time)} – ${displayClock(selected.end)} น.)`,
          })
          .catch(() => {});
      }
      go('booked');
    } catch (e) {
      notify(cloudError(e), 'error', button);
    } finally {
      button.disabled = false;
    }
  } else if (a === 'cancel-confirm') {
    if (!(await askCancel())) return;
    const round = classForDate(selectedBooking.classId, selectedBooking.date);
    const state = bookingState(selectedBooking, round);
    if (state !== 'upcoming') {
      render();
      return notify(state === 'round_cancelled' ? 'ผู้ดูแลยกเลิกรอบเรียนนี้แล้ว' : 'ยกเลิกการจองได้เฉพาะก่อนเริ่มคลาส', 'error');
    }
    button.disabled = true;
    try {
      if (user.demo) {
        const items = readBookings();
        selectedBooking = items.find((b) => b.id === selectedBooking.id);
        selectedBooking.cancelled = true;
        saveBookings(items);
      } else {
        const store = await window.fitlabStore;
        selectedBooking = await store.cancel(user.uid, selectedBooking, { requireActiveRound: true });
        cloudBookings = cloudBookings.map((b) =>
          b.id === selectedBooking.id ? selectedBooking : b,
        );

        // ส่งแจ้งเตือนยกเลิกการจองเข้าบัญชี Member และทีมงาน
        const cancelledClass = classForDate(selectedBooking.classId, selectedBooking.date);
        // 1. แจ้งเตือนเข้าบัญชี Member
        store
          .addNotification?.({
            targetUid: user.uid,
            audience: 'member',
            type: 'booking_cancelled',
            title: `ยกเลิกการจองคลาส ${cancelledClass?.title || ''}`,
            message: `ยกเลิกรอบวันที่ ${thaiDate(selectedBooking.date)} เวลา ${displayClock(cancelledClass?.time || '')} – ${displayClock(cancelledClass?.end || '')} น. เรียบร้อยแล้ว`,
          })
          .catch(() => {});

        // 2. ส่งไปที่ Trainer เจ้าของคลาสนั้นคนเดียว (ถ้ามี Trainer)
        if (cancelledClass?.trainerUid) {
          store
            .addNotification?.({
              targetUid: cancelledClass.trainerUid,
              sessionId: selectedBooking.id,
              audience: 'trainer',
              type: 'booking_cancelled',
              title: `สมาชิกยกเลิกคลาสของคุณ: ${cancelledClass?.title || ''}`,
              message: `${user.username} ยกเลิกรอบวันที่ ${thaiDate(selectedBooking.date)}`,
            })
            .catch(() => {});
        }

        // 3. แจ้งเตือนภาพรวมเข้า Admin
        store
          .addNotification?.({
            targetUid: '',
            audience: 'admin',
            type: 'booking_cancelled',
            title: `สมาชิกยกเลิกการจอง: ${cancelledClass?.title || ''}`,
            message: `${user.username} ยกเลิกรอบวันที่ ${thaiDate(selectedBooking.date)}`,
          })
          .catch(() => {});
      }
      go('cancelled');
    } catch (e) {
      notify(cloudError(e), 'error', button);
    } finally {
      button.disabled = false;
    }
  } else if (a === 'simulate') go('checkin-success');
  else if (a === 'personal') go('personal');
  else if (a === 'password-reset') go('password');
  else if (a === 'about') go('about');
  else if (a === 'logout') {
    button.disabled = true;
    try {
      if (!user.demo) await (await service()).logout();
      disconnectCloud();
      user = null;
      sessionStorage.removeItem('fitlab-demo-session');
      sessionStorage.removeItem('fitlab-screen');
      go('login');
    } catch (e) {
      authError(e);
      button.disabled = false;
    }
  }
});

// Form submission
app.addEventListener('submit', async (event) => {
  if (['classEditor', 'scheduleEditor'].includes(event.target.id)) {
    event.preventDefault();
    await submitCatalog(event.target);
    return;
  }
  if (event.target.id === 'assignmentForm') {
    event.preventDefault();
    const form = event.target,
      button = form.querySelector('[type=submit]');
    if (!canAdmin()) return notify('ไม่มีสิทธิ์มอบหมายคลาส', 'error', form);
    const data = new FormData(form),
      c = classForDate(data.get('classId'), data.get('date')),
      trainer = adminMembers.find(
        (m) => m.uid === data.get('trainerUid') && m.role === 'trainer',
      ),
      date = data.get('date');
    if (!trainer || !classesOnDate(date).some((item) => item.id === c?.id))
      return notify('กรุณาเลือกคลาสที่มีในวันนั้น และบัญชี Trainer', 'error', form);
    button.disabled = true;
    try {
      const store = await window.fitlabStore;
      await store.assignTrainer(c, date, trainer);
      store
        .addNotification?.({
          targetUid: trainer.uid,
          audience: 'trainer',
          type: 'trainer_assigned',
          title: `ได้รับมอบหมายคลาสสอน: ${c.title}`,
          message: `วันที่ ${thaiDate(date)} เวลา ${displayClock(c.time)} – ${displayClock(c.end)} น. · สถานที่: ${c.location || 'Gym Zone'}`,
        })
        .catch(() => {});
      notify('มอบหมายผู้สอนแล้ว ตารางสอนจะอัปเดตในบัญชี Trainer', 'success', form);
    } catch (e) {
      notify(cloudError(e), 'error', form);
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (event.target.classList.contains('rfid-member-form')) {
    event.preventDefault();
    const form = event.target,
      button = form.querySelector('[type=submit]'),
      targetUid = form.dataset.uid,
      cardUid = new FormData(form).get('rfidUid');
    button.disabled = true;
    try {
      const store = await window.fitlabStore;
      await store.assignRfidCard(targetUid, cardUid);
      const targetUser = adminMembers.find((u) => u.uid === targetUid);
      if (targetUser) targetUser.rfidUid = String(cardUid).trim().toUpperCase();
      activeRfidTargetUid = null;
      scannedForActiveUser = '';
      render();
      notify('บันทึกผูกบัตร RFID เรียบร้อยแล้ว!', 'success');
    } catch (error) {
      notify(cloudError(error), 'error', form);
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (event.target.matches('[data-role-form]')) {
    event.preventDefault();
    const form = event.target,
      button = form.querySelector('[type=submit]');
    if (!canAdmin()) return notify('ไม่มีสิทธิ์เปลี่ยนบทบาทสมาชิก', 'error', form);
    button.disabled = true;
    try {
      const store = await window.fitlabStore;
      const newRole = new FormData(form).get('role');
      await store.setRole(form.dataset.uid, newRole);
      const roleLabels = { member: 'Member', trainer: 'Trainer', admin: 'Admin' };
      store
        .addNotification?.({
          targetUid: form.dataset.uid,
          audience: 'system',
          type: 'system',
          title: 'อัปเดตสิทธิ์การใช้งานบัญชี',
          message: `ผู้ดูแลระบบได้เปลี่ยนสิทธิ์บัญชีของคุณเป็น ${roleLabels[newRole] || newRole}`,
        })
        .catch(() => {});
      notify('บันทึกสิทธิ์สมาชิกแล้ว', 'success', app.querySelector('.role-list'));
    } catch (e) {
      notify(cloudError(e), 'error', form);
    } finally {
      button.disabled = false;
    }
    return;
  }
  event.preventDefault();
  const form = event.target,
    button = form.querySelector('[type="submit"]'),
    data = new FormData(form);
  feedbackAnchor = form;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'กำลังดำเนินการ…';
  try {
    if (form.id === 'registerForm') {
      if (data.get('regPassword') !== data.get('confirmPassword'))
        throw Error('รหัสผ่านไม่ตรงกัน');
      const result = await (
        await service()
      ).register(
        data.get('regUsername').trim(),
        data.get('regEmail').trim(),
        data.get('regPassword'),
      );
      sessionStorage.removeItem('fitlab-demo-session');
      user = {
        uid: result.user.uid,
        username: result.user.displayName || data.get('regUsername'),
        email: result.user.email,
      };
      const registeredProfile = {
        username: user.username,
        email: user.email,
        thaiName: data.get('thaiName').trim(),
        lastName: data.get('lastName').trim(),
        phone: data.get('phone').trim(),
      };
      // Show success only after the registration details are stored.
      const store = await window.fitlabStore;
      await store.saveProfile(user.uid, registeredProfile);
      memberProfile = registeredProfile;
      memberProfileStatus = 'ready';
      go('registered');
      connectCloud();
    } else if (form.id === 'loginForm') {
      const { user: u } = await (
        await service()
      ).login(data.get('email').trim(), data.get('password'));
      sessionStorage.removeItem('fitlab-demo-session');
      user = { uid: u.uid, username: u.displayName || u.email, email: u.email };
      go('home');
      connectCloud();
    } else if (form.id === 'resetForm' || form.id === 'profileResetForm') {
      if (user?.demo)
        throw Error(
          'บัญชีนี้เป็นบัญชีทดลอง กรุณาเข้าสู่ระบบด้วยบัญชีจริงเพื่อเปลี่ยนรหัสผ่าน',
        );
      await (
        await service()
      ).reset(
        form.id === 'profileResetForm' ? user.email : data.get('resetEmail').trim(),
      );
      notify(
        'ส่งลิงก์แล้ว ตรวจสอบกล่องจดหมายของคุณ หากไม่พบอีเมล ลองดูในโฟลเดอร์สแปม',
        'success',
        form,
      );
    }
  } catch (e) {
    authError(e);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

// Restore Firebase session and selected screen after refresh
const restorablePages = [
  'admin',
  'home',
  'schedule',
  'bookings',
  'checkin',
  'profile',
  'personal',
  'password',
  'about',
  'teaching',
  'admin',
  'assignments',
];
function rememberScreen() {
  if (!user) return;
  const target = restorablePages.includes(page)
    ? page
    : ['detail'].includes(page)
      ? 'schedule'
      : ['booked', 'cancelled', 'booking-detail'].includes(page)
        ? 'bookings'
        : 'home';
  try {
    sessionStorage.setItem(
      'fitlab-screen',
      JSON.stringify({ uid: user.uid, page: target, date: dateKey(selectedDate), view }),
    );
  } catch {}
}
async function restoreSession() {
  app.innerHTML =
    '<section class="auth-screen"><div class="session-loading" role="status" aria-live="polite">' +
    brand() +
    '<span class="loading-ring" aria-hidden="true"></span><p>กำลังเปิด FitLab…</p></div></section>';
  try {
    const service = await window.fitlabFirebase;
    const account = service?.user;
    if (account) {
      sessionStorage.removeItem('fitlab-demo-session');
      user = {
        uid: account.uid,
        username: account.displayName || account.email,
        email: account.email,
      };
    } else if (sessionStorage.getItem('fitlab-demo-session') === 'true')
      user = {
        uid: 'demo',
        username: 'สมาชิกทดลอง',
        email: 'demo@example.com',
        demo: true,
      };
    if (user) {
      let saved;
      try {
        saved = JSON.parse(sessionStorage.getItem('fitlab-screen'));
      } catch {}
      page =
        saved?.uid === user.uid && restorablePages.includes(saved.page)
          ? saved.page
          : 'home';
      if (
        saved?.uid === user.uid &&
        /^\d{4}-\d{2}-\d{2}$/.test(saved.date) &&
        Number.isFinite(new Date(saved.date + 'T00:00:00').getTime())
      )
        selectedDate = new Date(saved.date + 'T00:00:00');
      if (['day', 'week', 'month'].includes(saved?.view)) view = saved.view;
      render();
      if (!user.demo) connectCloud();
    } else {
      page = 'login';
      render();
    }
  } catch (e) {
    page = 'login';
    render();
    notify(
      'เชื่อม Firebase ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชอีกครั้ง',
      'error',
      app.querySelector('.auth-card'),
    );
  }
}
restoreSession();

// Re-evaluate a visible booking button at the start time, and after another tab changes seats.
setInterval(() => {
  if (user && ['bookings', 'booking-detail'].includes(page) && bookingStatesOnPage() !== renderedBookingStates) render();
  if (['admin', 'home', 'notifications', 'profile'].includes(page) && canAdmin()) {
    const activeAlerts = adminTrainerAlerts().map((item) => item.id).join(',');
    if (activeAlerts !== renderedTrainerAlerts) render();
  }
  if (page === 'detail' && selected) {
    const b = app.querySelector('[data-action="book"]');
    const problem = bookingProblem(selected, dateKey(selectedDate));
    if (b && b.disabled !== Boolean(problem)) render();
  }
}, 1000);
window.addEventListener('storage', (event) => {
  if (
    event.key?.startsWith('fitlab-pdf-bookings:') &&
    ['schedule', 'detail', 'bookings', 'home'].includes(page)
  )
    render();
});
