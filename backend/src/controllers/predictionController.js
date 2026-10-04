const fs = require("fs");
const path = require("path");
const tf = require("@tensorflow/tfjs");

let model = null;
let modelLoadingPromise = null;

const modelDir = path.join(
  __dirname,
  "../../../isl-model/tfjs_unrolled_graph"
);

const mappingPath = path.join(
  __dirname,
  "../../../isl-model/amrita_25_class_mapping.json"
);

async function loadModel() {
  if (model) {
    return model;
  }

  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    console.log("Loading ISL model...");

    const modelJsonPath = path.join(modelDir, "model.json");

    const modelJson = JSON.parse(
      fs.readFileSync(modelJsonPath, "utf8")
    );

    const weightBuffers = [];

    for (const group of modelJson.weightsManifest) {
      for (const weightFile of group.paths) {
        const weightPath = path.join(modelDir, weightFile);

        console.log("Reading:", weightFile);

        weightBuffers.push(fs.readFileSync(weightPath));
      }
    }

    const combinedWeights = Buffer.concat(weightBuffers);

    const weightData = combinedWeights.buffer.slice(
      combinedWeights.byteOffset,
      combinedWeights.byteOffset + combinedWeights.byteLength
    );

    model = await tf.loadGraphModel({
      load: async () => ({
        modelTopology: modelJson.modelTopology,
        weightSpecs: modelJson.weightsManifest.flatMap(
          (group) => group.weights
        ),
        weightData,
      }),
    });

    console.log("ISL MODEL LOADED SUCCESSFULLY!");

    return model;
  })();

  return modelLoadingPromise;
}

async function predictSign(req, res) {
  try {
    const { sequence } = req.body;

    // Validate sequence
    if (!Array.isArray(sequence)) {
      return res.status(400).json({
        success: false,
        message: "Sequence must be an array.",
      });
    }

    if (sequence.length !== 30) {
      return res.status(400).json({
        success: false,
        message: "Sequence must contain exactly 30 frames.",
      });
    }

    for (let i = 0; i < sequence.length; i++) {
      if (!Array.isArray(sequence[i]) || sequence[i].length !== 126) {
        return res.status(400).json({
          success: false,
          message: `Frame ${i + 1} must contain exactly 126 features.`,
        });
      }

      for (const value of sequence[i]) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          return res.status(400).json({
            success: false,
            message: "Sequence contains an invalid number.",
          });
        }
      }
    }

    const loadedModel = await loadModel();

    // [30,126] → [1,30,126]
    const inputTensor = tf.tensor3d(
      [sequence],
      [1, 30, 126],
      "float32"
    );

    console.log("Running ISL prediction...");

    const prediction = loadedModel.predict(inputTensor);

    const values = Array.from(await prediction.data());

    // Find highest-scoring class
    let maxIndex = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[maxIndex]) {
        maxIndex = i;
      }
    }

    // Load class mapping
    const mapping = JSON.parse(
      fs.readFileSync(mappingPath, "utf8")
    );

    const predictedLabel = mapping.classes[maxIndex];

    const result = {
      success: true,
      prediction: predictedLabel,
      classIndex: maxIndex,
      score: values[maxIndex],
    };

    console.log("Prediction:", predictedLabel);
    console.log("Class index:", maxIndex);
    console.log("Score:", values[maxIndex]);

    inputTensor.dispose();

    if (prediction.dispose) {
      prediction.dispose();
    }

    return res.json(result);

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
  predictSign,
};