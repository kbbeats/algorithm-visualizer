from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from collections import deque

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. SORTING ALGORITHMS (UNCHANGED)
# ==========================================

def bubble_sort_steps(arr):
    steps = []
    a = list(arr)
    n = len(a)
    for i in range(n):
        for j in range(0, n - i - 1):
            steps.append({"type": "compare", "i": j, "j": j + 1})
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                steps.append({"type": "swap", "i": j, "j": j + 1})
    return steps

def selection_sort_steps(arr):
    steps = []
    a = list(arr)
    n = len(a)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            steps.append({"type": "compare", "i": min_idx, "j": j})
            if a[j] < a[min_idx]:
                min_idx = j
        if min_idx != i:
            a[i], a[min_idx] = a[min_idx], a[i]
            steps.append({"type": "swap", "i": i, "j": min_idx})
    return steps

def insertion_sort_steps(arr):
    steps = []
    a = list(arr)
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        steps.append({"type": "compare", "i": i, "j": j})
        while j >= 0 and key < a[j]:
            steps.append({"type": "compare", "i": j + 1, "j": j})
            a[j + 1] = a[j]
            steps.append({"type": "overwrite", "index": j + 1, "value": a[j]})
            j -= 1
        a[j + 1] = key
        steps.append({"type": "overwrite", "index": j + 1, "value": key})
    return steps

def quick_sort_steps(arr):
    steps = []
    a = list(arr)

    def partition(low, high):
        pivot = a[high]
        i = low - 1
        for j in range(low, high):
            steps.append({"type": "compare", "i": j, "j": high})
            if a[j] < pivot:
                i += 1
                a[i], a[j] = a[j], a[i]
                steps.append({"type": "swap", "i": i, "j": j})
        a[i + 1], a[high] = a[high], a[i + 1]
        steps.append({"type": "swap", "i": i + 1, "j": high})
        return i + 1

    def quick_sort_recursive(low, high):
        if low < high:
            pi = partition(low, high)
            quick_sort_recursive(low, pi - 1)
            quick_sort_recursive(pi + 1, high)

    if len(a) > 0:
        quick_sort_recursive(0, len(a) - 1)

    return steps

def merge_sort_steps(arr):
    steps = []

    def merge_sort(a, start, end):
        if start >= end:
            return
        mid = (start + end) // 2
        merge_sort(a, start, mid)
        merge_sort(a, mid + 1, end)
        merge(a, start, mid, end)

    def merge(a, start, mid, end):
        temp = []
        i, j = start, mid + 1
        while i <= mid and j <= end:
            steps.append({"type": "compare", "i": i, "j": j})
            if a[i] <= a[j]:
                temp.append(a[i])
                i += 1
            else:
                temp.append(a[j])
                j += 1
        while i <= mid:
            temp.append(a[i])
            i += 1
        while j <= end:
            temp.append(a[j])
            j += 1

        for k in range(len(temp)):
            idx = start + k
            val = temp[k]
            a[idx] = val
            steps.append({"type": "overwrite", "index": idx, "value": val})

    a2 = list(arr)
    if len(a2) > 0:
        merge_sort(a2, 0, len(a2) - 1)

    return steps

class SortRequest(BaseModel):
    algorithm: str
    array: List[int]

@app.post("/sort/run")
def run_sort(req: SortRequest):
    algo = req.algorithm
    if algo == "bubble":
        steps = bubble_sort_steps(req.array)
    elif algo == "selection":
        steps = selection_sort_steps(req.array)
    elif algo == "insertion":
        steps = insertion_sort_steps(req.array)
    elif algo == "quick":
        steps = quick_sort_steps(req.array)
    elif algo == "merge":
        steps = merge_sort_steps(req.array)
    else:
        steps = []
    return {"steps": steps}

# ==========================================
# 2. BINARY TREE BUILD + TRAVERSAL (NEW)
# ==========================================

# We'll store the last built tree in memory (simple for your local project).
TREE_STATE: Dict[str, object] = {
    "root_id": None,
    "nodes": []
}

class BuildTreeRequest(BaseModel):
    values: List[Optional[int]]  # supports nulls

class TraverseRequest(BaseModel):
    algorithm: str  # dfs_in / dfs_pre / dfs_post / bfs

def build_binary_tree_level_order(values: List[Optional[int]]):
    # Build a normal binary tree using level-order array representation.
    # index i -> left child 2i+1, right child 2i+2 (skipping null nodes)
    if not values or values[0] is None:
        raise HTTPException(status_code=400, detail="First value (root) cannot be null.")

    nodes = []
    id_map = {}  # index -> node_id

    # create nodes for non-null values
    next_id = 0
    for idx, v in enumerate(values):
        if v is None:
            continue
        id_map[idx] = next_id
        nodes.append({"id": next_id, "value": int(v), "left": None, "right": None})
        next_id += 1

    # link children using array indices
    for idx, node_id in id_map.items():
        left_idx = 2 * idx + 1
        right_idx = 2 * idx + 2

        if left_idx in id_map:
            nodes[node_id]["left"] = id_map[left_idx]
        if right_idx in id_map:
            nodes[node_id]["right"] = id_map[right_idx]

    root_id = id_map[0]
    return root_id, nodes

def bfs(nodes, root_id):
    order = []
    q = deque([root_id])
    while q:
        nid = q.popleft()
        order.append(nid)
        node = nodes[nid]
        if node["left"] is not None:
            q.append(node["left"])
        if node["right"] is not None:
            q.append(node["right"])
    return order

def dfs_pre(nodes, nid, order):
    order.append(nid)
    node = nodes[nid]
    if node["left"] is not None:
        dfs_pre(nodes, node["left"], order)
    if node["right"] is not None:
        dfs_pre(nodes, node["right"], order)

def dfs_in(nodes, nid, order):
    node = nodes[nid]
    if node["left"] is not None:
        dfs_in(nodes, node["left"], order)
    order.append(nid)
    if node["right"] is not None:
        dfs_in(nodes, node["right"], order)

def dfs_post(nodes, nid, order):
    node = nodes[nid]
    if node["left"] is not None:
        dfs_post(nodes, node["left"], order)
    if node["right"] is not None:
        dfs_post(nodes, node["right"], order)
    order.append(nid)

@app.post("/tree/build")
def tree_build(req: BuildTreeRequest):
    root_id, nodes = build_binary_tree_level_order(req.values)
    TREE_STATE["root_id"] = root_id
    TREE_STATE["nodes"] = nodes
    return {"root_id": root_id, "nodes": nodes}

@app.post("/tree/traverse")
def tree_traverse(req: TraverseRequest):
    root_id = TREE_STATE["root_id"]
    nodes = TREE_STATE["nodes"]

    if root_id is None or not nodes:
        raise HTTPException(status_code=400, detail="Tree not built yet. Call /tree/build first.")

    algo = req.algorithm
    visit_node_ids: List[int] = []

    if algo == "bfs":
        visit_node_ids = bfs(nodes, root_id)
    elif algo == "dfs_pre":
        out: List[int] = []
        dfs_pre(nodes, root_id, out)
        visit_node_ids = out
    elif algo == "dfs_in":
        out: List[int] = []
        dfs_in(nodes, root_id, out)
        visit_node_ids = out
    elif algo == "dfs_post":
        out: List[int] = []
        dfs_post(nodes, root_id, out)
        visit_node_ids = out
    else:
        raise HTTPException(status_code=400, detail="Unknown algorithm.")

    visit_values = [nodes[nid]["value"] for nid in visit_node_ids]

    return {
        "visit_node_ids": visit_node_ids,
        "visit_values": visit_values
    }

@app.get("/")
def root():
    return {"status": "ok", "message": "AlgoViz backend running"}
