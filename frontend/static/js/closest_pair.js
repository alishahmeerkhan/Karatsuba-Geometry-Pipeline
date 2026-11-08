const canvas = document.querySelector('canvas');
canvas.width = innerWidth - 20;
canvas.height = innerHeight - 130;

class ClosestPair {
    constructor() {
        this.context = canvas.getContext('2d');
        this.dataset = null; 
        this.snapshots = null;
        this.pointLookup = {};
        this.isAnimating = false;
        
        this.minX = 0; this.maxX = 1;
        this.minY = 0; this.maxY = 1;
        this.padding = 50;
    }

    async uploadAndFetchData() {
        if (this.isAnimating) {
            console.warn("Stop the current animation before uploading a new file.");
            return;
        }
        this.dataset = null;
        this.snapshots = null;
        this.context.clearRect(0, 0, canvas.width, canvas.height);

        const fileInput = document.getElementById('dataset-upload');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a dataset file first.');
            return;
        }

        const formData = new FormData();
        formData.append('dataset', file);

        try {
            const response = await fetch('/api/closest-pair', {
                method: 'POST',
                body: formData 
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.dataset = data.parsed_points;
                this.snapshots = data.snapshots; 
                this.setupScaling();
                this.drawInitialState();
                console.log("Data loaded. Ready to animate.");
            } else {
                console.error("API Error:", data.error);
            }
        } catch (error) {
            console.error("Fetch failed:", error);
        }
    }

    setupScaling() {
        let xs = this.dataset.map(p => p[1][0]);
        let ys = this.dataset.map(p => p[1][1]);
        
        this.minX = Math.min(...xs);
        this.maxX = Math.max(...xs);
        this.minY = Math.min(...ys);
        this.maxY = Math.max(...ys);

        if (this.maxX === this.minX) this.maxX += 1;
        if (this.maxY === this.minY) this.maxY += 1;

        this.pointLookup = {};
        for (const point of this.dataset) {
            this.pointLookup[point[0]] = { x: point[1][0], y: point[1][1] };
        }
    }

    mapX(raw_x) {
        return this.padding + ((raw_x - this.minX) / (this.maxX - this.minX)) * (canvas.width - 2 * this.padding);
    }

    mapY(raw_y) {
        return canvas.height - this.padding - ((raw_y - this.minY) / (this.maxY - this.minY)) * (canvas.height - 2 * this.padding);
    }

    drawInitialState() {
        this.context.clearRect(0, 0, canvas.width, canvas.height);
        for (const point of this.dataset) {
            this.drawPoint(point[0], '#32383c');
        }
    }

    drawPoint(label, color) {
        const pt = this.pointLookup[label];
        if (!pt) return;
        
        const scaledX = this.mapX(pt.x);
        const scaledY = this.mapY(pt.y);

        this.context.beginPath();
        this.context.arc(scaledX, scaledY, 5, 0, 2 * Math.PI);
        this.context.fillStyle = color;
        this.context.fill();

        this.context.font = '12px "JetBrains Mono", monospace';
        this.context.fillStyle = '#32383c';
        this.context.fillText(label, scaledX + 8, scaledY - 8);
    }

    drawVerticalLine(raw_x) {
        const scaledX = this.mapX(raw_x);
        this.context.beginPath();
        this.context.moveTo(scaledX, 0);
        this.context.lineTo(scaledX, canvas.height);
        this.context.strokeStyle = '#f24500';
        this.context.lineWidth = 2;
        this.context.setLineDash([5, 5]);
        this.context.stroke();
        this.context.setLineDash([]); 
    }

    drawConnection(label1, label2, color) {
        const pt1 = this.pointLookup[label1];
        const pt2 = this.pointLookup[label2];
        if (!pt1 || !pt2) return;

        this.context.beginPath();
        this.context.moveTo(this.mapX(pt1.x), this.mapY(pt1.y));
        this.context.lineTo(this.mapX(pt2.x), this.mapY(pt2.y));
        this.context.strokeStyle = color;
        this.context.lineWidth = 2;
        this.context.stroke();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async animate() {
        if (!this.snapshots || this.isAnimating) return;
        this.isAnimating = true;

        for (const frame of this.snapshots) {
            this.drawInitialState();

            this.context.font = '16px "Inter", sans-serif';
            this.context.fillStyle = '#32383c';
            this.context.fillText(`Action: ${frame.description}`, 20, 30);

            if (frame.step_type === 'divide') {
                this.drawVerticalLine(frame.mid_line);
            } 
            else if (frame.step_type === 'base_case' && frame.active_points) {
                frame.active_points.forEach(lbl => this.drawPoint(lbl, '#f24500'));
                if (frame.active_points.length === 2) {
                    this.drawConnection(frame.active_points[0], frame.active_points[1], '#f24500');
                }
            } 
            else if (frame.step_type === 'combine') {
                this.drawVerticalLine(frame.mid_line);
                if (frame.strip_points) {
                    frame.strip_points.forEach(lbl => this.drawPoint(lbl, '#007bff')); 
                }
            } 
            else if (frame.step_type === 'combine_update' && frame.active_points) {
                frame.active_points.forEach(lbl => this.drawPoint(lbl, '#28a745'));
                this.drawConnection(frame.active_points[0], frame.active_points[1], '#28a745');
            }

            await this.sleep(1000);
        }

        const final_min = this.snapshots[this.snapshots.length - 1].current_min;
        if (final_min && final_min[1]) {
            this.drawInitialState();
            this.context.font = 'bold 18px "Inter", sans-serif';
            this.context.fillText(`Final Result: ${final_min[1]} & ${final_min[2]} (Distance: ${final_min[0].toFixed(2)})`, 20, 30);
            
            this.drawPoint(final_min[1], '#f24500');
            this.drawPoint(final_min[2], '#f24500');
            this.drawConnection(final_min[1], final_min[2], '#f24500');
        }

        this.isAnimating = false;
    }
}

const visualizer = new ClosestPair();

document.getElementById('dataset-upload').addEventListener('change', () => {
    visualizer.uploadAndFetchData();
});

document.getElementById('start-animation-btn').addEventListener('click', () => {
    visualizer.animate();
});