const fs = require("fs");
const path = require("path");
const tf = require("@tensorflow/tfjs");

let model = null;
let modelLoadingPromise = null;
let labels = [];

const modelDir = path.resolve(__dirname, "../../../isl-model");
const tfjsModelJsonPath = path.join(modelDir, "tfjs_model", "model.json");
const weightsJsonPath = path.join(modelDir, "weights.json");
const labelsPath = path.join(modelDir, "labels_two_hand.json");
const fallbackLabelsPath = path.join(modelDir, "labels.json");

/**
 * Load labels from JSON file
 */
function loadLabels() {
  if (labels.length > 0) return labels;

  try {
    if (fs.existsSync(labelsPath)) {
      labels = JSON.parse(fs.readFileSync(labelsPath, "utf8"));
    } else if (fs.existsSync(fallbackLabelsPath)) {
      labels = JSON.parse(fs.readFileSync(fallbackLabelsPath, "utf8"));
    } else {
      labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    }
  } catch (err) {
    console.error("Failed to load labels file, using default A-Z:", err);
    labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  }

  return labels;
}

/**
 * Build and load the ISL Word Recognition Model
 */
async function loadModel() {
  if (model) {
    return model;
  }

  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    console.log("Loading ISL Word Recognition model...");
    loadLabels();

    // Strategy 1: Try loading via tf.loadLayersModel from tfjs_model
    try {
      if (fs.existsSync(tfjsModelJsonPath)) {
        const modelJson = JSON.parse(fs.readFileSync(tfjsModelJsonPath, "utf8"));
        const shardDir = path.dirname(tfjsModelJsonPath);
        const weightBuffers = [];

        for (const group of modelJson.weightsManifest) {
          for (const shardFile of group.paths) {
            const shardPath = path.join(shardDir, shardFile);
            weightBuffers.push(fs.readFileSync(shardPath));
          }
        }

        const combinedWeights = Buffer.concat(weightBuffers);
        const weightData = combinedWeights.buffer.slice(
          combinedWeights.byteOffset,
          combinedWeights.byteOffset + combinedWeights.byteLength
        );

        model = await tf.loadLayersModel({
          load: async () => ({
            modelTopology: modelJson.modelTopology,
            weightSpecs: modelJson.weightsManifest.flatMap((g) => g.weights),
            weightData,
          }),
        });

        console.log("ISL Word Recognition model loaded via tfjs_model!");
        return model;
      }
    } catch (err) {
      console.warn("Could not load from tfjs_model, falling back to weights.json:", err.message);
    }

    // Strategy 2: Build Sequential model and load from weights.json
    try {
      if (fs.existsSync(weightsJsonPath)) {
        const weights = JSON.parse(fs.readFileSync(weightsJsonPath, "utf8"));

        const seqModel = tf.sequential();
        seqModel.add(tf.layers.dense({ inputShape: [126], units: 256, activation: "relu", name: "dense" }));
        seqModel.add(tf.layers.batchNormalization({ name: "batch_normalization" }));
        seqModel.add(tf.layers.dense({ units: 128, activation: "relu", name: "dense_1" }));
        seqModel.add(tf.layers.dense({ units: labels.length || 26, activation: "softmax", name: "dense_2" }));

        seqModel.layers[0].setWeights([
          tf.tensor2d(weights.dense_kernel, [126, 256]),
          tf.tensor1d(weights.dense_bias),
        ]);

        seqModel.layers[1].setWeights([
          tf.tensor1d(weights.bn_gamma),
          tf.tensor1d(weights.bn_beta),
          tf.tensor1d(weights.bn_mean),
          tf.tensor1d(weights.bn_var),
        ]);

        seqModel.layers[2].setWeights([
          tf.tensor2d(weights.dense1_kernel, [256, 128]),
          tf.tensor1d(weights.dense1_bias),
        ]);

        seqModel.layers[3].setWeights([
          tf.tensor2d(weights.dense2_kernel, [128, labels.length || 26]),
          tf.tensor1d(weights.dense2_bias),
        ]);

        model = seqModel;
        console.log("ISL Word Recognition model constructed from weights.json!");
        return model;
      }
    } catch (err) {
      console.error("Failed to load weights.json:", err);
      throw err;
    }

    throw new Error(`ISL Word Recognition model files not found in ${modelDir}`);
  })();

  return modelLoadingPromise;
}

/**
 * Geometric helper: computes 3D Euclidean distance between landmark points
 */
function dist3D(pts, i, j) {
  const dx = pts[i * 3] - pts[j * 3];
  const dy = pts[i * 3 + 1] - pts[j * 3 + 1];
  const dz = pts[i * 3 + 2] - pts[j * 3 + 2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Analyze finger extension states and directions from a 63-feature hand array
 */
function analyzeHandFingers(hand63) {
  let isAllZero = true;
  for (let i = 0; i < 63; i++) {
    if (hand63[i] !== 0) {
      isAllZero = false;
      break;
    }
  }
  if (isAllZero) return null;

  // Wrist is at index 0 (0, 1, 2)
  const dThumb = dist3D(hand63, 4, 0) > dist3D(hand63, 2, 0);
  const dIndex = dist3D(hand63, 8, 0) > dist3D(hand63, 6, 0);
  const dMiddle = dist3D(hand63, 12, 0) > dist3D(hand63, 10, 0);
  const dRing = dist3D(hand63, 16, 0) > dist3D(hand63, 14, 0);
  const dPinky = dist3D(hand63, 20, 0) > dist3D(hand63, 18, 0);

  // Distances for geometric signatures
  const loopDist = dist3D(hand63, 4, 8); // Thumb tip (4) to Index tip (8)
  const imSpread = dist3D(hand63, 8, 12); // Index tip (8) to Middle tip (12)

  // Middle fingertip relative to wrist (index 12)
  const midX = hand63[12 * 3];
  const midY = hand63[12 * 3 + 1];

  return {
    thumb: dThumb,
    index: dIndex,
    middle: dMiddle,
    ring: dRing,
    pinky: dPinky,
    allOpen: dThumb && dIndex && dMiddle && dRing && dPinky,
    isTwoFinger: dIndex && dMiddle && !dRing && !dPinky,
    isThreeFinger: dIndex && dMiddle && dRing && !dPinky,
    loopDist,
    imSpread,
    midX,
    midY,
  };
}

/**
 * Handle POST /api/predict with Conservative Dual-Slot & Targeted Geometric Disambiguation
 */
async function predictSign(req, res) {
  try {
    const { features, vector, sequence } = req.body;

    let inputFeatures = null;

    if (Array.isArray(features) && features.length === 126) {
      inputFeatures = features;
    } else if (Array.isArray(vector) && vector.length === 126) {
      inputFeatures = vector;
    } else if (Array.isArray(sequence)) {
      if (sequence.length === 126 && typeof sequence[0] === "number") {
        inputFeatures = sequence;
      } else if (sequence.length > 0) {
        const lastFrame = sequence[sequence.length - 1];
        if (Array.isArray(lastFrame) && lastFrame.length === 126) {
          inputFeatures = lastFrame;
        }
      }
    }

    if (!inputFeatures || inputFeatures.length !== 126) {
      return res.status(400).json({
        success: false,
        message: "Invalid input. Expected a 126-feature vector (63 Left hand + 63 Right hand).",
      });
    }

    for (let i = 0; i < inputFeatures.length; i++) {
      if (typeof inputFeatures[i] !== "number" || !Number.isFinite(inputFeatures[i])) {
        return res.status(400).json({
          success: false,
          message: `Frame feature at index ${i} is not a valid number.`,
        });
      }
    }

    const loadedModel = await loadModel();
    const classLabels = loadLabels();

    const leftHand63 = inputFeatures.slice(0, 63);
    const rightHand63 = inputFeatures.slice(63, 126);

    const leftFingers = analyzeHandFingers(leftHand63);
    const rightFingers = analyzeHandFingers(rightHand63);
    const isOneHand = (leftFingers === null) !== (rightFingers === null);

    let bestValues = null;

    if (isOneHand) {
      // Single hand detected:
      // The training dataset trained 1-hand signs (C, I, L, O, U, V, etc.) in the Right slot.
      // We test BOTH [zeros, hand] and [hand, zeros] and select the orientation with higher max confidence.
      const activeHand = leftFingers ? leftHand63 : rightHand63;
      const inRight = [...new Array(63).fill(0), ...activeHand];
      const inLeft = [...activeHand, ...new Array(63).fill(0)];

      const tR = tf.tensor2d([inRight], [1, 126], "float32");
      const pR = Array.from(await loadedModel.predict(tR).data());
      tR.dispose();

      const tL = tf.tensor2d([inLeft], [1, 126], "float32");
      const pL = Array.from(await loadedModel.predict(tL).data());
      tL.dispose();

      let maxR = 0, maxL = 0;
      for (let j = 1; j < classLabels.length; j++) {
        if (pR[j] > pR[maxR]) maxR = j;
        if (pL[j] > pL[maxL]) maxL = j;
      }

      if (pR[maxR] >= pL[maxL]) {
        bestValues = pR;
      } else {
        bestValues = pL;
      }
    } else {
      // Two hands: normal orientation first
      const tensorNormal = tf.tensor2d([inputFeatures], [1, 126], "float32");
      const predNormal = loadedModel.predict(tensorNormal);
      const valuesNormal = Array.from(await predNormal.data());
      tensorNormal.dispose();
      if (predNormal.dispose) predNormal.dispose();

      bestValues = valuesNormal;
      let maxN = 0;
      for (let j = 1; j < valuesNormal.length; j++) {
        if (valuesNormal[j] > valuesNormal[maxN]) maxN = j;
      }

      // Only swap if normal orientation is weak (< 0.65) AND hands are not both open (prevents false Z on W)
      const bothOpen = leftFingers?.allOpen && rightFingers?.allOpen;
      if (valuesNormal[maxN] < 0.65 && !bothOpen) {
        const swappedFeatures = [...rightHand63, ...leftHand63];
        const tensorSwapped = tf.tensor2d([swappedFeatures], [1, 126], "float32");
        const predSwapped = loadedModel.predict(tensorSwapped);
        const valuesSwapped = Array.from(await predSwapped.data());
        tensorSwapped.dispose();
        if (predSwapped.dispose) predSwapped.dispose();

        let swapIdx = 0;
        for (let j = 1; j < valuesSwapped.length; j++) {
          if (valuesSwapped[j] > valuesSwapped[swapIdx]) swapIdx = j;
        }

        if (valuesSwapped[swapIdx] >= 0.70 && valuesSwapped[swapIdx] > valuesNormal[maxN] + 0.15) {
          bestValues = valuesSwapped;
        }
      }
    }

    let maxIdx = 0;
    for (let i = 1; i < bestValues.length; i++) {
      if (bestValues[i] > bestValues[maxIdx]) maxIdx = i;
    }

    let predictedLabel = classLabels[maxIdx] || "?";
    let confidence = bestValues[maxIdx];

    // Precision Targeted Geometric Disambiguation
    const activeFingers = rightFingers || leftFingers;
    const mIdx = classLabels.indexOf("M");
    const nIdx = classLabels.indexOf("N");
    const oIdx = classLabels.indexOf("O");
    const qIdx = classLabels.indexOf("Q");
    const sIdx = classLabels.indexOf("S");
    const vIdx = classLabels.indexOf("V");
    const wIdx = classLabels.indexOf("W");
    const zIdx = classLabels.indexOf("Z");
    const iIdx = classLabels.indexOf("I");

    // 1. ISL Q Disambiguation (Two hands: one hand forms thumb-index loop, other points index)
    if (leftFingers && rightFingers) {
      const isQL = (leftFingers.loopDist < 0.16 && rightFingers.index && !rightFingers.middle && !rightFingers.ring && !rightFingers.pinky);
      const isQR = (rightFingers.loopDist < 0.16 && leftFingers.index && !leftFingers.middle && !leftFingers.ring && !leftFingers.pinky);
      if (isQL || isQR) {
        maxIdx = qIdx;
        predictedLabel = "Q";
        confidence = Math.max(confidence, 0.96);
      }
    }
    // Single-hand ASL Q: Thumb and index pointing down, others curled
    if (isOneHand && activeFingers && activeFingers.thumb && activeFingers.index && !activeFingers.middle && !activeFingers.ring && !activeFingers.pinky && activeFingers.midY > 0) {
      maxIdx = qIdx;
      predictedLabel = "Q";
      confidence = Math.max(confidence, 0.95);
    }

    // 2. ISL N & M Disambiguation (Two hands: one base/palm + 2 or 3 fingers)
    if (leftFingers && rightFingers) {
      const h1 = leftFingers, h2 = rightFingers;
      const isBase1 = h1.allOpen || (!h1.isTwoFinger && !h1.isThreeFinger);
      const isBase2 = h2.allOpen || (!h2.isTwoFinger && !h2.isThreeFinger);

      if ((isBase1 && h2.isTwoFinger) || (isBase2 && h1.isTwoFinger)) {
        maxIdx = nIdx;
        predictedLabel = "N";
        confidence = Math.max(confidence, 0.96);
      } else if ((isBase1 && h2.isThreeFinger) || (isBase2 && h1.isThreeFinger)) {
        maxIdx = mIdx;
        predictedLabel = "M";
        confidence = Math.max(confidence, 0.96);
      }
    }

    // Single-hand N Disambiguation:
    if (isOneHand && activeFingers && activeFingers.isTwoFinger && activeFingers.imSpread < 0.20) {
      // 2 fingers together (not wide V): if curled or model predicted N/U, resolve to N
      if (["N", "U", "V", "H"].includes(predictedLabel) && activeFingers.midY >= 0) {
        maxIdx = nIdx;
        predictedLabel = "N";
        confidence = Math.max(confidence, 0.94);
      }
    }

    // 3. V Disambiguation (Index & Middle spread open in wide V)
    if (activeFingers && ["Y", "W", "U", "H"].includes(predictedLabel)) {
      if (activeFingers.index && activeFingers.middle && !activeFingers.ring && activeFingers.imSpread > 0.22) {
        maxIdx = vIdx;
        predictedLabel = "V";
        confidence = Math.max(confidence, 0.95);
      }
    }

    // 4. W Disambiguation:
    // Single-hand W support (3 fingers: Index, Middle, Ring up)
    if (isOneHand && activeFingers && activeFingers.index && activeFingers.middle && activeFingers.ring && !activeFingers.pinky) {
      maxIdx = wIdx;
      predictedLabel = "W";
      confidence = Math.max(confidence, 0.95);
    }
    // Two-hand W support (both open palms, low asymmetry)
    if (leftFingers && rightFingers && leftFingers.allOpen && rightFingers.allOpen) {
      const asymmetry = Math.abs(Math.abs(leftFingers.midX) - Math.abs(rightFingers.midX));
      if (asymmetry < 0.35 && ["B", "Z"].includes(predictedLabel)) {
        if (bestValues[wIdx] > 0.15) {
          maxIdx = wIdx;
          predictedLabel = "W";
          confidence = Math.max(confidence, 0.92);
        }
      }
    }

    // 5. Z Disambiguation: requires high horizontal/vertical angle asymmetry (> 0.38)
    if (leftFingers && rightFingers && predictedLabel === "Z") {
      const asymmetry = Math.abs(Math.abs(leftFingers.midX) - Math.abs(rightFingers.midX));
      if (asymmetry < 0.35) {
        if (bestValues[wIdx] > bestValues[classLabels.indexOf("B")]) {
          maxIdx = wIdx;
          predictedLabel = "W";
          confidence = Math.max(bestValues[wIdx], 0.88);
        } else {
          maxIdx = classLabels.indexOf("B");
          predictedLabel = "B";
          confidence = Math.max(bestValues[maxIdx], 0.88);
        }
      }
    }

    // 6. S Disambiguation: Closed fist
    if (activeFingers && ["N", "C", "Q"].includes(predictedLabel)) {
      if (!activeFingers.index && !activeFingers.middle && !activeFingers.ring) {
        maxIdx = sIdx;
        predictedLabel = "S";
        confidence = Math.max(confidence, 0.95);
      }
    }

    // 7. ASL/ISL I support (Pinky extended alone or Index extended alone, when not O)
    if (isOneHand && activeFingers && activeFingers.pinky && !activeFingers.index && !activeFingers.middle && !activeFingers.ring && predictedLabel !== "O" && bestValues[oIdx] < 0.60) {
      maxIdx = iIdx;
      predictedLabel = "I";
      confidence = Math.max(confidence, 0.96);
    }

    return res.json({
      success: true,
      prediction: predictedLabel,
      classIndex: maxIdx,
      score: confidence,
      probabilities: bestValues,
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return res.status(500).json({
      success: false,
      message: "Prediction failed.",
      error: error.message,
    });
  }
}

module.exports = {
  loadModel,
  predictSign,
};
