const BUILT_IN_DATASETS = [
  { label: "All Batches", path: "../outputs/all_batches_raw_classes.json" },
  { label: "1st Year A", path: "../outputs/1st_year_a_raw_classes.json" },
  { label: "1st Year B", path: "../outputs/1st_year_b_raw_classes.json" },
  { label: "2nd Year A", path: "../outputs/2nd_year_a_raw_classes.json" },
  { label: "2nd Year B", path: "../outputs/2nd_year_b_raw_classes.json" },
  { label: "2nd Year ECE ENC", path: "../outputs/2nd_year_ece_enc_raw_classes.json" },
  { label: "2nd ECE", path: "../outputs/2nd_ece_raw_classes.json" },
  { label: "2nd Year ECE ENC A", path: "../outputs/2nd_year_ece_enc_a_raw_classes.json" },
  { label: "3rd Year A", path: "../outputs/3rd_year_a_raw_classes.json" },
  { label: "3rd Year B", path: "../outputs/3rd_year_b_raw_classes.json" },
  { label: "4th Year A", path: "../outputs/4th_year_a_raw_classes.json" },
];

const SUBJECTS_PATH = "../subjects.json";
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const SLOT_TIMES = {
  1: "08:00",
  2: "08:50",
  3: "09:40",
  4: "10:30",
  5: "11:20",
  6: "12:10",
  7: "13:00",
  8: "13:50",
  9: "14:40",
  10: "15:30",
  11: "16:20",
  12: "17:10",
  13: "18:00",
  14: "18:50",
};

const state = {
  datasets: [],
  activeData: null,
  activeLabel: "",
  subjects: {},
  selectedBatch: "",
  electiveChoices: {},
};

const els = {
  loadStatus: document.querySelector("#loadStatus"),
  datasetSelect: document.querySelector("#datasetSelect"),
  batchSelect: document.querySelector("#batchSelect"),
  hasElectives: document.querySelector("#hasElectives"),
  jsonUpload: document.querySelector("#jsonUpload"),
  subjectsUpload: document.querySelector("#subjectsUpload"),
  alertPanel: document.querySelector("#alertPanel"),
  electivesPanel: document.querySelector("#electivesPanel"),
  electiveChoices: document.querySelector("#electiveChoices"),
  timetable: document.querySelector("#timetable"),
};

init();

async function init() {
  bindEvents();
  await loadSubjects();
  await loadBuiltInDatasets();
  renderAll();
}

function bindEvents() {
  els.datasetSelect.addEventListener("change", () => {
    const selected = state.datasets[Number(els.datasetSelect.value)];
    state.activeData = selected?.data ?? null;
    state.activeLabel = selected?.label ?? "";
    state.selectedBatch = "";
    state.electiveChoices = {};
    populateBatchSelect();
    renderAll();
  });

  els.batchSelect.addEventListener("change", () => {
    state.selectedBatch = els.batchSelect.value;
    state.electiveChoices = {};
    renderAll();
  });

  els.hasElectives.addEventListener("change", renderAll);
  els.jsonUpload.addEventListener("change", handleJsonUpload);
  els.subjectsUpload.addEventListener("change", handleSubjectsUpload);
}

async function loadSubjects() {
  try {
    state.subjects = await fetchJson(SUBJECTS_PATH);
  } catch {
    state.subjects = {};
  }
}

async function loadBuiltInDatasets() {
  const loaded = [];
  for (const dataset of BUILT_IN_DATASETS) {
    try {
      loaded.push({ label: dataset.label, data: await fetchJson(dataset.path) });
    } catch {
      // file:// usually blocks fetch; uploads still work.
    }
  }

  state.datasets = loaded;
  populateDatasetSelect();

  if (loaded.length > 0) {
    state.activeData = loaded[0].data;
    state.activeLabel = loaded[0].label;
    populateBatchSelect();
    els.loadStatus.textContent = `Loaded ${loaded.length} bundled dataset(s).`;
  } else {
    els.loadStatus.textContent = "Bundled fetch unavailable. Upload a timetable JSON to preview.";
  }
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }
  return response.json();
}

function populateDatasetSelect() {
  els.datasetSelect.innerHTML = "";
  state.datasets.forEach((dataset, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = dataset.label;
    els.datasetSelect.append(option);
  });
}

function populateBatchSelect() {
  els.batchSelect.innerHTML = "";
  const batches = Object.keys(state.activeData ?? {}).sort();
  for (const batch of batches) {
    const option = document.createElement("option");
    option.value = batch;
    option.textContent = batch;
    els.batchSelect.append(option);
  }
  state.selectedBatch = batches[0] ?? "";
  els.batchSelect.value = state.selectedBatch;
}

async function handleJsonUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const data = JSON.parse(await file.text());
  state.datasets.push({ label: file.name, data });
  populateDatasetSelect();
  els.datasetSelect.value = String(state.datasets.length - 1);
  state.activeData = data;
  state.activeLabel = file.name;
  state.selectedBatch = "";
  state.electiveChoices = {};
  populateBatchSelect();
  els.loadStatus.textContent = `Loaded ${file.name}.`;
  renderAll();
}

async function handleSubjectsUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  state.subjects = JSON.parse(await file.text());
  els.loadStatus.textContent = `Loaded ${file.name}.`;
  renderAll();
}

function renderAll() {
  const batchData = state.activeData?.[state.selectedBatch] ?? null;
  renderElectives(batchData);
  renderTimetable(batchData);
}

function renderElectives(batchData) {
  const electiveBlocks = collectElectiveBlocks(batchData);
  els.hasElectives.checked = electiveBlocks.length > 0 || els.hasElectives.checked;
  els.electivesPanel.hidden = !els.hasElectives.checked || electiveBlocks.length === 0;
  els.electiveChoices.innerHTML = "";

  for (const block of electiveBlocks) {
    const key = blockKey(block);
    if (!state.electiveChoices[key]) {
      state.electiveChoices[key] = "0";
    }

    const card = document.createElement("div");
    card.className = "elective-card";
    const title = document.createElement("strong");
    title.textContent = `${block.day} ${block.start_time}-${block.end_time}`;
    const select = document.createElement("select");
    select.value = state.electiveChoices[key];
    block.options.forEach((option, index) => {
      const item = document.createElement("option");
      item.value = String(index);
      item.textContent = optionLabel(option);
      select.append(item);
    });
    select.addEventListener("change", () => {
      state.electiveChoices[key] = select.value;
      renderTimetable(batchData);
    });
    card.append(title, select);
    els.electiveChoices.append(card);
  }
}

function renderTimetable(batchData) {
  els.timetable.innerHTML = "";
  clearAlert();

  if (!batchData) {
    showAlert("No timetable data loaded.");
    return;
  }

  const selectedEntries = selectedScheduleEntries(batchData);
  const collisions = findCollisions(selectedEntries);
  if (collisions.length > 0) {
    showAlert(`FATAL ERROR: overlapping classes found at ${collisions.join(", ")}.`);
  }

  const header = document.createElement("tr");
  header.append(tableHeader("Time", "time-col"));
  for (const day of DAYS) {
    header.append(tableHeader(day));
  }
  els.timetable.append(header);

  for (let slot = 1; slot <= 14; slot++) {
    const row = document.createElement("tr");
    row.append(tableHeader(SLOT_TIMES[slot], "time-col"));
    for (const day of DAYS) {
      if (isCoveredByEarlierEntry(selectedEntries, day, slot)) {
        continue;
      }

      const entries = selectedEntries.filter((entry) => entry.day === day && entry.start_slot === slot);
      const cell = document.createElement("td");
      if (entries.length > 1) {
        cell.className = "fatal-cell";
      }
      if (entries.length > 0) {
        cell.rowSpan = Math.max(...entries.map((entry) => clippedPeriods(entry)));
      }
      for (const entry of entries) {
        cell.append(renderClassCard(entry));
      }
      row.append(cell);
    }
    els.timetable.append(row);
  }
}

function isCoveredByEarlierEntry(entries, day, slot) {
  return entries.some((entry) => {
    if (entry.day !== day || entry.start_slot >= slot) {
      return false;
    }
    return slot < entry.start_slot + clippedPeriods(entry);
  });
}

function clippedPeriods(entry) {
  const periods = Number(entry.periods) || 1;
  return Math.max(1, Math.min(periods, 15 - entry.start_slot));
}

function selectedScheduleEntries(batchData) {
  const entries = [];
  for (const day of DAYS) {
    const classes = batchData[day] ?? [];
    for (const block of classes) {
      const entry = { ...block, day };
      if (block.block_kind === "ELECTIVE_GROUP") {
        const key = blockKey(entry);
        const selectedIndex = Number(state.electiveChoices[key] ?? 0);
        const option = block.options?.[selectedIndex];
        if (option) {
          entry.subject_code = option.subject_code;
          entry.subject_name = option.subject_name ?? subjectNameFromCatalog(option.subject_code);
          entry.type = option.type;
          entry.confidence = option.confidence;
          entry.place = option.place;
          entry.teacher = option.teacher;
        }
      }
      entries.push(entry);
    }
  }
  return entries;
}

function findCollisions(entries) {
  const occupied = new Map();
  const collisions = new Set();

  for (const entry of entries) {
    for (let slot = entry.start_slot; slot < entry.start_slot + entry.periods; slot++) {
      const key = `${entry.day} slot ${slot}`;
      if (occupied.has(key)) {
        collisions.add(key);
      }
      occupied.set(key, true);
    }
  }
  return [...collisions];
}

function renderClassCard(entry) {
  const card = document.createElement("div");
  card.className = `class-card ${entry.block_kind === "ELECTIVE_GROUP" ? "elective" : ""}`;
  card.title = tooltipText(entry);

  const code = document.createElement("div");
  code.className = "subject-code";
  code.textContent = entry.subject_code ?? "UNKNOWN";

  const name = document.createElement("div");
  name.className = "subject-name";
  name.textContent = entry.subject_name ?? subjectNameFromCatalog(entry.subject_code) ?? "Subject not found";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = compactMeta(entry);

  card.append(code, name, meta);
  return card;
}

function collectElectiveBlocks(batchData) {
  if (!batchData) return [];
  const blocks = [];
  for (const day of DAYS) {
    for (const block of batchData[day] ?? []) {
      if (block.block_kind === "ELECTIVE_GROUP" && block.options?.length > 0) {
        blocks.push({ ...block, day });
      }
    }
  }
  return blocks;
}

function blockKey(block) {
  return `${block.day}:${block.start_slot}:${block.end_time}:${block.bounds?.start ?? ""}`;
}

function optionLabel(option) {
  const name = option.subject_name ?? subjectNameFromCatalog(option.subject_code) ?? "Unknown subject";
  const meta = [option.place, option.teacher].filter(Boolean).join(" | ");
  return `${option.subject_code} - ${name}${meta ? ` (${meta})` : ""}`;
}

function subjectNameFromCatalog(subjectCode) {
  if (!subjectCode) return null;
  return state.subjects[subjectCode.slice(0, -1)] ?? null;
}

function compactMeta(entry) {
  const parts = [];
  if (entry.block_kind === "ELECTIVE_GROUP") {
    parts.push("Elective");
  }
  parts.push(`${entry.start_time}-${entry.end_time}`);
  parts.push(shortType(entry.type));
  if (entry.place) {
    parts.push(entry.place);
  }
  if (entry.teacher) {
    parts.push(entry.teacher);
  }
  if (entry.source_sheet) {
    parts.push(entry.source_sheet.replaceAll("_", " "));
  }
  return parts.filter(Boolean).join(" | ");
}

function shortType(type) {
  if (type === "LECTURE") return "Lecture";
  if (type === "TUTORIAL") return "Tutorial";
  if (type === "PRACTICAL") return "Practical";
  return "Unknown";
}

function tooltipText(entry) {
  const lines = [
    `${entry.subject_code ?? "UNKNOWN"} - ${entry.subject_name ?? subjectNameFromCatalog(entry.subject_code) ?? "Subject not found"}`,
    `${entry.start_time}-${entry.end_time}, ${entry.periods} period(s), ${entry.type}, ${entry.confidence}`,
  ];
  if (entry.place || entry.teacher) {
    lines.push([entry.place, entry.teacher].filter(Boolean).join(" | "));
  }
  if (entry.source_sheet) {
    lines.push(`Source: ${entry.source_sheet}`);
  }
  if (entry.raw?.length) {
    lines.push(`Raw: ${entry.raw.join(" / ")}`);
  }
  return lines.join("\n");
}

function tableHeader(text, className = "") {
  const th = document.createElement("th");
  th.textContent = text;
  if (className) th.className = className;
  return th;
}

function showAlert(message) {
  els.alertPanel.hidden = false;
  els.alertPanel.textContent = message;
}

function clearAlert() {
  els.alertPanel.hidden = true;
  els.alertPanel.textContent = "";
}
