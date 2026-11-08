const canvas = document.querySelector('canvas');
canvas.width = innerWidth - 20;

class KaratsubaVisualizer {
    constructor() {
        this.context = canvas.getContext('2d');

        this.snapshots = null;
        this.isAnimating = false;

        this.nodes = [];
        this.root = null;
        this.NODE_WIDTH = 260;
        this.NODE_HEIGHT = 110;
        this.X_SPACING = 30;
        this.Y_SPACING = 190;

        this.scale = 1;
        this.MIN_SCALE = 0.3;
        this.offsetX = 0;
        this.offsetY = 110; // room for the two header lines
        // false = tree grows as nodes divide (children appear when parent splits)
        // true  = whole tree skeleton visible from the start
        this.SHOW_FULL_TREE = false;
    }

    async uploadAndFetchData() {
        if (this.isAnimating) return;

        this.snapshots = null;
        this.nodes = [];
        this.root = null;
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
                this.renderFrame(-1);
            } else {
                console.error("API Error:", data.error);
            }
        } catch (error) {
            console.error("Fetch failed:", error);
        }
    }

    // ---------- Tree construction ----------

    buildTreeDataStructure() {
        this.nodes = [];
        this.root = null;
        const stack = [];
        let idCounter = 0;

        for (let i = 0; i < this.snapshots.length; i++) {
            const frame = this.snapshots[i];

            if (frame.step_type === 'split' || frame.step_type === 'base_case') {
                const node = {
                    id: idCounter++,
                    depth: frame.depth,
                    operands: frame.operands,
                    children: [],
                    createIdx: i,
                    combineIdx: frame.step_type === 'base_case' ? i : Infinity,
                    result: frame.step_type === 'base_case' ? frame.result : null,
                    isBase: frame.step_type === 'base_case',
                    split: null,
                    role: null,
                    width: 0, x: 0, y: 0
                };

                this.nodes.push(node);
                frame.nodeRef = node;

                if (stack.length > 0) {
                    const parent = stack[stack.length - 1];
                    parent.children.push(node);
                    node.parent = parent;
                } else {
                    this.root = node;
                }

                if (frame.step_type === 'split') stack.push(node);
            } else if (frame.step_type === 'combine') {
                const node = stack.pop();
                node.combineIdx = i;
                node.result = frame.result;
                frame.nodeRef = node;
            }
        }

        // Work out HOW each node divides (a, b, c, d, m) and which child is which
        for (const n of this.nodes) {
            if (!n.isBase) this.computeSplit(n);
        }

        this.calculateTreeLayout();
    }

    // Figures out the split point by matching the children's operands.
    // x = a*10^m + b,  y = c*10^m + d
    // children: a×c (z2),  b×d (z0),  (a+b)×(c+d) (z1)
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

        // Tag each child with its role (z2 / z0 / z1)
        const used = new Set();
        for (const role of ['z2', 'z0', 'z1']) {
            const child = node.children.find(ch =>
                !used.has(ch.id) && `${ch.operands[0]}|${ch.operands[1]}` === best.keys[role]);
            if (child) { child.role = role; used.add(child.id); }
        }
        // Fallback: if matching failed, assume the order z2, z0, z1
        node.children.forEach((ch, i) => { if (!ch.role) ch.role = ['z2', 'z0', 'z1'][i]; });
    }

    // ---------- Layout ----------

    calculateTreeLayout() {
        const calcWidth = (n) => {
            if (n.children.length === 0) {
                n.width = this.NODE_WIDTH + this.X_SPACING;
            } else {
                n.width = 0;
                n.children.forEach(c => { calcWidth(c); n.width += c.width; });
            }
        };
        calcWidth(this.root);

        let maxDepth = 0;
        const assignPositions = (n, startX) => {
            if (n.depth > maxDepth) maxDepth = n.depth;
            n.y = (this.NODE_HEIGHT / 2) + (n.depth * this.Y_SPACING);
            n.x = startX + (n.width / 2);
            let currentX = startX;
            n.children.forEach(c => { assignPositions(c, currentX); currentX += c.width; });
        };
        assignPositions(this.root, 0);

        const available = innerWidth - 20;
        const treeWidth = this.root.width;
        this.scale = Math.max(this.MIN_SCALE, Math.min(1, available / treeWidth));

        const scaledWidth = treeWidth * this.scale;
        canvas.width = Math.max(available, scaledWidth);
        this.offsetX = (canvas.width - scaledWidth) / 2;

        const treeHeight = (maxDepth * this.Y_SPACING + this.NODE_HEIGHT + 20) * this.scale;
        canvas.height = Math.max(innerHeight - 130, this.offsetY + treeHeight);
    }

    // ---------- Drawing helpers ----------

    drawText(text, x, y, font, color, align = 'center') {
        this.context.font = font;
        this.context.fillStyle = color;
        this.context.textAlign = align;
        this.context.fillText(text, x, y);
    }

    // Shorten only very long numbers, keeping both ends visible
    fmt(v, max = 16) {
        const s = String(v);
        if (s.length <= max) return s;
        const keep = Math.floor((max - 1) / 2);
        return s.slice(0, keep) + '…' + s.slice(-keep);
    }

    drawEdge(px, py, cx, cy, color, label) {
        const ctx = this.context;
        const sx = px, sy = py + this.NODE_HEIGHT / 2;
        const ex = cx, ey = cy - this.NODE_HEIGHT / 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (label) {
            const mx = (sx + ex) / 2, my = (sy + ey) / 2;
            ctx.font = 'bold 12px "JetBrains Mono", monospace';
            const w = ctx.measureText(label).width + 12;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(mx - w / 2, my - 10, w, 20);
            this.drawText(label, mx, my + 4, 'bold 12px "JetBrains Mono", monospace', color === '#e2e8f0' ? '#94a3b8' : '#475569');
        }
    }

    drawRoundedRect(x, y, w, h, r, borderColor, fillColor) {
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
        c.fillStyle = fillColor;
        c.fill();
        c.strokeStyle = borderColor;
        c.lineWidth = 2;
        c.stroke();
    }

    edgeLabel(child) {
        const s = child.parent && child.parent.split;
        if (!s) return '';
        if (child.role === 'z2') return 'a×c';
        if (child.role === 'z0') return 'b×d';
        if (child.role === 'z1') return '(a+b)×(c+d)';
        return '';
    }

    // Merge formula shown in the header when a node combines
    mergeFormula(node) {
        const s = node.split;
        if (!s) return '';
        try {
            const get = (role) => {
                const ch = node.children.find(c => c.role === role);
                return BigInt(String(ch.result));
            };
            const z2 = get('z2'), z0 = get('z0'), z1 = get('z1');
            const mid = z1 - z2 - z0;
            return `z2=${z2}  z0=${z0}  z1=${z1}  →  z1−z2−z0 = ${mid}   |   ` +
                   `${z2}·10^${2 * s.m} + ${mid}·10^${s.m} + ${z0} = ${node.result}`;
        } catch (e) { return ''; }
    }

    // ---------- Rendering ----------

    renderFrame(frameIdx) {
        const ctx = this.context;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const frame = frameIdx >= 0 ? this.snapshots[frameIdx] : null;

        // ----- Header (phase + description + formula) -----
        let phase = '', phaseColor = '#32383c';
        if (frame) {
            if (frame.step_type === 'split')     { phase = 'DIVIDE';     phaseColor = '#3b82f6'; }
            if (frame.step_type === 'base_case') { phase = 'BASE CASE';  phaseColor = '#f24500'; }
            if (frame.step_type === 'combine')   { phase = 'MERGE';      phaseColor = '#28a745'; }
        }
        if (frame) {
            this.drawText(phase, 20, 36, 'bold 16px "Inter", sans-serif', phaseColor, 'left');
            this.drawText(frame.description || '', 120, 36, '16px "Inter", sans-serif', '#32383c', 'left');
            if (frame.step_type === 'combine' && frame.nodeRef) {
                this.drawText(this.mergeFormula(frame.nodeRef), 20, 66, '13px "JetBrains Mono", monospace', '#28a745', 'left');
            } else if (frame.step_type === 'split' && frame.nodeRef && frame.nodeRef.split) {
                const s = frame.nodeRef.split;
                this.drawText(
                    `Split at 10^${s.m}:  a=${s.a}, b=${s.b}  |  c=${s.c}, d=${s.d}   →   a×c,  b×d,  (a+b)×(c+d)`,
                    20, 66, '13px "JetBrains Mono", monospace', '#3b82f6', 'left');
            }
        } else {
            this.drawText('Tree compiled. Press start to animate.', 20, 40, '18px "Inter", sans-serif', '#32383c', 'left');
        }

        ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

        // ----- Edges -----
        for (const node of this.nodes) {
            if (!node.parent) continue;
            const visible = this.SHOW_FULL_TREE || node.parent.createIdx <= frameIdx;
            if (!visible) continue;
            const color = (node.createIdx <= frameIdx) ? '#94a3b8' : '#e2e8f0';
            const showLabel = node.parent.createIdx <= frameIdx; // label once the parent has split
            this.drawEdge(node.parent.x, node.parent.y, node.x, node.y, color,
                          showLabel ? this.edgeLabel(node) : '');
        }

        // ----- Nodes -----
        for (const node of this.nodes) {
            const isVisible = this.SHOW_FULL_TREE || !node.parent || node.parent.createIdx <= frameIdx;
            if (!isVisible) continue;

            const isPending = node.createIdx > frameIdx;
            const isCombined = node.combineIdx <= frameIdx;
            const isActive = frame && frame.nodeRef === node;
            const hasSplit = !node.isBase && node.split && node.createIdx <= frameIdx;

            let border, fill, text, res;
            if (isActive)        { border = '#f24500'; fill = '#fff5f0'; text = '#f24500'; res = '#f24500'; }
            else if (isCombined) { border = '#28a745'; fill = '#f6fdf8'; text = '#555';    res = '#28a745'; }
            else if (isPending)  { border = '#cbd5e1'; fill = '#f8fafc'; text = '#94a3b8'; res = '#94a3b8'; }
            else                 { border = '#3b82f6'; fill = '#eff6ff'; text = '#3b82f6'; res = '#3b82f6'; }

            this.drawRoundedRect(node.x, node.y, this.NODE_WIDTH, this.NODE_HEIGHT, 10, border, fill);

            const x = node.x, y = node.y;
            const opStr = `${this.fmt(node.operands[0])} × ${this.fmt(node.operands[1])}`;
            const mono = (sz, b = false) => `${b ? 'bold ' : ''}${sz}px "JetBrains Mono", monospace`;

            if (hasSplit) {
                const s = node.split;
                this.drawText(opStr, x, y - 33, mono(14, true), text);
                this.drawText(`a=${this.fmt(s.a, 8)}  b=${this.fmt(s.b, 8)}`, x, y - 10, mono(12), text);
                this.drawText(`c=${this.fmt(s.c, 8)}  d=${this.fmt(s.d, 8)}`, x, y + 8, mono(12), text);
                if (isCombined) {
                    this.drawText(`= ${this.fmt(node.result, 20)}`, x, y + 35, mono(14, true), res);
                } else {
                    this.drawText(`split at 10^${s.m}`, x, y + 35, mono(11), text);
                }
            } else if (isCombined) {
                this.drawText(opStr, x, y - 8, mono(12), text);
                this.drawText(`= ${this.fmt(node.result, 20)}`, x, y + 16, mono(14, true), res);
            } else {
                this.drawText(opStr, x, y + 5, mono(14, true), text);
            }
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // ---------- Animation ----------

    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    async animate() {
        if (!this.snapshots || this.isAnimating) return;
        this.isAnimating = true;

        for (let i = 0; i < this.snapshots.length; i++) {
            this.renderFrame(i);
            await this.sleep(1200);
        }

        this.isAnimating = false;
    }
}

const visualizer = new KaratsubaVisualizer();

document.getElementById('dataset-upload').addEventListener('change', () => {
    visualizer.uploadAndFetchData();
});

document.getElementById('start-animation-btn').addEventListener('click', () => {
    visualizer.animate();
});

window.addEventListener('resize', () => {
    if (visualizer.root && !visualizer.isAnimating) {
        visualizer.calculateTreeLayout();
        visualizer.renderFrame(-1);
    }
});