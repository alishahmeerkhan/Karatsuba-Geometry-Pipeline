from math import inf, sqrt

class ClosestPair:
    def __init__(self, points=[], is2D=False):
        self.points = points
        self.is2D = is2D
        self.closestPair = ()

    def closest_pair_1D(self):
        self.points = sorted(self.points)
        return self.solve_1D(self.points, 0, len(self.points) - 1)

    def solve_1D(self, points=[], low=0, high=0):
        if high - low <= 1:
            return points[high] - points[low]

        mid = int(low + (high - low) / 2)
        d1 = self.solve_1D(points, low, mid)
        d2 = self.solve_1D(points, mid + 1, high)
        d3 = points[mid + 1] - points[mid]

        return min(d1, d2, d3)

    def closest_pair_2D(self):
        self.points = sorted(self.points, key=lambda x: x[0])
        return self.solve_2D(self.points, 0, len(self.points) - 1)

    def solve_2D(self, points=[], low=0, high=0):
        if high - low <= 1:
            return self.brute_force(points, low, high)

        mid = int(low + (high - low) / 2)
        midPoint = points[mid]

        d1 = self.solve_2D(points, low, mid)
        d2 = self.solve_2D(points, mid + 1, high)
        d = min(d1, d2)

        strip = []

        for i in range(low, high + 1):
            if abs(points[i][0] - midPoint[0]) < d:
                strip.append(points[i])

        strip = sorted(strip, key=lambda x:x[1])

        for i in range(len(strip)):
            for j in range(i + 1, min(i + 7, len(strip) - 1)):
                d = min(d, self.distance(points[i], points[j]))

        return d

    def brute_force(self, points=[], low=0, high=0):
        minDist = inf

        for i in range(low, high):
            for j in range(i + 1, high + 1):
                minDist = min(minDist, self.distance(points[i], points[j]))

        return minDist

    def distance(self, point1, point2):
        return sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)

if __name__ == '__main__':
    closestPair = ClosestPair([(0,1), (2,0), (5,6)], True)
    print(closestPair.closest_pair_2D())