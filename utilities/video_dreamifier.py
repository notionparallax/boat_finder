#!/usr/bin/env python3
import argparse
import subprocess
import sys
from pathlib import Path

def run_ffmpeg(cmd):
    print("Running FFmpeg:")
    print(" ".join(cmd))
    process = subprocess.run(cmd)
    if process.returncode != 0:
        print("FFmpeg failed with exit code", process.returncode)
        sys.exit(process.returncode)

def main():
    parser = argparse.ArgumentParser(
        description="Prepare a blurred, slowed-down background video."
    )

    parser.add_argument("input", help="Input video file")
    parser.add_argument("output", help="Output video file (e.g., output.webm)")
    parser.add_argument("--start", default=None, help="Start time (e.g., 00:00:10)")
    parser.add_argument("--end", default=None, help="End time (e.g., 00:00:25)")
    parser.add_argument("--slow", type=float, default=4.0,
                        help="Slowdown factor (4.0 = quarter speed)")
    parser.add_argument("--blur", type=float, default=12.0,
                        help="Gaussian blur sigma value")
    parser.add_argument("--width", type=int, default=854,
                        help="Output width (height auto-scaled)")

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print("Input file does not exist:", input_path)
        sys.exit(1)

    # Build FFmpeg command
    cmd = ["ffmpeg"]

    # Optional trim
    if args.start:
        cmd += ["-ss", args.start]
    if args.end:
        cmd += ["-to", args.end]

    cmd += ["-i", str(input_path)]

    # Filter chain
    filter_chain = (
        f"minterpolate='mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=60',"
        f"setpts={args.slow}*PTS,"
        f"gblur=sigma={args.blur},"
        f"scale={args.width}:-1"
    )

    cmd += [
        "-filter_complex", filter_chain,
        "-c:v", "libvpx-vp9",
        "-b:v", "800k",
        "-pix_fmt", "yuv420p",
        str(args.output)
    ]

    run_ffmpeg(cmd)

if __name__ == "__main__":
    main()
