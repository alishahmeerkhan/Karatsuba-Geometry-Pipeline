from math import floor, log10
from time import time

class Karatsuba:
    def __init__(self):
        self.result = 0
        self.time_elapsed = 0.0
        self.snapshots = []

    def count_digits(self, number):
        return 1 if number == 0 else floor(log10(abs(number))) + 1

    def karatsuba(self, num1, num2):
        self.snapshots = []
        start_time = time()
        self.result = self.algorithm(num1, num2, depth=0)
        end_time = time()
        self.time_elapsed = end_time - start_time
        return self.result

    def algorithm(self, num1, num2, depth=0):
        if num1 < 10 or num2 < 10:
            res = num1 * num2
            self.snapshots.append({
                'step_type': 'base_case',
                'depth': depth,
                'operands': (num1, num2),
                'description': f'Base case reached: {num1} * {num2} = {res}.',
                'result': res
            })
            return res

        m = max(self.count_digits(num1), self.count_digits(num2))
        m2 = int(m / 2)
        power = 10 ** m2

        high1, low1 = num1 // power, num1 % power
        high2, low2 = num2 // power, num2 % power

        self.snapshots.append({
            'step_type': 'split',
            'depth': depth,
            'operands': (num1, num2),
            'splits': {'high1': high1, 'low1': low1, 'high2': high2, 'low2': low2},
            'm2': m2,
            'description': f'Splitting at length m2 = {m2}: num1 -> ({high1}, {low1}), num2 -> ({high2}, {low2}).'
        })

        z0 = self.algorithm(low1, low2)
        z2 = self.algorithm(high1, high2)
        z1 = self.algorithm((low1 + high1), (low2 + high2))

        res = (z2 * 10**(2 * m2)) + ((z1 - z2 - z0) * 10**m2) + z0
        self.snapshots.append({
            'step_type': 'combine',
            'depth': depth,
            'operands': (num1, num2),
            'products': {'z0': z0, 'z1': z1, 'z2': z2},
            'description': f'Combining results: z0={z0}, z1={z1}, z2={z2} -> result={res}.',
            'result': res
        })

        return res


if __name__ == '__main__':
    karatsuba = Karatsuba()
    print(f"Final Result: {karatsuba.karatsuba(1234, 5678)}") 
    print(f"Snapshots Captured: {len(karatsuba.snapshots)}")

    import json
    print(json.dumps(karatsuba.snapshots, indent=2))