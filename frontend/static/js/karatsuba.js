const LINE_LENGTH = innerHeight - 150;

const canvas = document.querySelector('canvas');
canvas.width = innerWidth - 20;
canvas.height = innerHeight - 130;

class Karatsuba {
    constructor() {
        this.context = canvas.getContext('2d');
        this.dataset = null; 
        this.snapshots = null;
    }

    async uploadAndFetchData() {
        const fileInput = document.getElementById('dataset-upload');
        const file = fileInput.files[0];

        if (!file) {
            console.error('No file selected.');
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

            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log("API Response:", data);

            if (data.status === 'success') {
                this.dataset = data.parsed_points;
                this.snapshots = data.snapshots; 
                
                console.log("Data successfully loaded into memory. Ready to animate.");
            } else {
                console.error("API Error:", data.error);
            }

        } catch (error) {
            console.error("Fetch failed:", error);
        }
    }
}

const visualizer = new Karatsuba();

document.getElementById('dataset-upload').addEventListener('change', () => {
    visualizer.uploadAndFetchData();
});

document.getElementById('start-animation-btn').addEventListener('click', () => {
    // visualization logic here
    console.log("Animation started!"); 
});