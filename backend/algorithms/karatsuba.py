from math import floor, log10
from time import time

class Karatsuba:
    def __init__(self):
        self.result = 0
        self.time = 0.0

    def count_digits(self, number):
        return 1 if number == 0 else floor(log10(abs(number))) + 1

    def karatsuba(self, num1, num2):
        start_time = time()
        self.result = self.algorithm(num1, num2)
        end_time = time()
        self.timer = end_time - start_time
        return self.result

    def algorithm(self, num1, num2):
        if num1 < 10 or num2 < 10:
            return num1 * num2

        m = max(self.count_digits(num1), self.count_digits(num2))
        m2 = int(m / 2)
        power = 10 ** m2

        high1, low1 = num1 // power, num1 % power
        high2, low2 = num2 // power, num2 % power

        z0 = self.algorithm(low1, low2)
        z2 = self.algorithm(high1, high2)
        z1 = self.algorithm((low1 + high1), (low2 + high2))

        return (z2 * 10**(2 * m2)) + ((z1 - z2 - z0) * 10**m2) + z0


if __name__ == '__main__':
    karatsuba = Karatsuba()
    print(karatsuba.karatsuba(123456789, 123)) # testing value