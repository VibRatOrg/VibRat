import './../style.css';
import 'alpinejs/dist/cdn';
import Vibr from './vibr.js';
import ServiceWorkerManager from './registerSw';

const id = document.getElementById.bind(document);
const catob = (data) => atob(data.replace(/\_/g, '+'));
const cbtoa = (data) => btoa(data).replace(/\+/g, '_');

let tapArea = id("tap-area");
let tapAreaText = tapArea.querySelector("p");
let pseudoCursor = id("pseudo-cursor");
let recordingsContainer = id("recordings-container")
let seekBar = id("seekbar")
let stopBtn = id("stop/record");
let cancelBtn = id("cancel-recording");
let saveBtn = id("save-recording");
let playBtn = id("play-recording");
let playStopBtn = id("play/stop");
let saveDialog = id("save-dialog");
let playerDialog = id("vibr-player");
let playerSeekBar = id("vibr-seekbar");
let importInput = id("import-input");
let saveOkBtn = saveDialog.querySelector(".save-btn");
let saveCancelBtn = saveDialog.querySelector(".cancel-btn");
let Database = {
  recordings: [],
}, isLS;
let isRecording = false, isPsCursorVisible = false, recordingDuration = 60000, isStopped = true;
let data = [], snapshots = [], currentIndex = 0, timeElapsed = 0, startTime = 0, timeLoop = null, playInterval = null;
let TBM = new Tabs(["loader", "main", "record"], "loader");
window.TBM = TBM;
let VibRat = new Vibr();

try {
  localStorage.setItem("Vibrat_@%#!$#@%&$#^#*^%#", "TEST");
  localStorage.getItem("Vibrat_@%#!$#@%&$#^#*^%#");
  localStorage.removeItem("Vibrat_@%#!$#@%&$#^#*^%#");
  isLS = true;
}
catch (e) {
  isLS = false;
}

if (isLS) {
  if (localStorage.getItem("VibratDatabase") !== null) {
    Database = JSON.parse(localStorage.getItem("VibratDatabase"));
  }
  else {
    localStorage.setItem("VibratDatabase", JSON.stringify(Database));
  }
}

let swManager = new ServiceWorkerManager("/sw.js");

swManager.init();

addEventListener("load", () => {
  if (window.location.search) {
    let params = new URLSearchParams(window.location.search);
    if (params.get("data")) {
      try {
        let pdata = decodeURIComponent(params.get("data"));
        let shareData = VibRat.parse(catob(pdata));
        playRecording(shareData.data, shareData.metadata.fileName);
      }
      catch (e) {
        console.log(e);
      }
    }
  }
});

let refreshing = false;

id("reload-btn").addEventListener("click", () => {
  window.location.reload();
});

navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  id("update-popup")["_x_dataStack"][0].open = true;
  refreshing = true;
});

window.addEventListener("updatefound", () => {
  console.log("New Update Available!");
});

// TBM.open("main");
// let x = 0;

// do {
//   recordingsContainer.appendChild(rCard())
//   x++
// } while (x < 15)

// register service worker
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/sw.js').then(function (registration) {
//     console.log('ServiceWorker registration successful with scope: ', registration.scope);
//   }).catch(function (err) {
//     console.log('ServiceWorker registration failed: ', err);
//   });
// }

document.addEventListener("click", (e) => {
  var t = document.querySelectorAll(".vibr-action-dropdown");
  if (!e.target.closest(".vibr-action-dropdown")) {
    t.forEach(i => {
      i["_x_dataStack"][0].open = false;
    });
  }
});

window.closeAllDropdowns = (e) => {
  var t = document.querySelectorAll(".vibr-action-dropdown");
  t.forEach(i => {
    if (!i.isEqualNode(e.target.closest(".vibr-action-dropdown"))) {
      i["_x_dataStack"][0].open = false;
    }
  });
}

importInput.addEventListener("change", (e) => {
  let file = e.target.files[0];
  let name = file.name.replace(".vibr", "");
  let i = 1;
  let suffix = "";
  while (!Exists(name + suffix)) {
    suffix = ` (${i})`;
    i++;
  }
  name += suffix;
  file.text().then(r => {
    let d = VibRat.parse(r);
    Database.recordings.push({
      name,
      data: d.data,
    });
    syncDatabase();
    paintRecordings();
  });
});

tapArea.addEventListener("pointerdown", e => {
  if (isStopped) {
    pseudoCursor.classList.add("hidden");
    isPsCursorVisible = false;
    return;
  }
  // if (!isRecording) {
  //   startRecording();
  // }
  pseudoCursor.classList.remove("hidden");
  let x = Math.max(e.clientX - tapArea.offsetLeft - 23, 0);
  let y = Math.max(e.clientY - tapArea.offsetTop - 23, 0);
  pseudoCursor.style.left = x + "px";
  pseudoCursor.style.top = y + "px";
  isPsCursorVisible = true;
  tapAreaText.classList.add("hidden");
  snapshots.push({
    start: performance.now() || Date.now(),
  });
  navigator.vibrate(60000);
  console.log("Capturing...", performance.now() || Date.now());
});
tapArea.addEventListener("pointermove", e => {
  if (isStopped) {
    pseudoCursor.classList.add("hidden");
    isPsCursorVisible = false;
    return;
  }
  if (isRecording) {
    if (isPsCursorVisible) {
      if (e.clientX - tapArea.offsetLeft - 23 < 0 || e.clientX - tapArea.offsetLeft + 8 > tapArea.offsetWidth || e.clientY - tapArea.offsetTop - 23 < 0 || e.clientY - tapArea.offsetTop + 8 > tapArea.offsetHeight) {
        navigator.vibrate(0);
        pseudoCursor.classList.add("hidden");
        isPsCursorVisible = false;
        snapshots[currentIndex].end = performance.now() || Date.now();
        snapshots[currentIndex].duration = snapshots[currentIndex].end - snapshots[currentIndex].start;
        currentIndex += 1;
      }
      else {
        pseudoCursor.classList.remove("hidden");
        let x = Math.max(e.clientX - tapArea.offsetLeft - 23, 0);
        let y = Math.max(e.clientY - tapArea.offsetTop - 23, 0);
        pseudoCursor.style.left = x + "px";
        pseudoCursor.style.top = y + "px";
        isPsCursorVisible = true;
      }
    }
  }
});
tapArea.addEventListener("pointerup", e => {
  if (isStopped) {
    pseudoCursor.classList.add("hidden");
    isPsCursorVisible = false;
    return;
  }
  if (isRecording) {
    if (isPsCursorVisible) {
      pseudoCursor.classList.add("hidden");
      isPsCursorVisible = false;
    }
    let x = Math.max(e.clientX - tapArea.offsetLeft - 23, 0);
    let y = Math.max(e.clientY - tapArea.offsetTop - 23, 0);
    try {
      navigator.vibrate(0);
      snapshots[currentIndex].end = performance.now() || Date.now();
      snapshots[currentIndex].duration = snapshots[currentIndex].end - snapshots[currentIndex].start;
      let ts = document.createElement("div");
      ts.className = "bar-timestamp top-0 absolute h-full bg-blue-800 dark:bg-blue-500 rounded-md opacity-70";
      ts.style.left = (snapshots[currentIndex].start - startTime) / 60000 * 100 + "%";
      ts.style.width = snapshots[currentIndex].duration / 60000 * 100 + "%";
      seekBar.appendChild(ts);
      currentIndex += 1;
    }
    catch (e) {
      console.log("Error:", e);
    }
  }
});

stopBtn.addEventListener("click", () => {
  if (stopBtn.dataset.action === "stop") {
    stopRecording();
  }
  else {
    resetRecording();
    startRecording();
  }
});

playBtn.addEventListener("click", () => {
  if (isStopped && snapshots.length > 0) {
    playRecording(getData(snapshots));
  }
});

cancelBtn.addEventListener("click", () => {
  console.log("Cancelling...");
  cancelRecording();
});

id("recording-name").addEventListener("input", e => {
  if (e.target.value.length <= 0) {
    e.target.classList.add("border-red-700");
    e.target.classList.add("bg-red-50");
  }
  else {
    e.target.classList.remove("border-red-700");
    e.target.classList.remove("bg-red-50");
  }
})

saveOkBtn.addEventListener("click", () => {
  let name = id("recording-name");
  if (name.value.length <= 0) {
    if (name.value.length <= 0) {
      name.classList.add("border-red-700");
      name.classList.add("bg-red-50");
    }
    else {
      name.classList.remove("border-red-700");
      name.classList.remove("bg-red-50");
    }
    return;
  }
  saveData(name.value);
  name.value = "";
  name.classList.remove("border-red-700");
  name.classList.remove("bg-red-50");
  toggleSaveDialog(false);
});
saveCancelBtn.addEventListener("click", () => {
  let name = id("recording-name");
  name.value = "";
  name.classList.remove("border-red-700");
  name.classList.remove("bg-red-50");
  toggleSaveDialog(false);
});

saveBtn.addEventListener("click", () => {
  toggleSaveDialog(true);
})

playStopBtn.addEventListener("click", () => {
  if (playStopBtn.dataset.action === "play") {
    playRecording();
  }
  else {
    stopPlayingRecording();
  }
});
id("fab").addEventListener("click", startNewRecording);


function paintRecordings() {
  recordingsContainer.innerHTML = "";
  let dcopy = [...Database.recordings];
  dcopy.reverse()
  if (dcopy.length == 0) {
    recordingsContainer.innerHTML = `
    <div class="absolute left-0 top-0 w-full h-full mt-28 flex items-center justify-center">
      <p class="block text-gray-600 dark:text-gray-400 text-lg">No Recordings! Create One</p>
    </div>`;
  }
  dcopy.forEach((r, i) => {
    recordingsContainer.appendChild(rCard(r.name, r.data, i))
  });
}

paintRecordings();

function startNewRecording() {
  resetRecording();
  TBM.open("record");
  startRecording();
  tapAreaText.classList.remove("hidden");
}

function deleteRecording(el) {
  let name = el.closest(".vibr-card").dataset.name;
  Database.recordings = Database.recordings.filter(r => r.name !== name);
  syncDatabase();
  el.closest(".vibr-card").remove();
  if (Database.recordings.length == 0) {
    recordingsContainer.innerHTML = `
    <div class="absolute left-0 top-0 w-full h-full mt-28 flex items-center justify-center">
      <p class="block text-gray-500 dark:text-gray-600 text-lg">No Recordings! Create One</p>
    </div>`;
  }
}


function downloadRecording(el) {
  let parent = el.closest(".vibr-card");
  let pdata = JSON.parse(parent.dataset.data);
  let duration = 0;
  if (pdata.length == 0) { }
  else if (pdata.length == 1) { duration = pdata[0]; }
  else if (pdata.length == 2) { duration = pdata[0] + pdata[1]; }
  else { duration = pdata.reduce((a, b) => a + b) }
  VibRat.downloadFile(VibRat.create({
    data: pdata, metadata: {
      fileName: parent.dataset.name,
      duration,
    }
  }, true));
}

function playCardRecording(el) {
  let parent = el.closest(".vibr-card");
  let pdata = JSON.parse(parent.dataset.data);
  playRecording(pdata, parent.dataset.name);
}
window.deleteRecording = deleteRecording;
window.downloadRecording = downloadRecording;
window.playCardRecording = playCardRecording;

function rCard(name = "Untitled", data = [], index = 0) {
  let temp = `<div data-name="${name}" data-index="${index}" data-data="${JSON.stringify(data)}"
  class="vibr-card py-8 px-4 max-w-full flex items-center justify-between shadow-md rounded-md bg-slate-100 dark:bg-slate-800">
  <div class="vibr-card-play mr-3 flex items-center justify-start cursor-pointer" onclick="playCardRecording(this)">
    <svg xmlns="http://www.w3.org/2000/svg"
      class="h-8 w-8 shadow-sm border rounded-full border-gray-300 dark:border-gray-700 bg-opacity-70 fill-green-500"
      viewBox="0 0 20 20" fill="currentColor" id="track-play-icon">
      <path fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
        clip-rule="evenodd" />
    </svg>
  </div>
  <div class="vibr-card-details w-full flex justify-start title font-medium">
    <span>${name}</span>
  </div>
  <div class="vibr-card-actions ml-3 ">
    <div x-data="{ open: false }" x-init="open = false" @keydown.escape.stop="open = false;"
      class="relative inline-block text-left vibr-action-dropdown">
      <div class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full cursor-pointer"
        @click="open == false ? (open = true, closeAllDropdowns($event)) : open = false"
        @keydown.tab="open == false ? (open = true, closeAllDropdowns($event)) : open = false">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 fill-slate-800 dark:fill-slate-100"
          viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </div>

      <div x-show="open" x-transition:enter="transition ease-out duration-100"
        x-transition:enter-start="transform opacity-0 scale-95"
        x-transition:enter-end="transform opacity-100 scale-100"
        x-transition:leave="transition ease-in duration-75"
        x-transition:leave-start="transform opacity-100 scale-100"
        x-transition:leave-end="transform opacity-0 scale-95"
        class="z-10 origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-100 dark:bg-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none"
        x-ref="menu-items" x-description="Actions" role="menu" aria-orientation="vertical"
        aria-labelledby="menu-button" tabindex="-1" @keydown.tab="open = false"
        @keydown.enter.prevent="open = false;" @keyup.space.prevent="open = false;">
        <div role="none" class="py-1 text-sm text-gray-700 dark:text-slate-200">
          <div
            class="flex gap-2 justify-start items-center px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-600"
            role="menuitem" tabindex="-1" @click="open = false;" onclick="downloadRecording(this)">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <span>Download</span>
          </div>
          <div
            class="flex gap-2 justify-start items-center px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-600"
            role="menuitem" tabindex="-1" @click="open = false;" onclick="playCardRecording(this)">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            <span>Play</span>
          </div>
          <div
            class="flex gap-2 justify-start items-center px-4 py-2 hover:bg-slate-200 dark:hover:bg-slate-600"
            role="menuitem" tabindex="-1" @click="open = false;" onclick="deleteRecording(this)">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span>Delete</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
  let psHTML = new DOMParser().parseFromString(temp, "text/html");
  return psHTML.querySelector(".vibr-card");
}

function syncDatabase() {
  if (isLS) {
    localStorage.setItem("VibratDatabase", JSON.stringify(Database));
  }
}

function cancelRecording() {
  resetRecording();
  TBM.open("main");
}

function startRecording() {
  isRecording = true;
  isStopped = false;
  stopBtn.dataset.action = "stop";
  stopBtn.innerText = "Stop";
  stopBtn.disabled = false;
  saveBtn.disabled = true;
  playBtn.disabled = true;
  startTime = performance.now() || Date.now();
  timeLoop = setInterval(() => {
    let progress = id("seek-progress");
    // console.log(timeElapsed, recordingDuration, timeElapsed / recordingDuration * 100 + "%");
    progress.style.width = timeElapsed / recordingDuration * 100 + "%";
    timeElapsed += 10;
    if (timeElapsed > recordingDuration) {
      stopRecording();
    }
  }, 10);
}

function stopRecording() {
  clearInterval(timeLoop);
  isStopped = true
  console.log("Recording stopped.");
  console.log("Snapshots:", snapshots);
  let d = getData(snapshots);
  stopBtn.innerText = "Record";
  stopBtn.dataset.action = "record";
  saveBtn.disabled = false;
  playBtn.disabled = false;
  console.log("Data", d)
}

function resetRecording() {
  id("seek-progress").style.width = "0px";
  seekBar.querySelectorAll(".bar-timestamp").forEach(el => {
    el.remove();
  });
  data = [];
  snapshots = [];
  currentIndex = 0;
  timeElapsed = 0;
  startTime = 0;
  clearInterval(timeLoop);
  isRecording = false;
  isPsCursorVisible = false;
  isStopped = true;
}

function getData(snapshots) {
  let d = []
  for (let s in snapshots) {
    d.push(snapshots[s].duration);
    try {
      d.push(snapshots[parseInt(s) + 1].start - snapshots[parseInt(s)].end);
      console.log(parseInt(s), parseInt(s) + 1, "Interval:", snapshots[parseInt(s) + 1].start - snapshots[parseInt(s)].end);
    }
    catch (e) {
      d.push(startTime + 60000 - snapshots[parseInt(s)].end);
      console.log(parseFloat(startTime) + 60000, snapshots[parseInt(s)].end);
      console.log("Error:", e);
    }
  }
  return d;
}

function Tabs(tabs = [], selected = null) {
  this.tabs = tabs;
  this.current = selected;
  this.add = function (tab) {
    this.tabs.push(tab);
  }
  this.open = function (i) {
    try {
      id(this.current).classList.add("hidden");
    }
    catch { }
    this.current = i;
    try {
      id(this.current).classList.remove("hidden");
    }
    catch {
      throw new Error("Tab \"" + i + "\" does not exist.");
    }
  }
}

function toggleSaveDialog(bool = true, value = "Untitled") {
  // stopRecording();
  id("recording-name").value = value;
  saveDialog["_x_dataStack"][0].open = bool;
  return bool;
}

function Exists(name) {
  return Database.recordings.filter(r => r.name == name).length == 0;
}

function saveData(name) {
  console.log(getData(snapshots))
  let i = 1;
  let suffix = "";
  while (!Exists(name + suffix)) {
    suffix = ` (${i})`;
    i++;
  }
  name += suffix;
  Database.recordings.push({
    name,
    data: getData(snapshots)
  });
  syncDatabase();
  paintRecordings();
  resetRecording();
  TBM.open("main");
  console.log("data saved with name:", name)
}

function togglePlayerDialog(bool = true) {
  // stopRecording();
  console.log(playerDialog["_x_dataStack"])
  playerDialog["_x_dataStack"][0].open = bool;
  return bool;
}

function stopPlayingRecording() {
  navigator.vibrate(0);
  clearInterval(playInterval);
  togglePlayerDialog(false);
  // id("track-play-icon").classList.remove("hidden");
  // id("track-stop-icon").classList.add("hidden");
  id("vibr-seek-progress").style.width = "0px";
  playerSeekBar.querySelectorAll(".bar-timestamp").forEach(el => {
    el.remove();
  });
}

function playRecording(data, name = "Untitled") {
  togglePlayerDialog(true);
  navigator.vibrate(0);
  data.pop();
  let s = 0;
  let playDuration = data.reduce((a, b) => parseFloat(a) + parseFloat(b));
  let playTimeElapsed = 0;
  id("track-name").innerText = name;
  for (let x in data) {
    if (x % 2 === 0) {
      let ts = document.createElement("div");
      ts.className = "bar-timestamp top-0 absolute h-full bg-blue-800 dark:bg-blue-500 rounded-md opacity-70";
      console.log(playDuration)
      ts.style.left = s / playDuration * 100 + "%";
      ts.style.width = data[x] / playDuration * 100 + "%";
      playerSeekBar.appendChild(ts);
    }
    s += data[x];
  }
  navigator.vibrate(data);
  playInterval = setInterval(() => {
    let progress = id("vibr-seek-progress");
    progress.style.width = playTimeElapsed / playDuration * 100 + "%";
    playTimeElapsed += 10;
    if (playTimeElapsed > playDuration) {
      clearInterval(playInterval);
      stopPlayingRecording();
      togglePlayerDialog(false);
    }
  }, 10);
}

let d = [406
  , 1018.7000000476837
  , 625.8999998569489
  , 841.3000001907349
  , 495.89999985694885
  , 862
  , 348.60000014305115
  , 646.6999998092651
  , 2927.600000143051
  , 869.5999999046326
  , 1831.2000000476837
  , 2738
  , 1019.9000000953674
  , 930.3999998569489
  , 1503.2000000476837
  , 781
  , 1883.5999999046326
  , 756.3000001907349
  , 2103.0999999046326
  , 1063.4000000953674
  , 1146.6999998092651
  , 1362.5
  , 2771.5
  , 14632.600000143051
  , 734.2999999523163
  , 2571.4000000953674
  , 2371.2999999523163
  , 3041.2000000476837
  , 1623.2999999523163
  , 2105
  , 999.7000000476837
  , 2123.199999809265]
// playRecording(d)


let loadTime = performance.now() - window.__LOAD_START;
window.__LAOD_TIME = loadTime;
if (loadTime > 2000) {
  window.__IS_LOADED = true;
  TBM.open("main");
}
else {
  setTimeout(() => {
    window.__IS_LOADED = true;
    TBM.open("main");
  }, 2000 - loadTime);
}