from algorithms.karatsuba import Karatsuba
from algorithms.closest_pair import ClosestPair
from flask import Flask, request, jsonify, render_template

app = Flask(
    __name__,
    template_folder='../frontend/templates',
    static_folder='../frontend/static'
)

@app.route('/')
def home():
    return render_template('home_page.html')

@app.route('/closest-pair')
def closest_pair_page():
    return render_template('closest_pair.html')

@app.route('/karatsuba')
def karatsuba_page():
    return render_template('karatsuba.html')

@app.route('/api/closest-pair', methods=['POST'])
def run_closest_pair():
    if 'dataset' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['dataset']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        points = []
        lines = file.read().decode('utf-8').splitlines()
        
        for i, line in enumerate(lines):
            if not line.strip(): 
                continue
            parts = line.split()
            x, y = float(parts[0]), float(parts[1])
            points.append((f"P{i+1}", (x, y)))

        cp = ClosestPair(points, is2D=True)
        result = cp.closest_pair_2D()

        return jsonify({
            'status': 'success',
            'parsed_points': points,
            'result': "Path to snapshots for future"
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/karatsuba', methods=['POST'])
def run_karatsuba():
    # 1. Check if a file was uploaded
    if 'dataset' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['dataset']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        lines = file.read().decode('utf-8').splitlines()
        lines = [line.strip() for line in lines if line.strip()]
        
        if len(lines) < 2:
            return jsonify({'error': 'File must contain at least two integers'}), 400
            
        num1 = int(lines[0])
        num2 = int(lines[1])

        k = Karatsuba(num1, num2)
        result = k.karatsuba()

        return jsonify({
            'status': 'success',
            'num1': num1,
            'num2': num2,
            'result': "Path to snapshots for future"
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)