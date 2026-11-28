#!/usr/bin/env python3
"""Attach Prisma's recommender and default new Showly installs to personalized discovery."""

from pathlib import Path
import sys


def replace_exact(content: str, old: str, new: str, expected: int, label: str) -> tuple[str, bool]:
    old_count = content.count(old)
    new_count = content.count(new)
    if old_count == expected:
        return content.replace(old, new), True
    if old_count == 0 and new_count == expected:
        return content, False
    raise ValueError(
        f"Estado inesperado en {label}: se esperaban {expected} apariciones "
        f"de la versión original y se encontraron {old_count} (nueva: {new_count})."
    )


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    showly = root / "showly-android"
    settings_path = showly / "settings.gradle"
    app_gradle_path = showly / "app" / "build.gradle"
    engine_build = root / "showly-recommendation-engine" / "build.gradle.kts"
    default_paths = {
        "filters": showly / "repository/src/main/java/com/michaldrabik/repository/settings/SettingsFiltersRepository.kt",
        "settings": showly / "ui-model/src/main/java/com/michaldrabik/ui_model/Settings.kt",
        "discover_filters": showly / "ui-model/src/main/java/com/michaldrabik/ui_model/DiscoverFilters.kt",
        "mapper": showly / "repository/src/main/java/com/michaldrabik/repository/mappers/SettingsMapper.kt",
    }

    required = (settings_path, app_gradle_path, engine_build, *default_paths.values())
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        print(
            "No se encuentra la base Showly o alguno de los archivos esperados. "
            "Ejecuta primero: git submodule update --init --recursive\n"
            + "\n".join(missing),
            file=sys.stderr,
        )
        return 2

    # Prepare every edit in memory. Nothing is written until all upstream anchors validate.
    settings = settings_path.read_text(encoding="utf-8")
    include_line = "include ':prisma-recommendation-engine'"
    project_line = (
        "project(':prisma-recommendation-engine').projectDir = "
        "file('../showly-recommendation-engine')"
    )
    changed_settings = False

    if include_line not in settings:
        settings = settings.rstrip() + "\n\n" + include_line + "\n"
        changed_settings = True
    if project_line not in settings:
        settings = settings.rstrip() + "\n" + project_line + "\n"
        changed_settings = True

    app_gradle = app_gradle_path.read_text(encoding="utf-8")
    dependency = "  implementation project(':prisma-recommendation-engine')"
    changed_app = False
    if dependency not in app_gradle:
        anchor = "  implementation project(':repository')"
        if anchor not in app_gradle:
            print(
                "No se encontró el punto de inserción esperado en app/build.gradle. "
                "No se modificó ningún archivo.",
                file=sys.stderr,
            )
            return 3
        app_gradle = app_gradle.replace(anchor, anchor + "\n" + dependency, 1)
        changed_app = True

    planned_defaults = {
        name: path.read_text(encoding="utf-8")
        for name, path in default_paths.items()
    }
    changed_defaults = False
    try:
        planned_defaults["filters"], changed = replace_exact(
            planned_defaults["filters"],
            "val default = DiscoverFeed.TRENDING.name",
            "val default = DiscoverFeed.PERSONALIZED.name",
            2,
            str(default_paths["filters"]),
        )
        changed_defaults |= changed

        planned_defaults["settings"], changed = replace_exact(
            planned_defaults["settings"],
            "discoverFilterFeed = DiscoverFeed.TRENDING,",
            "discoverFilterFeed = DiscoverFeed.PERSONALIZED,",
            1,
            str(default_paths["settings"]),
        )
        changed_defaults |= changed
        planned_defaults["settings"], changed = replace_exact(
            planned_defaults["settings"],
            "discoverMoviesFilterFeed = DiscoverFeed.TRENDING,",
            "discoverMoviesFilterFeed = DiscoverFeed.PERSONALIZED,",
            1,
            str(default_paths["settings"]),
        )
        changed_defaults |= changed

        planned_defaults["discover_filters"], changed = replace_exact(
            planned_defaults["discover_filters"],
            "val feedOrder: DiscoverFeed = DiscoverFeed.TRENDING",
            "val feedOrder: DiscoverFeed = DiscoverFeed.PERSONALIZED",
            1,
            str(default_paths["discover_filters"]),
        )
        changed_defaults |= changed

        planned_defaults["mapper"], changed = replace_exact(
            planned_defaults["mapper"],
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING",
            "import com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED",
            1,
            str(default_paths["mapper"]),
        )
        changed_defaults |= changed
        planned_defaults["mapper"], changed = replace_exact(
            planned_defaults["mapper"],
            "?: TRENDING",
            "?: PERSONALIZED",
            2,
            str(default_paths["mapper"]),
        )
        changed_defaults |= changed
        planned_defaults["mapper"], changed = replace_exact(
            planned_defaults["mapper"],
            "discoverMoviesFilterFeed = enumEntries<DiscoverFeed>()\n"
            "        .find { settings.discoverFilterFeed == it.name } ?: PERSONALIZED,",
            "discoverMoviesFilterFeed = enumEntries<DiscoverFeed>()\n"
            "        .find { settings.discoverMoviesFilterFeed == it.name } ?: PERSONALIZED,",
            1,
            str(default_paths["mapper"]),
        )
        changed_defaults |= changed
    except ValueError as error:
        print(f"{error} No se escribieron cambios.", file=sys.stderr)
        return 3

    if changed_settings:
        settings_path.write_text(settings, encoding="utf-8")
    if changed_app:
        app_gradle_path.write_text(app_gradle, encoding="utf-8")
    for name, path in default_paths.items():
        if planned_defaults[name] != path.read_text(encoding="utf-8"):
            path.write_text(planned_defaults[name], encoding="utf-8")

    print("Showly ya puede resolver el módulo :prisma-recommendation-engine.")
    if changed_defaults:
        print("«Para ti» será el feed inicial de películas y series en instalaciones nuevas.")
        print("Las preferencias de feed que ya estuvieran guardadas se respetan.")
    else:
        print("Los valores predeterminados de «Para ti» ya estaban aplicados.")
    if changed_settings or changed_app or changed_defaults:
        print("Se aplicaron cambios locales e idempotentes al checkout del submódulo Showly.")
        print("No se modifica ni se confirma nada en el repositorio upstream.")
    else:
        print("La configuración ya estaba aplicada; no se modificaron archivos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
