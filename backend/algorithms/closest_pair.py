from math import inf, sqrt

class ClosestPair:
    def __init__(self, points=[], is2D=False):
        self.points = points
        self.is2D = is2D
        self.snapshots = []

    def closest_pair_1D(self):
        self.points = sorted(self.points, key=lambda x: x[1])
        return self.solve_1D(self.points, 0, len(self.points) - 1)

    def solve_1D(self, points=[], low=0, high=0):
        if high == low:
            self.snapshots.append({
                'step_type': 'base_case',
                'bounds': [low, high],
                'description': f'Base case reached: Only 1 point ({points[low][0]}). No pair exists.',
                'current_min': (inf, None, None)
            })
            return (inf, None, None)
        
        if high - low == 1:
            d = abs(points[high][1] - points[low][1])
            current_min = (d, points[low][0], points[high][0])
            self.snapshots.append({
                'step_tyep': 'base_case',
                'bounds': [low, high],
                'active_points': [points[low][0], points[high][0]],
                'description': f'Base case reached: 2 points. Distance is {d}.',
                'current_min': current_min
            })
            return current_min

        mid = int(low + (high - low) / 2)
        
        mid_val = points[mid][1]
        self.snapshots.append({
            'step_type': 'divide',
            'bounds': [low, high],
            'mid_line': mid_val,
            'description': f'Dividing 1D array at mid value {mid_val}.'
        })

        d1 = self.solve_1D(points, low, mid)
        d2 = self.solve_1D(points, mid + 1, high)

        d3_dist = abs(points[mid + 1][1] - points[mid][1])
        d3 = (d3_dist, points[mid][0], points[mid + 1][0])

        best_min = min(d1, d2, d3, key=lambda x: x[0])
        self.snapshots.append({
            'step_type': 'combine',
            'bounds': [low, high],
            'active_points': [points[mid][0], points[mid + 1][0]],
            'description': f'Checking cross-boundary pair: {points[mid][0]} and {points[mid + 1][0]}.',
            'current_min': best_min
        })

        return best_min



    def closest_pair_2D(self):
        self.points = sorted(self.points, key=lambda x: x[1][0])
        return self.solve_2D(self.points, 0, len(self.points) - 1)

    def solve_2D(self, points=[], low=0, high=0):
        if high - low <= 2:
            base_min = self.brute_force(points, low, high)
            active = [p[0] for p in points[low : high + 1]]
            self.snapshots.append({
                'step_type': 'base_case',
                'bounds': [low, high],
                'active_points': active,
                'description': f'Base case (N <= 3). Brute force distance is {base_min[0]:.2f}.',
                'current_min': base_min
            })
            return base_min

        mid = int(low + (high - low) / 2)
        midPoint = points[mid]

        self.snapshots.append({
            'step_type': 'divide',
            'bounds': [low, high],
            'mid_line': midPoint[1][0],
            'description': f'Dividing 2D plane vertically at x = {midPoint[1][0]}.'
        })

        d1 = self.solve_2D(points, low, mid)
        d2 = self.solve_2D(points, mid + 1, high)
        d = min(d1, d2, key=lambda x: x[0])

        strip = []
        for i in range(low, high + 1):
            if abs(points[i][1][0] - midPoint[1][0]) < d[0]:
                strip.append(points[i])

        strip_labels = [p[0] for p in strip]
        self.snapshots.append({
            'step_type': 'combine',
            'bounds': [low, high],
            'mid_line': midPoint[1][0],
            'strip_points': strip_labels,
            'description': f'Created cross-boundary strip of width 2 * d ({2 * d[0]:.2f}). Found {len(strip)} points inside.',
            'current_min': d
        })

        strip = sorted(strip, key=lambda x: x[1][1])

        for i in range(len(strip)):
            for j in range(i + 1, min(i + 7, len(strip) - 1)):
                dist = self.distance(strip[i][1], strip[j][1])
                if dist < d[0]:
                    d = (dist, strip[i][0], strip[j][0])
                    self.snapshots.append({
                        'step_type': 'combine_update',
                        'active_points': [strip[i][0], strip[j][0]],
                        'description': f'New minimum cross-boundary distance found: {dist:.2f}.',
                        'current_min': d
                    })

        return d

    def brute_force(self, points=[], low=0, high=0):
        minDist = inf
        best_labels = [None, None]

        for i in range(low, high):
            for j in range(i + 1, high + 1):
                dist = self.distance(points[i][1], points[j][1])
                if dist < minDist:
                    minDist = dist
                    best_labels = [points[i][0], points[j][0]]

        return (minDist, best_labels[0], best_labels[1])

    def distance(self, point1, point2):
        return sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)

if __name__ == '__main__':
    closest_pair_1d = ClosestPair([('P1', 10), ('P2', 2), ('P3', 5), ('P4', 11)], is2D=False)
    print(f'1D Closest Pair: {closest_pair_1d.closest_pair_1D()}')

    closest_pair_2d = ClosestPair([('A', (0,1)), ('B', (2,0)), ('C', (5,6)), ('D', (0, 1.5))], is2D=True)
    print(f'2D Closest Pair: {closest_pair_2d.closest_pair_2D()}')