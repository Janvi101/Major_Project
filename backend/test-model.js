const path = require("path");
const tf = require("@tensorflow/tfjs");
const { loadModel } = require("./src/controllers/predictionController");
const fs = require("fs");

async function testModel() {
  try {
    console.log("========================================");
    console.log("TESTING ISL WORD RECOGNITION MODEL");
    console.log("========================================");

    const labelsPath = path.resolve(__dirname, "../isl-model/labels_two_hand.json");
    const labels = JSON.parse(fs.readFileSync(labelsPath, "utf8"));
    console.log(`Loaded ${labels.length} classes:`, labels.join(", "));

    console.log("\nLoading model...");
    const model = await loadModel();

    console.log("\nModel summary:");
    model.summary();

    console.log("\nTesting prediction on 126-feature dummy vector...");
    const dummyFeatures = new Array(126).fill(0);
    const inputTensor = tf.tensor2d([dummyFeatures], [1, 126], "float32");

    const prediction = model.predict(inputTensor);
    const probabilities = Array.from(await prediction.data());

    let maxIndex = 0;
    for (let i = 1; i < probabilities.length; i++) {
      if (probabilities[i] > probabilities[maxIndex]) {
        maxIndex = i;
      }
    }

    console.log("Predicted class:", labels[maxIndex]);
    console.log("Confidence:", (probabilities[maxIndex] * 100).toFixed(2) + "%");

    inputTensor.dispose();
    if (prediction.dispose) prediction.dispose();

    console.log("\n========================================");
    console.log("TEST PASSED SUCCESSFULLY!");
    console.log("========================================");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testModel();
