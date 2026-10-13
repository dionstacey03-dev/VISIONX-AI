"""Download the official TensorFlow COCO-SSD model for local browser inference."""
import json
import os
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public/models/coco-ssd"
BASE = "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/"


def download(name):
    target = DEST / name
    temporary = target.with_name(target.name + ".tmp")
    try:
        with urlopen(BASE + name, timeout=120) as response, temporary.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    download("model.json")
    model = json.loads((DEST / "model.json").read_text())
    paths = [path for group in model["weightsManifest"] for path in group["paths"]]
    for name in paths:
        if Path(name).name != name:
            raise ValueError("Unexpected model shard path")
        download(name)
    print(f"Downloaded COCO-SSD model and {len(paths)} weight shards to {DEST}")


if __name__ == "__main__":
    main()
