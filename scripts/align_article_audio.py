#!/usr/bin/env python3
"""Force-align the Studio Classroom reading and export one MP3 per sentence."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

from pocketsphinx import Decoder


TITLE = "Understanding Social Media Algorithms"
BODY_START_SECONDS = 29.4
BODY_END_SECONDS = 131.0

SENTENCES = [
    "The word “algorithm” is used so often in online conversations that it has almost become a buzzword.",
    "When people hear the word “algorithm,” they often imagine a nasty secret plot.",
    "In reality, algorithms are just complex sets of instructions that tell computers how to make decisions.",
    "On social media, their aim is to prioritize which posts, videos or reels appear on users’ screens, not to manipulate users.",
    "Algorithms are used because platforms host so many posts that some kind of organizing system is necessary.",
    "The algorithm begins by showing you a small and varied selection of posts, and then it watches how you respond, paying attention to observable actions rather than private thoughts or personal feelings.",
    "Likes, comments and shares are strong signals.",
    "Scrolling past a post quickly, on the other hand, sends a clear signal that the content failed to hold your attention.",
    "Over time, the system learns your patterns of behavior without asking you any direct questions.",
    "Platforms usually can’t reliably perceive whether you like things or not, but they do understand what makes you react with great accuracy.",
    "By comparing your actions with those of other users, algorithms gradually align what you see with things you have responded to in the past.",
]


def words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z]+(?:['’][A-Za-z]+)?", text.lower().replace("’", "'"))


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    sentence_words = [words(sentence) for sentence in SENTENCES]
    alignment_words = [word for sentence in sentence_words for word in sentence]

    decoder = Decoder()
    if decoder.lookup_word("sandboxes") is None:
        decoder.add_word("sandboxes", "S AE N D B AA K S IH Z", False)
    missing = sorted({word for word in alignment_words if decoder.lookup_word(word) is None})
    if missing:
        raise RuntimeError(f"Words missing from pronunciation dictionary: {missing}")

    with tempfile.TemporaryDirectory() as temp_dir:
        wav_path = Path(temp_dir) / "reading.wav"
        run(
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-ss", str(BODY_START_SECONDS), "-t", str(BODY_END_SECONDS - BODY_START_SECONDS), "-i", str(args.input),
            "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(wav_path),
        )
        raw_audio = wav_path.read_bytes()[44:]

        decoder.set_align_text(" ".join(alignment_words))
        decoder.start_utt()
        decoder.process_raw(raw_audio, full_utt=True)
        decoder.end_utt()
        segments = [segment for segment in decoder.seg() if segment.word not in {"<s>", "</s>", "<sil>"}]

    if len(segments) != len(alignment_words):
        raise RuntimeError(f"Expected {len(alignment_words)} aligned words, got {len(segments)}")

    body_segments = segments
    cursor = 0
    timings = []
    for index, sentence in enumerate(SENTENCES, start=1):
        count = len(sentence_words[index - 1])
        aligned = body_segments[cursor:cursor + count]
        cursor += count
        first_start = BODY_START_SECONDS + aligned[0].start_frame / 100
        last_end = BODY_START_SECONDS + (aligned[-1].end_frame + 1) / 100
        start = max(0, first_start - 0.14)
        end = last_end + 0.18
        output_name = f"sentence-{index:02d}.mp3"
        run(
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(args.input),
            "-map_metadata", "-1", "-ac", "1", "-ar", "44100", "-b:a", "64k",
            str(args.output / output_name),
        )
        timings.append({
            "index": index,
            "start": round(start, 3),
            "end": round(end, 3),
            "duration": round(end - start, 3),
            "audio": output_name,
            "english": sentence,
        })

    (args.output / "timings.json").write_text(json.dumps(timings, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(timings, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
