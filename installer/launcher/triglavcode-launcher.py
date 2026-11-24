#!/usr/bin/env python3
"""TriglavCode — кроссплатформенный лаунчер (аварийный вариант).

Если готовый .exe/бинарник не запускается (антивирус, старое железо, политики
Windows и т.п.), запустите этот скрипт обычным Python 3.8+ — он сам скачает
подходящий бинарник из GitHub Releases, распакует в пользовательский кэш и
запустит GUI (веб-интерфейс в браузере).

Зависимостей нет — только стандартная библиотека Python.

Примеры:
    python triglavcode-launcher.py                 # веб-GUI (скачает при первом запуске)
    python triglavcode-launcher.py --tui           # терминальный TUI (Linux/macOS)
    python triglavcode-launcher.py --serve         # headless-сервер
    python triglavcode-launcher.py --exe ./triglavcode  # использовать локальный бинарник
    python triglavcode-launcher.py -- --help       # передать аргументы триглавкоду
    python triglavcode-launcher.py --print-exe     # только показать путь к бинарнику
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

REPO = os.environ.get("TRIGLAVCODE_REPO", "DonatoDiaz/triglavcode")
TAG = os.environ.get("TRIGLAVCODE_RELEASE", "triglav-1.19.0-triglav.1")
UA = "triglavcode-launcher/1.0 (+https://github.com/DonatoDiaz/triglavcode)"


def log(msg: str) -> None:
    print(f"[triglavcode] {msg}", file=sys.stderr, flush=True)


def platform_key() -> tuple[str, str]:
    system = platform.system().lower()
    machine = platform.machine().lower()
    if system.startswith("win"):
        os_name = "windows"
    elif system == "darwin":
        os_name = "darwin"
    else:
        os_name = "linux"
    if machine in ("x86_64", "amd64", "x64"):
        arch = "x64"
    elif machine in ("aarch64", "arm64"):
        arch = "arm64"
    else:
        arch = machine or "unknown"
    return os_name, arch


def cache_dir() -> Path:
    if os.name == "nt":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / "TriglavCode" / "bin"
    base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
    return Path(base) / "triglavcode" / "bin"


def exe_name() -> str:
    return "triglavcode.exe" if os.name == "nt" else "triglavcode"


def http_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def resolve_release() -> dict:
    try:
        return http_json(f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}")
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
        log(f"релиз {TAG} не найден, беру последний")
        return http_json(f"https://api.github.com/repos/{REPO}/releases/latest")


def pick_asset(release: dict, os_name: str, arch: str) -> dict:
    assets = release.get("assets") or []
    want_zip_suffix = ".zip"
    for asset in assets:
        name = asset.get("name", "")
        lower = name.lower()
        if os_name == "windows":
            if f"windows-{arch}" in lower and lower.endswith(want_zip_suffix):
                return asset
        elif os_name == "linux":
            if f"linux-{arch}" in lower and lower.endswith(".tar.gz"):
                return asset
        elif os_name == "darwin":
            if ("darwin" in lower or "macos" in lower) and lower.endswith(".zip") and arch in lower:
                return asset
    raise SystemExit(
        f"В релизе нет бинарника для {os_name}-{arch}. "
        f"Проверьте https://github.com/{REPO}/releases"
    )


def download(url: str, dest: Path, size: int | None = None) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp, open(dest, "wb") as out:
        total = size or int(resp.headers.get("Content-Length") or 0)
        done = 0
        last = -1
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            done += len(chunk)
            if total:
                pct = int(done * 100 / total)
                if pct != last:
                    last = pct
                    print(f"\r[triglavcode] скачивание {pct:3d}% ({done // 1048576}/{total // 1048576} МБ)",
                          end="", file=sys.stderr, flush=True)
    print("", file=sys.stderr)


def extract_binary(archive: Path, dest: Path) -> Path:
    target = exe_name()
    dest.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        if archive.name.lower().endswith(".zip"):
            with zipfile.ZipFile(archive) as z:
                z.extractall(tmp_dir)
        else:
            with tarfile.open(archive, "r:gz") as t:
                t.extractall(tmp_dir, filter="data")
        found = next((p for p in tmp_dir.rglob(target) if p.is_file()), None)
        if not found:
            found = next((p for p in tmp_dir.rglob("triglavcode*") if p.is_file()), None)
        if not found:
            raise SystemExit(f"в архиве нет {target}")
        out = dest / target
        shutil.copy2(found, out)
    if os.name != "nt":
        out.chmod(out.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return out


def local_binary_near_script() -> Path | None:
    here = Path(__file__).resolve().parent
    for candidate in (here / exe_name(), here / "triglavcode"):
        if candidate.is_file():
            return candidate
    return None


def ensure_binary(explicit: str | None) -> Path:
    if explicit:
        path = Path(explicit).expanduser().resolve()
        if not path.is_file():
            raise SystemExit(f"не найден бинарник: {path}")
        return path

    cached = cache_dir() / exe_name()
    if cached.is_file():
        return cached

    near = local_binary_near_script()
    if near:
        return near

    os_name, arch = platform_key()
    log(f"бинарник не найден, определяю для {os_name}-{arch}")
    release = resolve_release()
    asset = pick_asset(release, os_name, arch)
    url = asset["browser_download_url"]
    size = asset.get("size")
    archive = cache_dir() / asset["name"]
    if archive.is_file() and (not size or archive.stat().st_size == size):
        log(f"использую уже скачанный {asset['name']}")
    else:
        log(f"скачиваю {asset['name']}")
        download(url, archive, size)
    binary = extract_binary(archive, cache_dir())
    try:
        archive.unlink()
    except OSError:
        pass
    log(f"готово: {binary}")
    return binary


def build_args(ns: argparse.Namespace) -> list[str]:
    if ns.extra:
        extra = list(ns.extra)
        if extra and extra[0] == "--":
            extra = extra[1:]
        return extra
    if ns.serve:
        return ["serve"]
    if ns.tui:
        return []
    return ["web"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Кроссплатформенный лаунчер TriglavCode (скачивает и запускает нужный бинарник).",
        epilog="Всё после `--` передаётся самому triglavcode.",
    )
    parser.add_argument("--exe", help="путь к локальному бинарнику triglavcode")
    parser.add_argument("--tui", action="store_true", help="запустить терминальный TUI (Linux/macOS)")
    parser.add_argument("--serve", action="store_true", help="запустить headless-сервер (serve)")
    parser.add_argument("--print-exe", action="store_true", help="показать путь к бинарнику и выйти")
    parser.add_argument("extra", nargs=argparse.REMAINDER, help="аргументы для triglavcode (после --)")
    ns = parser.parse_args(argv)

    binary = ensure_binary(ns.exe)
    if ns.print_exe:
        print(binary)
        return 0

    args = build_args(ns)
    env = dict(os.environ)
    if os.name != "nt":
        env.setdefault("TERM", "xterm-256color")
    log(f"запуск: {binary} {' '.join(args)}".rstrip())
    try:
        return subprocess.call([str(binary), *args], env=env)
    except KeyboardInterrupt:
        return 130
    except OSError as e:
        raise SystemExit(f"не удалось запустить {binary}: {e}")


if __name__ == "__main__":
    raise SystemExit(main())
