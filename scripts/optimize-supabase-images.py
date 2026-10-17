"""Batch-optimize referenced public Storage images; preview by default.

Requires Python + Pillow and server-side SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
See scripts/OPTIMIZE_SUPABASE_IMAGES.md before applying a batch.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import warnings
from datetime import datetime, timezone
from urllib.error import HTTPError
from urllib.parse import quote, unquote, urlencode, urlsplit
from urllib.request import Request, HTTPRedirectHandler, build_opener

from PIL import Image, ImageOps

TARGETS = {"profiles": "avatar", "custom_bosses": "portrait", "shop_items": "image_url"}
PREFIX = "_optimized/v1/"
MAX_BYTES = 10 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


class MigrationError(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise MigrationError("redirect-refused")


def source_object(value, base):
    """Only accept public objects belonging to this exact project."""
    if not isinstance(value, str) or len(value) > 4096:
        return None
    source, project = urlsplit(value), urlsplit(base)
    if (source.scheme, source.netloc) != (project.scheme, project.netloc) or source.query or source.fragment:
        return None
    marker = "/storage/v1/object/public/"
    if not source.path.startswith(marker):
        return None
    parts = source.path[len(marker):].split("/", 1)
    if len(parts) != 2:
        return None
    bucket, key = map(unquote, parts)
    if not re.fullmatch(r"[\w-]+", bucket) or not key or any(p in ("", ".", "..") for p in key.split("/")):
        return None
    if key.startswith(PREFIX):
        return None
    return bucket, key


def compress(data, max_size=512):
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(data)) as image:
            if image.format not in {"PNG", "JPEG", "WEBP"} or getattr(image, "n_frames", 1) != 1:
                raise MigrationError("unsupported-or-animated-image")
            image = ImageOps.exif_transpose(image)
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            transparent = "A" in image.getbands() or "transparency" in image.info
            image = image.convert("RGBA" if transparent else "RGB")
            output = io.BytesIO()
            image.save(output, "WEBP", quality=82, method=6)
            encoded = output.getvalue()
    with Image.open(io.BytesIO(encoded)) as check:
        check.load()
        if check.format != "WEBP" or max(check.size) > max_size:
            raise MigrationError("invalid-encoded-image")
    return encoded


class Api:
    def __init__(self, base, key):
        project = urlsplit(base)
        if project.scheme != "https" or not project.netloc or project.path not in ("", "/") or project.query or project.fragment or project.username:
            raise MigrationError("SUPABASE_URL must be an HTTPS project origin")
        self.base = base.rstrip("/")
        self.key = key
        self.opener = build_opener(NoRedirect())

    def request(self, method, path, *, query=None, data=None, headers=None):
        url = self.base + path + ("?" + urlencode(query) if query else "")
        request_headers = {"apikey": self.key}
        if not self.key.startswith("sb_secret_"):
            request_headers["Authorization"] = "Bearer " + self.key
        request_headers.update(headers or {})
        try:
            with self.opener.open(Request(url, data=data, headers=request_headers, method=method), timeout=45) as response:
                if int(response.headers.get("Content-Length", "0")) > MAX_BYTES:
                    raise MigrationError("response-too-large")
                result = response.read(MAX_BYTES + 1)
                if len(result) > MAX_BYTES:
                    raise MigrationError("response-too-large")
                return result
        except HTTPError as error:
            # Never include authenticated request URLs, keys, or private response bodies.
            raise MigrationError(f"http-{error.code}") from None

    def rows(self, table, after_id, user_id=None):
        query = {
            "select": "id," + TARGETS[table], TARGETS[table]: "not.is.null",
            "order": "id.asc", "limit": 100,
        }
        if after_id:
            query["id"] = "gt." + after_id
        if user_id:
            query["id" if table == "profiles" else "user_id"] = "eq." + user_id
            if table == "custom_bosses":
                query["select"] += ",user_id"
        rows = json.loads(self.request("GET", "/rest/v1/" + table, query=query))
        if user_id and any(str(row["id" if table == "profiles" else "user_id"]) != user_id for row in rows):
            raise MigrationError("unexpected-user-record")
        return rows

    def download(self, bucket, key):
        return self.request("GET", "/storage/v1/object/public/" + quote(bucket, safe="") + "/" + quote(key, safe="/"))

    def upload(self, bucket, key, encoded):
        try:
            self.request("POST", "/storage/v1/object/" + quote(bucket, safe="") + "/" + quote(key, safe="/"),
                         data=encoded, headers={"Content-Type": "image/webp", "Cache-Control": "max-age=31536000", "x-upsert": "false"})
        except MigrationError as error:
            if str(error) not in {"http-400", "http-409"}:
                raise
            # A previous run may have uploaded this content-addressed file.
            # It is safe to reuse only if its bytes match exactly.
        if self.download(bucket, key) != encoded:
            raise MigrationError("uploaded-file-verification-failed")

    def public_url(self, bucket, key):
        return self.base + "/storage/v1/object/public/" + quote(bucket, safe="") + "/" + quote(key, safe="/")

    def replace(self, table, row_id, old_url, new_url):
        field = TARGETS[table]
        # Compare-and-swap: a concurrent photo change must never be overwritten.
        result = json.loads(self.request("PATCH", "/rest/v1/" + table,
            query={"id": "eq." + str(row_id), field: "eq." + old_url, "select": "id"},
            data=json.dumps({field: new_url}).encode(),
            headers={"Content-Type": "application/json", "Prefer": "return=representation"}))
        return len(result) == 1


def save_report(path, report):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(report, indent=2), encoding="utf-8")
    temporary.replace(path)


def optimize_record(api, table, row, apply, report, report_path):
    old_url = row[TARGETS[table]]
    source = source_object(old_url, api.base)
    if not source:
        return "skipped"
    original = api.download(*source)
    encoded = compress(original)
    if len(encoded) >= len(original) * 0.9:
        return "no-gain"
    bucket = source[0]
    key = PREFIX + hashlib.sha256(encoded).hexdigest() + ".webp"
    new_url = api.public_url(bucket, key)
    entry = {"table": table, "id": row["id"], "old_url": old_url, "new_url": new_url,
             "original_bytes": len(original), "optimized_bytes": len(encoded), "status": "preview"}
    report["entries"].append(entry)
    save_report(report_path, report)
    if apply:
        api.upload(bucket, key, encoded)
        entry["status"] = "uploaded"
        # The recovery URLs are persisted BEFORE changing the database reference.
        save_report(report_path, report)
        entry["status"] = "update-unconfirmed"
        save_report(report_path, report)
        entry["status"] = "updated" if api.replace(table, row["id"], old_url, new_url) else "conflict"
        save_report(report_path, report)
    return entry["status"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Upload verified files and update database references")
    parser.add_argument("--table", choices=list(TARGETS), default="profiles")
    parser.add_argument("--limit", type=int, default=10, help="Maximum image downloads per run (1-100)")
    parser.add_argument("--max-scan", type=int, default=1000, help="Maximum reference rows inspected (1-10000)")
    parser.add_argument("--after-id", help="Continue after the next_after_id reported by an earlier batch")
    parser.add_argument("--user-id", help="Restrict profiles or custom_bosses to exactly this app user")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if not 1 <= args.limit <= 100 or not 1 <= args.max_scan <= 10000:
        parser.error("Invalid batch limits")
    if args.user_id and (args.table == "shop_items" or args.after_id):
        parser.error("--user-id supports profiles/custom_bosses and cannot be combined with --after-id")
    base = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base or not key:
        parser.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY locally. Never use a VITE_ variable for the administrative key.")
    api = Api(base, key)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    path = args.report or Path(__file__).resolve().parents[1] / ".storage-image-optimization" / (timestamp + ".json")
    if path.exists():
        parser.error("Report already exists; use a new report path to preserve recovery history")
    report = {"project": api.base, "apply": args.apply, "user_id": args.user_id, "entries": [], "errors": []}
    save_report(path, report)
    stats = {"inspected": 0, "attempted": 0, "skipped": 0, "no-gain": 0, "preview": 0, "updated": 0, "conflict": 0, "errors": 0}
    cursor = args.after_id
    finished = False
    while stats["inspected"] < args.max_scan and stats["attempted"] < args.limit:
        rows = api.rows(args.table, cursor, args.user_id) if args.user_id else api.rows(args.table, cursor)
        if not rows:
            finished = True
            break
        visited = 0
        for row in rows:
            if stats["inspected"] >= args.max_scan or stats["attempted"] >= args.limit:
                break
            stats["inspected"] += 1
            visited += 1
            cursor = str(row["id"])
            if not source_object(row[TARGETS[args.table]], api.base):
                stats["skipped"] += 1
                continue
            stats["attempted"] += 1
            try:
                outcome = optimize_record(api, args.table, row, args.apply, report, path)
                stats[outcome] += 1
            except Exception as error:
                # Do not print URLs or exception bodies, which may contain personal data.
                stats["errors"] += 1
                report["errors"].append({"table": args.table, "id": row["id"], "kind": type(error).__name__})
                save_report(path, report)
        if visited == len(rows) and len(rows) < 100:
            finished = True
            break
    stats["next_after_id"] = None if finished else cursor
    report["summary"] = stats
    save_report(path, report)
    print(json.dumps({"mode": "apply" if args.apply else "preview", **stats,
        "candidate_original_bytes": sum(e["original_bytes"] for e in report["entries"]),
        "candidate_optimized_bytes": sum(e["optimized_bytes"] for e in report["entries"]),
        "report": str(path)}))
    return 1 if stats["errors"] else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except MigrationError as error:
        raise SystemExit(str(error)) from None
