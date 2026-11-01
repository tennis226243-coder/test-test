import io
import json
import os
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_portraits as gp  # noqa: E402
from PIL import Image  # noqa: E402

HEROINES = [
    {"id": "hina", "age": 20, "appearance": "short hair"},
    {"id": "rei", "age": 23, "appearance": "long hair"},
]
LOCATIONS = [{"id": "cafe", "name": "カフェ"}, {"id": "home", "name": "自宅"}]


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode()

    def read(self):
        return self.payload

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def image_response(data=b"PNGDATA"):
    import base64
    return FakeResponse({"candidates": [{"content": {"parts": [{"text": "ok"}, {"inlineData": {"mimeType": "image/png", "data": base64.b64encode(data).decode()}}]}}]})


def http_error(code):
    return urllib.error.HTTPError("u", code, "err", {}, io.BytesIO(b"{}"))


class PlanJobsTest(unittest.TestCase):
    def test_all_jobs_when_nothing_exists(self):
        jobs = gp.plan_jobs(HEROINES, LOCATIONS, only=None, force=False, exists_fn=lambda p: False)
        self.assertEqual(len(jobs), 2 * 5 + 2)

    def test_existing_files_are_skipped(self):
        jobs = gp.plan_jobs(HEROINES, LOCATIONS, None, False, exists_fn=lambda p: "hina" in str(p))
        self.assertFalse(any(j.id == "hina" for j in jobs))

    def test_force_regenerates_existing(self):
        jobs = gp.plan_jobs(HEROINES, LOCATIONS, None, True, exists_fn=lambda p: True)
        self.assertEqual(len(jobs), 12)

    def test_only_filters(self):
        jobs = gp.plan_jobs(HEROINES, LOCATIONS, ["hina:smile", "bg:cafe"], False, exists_fn=lambda p: False)
        self.assertEqual([(j.kind, j.id, j.expr) for j in jobs], [("portrait", "hina", "smile"), ("background", "cafe", None)])

    def test_only_regenerates_existing_files(self):
        jobs = gp.plan_jobs(HEROINES, LOCATIONS, ["hina:smile"], False, exists_fn=lambda p: True)
        self.assertEqual([(j.id, j.expr) for j in jobs], [("hina", "smile")])

    def test_expressions_come_after_normal(self):
        jobs = gp.plan_jobs(HEROINES, LOCATIONS, None, False, exists_fn=lambda p: False)
        hina = [j.expr for j in jobs if j.id == "hina"]
        self.assertEqual(hina[0], "normal")
        self.assertEqual(set(hina), set(gp.EXPRESSIONS))


class PromptTest(unittest.TestCase):
    def test_portrait_prompt_states_adult_age(self):
        p = gp.build_portrait_prompt(HEROINES[1])
        self.assertIn("adult", p.lower())
        self.assertIn("23", p)
        self.assertIn("long hair", p)
        self.assertIn("#00FF00", p)

    def test_expression_prompt_names_expression(self):
        self.assertIn("shy", gp.build_expression_prompt(HEROINES[0], "shy").lower())


class RemoveGreenTest(unittest.TestCase):
    def test_green_becomes_transparent_and_red_stays(self):
        img = Image.new("RGB", (2, 1))
        img.putpixel((0, 0), (0, 255, 0))
        img.putpixel((1, 0), (200, 30, 30))
        out = gp.remove_green(img)
        self.assertEqual(out.getpixel((0, 0))[3], 0)
        self.assertEqual(out.getpixel((1, 0))[3], 255)


class CallGeminiTest(unittest.TestCase):
    def test_returns_image_bytes(self):
        opener = mock.Mock(return_value=image_response(b"abc"))
        self.assertEqual(gp.call_gemini("p", api_key="k", opener=opener, sleep=lambda s: None), b"abc")
        req = opener.call_args[0][0]
        self.assertEqual(req.get_header("X-goog-api-key"), "k")
        body = json.loads(req.data)
        self.assertEqual(body["contents"][0]["parts"][0]["text"], "p")

    def test_sends_reference_image(self):
        opener = mock.Mock(return_value=image_response())
        gp.call_gemini("p", ref_image_bytes=b"ref", api_key="k", opener=opener, sleep=lambda s: None)
        parts = json.loads(opener.call_args[0][0].data)["contents"][0]["parts"]
        self.assertIn("inline_data", parts[1])

    def test_retries_rate_limit_then_succeeds(self):
        waits = []
        opener = mock.Mock(side_effect=[http_error(429), http_error(503), image_response(b"ok")])
        self.assertEqual(gp.call_gemini("p", api_key="k", opener=opener, sleep=waits.append), b"ok")
        self.assertEqual(waits, [2, 4])

    def test_retries_network_errors(self):
        waits = []
        opener = mock.Mock(side_effect=[urllib.error.URLError("reset"), TimeoutError(), image_response(b"ok")])
        self.assertEqual(gp.call_gemini("p", api_key="k", opener=opener, sleep=waits.append), b"ok")
        self.assertEqual(waits, [2, 4])

    def test_gives_up_after_four_retries(self):
        opener = mock.Mock(side_effect=[http_error(429)] * 5)
        with self.assertRaises(urllib.error.HTTPError):
            gp.call_gemini("p", api_key="k", opener=opener, sleep=lambda s: None)
        self.assertEqual(opener.call_count, 5)

    def test_no_image_part_is_refusal(self):
        opener = mock.Mock(return_value=FakeResponse({"candidates": [{"finishReason": "SAFETY", "content": {"parts": [{"text": "no"}]}}]}))
        with self.assertRaises(gp.GenerationRefused):
            gp.call_gemini("p", api_key="k", opener=opener, sleep=lambda s: None)


class MainTest(unittest.TestCase):
    def test_missing_key_exits_2(self):
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch("sys.stdout", new_callable=io.StringIO) as out:
            self.assertEqual(gp.main([]), 2)
        self.assertIn("GEMINI_API_KEY", out.getvalue())

    def test_refused_job_is_skipped_and_others_continue(self):
        calls = []

        def fake_run(job, api_key):
            calls.append(job.id)
            if job.id == "cafe":
                raise gp.GenerationRefused("SAFETY")

        jobs = [gp.Job("background", "cafe", None, Path("a")), gp.Job("background", "home", None, Path("b"))]
        refused = gp.run_jobs(jobs, "k", run_one=fake_run)
        self.assertEqual(calls, ["cafe", "home"])
        self.assertEqual([j.id for j, _ in refused], ["cafe"])

    def test_unexpected_error_on_one_job_does_not_stop_others(self):
        calls = []

        def fake_run(job, api_key):
            calls.append(job.id)
            if job.id == "cafe":
                raise urllib.error.URLError("dns")

        jobs = [gp.Job("background", "cafe", None, Path("a")), gp.Job("background", "home", None, Path("b"))]
        refused = gp.run_jobs(jobs, "k", run_one=fake_run)
        self.assertEqual(calls, ["cafe", "home"])
        self.assertEqual(len(refused), 1)

    def test_manifest_written_even_if_run_crashes(self):
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": "k"}), \
                mock.patch.object(gp, "run_jobs", side_effect=KeyboardInterrupt), \
                mock.patch.object(gp, "write_manifest", return_value={"portraits": {}, "backgrounds": []}) as wm, \
                mock.patch.object(gp, "write_contact_sheet"), mock.patch("sys.stdout", new_callable=io.StringIO):
            with self.assertRaises(KeyboardInterrupt):
                gp.main([])
        wm.assert_called_once()


if __name__ == "__main__":
    unittest.main()
