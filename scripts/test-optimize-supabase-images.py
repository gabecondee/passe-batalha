import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from PIL import Image

spec = importlib.util.spec_from_file_location("migration", Path(__file__).with_name("optimize-supabase-images.py"))
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)
BASE = "https://project.supabase.co"
OLD = BASE + "/storage/v1/object/public/avatars/user/old.png"
TEMP_ROOT = Path(__file__).resolve().parents[1] / ".storage-image-optimization/tests"
TEMP_ROOT.mkdir(parents=True, exist_ok=True)


def temporary_directory():
    directory = tempfile.TemporaryDirectory(dir=TEMP_ROOT)
    # TemporaryDirectory recursively cleans up only the test directory it created.
    assert Path(directory.name).resolve().is_relative_to(TEMP_ROOT.resolve())
    return directory


def png(mode="RGB", size=(1024, 512)):
    image = Image.new(mode, size)
    output = io.BytesIO()
    image.save(output, "PNG")
    return output.getvalue()


class FakeApi:
    base = BASE

    def __init__(self, conflict=False):
        self.events = []
        self.conflict = conflict

    def download(self, *args):
        return png()

    def public_url(self, bucket, key):
        return BASE + "/storage/v1/object/public/" + bucket + "/" + key

    def upload(self, *args):
        self.events.append("upload-verified")

    def replace(self, *args):
        self.events.append("database-write")
        self.replace_args = args
        return not self.conflict


class MigrationTests(unittest.TestCase):
    def test_accepts_only_own_public_storage(self):
        self.assertEqual(migration.source_object(OLD, BASE), ("avatars", "user/old.png"))
        for value in [None, "/images/local.png", "data:image/png;base64,AAA",
                      OLD.replace("project.", "other."), OLD + "?token=abc",
                      OLD.replace("/public/", "/sign/"),
                      BASE + "/storage/v1/object/public/avatars/%2e%2e/other.png",
                      OLD.replace("https://", "http://")]:
            with self.subTest(value=value):
                self.assertIsNone(migration.source_object(value, BASE))

    def test_skips_optimized_versions(self):
        self.assertIsNone(migration.source_object(BASE + "/storage/v1/object/public/avatars/_optimized/v1/hash.webp", BASE))

    def test_preserves_proportions_and_alpha(self):
        encoded = migration.compress(png("RGBA"))
        with Image.open(io.BytesIO(encoded)) as result:
            self.assertEqual(result.size, (512, 256))
            self.assertEqual(result.format, "WEBP")
            self.assertIn("A", result.getbands())

    def test_preserves_palette_transparency(self):
        image = Image.new("P", (20, 20))
        image.info["transparency"] = 0
        stream = io.BytesIO()
        image.save(stream, "PNG")
        with Image.open(io.BytesIO(migration.compress(stream.getvalue()))) as result:
            self.assertIn("A", result.getbands())

    def test_does_not_enlarge_small_images(self):
        with Image.open(io.BytesIO(migration.compress(png(size=(20, 10))))) as result:
            self.assertEqual(result.size, (20, 10))

    def test_does_not_silently_flatten_animation(self):
        output = io.BytesIO()
        Image.new("RGB", (20, 20), "red").save(output, "PNG", save_all=True,
            append_images=[Image.new("RGB", (20, 20), "blue")], duration=100)
        with self.assertRaises(migration.MigrationError):
            migration.compress(output.getvalue())

    def run_record(self, api, apply):
        report = {"entries": []}
        directory = temporary_directory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / "report.json"
        status = migration.optimize_record(api, "profiles", {"id": "one", "avatar": OLD}, apply, report, path)
        return status, report, path

    def test_preview_never_uploads_or_writes_database(self):
        api = FakeApi()
        status, report, path = self.run_record(api, False)
        self.assertEqual(status, "preview")
        self.assertEqual(api.events, [])
        self.assertGreater(report["entries"][0]["original_bytes"], report["entries"][0]["optimized_bytes"])
        self.assertTrue(path.exists())

    def test_apply_uploads_before_compare_and_swap(self):
        api = FakeApi()
        status, report, path = self.run_record(api, True)
        self.assertEqual(status, "updated")
        self.assertEqual(api.events, ["upload-verified", "database-write"])
        self.assertEqual(api.replace_args[:3], ("profiles", "one", OLD))
        self.assertEqual(json.loads(path.read_text())["entries"][0]["old_url"], OLD)

    def test_concurrent_photo_change_is_not_reported_as_success(self):
        status, report, _ = self.run_record(FakeApi(conflict=True), True)
        self.assertEqual(status, "conflict")

    def test_failed_upload_never_writes_database(self):
        api = FakeApi()
        api.upload = Mock(side_effect=migration.MigrationError("http-403"))
        with self.assertRaises(migration.MigrationError):
            self.run_record(api, True)
        self.assertNotIn("database-write", api.events)

    def test_recovery_report_precedes_database_write(self):
        api = FakeApi()
        report = {"entries": []}
        with temporary_directory() as directory:
            path = Path(directory) / "report.json"
            def replace(*args):
                saved = json.loads(path.read_text())["entries"][0]
                self.assertEqual(saved["old_url"], OLD)
                self.assertEqual(saved["status"], "update-unconfirmed")
                raise TimeoutError()
            api.replace = replace
            with self.assertRaises(TimeoutError):
                migration.optimize_record(api, "profiles", {"id": "one", "avatar": OLD}, True, report, path)
            self.assertEqual(json.loads(path.read_text())["entries"][0]["status"], "update-unconfirmed")

    def test_no_gain_does_not_create_new_files(self):
        api = FakeApi()
        tiny = io.BytesIO()
        Image.new("RGB", (1, 1)).save(tiny, "WEBP", lossless=True)
        api.download = lambda *args: tiny.getvalue()
        status, report, _ = self.run_record(api, True)
        self.assertEqual(status, "no-gain")
        self.assertEqual(api.events, [])

    def test_upload_must_verify_read_back_bytes(self):
        api = migration.Api(BASE, "test-key")
        api.request = Mock(return_value=b"{}")
        api.download = Mock(return_value=b"wrong")
        with self.assertRaises(migration.MigrationError):
            api.upload("avatars", "hash.webp", b"right")

    def test_matching_existing_file_can_be_reused(self):
        api = migration.Api(BASE, "test-key")
        api.request = Mock(side_effect=migration.MigrationError("http-409"))
        api.download = Mock(return_value=b"right")
        api.upload("avatars", "hash.webp", b"right")

    def test_patch_filters_by_id_and_previous_url(self):
        api = migration.Api(BASE, "test-key")
        api.request = Mock(return_value=b'[{"id":"one"}]')
        self.assertTrue(api.replace("profiles", "one", OLD, "new"))
        self.assertEqual(api.request.call_args.kwargs["query"], {"id": "eq.one", "avatar": "eq." + OLD, "select": "id"})

    def test_user_pilot_selects_only_the_requested_profile(self):
        api = migration.Api(BASE, "test-key")
        api.request = Mock(return_value=b'[{"id":"one","avatar":null}]')
        api.rows("profiles", None, "one")
        self.assertEqual(api.request.call_args.kwargs["query"]["id"], "eq.one")

    def test_user_pilot_filters_boss_ownership(self):
        api = migration.Api(BASE, "test-key")
        api.request = Mock(return_value=b'[{"id":"boss","user_id":"one","portrait":null}]')
        api.rows("custom_bosses", None, "one")
        self.assertEqual(api.request.call_args.kwargs["query"]["user_id"], "eq.one")

    def test_user_pilot_rejects_a_response_from_another_account(self):
        api = migration.Api(BASE, "test-key")
        api.request = Mock(return_value=b'[{"id":"other","avatar":null}]')
        with self.assertRaises(migration.MigrationError):
            api.rows("profiles", None, "one")

    def test_rejects_credential_forwarding_redirects(self):
        with self.assertRaises(migration.MigrationError):
            migration.NoRedirect().redirect_request(None, None, 302, "", {}, "https://external.example")

    def test_batch_cursor_stops_at_last_processed_row(self):
        api = FakeApi()
        api.rows = Mock(return_value=[{"id": "one", "avatar": OLD}, {"id": "two", "avatar": OLD}])
        with temporary_directory() as directory:
            report_path = Path(directory) / "batch.json"
            argv = ["migration", "--limit", "1", "--after-id", "initial", "--report", str(report_path)]
            with patch.object(migration, "Api", return_value=api), patch("sys.argv", argv), \
                 patch.dict(migration.os.environ, {"SUPABASE_URL": BASE, "SUPABASE_SERVICE_ROLE_KEY": "test-key"}), \
                 patch("sys.stdout", new_callable=io.StringIO):
                self.assertEqual(migration.main(), 0)
            api.rows.assert_called_once_with("profiles", "initial")
            self.assertEqual(json.loads(report_path.read_text())["summary"]["next_after_id"], "one")
            self.assertEqual(api.events, [])


if __name__ == "__main__":
    unittest.main()
