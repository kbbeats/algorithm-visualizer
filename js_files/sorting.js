const API_URL = "http://127.0.0.1:8000";
const container = document.getElementById("arrayContainer");

// Controls
const btnSort = document.getElementById("btnSort");
const btnStop = document.getElementById("btnStop");
const btnReset = document.getElementById("btnReset");
const btnRandomize = document.getElementById("btnRandomize");
const sizeSlider = document.getElementById("sortSize");
const speedSlider = document.getElementById("sortSpeed");
const algoSelect = document.getElementById("sortAlgo");

// State
let array = [];
let originalArray = [];
let isSorting = false;

// 1. Generate & Render
function generateArray() {
    if (isSorting) return;
    const size = parseInt(sizeSlider.value);
    array = Array.from({ length: size }, () => Math.floor(Math.random() * 300) + 20);
    originalArray = [...array];
    renderArray();
    resetStats();
}

function renderArray() {
    container.innerHTML = "";
    array.forEach(val => {
        const bar = document.createElement("div");
        bar.style.height = `${val}px`;
        bar.className = "bar";
        container.appendChild(bar);
    });
}

function resetStats() {
    document.getElementById("statSteps").innerText = "0";
    document.getElementById("statComps").innerText = "0";
    document.getElementById("statSwaps").innerText = "0";
}

// 2. Control Logic
async function runSort() {
    if (isSorting) return;
    isSorting = true;
    updateUIState(true);

    try {
        const res = await fetch(`${API_URL}/sort/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ algorithm: algoSelect.value, array: array })
        });
        const data = await res.json();
        await animate(data.steps);
    } catch (e) {
        console.error(e);
        isSorting = false;
        updateUIState(false);
    }
}

function stopSort() {
    isSorting = false;
    updateUIState(false);
}

function resetArray() {
    stopSort();
    array = [...originalArray];
    renderArray();
    resetStats();
}

// 3. Animation Loop
function animate(steps) {
    return new Promise((resolve) => {
        let i = 0;
        const bars = document.getElementsByClassName("bar");
        
        function nextStep() {
            if (!isSorting) { resolve(); return; }
            
            if (i >= steps.length) {
                isSorting = false;
                updateUIState(false);
                for(let b of bars) b.classList.add("sorted");
                resolve();
                return;
            }

            const step = steps[i];
            const delay = 101 - parseInt(speedSlider.value);

            // Clean previous
            for(let b of bars) b.classList.remove("compare", "swap", "overwrite");

            // Apply step
            if (step.type === "compare") {
                if(bars[step.i]) bars[step.i].classList.add("compare");
                if(bars[step.j]) bars[step.j].classList.add("compare");
                document.getElementById("statComps").innerText++;
            } 
            else if (step.type === "swap") {
                if(bars[step.i] && bars[step.j]) {
                    bars[step.i].classList.add("swap");
                    bars[step.j].classList.add("swap");
                    // Swap heights
                    let temp = bars[step.i].style.height;
                    bars[step.i].style.height = bars[step.j].style.height;
                    bars[step.j].style.height = temp;
                }
                document.getElementById("statSwaps").innerText++;
            }
            else if (step.type === "overwrite") {
                if(bars[step.index]) {
                    bars[step.index].classList.add("overwrite");
                    bars[step.index].style.height = `${step.value}px`;
                }
                document.getElementById("statSwaps").innerText++;
            }

            document.getElementById("statSteps").innerText = i + 1;
            i++;
            setTimeout(nextStep, delay * 5);
        }
        nextStep();
    });
}

function updateUIState(running) {
    btnSort.disabled = running;
    btnRandomize.disabled = running;
    sizeSlider.disabled = running;
    algoSelect.disabled = running;
    btnStop.disabled = !running;
}

// Listeners
btnRandomize.addEventListener("click", generateArray);
btnSort.addEventListener("click", runSort);
btnStop.addEventListener("click", stopSort);
btnReset.addEventListener("click", resetArray);
sizeSlider.addEventListener("input", generateArray);

// Init
generateArray();