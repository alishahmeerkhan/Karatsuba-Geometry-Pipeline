const canvas = document.querySelector('canvas');

class KaratsubaVisualizer {
    constructor() {
        this.context = canvas.getContext('2d');
        this.snapshots = null;
        this.isAnimating = false;

        this.nodes = [];
        this.root = null;
        this.steps = [];
        this.currentStep = null;

        // Node size in "tree space" (before scaling)
        this.MAX_NODE_WIDTH = 180;
        this.MAX_NODE_HEIGHT = 85;
        this.X_SPACING = 15;
        this.Y_SPACING = 120;

        this.HEADER_H = 80;
        this.STEP_MS = 1500;

        // Text legibility
        this.MIN_FONT = 12;       // text is NEVER drawn smaller than this (screen px)
        this.MIN_NODE_W = 110;    // smallest on-screen node that can hold 12px text
        this.MIN_NODE_H = 54;     // ...3 lines of 12px text

        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    async uploadAndFetchData() {
        if (this.isAnimating) return;

        this.snapshots = null;
        this.nodes = [];
        this.root = null;
        this.steps = [];
        this.currentStep = null;

        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, canvas.width, canvas.height);

        const file = document.getElementById('dataset-upload').files[0];
        if (!file) {
            alert('Please select a dataset file first.');
            return;
        }

        const formData = new FormData();
        formData.append('dataset', file);

        try {
            const response = await fetch('/api/karatsuba', { method: 'POST', body: formData });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (data.status === 'success') {
                this.snapshots = data.snapshots;
                this.buildTreeDataStructure();
                this.buildSteps();
                this.renderStep(this.steps[0]);
            } else {
                console.error('API Error:', data.error);
            }
        } catch (error) {
            console.error('Fetch failed:', error);
        }
    }

    // ---------- 1. Build the Tree ----------

    buildTreeDataStructure() {
        this.nodes = [];
        this.root = null;
        const stack = [];
        let id = 0;
        const sameOps = (a, b) => String(a[0]) === String(b[0]) && String(a[1]) === String(b[1]);

        for (const frame of this.snapshots) {
            if (frame.step_type === 'split' || frame.step_type === 'base_case') {
                const node = {
                    id: id++,
                    depth: 0,
                    operands: frame.operands,
                    children: [],
                    isBase: frame.step_type === 'base_case',
                    result: frame.step_type === 'base_case' ? frame.result : null,
                    split: null,
                    role: null,
                    treeWidth: 0,
                    x: 0, y: 0
                };
                this.nodes.push(node);

                if (stack.length > 0) {
                    const parent = stack[stack.length - 1];
                    parent.children.push(node);
                    node.parent = parent;
                } else if (!this.root) {
                    this.root = node;
                } else {
                    this.root.children.push(node);
                    node.parent = this.root;
                }

                if (frame.step_type === 'split') stack.push(node);
            } else if (frame.step_type === 'combine') {
                let idx = -1;
                if (frame.operands) {
                    for (let i = stack.length - 1; i >= 0; i--) {
                        if (sameOps(stack[i].operands, frame.operands)) { idx = i; break; }
                    }
                    if (idx === -1) continue;
                } else {
                    idx = stack.length - 1;
                }
                if (idx < 0) continue;
                const node = stack[idx];
                node.result = frame.result;
                stack.length = idx;
            }
        }

        const setDepth = (n, d) => { n.depth = d; n.children.forEach(c => setDepth(c, d + 1)); };
        if (this.root) setDepth(this.root, 0);

        for (const n of this.nodes) {
            if (!n.isBase) this.computeSplit(n);
        }

        this.calculateTreeLayout();
    }

    computeSplit(node) {
        let x, y;
        try {
            x = BigInt(String(node.operands[0]));
            y = BigInt(String(node.operands[1]));
        } catch (e) { return; }

        const n = Math.max(x.toString().length, y.toString().length);
        const candidates = [...new Set([Math.floor(n / 2), Math.ceil(n / 2)])].filter(m => m > 0);
        const childKeys = node.children.map(c => `${c.operands[0]}|${c.operands[1]}`);

        let best = null;
        for (const m of candidates) {
            const p = 10n ** BigInt(m);
            const a = x / p, b = x % p, c = y / p, d = y % p;
            const keys = { z2: `${a}|${c}`, z0: `${b}|${d}`, z1: `${a + b}|${c + d}` };
            const matches = Object.values(keys).filter(k => childKeys.includes(k)).length;
            if (!best || matches > best.matches) best = { m, a, b, c, d, keys, matches };
        }
        if (!best) return;

        node.split = { m: best.m, a: best.a, b: best.b, c: best.c, d: best.d };

        const used = new Set();
        for (const role of ['z2', 'z0', 'z1']) {
            const child = node.children.find(ch =>
                !used.has(ch.id) && `${ch.operands[0]}|${ch.operands[1]}` === best.keys[role]);
            if (child) { child.role = role; used.add(child.id); }
        }
        node.children.forEach((ch, i) => { if (!ch.role) ch.role = ['z2', 'z0', 'z1'][i]; });
    }

    // ---------- 2. Build the Animation Steps ----------

    buildSteps() {
        if (!this.root) { this.steps = []; return; }
        const maxD = Math.max(...this.nodes.map(n => n.depth));
        const steps = [];
        const r = this.root;

        steps.push({
            phase: 'START',
            text: `Multiply ${this.fmt(r.operands[0], 30)} × ${this.fmt(r.operands[1], 30)}`,
            visDepth: 0, baseDone: false, mergedFrom: Infinity, active: []
        });

        for (let d = 0; d < maxD; d++) {
            steps.push({
                phase: 'DIVIDE',
                text: `Level ${d}: split each number into high and low halves`,
                visDepth: d + 1, baseDone: false, mergedFrom: Infinity,
                active: this.nodes.filter(n => n.depth === d && !n.isBase)
            });
        }

        steps.push({
            phase: 'BASE CASE',
            text: 'Smallest numbers are multiplied directly',
            visDepth: maxD, baseDone: true, mergedFrom: Infinity,
            active: this.nodes.filter(n => n.isBase)
        });

        for (let d = maxD - 1; d >= 0; d--) {
            const active = this.nodes.filter(n => n.depth === d && !n.isBase);
            if (active.length === 0) continue;
            steps.push({
                phase: 'MERGE',
                text: `Level ${d}: combine the 3 results of each node`,
                visDepth: maxD, baseDone: true, mergedFrom: d,
                active
            });
        }
        this.steps = steps;
    }

    // ---------- 3. Layout ----------

    calculateTreeLayout() {
        if (!this.root) return;

        const setSubtreeWidths = (n) => {
            if (n.children.length === 0) {
                n.treeWidth = this.MAX_NODE_WIDTH + this.X_SPACING;
            } else {
                n.treeWidth = 0;
                n.children.forEach(c => {
                    setSubtreeWidths(c);
                    n.treeWidth += c.treeWidth;
                });
            }
        };
        setSubtreeWidths(this.root);

        const assignCoords = (n, startX) => {
            n.x = startX + (n.treeWidth / 2);
            n.y = (n.depth * this.Y_SPACING);

            let currentX = startX;
            n.children.forEach(c => {
                assignCoords(c, currentX);
                currentX += c.treeWidth;
            });
        };
        assignCoords(this.root, 0);

        let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.nodes.forEach(n => {
            minX = Math.min(minX, n.x - this.MAX_NODE_WIDTH / 2);
            maxX = Math.max(maxX, n.x + this.MAX_NODE_WIDTH / 2);
            maxY = Math.max(maxY, n.y + this.MAX_NODE_HEIGHT / 2);
        });

        const treePhysicalWidth = maxX - minX;
        const treePhysicalHeight = maxY;

        const availableW = innerWidth - 40;
        const availableH = (innerHeight - 130) - this.HEADER_H - 40;

        const scaleX = availableW / treePhysicalWidth;
        const scaleY = availableH / treePhysicalHeight;

        // Smallest scale at which a node can still hold 12px text (derived, not a magic number)
        const minScale = Math.max(
            this.MIN_NODE_W / this.MAX_NODE_WIDTH,
            this.MIN_NODE_H / this.MAX_NODE_HEIGHT
        );
        this.scale = Math.max(minScale, Math.min(scaleX, scaleY, 1));

        // If the tree doesn't fit at that scale, the canvas grows instead of the text shrinking
        canvas.width = Math.max(innerWidth - 20, (treePhysicalWidth * this.scale) + 60);
        canvas.height = Math.max(innerHeight - 130, (treePhysicalHeight * this.scale) + this.HEADER_H + 60);

        const scaledWidth = treePhysicalWidth * this.scale;
        this.offsetX = ((canvas.width - scaledWidth) / 2) - (minX * this.scale);
        this.offsetY = this.HEADER_H + 20;
    }

    // ---------- Drawing Helpers ----------

    drawText(text, x, y, font, color, align = 'center') {
        this.context.font = font;
        this.context.fillStyle = color;
        this.context.textAlign = align;
        this.context.fillText(text, x, y);
    }

    fmt(v, max = 16) {
        const s = String(v);
        if (s.length <= max) return s;
        const keep = Math.floor((max - 2) / 2);
        return s.slice(0, keep) + '..' + s.slice(-keep);
    }

    // Shorten a string to n characters with a middle ellipsis
    shorten(text, n) {
        if (text.length <= n) return text;
        const head = Math.ceil((n - 2) / 2);
        const tail = Math.floor((n - 2) / 2);
        return text.slice(0, head) + '..' + text.slice(text.length - tail);
    }

    // Draws text in SCREEN pixels (no canvas scaling applied).
    // Size = baseSize * scale, but never below MIN_FONT. If the text is still too wide
    // at the minimum size, the digits are abbreviated rather than the font shrunk.
    drawLine(text, x, y, baseSize, bold, color, maxW) {
        const ctx = this.context;
        const font = (sz) => `${bold ? 'bold ' : ''}${sz}px "JetBrains Mono", monospace`;

        let size = Math.max(this.MIN_FONT, baseSize * this.scale);
        ctx.font = font(size);
        while (size > this.MIN_FONT && ctx.measureText(text).width > maxW) {
            size = Math.max(this.MIN_FONT, size - 0.5);
            ctx.font = font(size);
        }

        let t = text;
        if (ctx.measureText(t).width > maxW) {
            for (let n = text.length - 1; n >= 5; n--) {
                t = this.shorten(text, n);
                if (ctx.measureText(t).width <= maxW) break;
            }
        }

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t, x, y);
        ctx.textBaseline = 'alphabetic';
    }

    drawEdgeLine(px, py, cx, cy, color) {
        const ctx = this.context;
        ctx.beginPath();
        ctx.moveTo(px, py + this.MAX_NODE_HEIGHT / 2);
        ctx.lineTo(cx, cy - this.MAX_NODE_HEIGHT / 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Edge label in screen pixels, at the midpoint of the edge
    drawEdgeLabel(parent, child, label) {
        if (!label) return;
        const ctx = this.context;
        const mx = ((parent.x + child.x) / 2) * this.scale + this.offsetX;
        const my = (((parent.y + this.MAX_NODE_HEIGHT / 2) + (child.y - this.MAX_NODE_HEIGHT / 2)) / 2) * this.scale + this.offsetY;

        const size = Math.max(this.MIN_FONT, 14 * this.scale);
        ctx.font = `bold ${size}px "JetBrains Mono", monospace`;
        const w = ctx.measureText(label).width + 8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx - w / 2, my - (size / 2 + 2), w, size + 4);
        this.drawLine(label, mx, my, 14, true, '#64748b', 9999);
    }

    drawRoundedRect(x, y, w, h, r, border, fill, isBold) {
        const c = this.context;
        c.beginPath();
        c.moveTo(x - w/2 + r, y - h/2);
        c.lineTo(x + w/2 - r, y - h/2);
        c.quadraticCurveTo(x + w/2, y - h/2, x + w/2, y - h/2 + r);
        c.lineTo(x + w/2, y + h/2 - r);
        c.quadraticCurveTo(x + w/2, y + h/2, x + w/2 - r, y + h/2);
        c.lineTo(x - w/2 + r, y + h/2);
        c.quadraticCurveTo(x - w/2, y + h/2, x - w/2, y + h/2 - r);
        c.lineTo(x - w/2, y - h/2 + r);
        c.quadraticCurveTo(x - w/2, y - h/2, x - w/2 + r, y - h/2);
        c.closePath();
        c.fillStyle = fill;
        c.fill();
        c.strokeStyle = border;
        c.lineWidth = isBold ? 4 : 2;
        c.stroke();
    }

    edgeLabel(child) {
        return { z2: 'a×c', z0: 'b×d', z1: '(a+b)×(c+d)' }[child.role] || '';
    }

    mergeFormula(node) {
        const s = node.split;
        if (!s) return '';
        try {
            const get = (role) => BigInt(String(node.children.find(c => c.role === role).result));
            const z2 = get('z2'), z0 = get('z0'), z1 = get('z1');
            return `${this.fmt(z2, 12)}·10^${2 * s.m} + (${this.fmt(z1, 12)} − ${this.fmt(z2, 12)} − ${this.fmt(z0, 12)})·10^${s.m} + ${this.fmt(z0, 12)} = ${this.fmt(node.result, 24)}`;
        } catch (e) { return ''; }
    }

    // ---------- 4. Rendering one step ----------

    renderStep(st) {
        if (!st) return;
        this.currentStep = st;
        const ctx = this.context;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Header (already screen-space, 16px / 13px)
        this.drawText(st.phase, 20, 36, 'bold 16px "Inter", sans-serif', '#32383c', 'left');
        ctx.font = 'bold 16px "Inter", sans-serif';
        const phaseW = ctx.measureText(st.phase).width;
        this.drawText(st.text, 20 + phaseW + 14, 36, '16px "Inter", sans-serif', '#32383c', 'left');

        if (st.phase === 'MERGE' && st.active.length) {
            this.drawText('z2·10^2m + (z1 − z2 − z0)·10^m + z0  →  ' + this.mergeFormula(st.active[0]),
                20, 66, '13px "JetBrains Mono", monospace', '#32383c', 'left');
        } else if (st.phase === 'DIVIDE' && st.active.length && st.active[0].split) {
            const s = st.active[0].split;
            this.drawText(`x = a·10^${s.m} + b,  y = c·10^${s.m} + d     →     a×c,  b×d,  (a+b)×(c+d)`,
                20, 66, '13px "JetBrains Mono", monospace', '#32383c', 'left');
        }

        const visibleNodes = this.nodes.filter(n => n.depth <= st.visDepth);

        // --- Pass A: shapes (edges + boxes) in scaled tree space ---
        ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

        for (const node of visibleNodes) {
            if (!node.parent) continue;
            this.drawEdgeLine(node.parent.x, node.parent.y, node.x, node.y, '#cbd5e1');
        }

        for (const node of visibleNodes) {
            const active = st.active.includes(node);
            const border = active ? '#f24500' : '#cbd5e1';
            const fill = active ? '#fff5f0' : '#ffffff';
            this.drawRoundedRect(node.x, node.y, this.MAX_NODE_WIDTH, this.MAX_NODE_HEIGHT, 6, border, fill, active);
        }

        // --- Pass B: all text in real screen pixels (never below MIN_FONT) ---
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        for (const node of visibleNodes) {
            if (node.parent) this.drawEdgeLabel(node.parent, node, this.edgeLabel(node));
        }

        const W = this.MAX_NODE_WIDTH * this.scale;
        const H = this.MAX_NODE_HEIGHT * this.scale;
        const maxW = W - 12;
        const textColor = '#32383c';

        for (const node of visibleNodes) {
            const divided = !node.isBase && node.depth < st.visDepth;
            const merged = !node.isBase && node.depth >= st.mergedFrom;
            const hasResult = node.isBase ? st.baseDone : merged;

            const x = node.x * this.scale + this.offsetX;
            const y = node.y * this.scale + this.offsetY;

            if (divided && node.split) {
                // 3 lines
                const LH = Math.min(22, (H - 8) / 3);
                const s = node.split;
                const lo = (v) => String(v).padStart(s.m, '0');
                this.drawLine(`${this.fmt(s.a, 8)} | ${this.fmt(lo(s.b), 8)}`, x, y - LH, 15, true, textColor, maxW);
                this.drawLine(`× ${this.fmt(s.c, 8)} | ${this.fmt(lo(s.d), 8)}`, x, y, 15, true, textColor, maxW);
                if (hasResult) {
                    this.drawLine(`= ${this.fmt(node.result, 18)}`, x, y + LH, 16, true, textColor, maxW);
                } else {
                    this.drawLine(`split at 10^${s.m}`, x, y + LH, 13, false, '#64748b', maxW);
                }
            } else {
                // 2 lines
                const LH = Math.min(26, (H - 8) / 2);
                if (hasResult) {
                    this.drawLine(`${this.fmt(node.operands[0])} × ${this.fmt(node.operands[1])}`, x, y - LH / 2, 14, false, textColor, maxW);
                    this.drawLine(`= ${this.fmt(node.result, 18)}`, x, y + LH / 2, 17, true, textColor, maxW);
                } else {
                    this.drawLine(`${this.fmt(node.operands[0], 16)}`, x, y - LH / 2, 16, true, textColor, maxW);
                    this.drawLine(`× ${this.fmt(node.operands[1], 16)}`, x, y + LH / 2, 16, true, textColor, maxW);
                }
            }
        }
    }

    // ---------- Animation ----------

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    async animate() {
        if (this.steps.length === 0 || this.isAnimating) return;
        this.isAnimating = true;

        for (const st of this.steps) {
            this.renderStep(st);
            await this.sleep(this.STEP_MS);
        }

        this.isAnimating = false;
    }
}

const visualizer = new KaratsubaVisualizer();
document.getElementById('dataset-upload').addEventListener('change', () => visualizer.uploadAndFetchData());
document.getElementById('start-animation-btn').addEventListener('click', () => visualizer.animate());
window.addEventListener('resize', () => {
    if (visualizer.root && !visualizer.isAnimating) {
        visualizer.calculateTreeLayout();
        visualizer.renderStep(visualizer.currentStep || visualizer.steps[0]);
    }
});