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

        self.showly = self.root / "showly-android"
        (self.showly / "app").mkdir(parents=True)
        (self.showly / "settings.gradle").write_text(
            "rootProject.name = 'Showly 2.0'\ninclude ':app'\ninclude ':repository'\n",
            encoding="utf-8",
        )
        (self.showly / "app" / "build.gradle").write_text(
            "dependencies {\n  implementation project(':repository')\n}\n",
            encoding="utf-8",
        )
        self.default_files = {
            "filters": self.write_showly(
                "repository/src/main/java/com/michaldrabik/repository/settings/SettingsFiltersRepository.kt",
                "val default = DiscoverFeed.TRENDING.name\nval default = DiscoverFeed.TRENDING.name\n",
            ),
            "settings": self.write_showly(
                "ui-model/src/main/java/com/michaldrabik/ui_model/Settings.kt",
                "discoverFilterFeed = DiscoverFeed.TRENDING,\ndiscoverMoviesFilterFeed = DiscoverFeed.TRENDING,\n",
            ),
            "discover_filters": self.write_showly(
                "ui-model/src/main/java/com/michaldrabik/ui_model/DiscoverFilters.kt",
                "val feedOrder: DiscoverFeed = DiscoverFeed.TRENDING\n",
            ),
            "mapper": self.write_showly(
                "repository/src/main/java/com/michaldrabik/repository/mappers/SettingsMapper.kt",
                "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\n"
                "discoverFilterFeed = enumEntries<DiscoverFeed>()\n"
                "        .find { settings.discoverFilterFeed == it.name } ?: TRENDING,\n"
                "discoverMoviesFilterFeed = enumEntries<DiscoverFeed>()\n"
                "        .find { settings.discoverFilterFeed == it.name } ?: TRENDING,\n",
            ),
        }
        engine = self.root / "showly-recommendation-engine"
        engine.mkdir()
        (engine / "build.gradle.kts").write_text("plugins {}\n", encoding="utf-8")

    def write_showly(self, relative: str, content: str) -> Path:
        path = self.showly / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def tearDown(self) -> None:
        self.temp.cleanup()

    def run_script(self) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(self.script)],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_configures_feed_defaults_and_is_idempotent(self) -> None:
        first = self.run_script()
        self.assertEqual(first.returncode, 0, first.stderr)

        settings_path = self.showly / "settings.gradle"
        app_path = self.showly / "app" / "build.gradle"
        settings_before = settings_path.read_text(encoding="utf-8")
        app_before = app_path.read_text(encoding="utf-8")

        self.assertEqual(settings_before.count("include ':prisma-recommendation-engine'"), 1)
        self.assertEqual(settings_before.count("project(':prisma-recommendation-engine').projectDir"), 1)
        self.assertEqual(app_before.count("implementation project(':prisma-recommendation-engine')"), 1)

        filters = self.default_files["filters"].read_text(encoding="utf-8")
        self.assertEqual(filters.count("DiscoverFeed.PERSONALIZED.name"), 2)
        settings = self.default_files["settings"].read_text(encoding="utf-8")
        self.assertIn("discoverFilterFeed = DiscoverFeed.PERSONALIZED", settings)
        self.assertIn("discoverMoviesFilterFeed = DiscoverFeed.PERSONALIZED", settings)
        discover_filters = self.default_files["discover_filters"].read_text(encoding="utf-8")
        self.assertIn("feedOrder: DiscoverFeed = DiscoverFeed.PERSONALIZED", discover_filters)
        mapper = self.default_files["mapper"].read_text(encoding="utf-8")
        self.assertIn("DiscoverFeed.PERSONALIZED", mapper)
        self.assertEqual(mapper.count("?: PERSONALIZED"), 2)
        self.assertEqual(mapper.count("settings.discoverFilterFeed == it.name"), 1)
        self.assertEqual(mapper.count("settings.discoverMoviesFilterFeed == it.name"), 1)

        before = {name: path.read_text(encoding="utf-8") for name, path in self.default_files.items()}
        second = self.run_script()
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(settings_path.read_text(encoding="utf-8"), settings_before)
        self.assertEqual(app_path.read_text(encoding="utf-8"), app_before)
        self.assertEqual(
            {name: path.read_text(encoding="utf-8") for name, path in self.default_files.items()},
            before,
        )

    def test_refuses_unknown_showly_layout_without_partial_write(self) -> None:
        app_path = self.showly / "app" / "build.gradle"
        app_path.write_text("dependencies {\n}\n", encoding="utf-8")
        settings_path = self.showly / "settings.gradle"
        original_settings = settings_path.read_text(encoding="utf-8")
        before = {name: path.read_text(encoding="utf-8") for name, path in self.default_files.items()}

        result = self.run_script()
        self.assertEqual(result.returncode, 3)
        self.assertEqual(settings_path.read_text(encoding="utf-8"), original_settings)
        self.assertEqual(
            {name: path.read_text(encoding="utf-8") for name, path in self.default_files.items()},
            before,
        )

    def test_refuses_partially_modified_defaults_without_partial_write(self) -> None:
        filters_path = self.default_files["filters"]
        filters_path.write_text(
            "val default = DiscoverFeed.PERSONALIZED.name\nval default = DiscoverFeed.TRENDING.name\n",
            encoding="utf-8",
        )
        before = {name: path.read_text(encoding="utf-8") for name, path in self.default_files.items()}

        result = self.run_script()
        self.assertEqual(result.returncode, 3)
        self.assertEqual(
            {name: path.read_text(encoding="utf-8") for name, path in self.default_files.items()},
            before,
        )


if __name__ == "__main__":
    unittest.main()
