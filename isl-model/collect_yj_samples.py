
from pathlib import Path
from datetime import datetime
import cv2

PROJECT_DIR = Path(__file__).resolve().parent
DATASET_DIR = PROJECT_DIR / "dataset"
MAX_PER_CLASS = 200

def find_training_folder():
    aliases = ("training", "train")
    for folder in DATASET_DIR.rglob("*"):
        if not folder.is_dir():
            continue

        name = folder.name.lower().replace("_", " ").strip()
        if not any(
            name == alias
            or name.startswith(alias + " ")
            or name.startswith(alias + "(")
            for alias in aliases
        ):
            continue

        if (folder / "Y").is_dir() and (folder / "J").is_dir():
            return folder

    raise FileNotFoundError(
        "Could not find the training split with Y and J folders. "
        "Check the folders inside your dataset directory."
    )

def main():
    training_dir = find_training_folder()
    counts = {
        letter: len([
            p for p in (training_dir / letter).iterdir()
            if p.is_file() and p.suffix.lower() in
            {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
            and p.stem.startswith("custom_")
        ])
        for letter in ("Y", "J")
    }

    selected = "Y"
    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        raise RuntimeError(
            "Could not open webcam. Close other camera applications and try again."
        )

    print("Y/J CUSTOM SAMPLE COLLECTION")
    print("Press Y to select Y, J to select J.")
    print("Show the correct sign, then press S to save an image.")
    print("Press Q to quit.")

    try:
        while True:
            ok, frame = camera.read()
            if not ok:
                print("Could not read a webcam frame.")
                break

            display = cv2.flip(frame, 1)
            cv2.putText(
                display, f"Selected: {selected} | Saved: {counts[selected]}/{MAX_PER_CLASS}",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 0), 2
            )
            cv2.putText(
                display, "Y/J: select class | S: save | Q: quit",
                (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2
            )
            cv2.imshow("Collect Y and J samples", display)

            key = cv2.waitKey(1) & 0xFF

            if key == ord("q"):
                break
            elif key == ord("y"):
                selected = "Y"
            elif key == ord("j"):
                selected = "J"
            elif key == ord("s"):
                if counts[selected] >= MAX_PER_CLASS:
                    print(f"{selected}: already saved {MAX_PER_CLASS} custom images.")
                    continue

                folder = training_dir / selected
                filename = (
                    f"custom_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
                )
                output_path = folder / filename

                # Save the original, unmirrored camera frame.
                if cv2.imwrite(str(output_path), frame):
                    counts[selected] += 1
                    print(f"Saved {selected}: {output_path} "
                          f"({counts[selected]}/{MAX_PER_CLASS})")
    finally:
        camera.release()
        cv2.destroyAllWindows()

    print("\nCollection finished.")
    print(f"Y custom images saved: {counts['Y']}")
    print(f"J custom images saved: {counts['J']}")
    print("Next: run your existing landmark extraction and training scripts.")

if __name__ == "__main__":
    main()
