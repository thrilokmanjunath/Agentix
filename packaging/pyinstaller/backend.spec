# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Base path of backend
backend_dir = os.path.abspath(os.path.join(SPECPATH, "..", "..", "backend"))

hiddenimports = [
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespans",
    "uvicorn.lifespans.on",
    "fastapi",
    "fastapi.responses",
    "fastapi.middleware.cors",
    "fastapi.middleware.gzip",
    "starlette",
    "starlette.middleware",
    "pydantic",
    "pydantic_settings",
    "sqlalchemy",
    "sqlalchemy.dialects.sqlite",
    "structlog",
    "prometheus_client",
    "sqlite3",
    "core",
    "core.api",
    "core.api.v1",
    "core.api.v1.api",
    "core.api.v1.routes_auth",
    "core.api.v1.routes_data",
    "core.api.v1.routes_jobs",
    "core.api.v1.routes_platform",
    "core.api.v1.routes_system",
    "core.auth",
    "core.auth.rbac",
    "core.config",
    "core.context",
    "core.middleware",
    "core.middleware.security",
    "core.middleware.profiling",
    "core.models",
    "core.models.models",
    "core.repositories",
    "core.repositories.database",
    "core.schemas",
    "core.schemas.api_schemas",
    "core.telemetry",
    "core.services",
    "core.services.ml_service",
    "core.services.orchestration_service",
]

# Collect submodules for core data science packages
for pkg in ["sklearn", "scipy", "pandas", "polars", "pyarrow"]:
    try:
        hiddenimports += collect_submodules(pkg)
    except Exception:
        pass

datas = []
binaries = []
for pkg in ["xgboost", "lightgbm"]:
    try:
        from PyInstaller.utils.hooks import collect_dynamic_libs
        binaries += collect_dynamic_libs(pkg)
    except Exception:
        pass

a = Analysis(
    [os.path.join(backend_dir, "desktop_entry.py")],
    pathex=[backend_dir],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "torch", "tensorflow", "test"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="agentix-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
