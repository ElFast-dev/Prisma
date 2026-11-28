#!/usr/bin/env python3
"""Attach Prisma's standalone recommender module to the pinned Showly submodule."""

from pathlib import Path
import sys


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    showly = root / "showly-android"
    settings_path = showly / "settings.gradle"
    app_gradle_path = showly / "app" / "build.gradle"
    engine_build = root / "showly-recommendation-engine" / "build.gradle.kts"

    missing = [str(path) for path in (settings_path, app_gradle_path, engine_build) if not path.is_file()]
    if missing:
        print(
            "No se encuentra la base Showly o el motor. "
            "Ejecuta primero: git submodule update --init --recursive\n"
            + "\n".join(missing),
            file=sys.stderr,
        )
        return 2

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
                "No se modificó ese archivo.",
                file=sys.stderr,
            )
            return 3
        app_gradle = app_gradle.replace(anchor, anchor + "\n" + dependency, 1)
        changed_app = True

    if changed_settings:
        settings_path.write_text(settings, encoding="utf-8")
    if changed_app:
        app_gradle_path.write_text(app_gradle, encoding="utf-8")

    print("Showly ya puede resolver el módulo :prisma-recommendation-engine.")
    if changed_settings or changed_app:
        print("Se actualizaron localmente settings.gradle y/o app/build.gradle dentro del submódulo.")
        print("Esos cambios locales no se han confirmado en el repositorio upstream.")
    else:
        print("La configuración ya estaba aplicada; no se modificaron archivos.")
    print("Ahora abre showly-android en Android Studio o ejecuta su Gradle wrapper.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
