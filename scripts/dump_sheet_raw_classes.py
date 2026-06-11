from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from openpyxl import load_workbook

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from timetable_parser.extractors.class_blocks import ClassBlockExtractor
from timetable_parser.serializers import class_blocks_to_jsonable


DEFAULT_WORKBOOK = Path("UG, PG TIME TABLE JAN TO MAY 2026.xlsx")
DEFAULT_SHEET = "1ST YEAR B "
DEFAULT_OUTPUT = Path("outputs/1st_year_b_raw_classes.json")


def main() -> int:
    parser = argparse.ArgumentParser(description="Dump raw class blocks for one timetable sheet.")
    parser.add_argument("workbook", nargs="?", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--sheet", default=DEFAULT_SHEET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    workbook = load_workbook(args.workbook, data_only=True)
    sheet = workbook[args.sheet]
    blocks = ClassBlockExtractor.extract(sheet)
    workbook.close()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(class_blocks_to_jsonable(blocks), indent=2), encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
