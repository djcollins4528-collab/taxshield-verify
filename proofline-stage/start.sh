#!/bin/sh
set -eu
[ "${PROOFLINE_STAGE_MODE:-}" = "sealed_db_probe" ] || { echo "Proofline staging mode denied"; exit 1; }
python proofline-stage/db_probe.py
exec python proofline-stage/server.py
