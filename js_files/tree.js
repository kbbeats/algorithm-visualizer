const API_TREE = "http://127.0.0.1:8000";

const svg = document.getElementById("treeSvg");
const resultEl = document.getElementById("treeResult");
const buildMsg = document.getElementById("treeBuildMsg");

const valuesText = document.getElementById("treeValues");
const btnBuildTree = document.getElementById("btnBuildTree");

const algoSel = document.getElementById("treeAlgo");
const runBtn = document.getElementById("runTree");

let modelNodes = [];
let rootId = null;
let positions = {};
let activeTimer = null;

// ---------- helpers ----------
function parseLevelOrderInput(str) {
  // supports: "1,2,3,null,4"
  // returns array of numbers or nulls
  const parts = str.split(",").map(s => s.trim()).filter(s => s.length > 0);
  if (parts.length === 0) return [];

  const out = [];
  for (const p of parts) {
    if (p.toLowerCase() === "null") out.push(null);
    else {
      const n = Number(p);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        throw new Error(`Invalid value: "${p}" (use integers or null)`);
      }
      out.push(n);
    }
  }
  return out;
}

function getNode(id) {
  return modelNodes.find(n => n.id === id);
}

function safeChild(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && v < 0) return null;
  return v;
}

// ---------- layout + render ----------
function computeLayout(root) {
  positions = {};
  let xCounter = 0;

  function traverse(id, depth) {
    const node = getNode(id);
    if (!node) return;

    const L = safeChild(node.left);
    const R = safeChild(node.right);

    if (L !== null) traverse(L, depth + 1);

    positions[id] = { x: xCounter * 90 + 70, y: depth * 95 + 70 };
    xCounter++;

    if (R !== null) traverse(R, depth + 1);
  }

  traverse(root, 0);
}

function drawLine(p1, p2) {
  if (!p1 || !p2) return;
  const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
  l.setAttribute("x1", p1.x);
  l.setAttribute("y1", p1.y);
  l.setAttribute("x2", p2.x);
  l.setAttribute("y2", p2.y);
  svg.insertBefore(l, svg.firstChild);
}

function renderTree() {
  svg.innerHTML = "";

  // edges
  modelNodes.forEach(node => {
    const p1 = positions[node.id];
    if (!p1) return;

    const L = safeChild(node.left);
    const R = safeChild(node.right);

    if (L !== null) drawLine(p1, positions[L]);
    if (R !== null) drawLine(p1, positions[R]);
  });

  // nodes
  modelNodes.forEach(node => {
    const p = positions[node.id];
    if (!p) return;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", `node-${node.id}`);

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", 22);

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", p.x);
    t.setAttribute("y", p.y + 5);
    t.setAttribute("text-anchor", "middle");
    t.textContent = node.value;

    g.appendChild(c);
    g.appendChild(t);
    svg.appendChild(g);
  });
}

// ---------- animation ----------
function clearActive() {
  document.querySelectorAll("circle").forEach(c => c.classList.remove("active"));
  if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
}

function animateVisit(orderIds, ms = 500) {
  clearActive();
  let i = 0;

  function step() {
    if (i >= orderIds.length) return;
    const id = orderIds[i];
    const el = document.getElementById(`node-${id}`);
    if (el) el.querySelector("circle").classList.add("active");
    i++;
    activeTimer = setTimeout(step, ms);
  }
  step();
}

// ---------- build tree ----------
btnBuildTree.addEventListener("click", async () => {
  try {
    buildMsg.textContent = "Tree: building...";
    resultEl.textContent = "Result: -";
    clearActive();

    const list = parseLevelOrderInput(valuesText.value);
    if (list.length === 0) {
      buildMsg.textContent = "Tree: enter values first";
      modelNodes = [];
      rootId = null;
      svg.innerHTML = "";
      return;
    }

    const res = await fetch(`${API_TREE}/tree/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: list })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${txt}`);
    }

    const out = await res.json();
    modelNodes = out.nodes;
    rootId = out.root_id;

    computeLayout(rootId);
    renderTree();

    buildMsg.textContent = `Tree: built (${modelNodes.length} nodes)`;
  } catch (e) {
    console.error(e);
    buildMsg.textContent = `Tree: error (${e.message})`;
  }
});

// ---------- run traversal ----------
runBtn.addEventListener("click", async () => {
  try {
    if (rootId === null) {
      alert("Build the tree first.");
      return;
    }

    runBtn.disabled = true;
    resultEl.textContent = "Result: running...";

    const res = await fetch(`${API_TREE}/tree/traverse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ algorithm: algoSel.value })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${txt}`);
    }

    const out = await res.json();
    resultEl.textContent = `Visit order: ${out.visit_values.join(" → ")}`;
    animateVisit(out.visit_node_ids, 500);

  } catch (e) {
    console.error(e);
    resultEl.textContent = `Result: error (${e.message})`;
  } finally {
    runBtn.disabled = false;
  }
});
