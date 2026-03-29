(function () {
  "use strict";

  /** @type {{ id: string, name: string, classLabel: string }[]} */
  let children = [];
  /** @type {string} */
  let childId = "nika";
  /** @type {string} ISO date */
  let diaryDate = "2026-03-27";
  /** @type {string[]} */
  let diaryDates = [];

  let tab = "diary";

  /** 'chart' | 'grades' */
  let perfSubview = "chart";
  /** @type {string} */
  let gradesSubjectId = "all";
  /** @type {string | null} */
  let expandedGradeDate = null;

  const ROLE_KEY = "dnevnik_role";
  /** @type {'parent' | 'teacher'} */
  let appRole = "parent";
  /** @type {string} */
  let tClassId = "c8a";
  /** @type {string} ISO */
  let tDiaryDate = "2026-03-27";
  /** @type {string[]} */
  let tDiaryDates = [];
  /** @type {{ name: string, subject: string } | null} */
  let teacherProfile = null;
  /** @type {{ id: string, label: string, grade: number }[]} */
  let teacherClasses = [];
  /** @type {Record<string, unknown> | null} */
  let editingLesson = null;

  const $ = (sel, root = document) => root.querySelector(sel);

  function api(path) {
    return fetch(path).then((r) => {
      if (!r.ok) return r.json().then((j) => Promise.reject(j));
      return r.json();
    });
  }

  function apiPut(path, body) {
    return fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) return r.json().then((j) => Promise.reject(j));
      return r.json();
    });
  }

  function setTab(next) {
    tab = next;
    document.querySelectorAll(".view").forEach((v) => v.classList.add("view--hidden"));
    const map = {
      diary: "#view-diary",
      performance: "#view-performance",
      meetings: "#view-meetings",
      finals: "#view-finals",
    };
    $(map[next]).classList.remove("view--hidden");

    document.querySelectorAll(".bn-item").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.tab === next);
    });

    if (tab === "performance") {
      $("#perf-chart").classList.toggle("view--hidden", perfSubview !== "chart");
      $("#perf-grades").classList.toggle("view--hidden", perfSubview !== "grades");
    }

    if (tab === "performance" && perfSubview === "chart") loadPerformance();
    if (tab === "performance" && perfSubview === "grades") loadGradesList();
    if (tab === "finals") loadFinals();
    if (tab === "diary") loadDiary();
  }

  function openPicker() {
    const list = $("#picker-list");
    list.innerHTML = "";
    children.forEach((c) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = c.id === childId ? "is-current" : "";
      btn.innerHTML =
        '<div class="p-name"></div><div class="p-class"></div>';
      btn.querySelector(".p-name").textContent = c.name;
      btn.querySelector(".p-class").textContent = c.classLabel;
      btn.addEventListener("click", () => {
        childId = c.id;
        $("#hdr-name").textContent = c.name;
        $("#hdr-class").textContent = c.classLabel;
        $("#picker").hidden = true;
        expandedGradeDate = null;
        perfSubview = "chart";
        $("#perf-chart").classList.remove("view--hidden");
        $("#perf-grades").classList.add("view--hidden");
        loadDiaryMeta().then(() => loadDiary());
        if (tab === "performance") setTab("performance");
        if (tab === "finals") loadFinals();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    $("#picker").hidden = false;
  }

  function loadChildren() {
    return api("/api/children").then((data) => {
      children = data.children || [];
      const cur = children.find((c) => c.id === childId) || children[0];
      if (cur) {
        childId = cur.id;
        $("#hdr-name").textContent = cur.name;
        $("#hdr-class").textContent = cur.classLabel;
      }
    });
  }

  function loadDiaryMeta() {
    return api(`/api/children/${encodeURIComponent(childId)}/diary/meta`)
      .then((d) => {
        diaryDates = d.dates || [];
        if (diaryDates.length && !diaryDates.includes(diaryDate)) {
          diaryDate = diaryDates[diaryDates.length - 1];
        }
        updateDiaryNavState();
      })
      .catch(() => {
        diaryDates = [];
        updateDiaryNavState();
      });
  }

  function updateDiaryNavState() {
    const prev = $("#diary-prev");
    const next = $("#diary-next");
    if (!prev || !next) return;
    if (!diaryDates.length) {
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    const idx = diaryDates.indexOf(diaryDate);
    if (idx < 0) {
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    prev.disabled = idx <= 0;
    next.disabled = idx >= diaryDates.length - 1;
  }

  function shiftDiary(delta) {
    if (!diaryDates.length) return;
    const idx = diaryDates.indexOf(diaryDate);
    if (idx < 0) {
      diaryDate = diaryDates[0];
      loadDiary();
      return;
    }
    const next = idx + delta;
    if (next < 0 || next >= diaryDates.length) return;
    diaryDate = diaryDates[next];
    loadDiary();
  }

  function barClassForKey(key) {
    const m = {
      teacher: "teacher",
      topic: "topic",
      hw: "hw",
      ctrl: "ctrl",
      place: "place",
      hwNext: "next",
    };
    return m[key] || "teacher";
  }

  function renderLesson(lesson, opts) {
    const teacherEdit = opts && opts.teacherEdit;
    const hasBlocks = Array.isArray(lesson.blocks) && lesson.blocks.length > 0;
    const detailsFromFields =
      !hasBlocks &&
      (lesson.teacher ||
        lesson.topic ||
        lesson.homework ||
        lesson.controlWork ||
        lesson.place ||
        lesson.homeworkNext);

    const wrap = document.createElement("article");
    wrap.className = "lesson";
    wrap.dataset.lessonId = lesson.id;

    const top = document.createElement("button");
    top.type = "button";
    top.className = "lesson__top";
    top.innerHTML =
      '<div><div class="lesson__title"></div><div class="lesson__time"></div></div>' +
      (lesson.grade != null
        ? '<div class="lesson__grade"></div>'
        : '<div class="lesson__grade" style="opacity:0">—</div>');
    top.querySelector(".lesson__title").textContent = lesson.title;
    top.querySelector(".lesson__time").textContent = lesson.timeLabel;
    if (lesson.grade != null) {
      top.querySelector(".lesson__grade").textContent = String(lesson.grade);
    }

    const body = document.createElement("div");
    body.className = "lesson__body";
    body.hidden = true;

    function fillBody() {
      body.innerHTML = "";
      if (hasBlocks) {
        lesson.blocks.forEach((b) => {
          const row = document.createElement("div");
          row.className = "detail-row";
          const bar = document.createElement("div");
          bar.className =
            "detail-row__bar detail-row__bar--" + barClassForKey(b.key);
          const tx = document.createElement("div");
          tx.className = "detail-row__text";
          tx.textContent = b.text;
          row.appendChild(bar);
          row.appendChild(tx);
          body.appendChild(row);
        });
      } else if (detailsFromFields) {
        const rows = [
          ["teacher", lesson.teacher ? `Преподаватель: ${lesson.teacher}` : ""],
          ["topic", lesson.topic ? `Тема: ${lesson.topic}` : ""],
          ["hw", lesson.homework ? `Домашнее задание: ${lesson.homework}` : ""],
          [
            "ctrl",
            lesson.controlWork ? `Контрольная работа: ${lesson.controlWork}` : "",
          ],
          ["place", lesson.place ? `Место: ${lesson.place}` : ""],
          [
            "next",
            lesson.homeworkNext
              ? `Домашнее задание на следующий урок: ${lesson.homeworkNext}`
              : "",
          ],
        ];
        rows.forEach(([k, text]) => {
          if (!text) return;
          const row = document.createElement("div");
          row.className = "detail-row";
          const bar = document.createElement("div");
          bar.className = "detail-row__bar detail-row__bar--" + barClassForKey(k);
          const tx = document.createElement("div");
          tx.className = "detail-row__text";
          tx.textContent = text;
          row.appendChild(bar);
          row.appendChild(tx);
          body.appendChild(row);
        });
      }
    }

    fillBody();

    let open = false;
    top.addEventListener("click", () => {
      if (!hasBlocks && !detailsFromFields) return;
      open = !open;
      body.hidden = !open;
    });

    wrap.appendChild(top);
    if (hasBlocks || detailsFromFields) wrap.appendChild(body);
    if (teacherEdit) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "lesson__edit";
      edit.textContent = "Изменить";
      edit.addEventListener("click", (e) => {
        e.stopPropagation();
        openLessonModal(lesson);
      });
      wrap.appendChild(edit);
    }
    return wrap;
  }

  function openLessonModal(lesson) {
    editingLesson = lesson;
    $("#lm-lesson-id").value = lesson.id;
    $("#lm-title-in").value = lesson.title || "";
    $("#lm-time").value = lesson.timeLabel || "";
    $("#lm-teacher").value = lesson.teacher || "";
    $("#lm-topic").value = lesson.topic || "";
    $("#lm-hw").value = lesson.homework || "";
    $("#lm-ctrl").value = lesson.controlWork || "";
    $("#lm-place").value = lesson.place || "";
    $("#lm-hwn").value = lesson.homeworkNext || "";
    $("#lm-grade").value =
      lesson.grade != null && lesson.grade !== "" ? String(lesson.grade) : "";
    $("#lesson-modal").hidden = false;
  }

  function closeLessonModal() {
    $("#lesson-modal").hidden = true;
    editingLesson = null;
  }

  function applyRole(role) {
    appRole = role === "teacher" ? "teacher" : "parent";
    try {
      localStorage.setItem(ROLE_KEY, appRole);
    } catch (_) {}

    const shellP = $("#shell-parent");
    const shellT = $("#shell-teacher");
    const nav = $(".bottomnav");

    if (appRole === "teacher") {
      shellP.classList.add("view--hidden");
      shellT.classList.remove("view--hidden");
      shellT.removeAttribute("hidden");
      if (nav) nav.hidden = true;
      const op = $("#open-picker");
      if (op) op.hidden = true;
      document.body.style.paddingBottom = "env(safe-area-inset-bottom, 0)";
    } else {
      shellP.classList.remove("view--hidden");
      shellT.classList.add("view--hidden");
      shellT.setAttribute("hidden", "");
      if (nav) nav.hidden = false;
      const op = $("#open-picker");
      if (op) op.hidden = false;
      document.body.style.paddingBottom = "";
      const cur = children.find((c) => c.id === childId) || children[0];
      if (cur) {
        $("#hdr-name").textContent = cur.name;
        $("#hdr-class").textContent = cur.classLabel;
      }
    }
  }

  function renderTeacherClassButtons() {
    const box = $("#teacher-classes");
    if (!box) return;
    box.innerHTML = "";
    teacherClasses.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "teacher-class-btn" + (c.id === tClassId ? " is-active" : "");
      b.textContent = c.label;
      b.addEventListener("click", () => {
        tClassId = c.id;
        renderTeacherClassButtons();
        loadTeacherDiaryMeta().then(() => loadTeacherDiary());
        loadTeacherRoster();
      });
      box.appendChild(b);
    });
  }

  function loadTeacherRoster() {
    api(`/api/teacher/classes/${encodeURIComponent(tClassId)}/roster`).then((d) => {
      const ul = $("#teacher-roster");
      if (!ul) return;
      ul.innerHTML = "";
      (d.names || []).forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
      });
    });
  }

  function updateTeacherDiaryNavState() {
    const prev = $("#t-diary-prev");
    const next = $("#t-diary-next");
    if (!prev || !next) return;
    if (!tDiaryDates.length) {
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    const idx = tDiaryDates.indexOf(tDiaryDate);
    if (idx < 0) {
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    prev.disabled = idx <= 0;
    next.disabled = idx >= tDiaryDates.length - 1;
  }

  function shiftTeacherDiary(delta) {
    if (!tDiaryDates.length) return;
    const idx = tDiaryDates.indexOf(tDiaryDate);
    if (idx < 0) {
      tDiaryDate = tDiaryDates[0];
      loadTeacherDiary();
      return;
    }
    const n = idx + delta;
    if (n < 0 || n >= tDiaryDates.length) return;
    tDiaryDate = tDiaryDates[n];
    loadTeacherDiary();
  }

  function loadTeacherDiaryMeta() {
    return api(`/api/teacher/classes/${encodeURIComponent(tClassId)}/diary?date=${encodeURIComponent(tDiaryDate)}`)
      .then((d) => {
        tDiaryDates = d.dates || [];
        if (tDiaryDates.length && !tDiaryDates.includes(tDiaryDate)) {
          tDiaryDate = tDiaryDates[tDiaryDates.length - 1];
        }
        updateTeacherDiaryNavState();
      })
      .catch(() => {
        tDiaryDates = [];
        updateTeacherDiaryNavState();
      });
  }

  function loadTeacherDiary() {
    const lessonsEl = $("#t-lessons");
    if (!lessonsEl) return;
    lessonsEl.innerHTML =
      '<p style="text-align:center;color:#6b7a90;font-size:0.88rem">Загрузка…</p>';
    api(
      `/api/teacher/classes/${encodeURIComponent(tClassId)}/diary?date=${encodeURIComponent(
        tDiaryDate
      )}`
    )
      .then((d) => {
        tDiaryDates = d.dates || tDiaryDates;
        const day = d.day;
        $("#t-day-num").textContent = String(new Date(day.date + "T12:00:00").getDate());
        $("#t-weekday").textContent = day.weekday;
        $("#t-month-y").textContent = `${day.monthGenitive}, ${day.year}`;
        lessonsEl.innerHTML = "";
        day.lessons.forEach((les) => {
          lessonsEl.appendChild(renderLesson(les, { teacherEdit: true }));
        });
        updateTeacherDiaryNavState();
      })
      .catch(() => {
        lessonsEl.innerHTML =
          '<p style="text-align:center;color:#c45">Нет расписания на этот день.</p>';
        updateTeacherDiaryNavState();
      });
  }

  function initTeacherShell() {
    return api("/api/teacher/profile")
      .then((p) => {
        teacherProfile = p;
        const line = $("#teacher-profile");
        if (line) line.textContent = `${p.name} — ${p.subject}`;
        $("#hdr-name").textContent = p.name;
        $("#hdr-class").textContent = p.subject;
        return api("/api/teacher/classes");
      })
      .then((d) => {
        teacherClasses = d.classes || [];
        if (teacherClasses.length && !teacherClasses.some((c) => c.id === tClassId)) {
          tClassId = teacherClasses[0].id;
        }
        tDiaryDate = diaryDate;
        renderTeacherClassButtons();
        return loadTeacherDiaryMeta();
      })
      .then(() => {
        loadTeacherDiary();
        loadTeacherRoster();
      });
  }

  function attachDiarySwipe(el, shiftFn) {
    const shift = typeof shiftFn === "function" ? shiftFn : shiftDiary;
    let x0 = null;
    let y0 = null;
    el.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches.length) return;
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
      },
      { passive: true }
    );
    el.addEventListener(
      "touchend",
      (e) => {
        if (x0 == null || !e.changedTouches.length) return;
        const x1 = e.changedTouches[0].clientX;
        const y1 = e.changedTouches[0].clientY;
        const dx = x1 - x0;
        const dy = y1 - y0;
        x0 = null;
        y0 = null;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) shift(1);
        else shift(-1);
      },
      { passive: true }
    );
  }

  function loadDiary() {
    const lessonsEl = $("#diary-lessons");
    lessonsEl.innerHTML =
      '<p style="text-align:center;color:#6b7a90;font-size:0.88rem">Загрузка…</p>';
    api(
      `/api/children/${encodeURIComponent(childId)}/diary?date=${encodeURIComponent(
        diaryDate
      )}`
    )
      .then((d) => {
        diaryDates = d.dates || diaryDates;
        const day = d.day;
        $("#diary-day-num").textContent = String(new Date(day.date + "T12:00:00").getDate());
        $("#diary-weekday").textContent = day.weekday;
        $("#diary-month-y").textContent = `${day.monthGenitive}, ${day.year}`;
        lessonsEl.innerHTML = "";
        day.lessons.forEach((les) => lessonsEl.appendChild(renderLesson(les)));
        updateDiaryNavState();
      })
      .catch(() => {
        lessonsEl.innerHTML =
          '<p style="text-align:center;color:#c45">Нет расписания на этот день.</p>';
        updateDiaryNavState();
      });
  }

  function loadPerformance() {
    api(`/api/children/${encodeURIComponent(childId)}/performance`).then((p) => {
      $("#perf-date-line").textContent = p.dateLabel;
      $("#perf-trimester").textContent = p.trimesterLabel;
      const box = $("#perf-rows");
      box.innerHTML = "";
      p.rows.forEach((row) => {
        const max = 5;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "perf-row";
        const name = document.createElement("div");
        name.className = "perf-row__name";
        name.textContent = row.subjectName;
        const bars = document.createElement("div");
        bars.className = "bars";
        [
          ["stu", row.studentAvg, "bar-fill--stu", "bar-val--stu"],
          ["cls", row.classAvg, "bar-fill--cls", "bar-val--cls"],
          ["par", row.parallelAvg, "bar-fill--par", "bar-val--par"],
        ].forEach(([_, val, fc, vc]) => {
          const line = document.createElement("div");
          line.className = "bar-line";
          const track = document.createElement("div");
          track.className = "bar-track";
          const fill = document.createElement("div");
          fill.className = "bar-fill " + fc;
          const pct = Math.min(100, Math.max(0, (Number(val) / max) * 100));
          fill.style.width = pct + "%";
          track.appendChild(fill);
          const num = document.createElement("span");
          num.className = "bar-val " + vc;
          num.textContent = Number(val).toFixed(2);
          line.appendChild(track);
          line.appendChild(num);
          bars.appendChild(line);
        });
        b.appendChild(name);
        b.appendChild(bars);
        b.addEventListener("click", () => {
          gradesSubjectId = row.subjectId;
          perfSubview = "grades";
          expandedGradeDate = null;
          $("#perf-chart").classList.add("view--hidden");
          $("#perf-grades").classList.remove("view--hidden");
          loadGradesList();
        });
        box.appendChild(b);
      });
    })
      .catch(() => {
        $("#perf-date-line").textContent = "—";
        $("#perf-trimester").textContent = "";
        const box = $("#perf-rows");
        if (box) box.innerHTML = '<p class="placeholder-msg">Нет данных успеваемости.</p>';
      });
  }

  function loadGradesList() {
    api(
      `/api/children/${encodeURIComponent(childId)}/grades?subject=${encodeURIComponent(
        gradesSubjectId
      )}`
    ).then((g) => {
      $("#grades-banner-date").textContent =
        document.getElementById("perf-date-line").textContent || "";
      $("#grades-subject-title").textContent = g.subjectLabel || "Предмет";
      const list = $("#grades-list");
      list.innerHTML = "";
      (g.rows || []).forEach((row) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gline";
        const isOpen = expandedGradeDate === row.date;
        btn.innerHTML =
          '<div class="gline__row">' +
          '<span class="gline__dot"></span>' +
          '<span class="gline__date"></span>' +
          '<span class="gline__grades"></span>' +
          "</div>";
        btn.querySelector(".gline__date").textContent = row.dateDisplay + ":";
        btn.querySelector(".gline__grades").textContent = row.grades.join(", ");

        const detailBox = document.createElement("div");
        detailBox.className = "gline__detail";
        detailBox.hidden = !isOpen;

        btn.addEventListener("click", () => {
          if (expandedGradeDate === row.date) {
            expandedGradeDate = null;
            detailBox.hidden = true;
            return;
          }
          list.querySelectorAll(".gline__detail").forEach((el) => {
            el.hidden = true;
          });
          expandedGradeDate = row.date;
          detailBox.hidden = false;
          detailBox.innerHTML = "Загрузка…";
          api(
            `/api/children/${encodeURIComponent(childId)}/grades/${encodeURIComponent(
              row.date
            )}?subject=${encodeURIComponent(gradesSubjectId)}`
          )
            .then((d) => {
              detailBox.innerHTML = "";
              d.detail.items.forEach((it) => {
                const line = document.createElement("div");
                line.className = "gdetail";
                line.innerHTML =
                  '<div><div class="gdetail__subj"></div><div class="gdetail__act"></div></div><div class="gdetail__gr"></div>';
                line.querySelector(".gdetail__subj").textContent = it.subject;
                line.querySelector(".gdetail__act").textContent = it.activity;
                line.querySelector(".gdetail__gr").textContent = String(it.grade);
                detailBox.appendChild(line);
              });
            })
            .catch(() => {
              detailBox.textContent = "Нет подробностей";
            });
        });

        const rowWrap = document.createElement("div");
        rowWrap.appendChild(btn);
        rowWrap.appendChild(detailBox);
        list.appendChild(rowWrap);
      });
    });
  }

  function loadFinals() {
    api(`/api/children/${encodeURIComponent(childId)}/finals`).then((f) => {
      $("#finals-year").textContent = f.yearLabel;
      const box = $("#finals-rows");
      box.innerHTML = "";
      f.rows.forEach((r) => {
        const row = document.createElement("div");
        row.className = "frow";
        const name = document.createElement("div");
        name.className = "frow__name";
        name.textContent = r.subject;
        row.appendChild(name);
        [r.t1, r.t2, r.t3, r.year].forEach((v) => {
          const c = document.createElement("div");
          c.className = "frow__g";
          c.textContent = v != null ? String(v) : "—";
          row.appendChild(c);
        });
        box.appendChild(row);
      });
    });
  }

  document.querySelectorAll(".bn-item").forEach((b) => {
    b.addEventListener("click", () => {
      const next = b.dataset.tab;
      if (!next) return;
      if (next === "performance") {
        perfSubview = "chart";
        expandedGradeDate = null;
        $("#perf-chart").classList.remove("view--hidden");
        $("#perf-grades").classList.add("view--hidden");
      }
      setTab(next);
    });
  });

  $("#open-picker").addEventListener("click", openPicker);
  $("#picker-close").addEventListener("click", () => {
    $("#picker").hidden = true;
  });
  $(".picker__backdrop").addEventListener("click", () => {
    $("#picker").hidden = true;
  });

  $("#grades-back").addEventListener("click", () => {
    perfSubview = "chart";
    expandedGradeDate = null;
    $("#perf-chart").classList.remove("view--hidden");
    $("#perf-grades").classList.add("view--hidden");
    loadPerformance();
  });

  $("#diary-prev").addEventListener("click", () => shiftDiary(-1));
  $("#diary-next").addEventListener("click", () => shiftDiary(1));
  attachDiarySwipe($("#diary-card"), shiftDiary);

  $("#t-diary-prev").addEventListener("click", () => shiftTeacherDiary(-1));
  $("#t-diary-next").addEventListener("click", () => shiftTeacherDiary(1));
  attachDiarySwipe($("#t-diary-card"), shiftTeacherDiary);

  $("#lm-cancel").addEventListener("click", closeLessonModal);
  $(".lesson-modal__backdrop").addEventListener("click", closeLessonModal);

  $("#lesson-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!editingLesson) return;
    const gradeRaw = $("#lm-grade").value.trim();
    const body = {
      title: $("#lm-title-in").value,
      timeLabel: $("#lm-time").value,
      teacher: $("#lm-teacher").value || null,
      topic: $("#lm-topic").value || null,
      homework: $("#lm-hw").value || null,
      controlWork: $("#lm-ctrl").value || null,
      place: $("#lm-place").value || null,
      homeworkNext: $("#lm-hwn").value || null,
      grade: gradeRaw === "" ? null : Number(gradeRaw),
    };
    const key = encodeURIComponent(String(editingLesson.id));
    apiPut(
      `/api/teacher/classes/${encodeURIComponent(tClassId)}/diary/${encodeURIComponent(
        tDiaryDate
      )}/lessons/${key}`,
      body
    )
      .then(() => {
        closeLessonModal();
        loadTeacherDiary();
      })
      .catch(() => {
        alert("Не удалось сохранить");
      });
  });

  const roleSelect = $("#role-switch");
  try {
    const saved = localStorage.getItem(ROLE_KEY);
    if (saved === "teacher" || saved === "parent") roleSelect.value = saved;
  } catch (_) {}
  applyRole(roleSelect.value === "teacher" ? "teacher" : "parent");

  roleSelect.addEventListener("change", () => {
    const v = roleSelect.value === "teacher" ? "teacher" : "parent";
    applyRole(v);
    if (v === "teacher") initTeacherShell();
    else {
      loadChildren()
        .then(() => loadDiaryMeta())
        .then(() => {
          if (tab === "diary") loadDiary();
          if (tab === "performance") setTab("performance");
          if (tab === "finals") loadFinals();
        });
    }
  });

  if (appRole === "teacher") {
    initTeacherShell();
  } else {
    loadChildren()
      .then(() => loadDiaryMeta())
      .then(() => {
        loadDiary();
        setTab("diary");
      });
  }
})();
