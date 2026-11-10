# Two-hand ISL recognition update

The old model used 63 features for one hand. This version uses 126 features (left hand 63 + right hand 63), and uses zeroes for a missing hand.

1. Copy the three updated Python files into `D:\ISL_Word_Recognition`, replacing the existing scripts.
2. Keep your current `dataset` folder. No new dataset download is needed.
3. Run `python extract_landmarks.py` to regenerate all processed `.npz` files with 126 features. This may take time.
4. Run `python train_model.py` to train the new model.
5. Run `python realtime_app.py` to use the two-hand model.

New model files are named `isl_alphabet_two_hand.keras` and `labels_two_hand.json`; the original model is not deleted.

Important: the new model can only learn two-hand signs if the dataset images actually show both hands for those classes. If the dataset uses one hand for some letters, the zero-filled second-hand vector is expected for those examples. If MediaPipe reports left/right inconsistently because of image mirroring, the handedness convention may need further adjustment.
