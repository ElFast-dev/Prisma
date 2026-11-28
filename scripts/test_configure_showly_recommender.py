from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SOURCE_SCRIPT = Path(__file__).with_name("configure_showly_recommender.py")


class ConfigureShowlyRecommenderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        scripts = self.root / "scripts"
        scripts.mkdir(parents=True)
        self.script = scripts / SOURCE_SCRIPT.name
        shutil.copyfile(SOURCE_SCRIPT, self.script)

        showly = self.root / "showly-android"
        (showly / "app").mkdir(parents=True)
        (showly / "settings.gradle").write_text(
            "rootProject.name = 'Showly 2.0'\ninclude ':app'\ninclude ':repository'\n",
            encoding="utf-8",
        )
        (showly / "app" / "build.gradle").write_text(
            "dependencies {\n  implementation project(':repository')\n}\n",
            encoding="utf-8",
        )
        engine = self.root / "showly-recommendation-engine"
        engine.mkdir()
        (engine / "build.gradle.kts").write_text("plugins {}\n", encoding="utf-8")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def run_script(self) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(self.script)],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_configures_showly_gradle_and_is_idempotent(self) -> None:
        first = self.run_script()
        self.assertEqual(first.returncode, 0, first.stderr)

        settings_path = self.root / "showly-android" / "settings.gradle"
        app_path = self.root / "showly-android" / "app" / "build.gradle"
        settings_before = settings_path.read_text(encoding="utf-8")
        app_before = app_path.read_text(encoding="utf-8")

        self.assertEqual(settings_before.count("include ':prisma-recommendation-engine'"), 1)
        self.assertEqual(settings_before.count("project(':prisma-recommendation-engine').projectDir"), 1)
        self.assertEqual(app_before.count("implementation project(':prisma-recommendation-engine')"), 1)

        second = self.run_script()
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertIn("no se modificaron archivos", second.stdout.lower())
        self.assertEqual(settings_path.read_text(encoding="utf-8"), settings_before)
        self.assertEqual(app_path.read_text(encoding="utf-8"), app_before)

    def test_refuses_unknown_showly_layout_without_partial_write(self) -> None:
        app_path = self.root / "showly-android" / "app" / "build.gradle"
        app_path.write_text("dependencies {\n}\n", encoding="utf-8")
        settings_path = self.root / "showly-android" / "settings.gradle"
        original_settings = settings_path.read_text(encoding="utf-8")

        result = self.run_script()
        self.assertEqual(result.returncode, 3)
        self.assertEqual(settings_path.read_text(encoding="utf-8"), original_settings)


if __name__ == "__main__":
    unittest.main()
