# ISL Fingerspelling-to-Word Recognition (Windows)

This project trains an A-Z static alphabet classifier from an existing ISL alphabet image dataset.
MediaPipe extracts 21 hand landmarks (63 values); TensorFlow/Keras learns to classify those values.
The webcam app adds one stable prediction at a time to a text buffer.

## 1. Requirements

- Windows 10/11, 64-bit
- Python 3.11 (64-bit)
- Webcam
- Internet connection for initial package installation and dataset download

Native Windows TensorFlow uses CPU in this setup. Your NVIDIA GPU is not required for this small landmark classifier.

## 2. Create the environment

Open Command Prompt:

```bat
mkdir D:\ISL_Word_Recognition
cd /d D:\ISL_Word_Recognition
py -3.11 -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
```

Copy the project files into this folder, then install dependencies:

```bat
pip install -r requirements.txt
```

If `py -3.11` is not recognized, install 64-bit Python 3.11 from https://www.python.org/downloads/ and select "Add python.exe to PATH".

## 3. Download the dataset

Dataset: https://github.com/RealSign62/RealSign-Indian-Sign-Language-Dataset

Download `Dataset.zip` from the repository and extract it. Put the split folders inside this project's `dataset` directory. The expected structure is:

```text
D:\ISL_Word_Recognition\
  dataset\
    Training\
      A\
      B\
      ...
      Z\
    Validation\
      A\
      B\
      ...
      Z\
    Testing\
      A\
      B\
      ...
      Z\
  extract_landmarks.py
  train_model.py
  realtime_app.py
```

The scripts also accept split folder names like `Training (A-Z)`. If extraction creates an extra `Dataset` directory, that is okay: the script searches below `dataset`.

Do not mix training images into validation/test folders. Keep the dataset's official splits.

## 4. Extract landmarks

```bat
python extract_landmarks.py
```

This creates `processed\train.npz`, `processed\validation.npz`, and `processed\test.npz`.

The console reports how many images in each class produced hand landmarks. Some images may be skipped if MediaPipe cannot confidently detect a hand.

## 5. Train and evaluate

```bat
python train_model.py
```

The best model is saved as `models\isl_alphabet.keras`, with `models\labels.json`.
The script reports held-out test accuracy and a per-class classification report, and saves accuracy/loss curves and a confusion matrix.

Do not claim an accuracy before you run this on your actual dataset. Real-world webcam accuracy may be lower than dataset test accuracy.

## 6. Run the webcam app

```bat
python realtime_app.py
```

- Hold one alphabet sign steadily until it is accepted.
- Briefly move your hand out of the camera view between letters.
- `SPACE`: add a space between words.
- `BACKSPACE`: delete the last character.
- `C`: clear all text.
- `Q`: quit.

For example, show H, remove your hand, show E, remove your hand, then L, L, O. The output buffer should become `HELLO`.

## 7. Troubleshooting

### Cannot find Training/Validation/Testing
Check that the folders are under this project's `dataset` directory and that each split contains folders named A through Z.

### Very few landmarks extracted
Use clear, non-blurry images, make sure the hand is visible and not cut off, and check that the downloaded images show a single hand. The extraction log gives counts per class. If a class has almost no extracted images, stop and inspect sample images before training.

### Webcam is black or not detected
Close Teams/Zoom/Camera, try another USB port, or change `cv2.VideoCapture(0, ...)` to camera index `1` in `realtime_app.py`.

### App predicts wrong letters
Improve lighting, keep the whole hand visible, lower `CONFIDENCE_THRESHOLD` slightly only if necessary, and compare the confusion matrix. Dataset images and your webcam conditions may differ. You can collect extra webcam images and retrain later.

### Repeated letters
The app accepts one character per hand presentation. Remove your hand until the app is re-armed before the next character. This is important for repeated letters like `LL`.

## Limitations

This first version recognizes static alphabet poses. It is not full continuous sign-language translation and does not infer sentence grammar or facial/body cues. Movement-based signs may require sequence data and a temporal model. The dataset's held-out test score is not a guarantee of accuracy for every person or camera.
