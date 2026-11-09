import os, random, sys
from pathlib import Path


sys.set_int_max_str_digits(10000)

def generate_test_cases():
    out_dir = Path(__file__).parent.parent / 'data'
    os.makedirs(out_dir, exist_ok=True)

    cp_configs = [
        ('01_base_case', 110, 'random'),
        ('02_small', 150, 'random'),
        ('03_edge_vertical', 250, 'vertical'),
        ('04_edge_horizontal', 130, 'horizontal'),
        ('05_medium', 300, 'random'),
        ('06_edge_clusters', 200, 'clusters'),
        ('07_large', 1000, 'random'),
        ('08_very_large', 10000, 'random'),
        ('09_massive', 50000, 'random'),
        ('10_stress_test', 100000, 'random')
    ]

    for name, n, t_type in cp_configs:
        with open(f'{out_dir}/closest_pair/cp_{name}.txt', 'w') as f:
            for _ in range(n):
                if t_type == 'random':
                    x, y = random.uniform(0, 10000), random.uniform(0, 10000)
                elif t_type == 'vertical':
                    x, y = 500.0, random.uniform(0, 10000)
                elif t_type == 'horizontal':
                    x, y = random.uniform(0, 10000), 500.0
                elif t_type == 'clusters':
                    if random.random() > 0.5:
                        x, y = random.uniform(0, 10), random.uniform(0, 10)
                    else:
                        x, y = random.uniform(9990, 10000), random.uniform(9990, 10000)
                
                f.write(f'{x:.4f} {y:.4f}\n')

    km_configs = [
        ('01_base_case', 105, 105, False),
        ('02_small_odd', 125, 125, False),
        ('03_mismatched', 110, 160, False),
        ('04_edge_zeroes', 130, 130, True),
        ('05_medium', 256, 256, False),
        ('06_large', 512, 512, False),
        ('07_large_mismatched', 600, 147, False),
        ('08_very_large', 1024, 1024, False),
        ('09_massive', 2048, 2048, False),
        ('10_stress_test', 5000, 5000, False)
    ]

    for name, d1, d2, is_zero_heavy in km_configs:
        with open(f'{out_dir}/karatsuba/km_{name}.txt', 'w') as f:
            if is_zero_heavy:
                num1 = int('1' + '0' * 4 + '5' + '0' * (d1 - 6)) if d1 >= 6 else random_number(d1)
                num2 = int('2' + '0' * 5 + '3' + '0' * (d2 - 7)) if d2 >= 7 else random_number(d2)
            else:
                num1 = random_number(d1)
                num2 = random_number(d2)
                
            f.write(f'{num1}\n{num2}\n')

    print(f'Successfully generated 20 test cases in \'{out_dir}\'')

def random_number(digits):
        if digits == 1:
            return random.randint(1, 9)
        lower = 10**(digits - 1)
        upper = (10**digits) - 1
        return random.randint(lower, upper)

if __name__ == '__main__':
    generate_test_cases()