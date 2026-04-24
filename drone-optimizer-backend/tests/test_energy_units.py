import sys
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.solver import joules_to_milliamp_hours, solve_optimal_speed_admc


class EnergyUnitConversionTests(unittest.TestCase):
    def test_joules_to_milliamp_hours_depends_on_voltage(self):
        self.assertAlmostEqual(joules_to_milliamp_hours(7992.0, 22.2), 100.0, places=6)
        self.assertAlmostEqual(joules_to_milliamp_hours(5328.0, 14.8), 100.0, places=6)

    def test_solver_compares_battery_capacity_in_milliamp_hours(self):
        result = solve_optimal_speed_admc(
            wind_speed=5.0,
            wind_direction_deg=0.0,
            drone_mass=1.2,
            battery_capacity=500.0,
            start_coord=(-18.8792, 47.5079),
            end_coord=(-18.9145, 47.5312),
            no_go_zones=[],
            battery_voltage=22.2,
        )

        self.assertTrue(result["success"])
        self.assertGreater(result["baseline"]["energy"], 500.0)
        self.assertTrue(any(alt["feasible_battery"] for alt in result["alternatives"]))
        self.assertTrue(any(not alt["feasible_battery"] for alt in result["alternatives"]))


if __name__ == "__main__":
    unittest.main()
