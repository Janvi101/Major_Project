const fs = require("fs");
const tf = require("@tensorflow/tfjs");
const { loadModel } = require("./src/controllers/predictionController");

async function testAll() {
  const labels = JSON.parse(fs.readFileSync("../isl-model/labels_two_hand.json", "utf8"));
  const samples = JSON.parse(fs.readFileSync("../isl-model/sample_test_vectors.json", "utf8"));
  const model = await loadModel();

  console.log("=== Testing Single-Hand Dual-Slot (testing both slots and picking highest) ===");
  for (const char of ["O", "V", "W"]) {
    const vecs = samples[char];
    for (let i = 0; i < vecs.length; i++) {
      const v = vecs[i];
      const hasL = v.slice(0, 63).some(x => x !== 0);
      const hasR = v.slice(63, 126).some(x => x !== 0);
      if (hasL && hasR) continue; // skip 2-hand for this test

      const hand = hasL ? v.slice(0, 63) : v.slice(63, 126);

      // Invert hand slot to simulate user showing hand to camera that puts it in wrong slot
      const wrongSlot = hasL ? [...new Array(63).fill(0), ...hand] : [...hand, ...new Array(63).fill(0)];
      const rightSlot = [...new Array(63).fill(0), ...hand];
      const leftSlot = [...hand, ...new Array(63).fill(0)];

      const pR = Array.from(await model.predict(tf.tensor2d([rightSlot], [1, 126])).data());
      const pL = Array.from(await model.predict(tf.tensor2d([leftSlot], [1, 126])).data());

      let maxR = 0, maxL = 0;
      for (let j = 1; j < 26; j++) {
        if (pR[j] > pR[maxR]) maxR = j;
        if (pL[j] > pL[maxL]) maxL = j;
      }

      const pickedSlot = pR[maxR] >= pL[maxL] ? "Right" : "Left";
      const pickedLabel = pR[maxR] >= pL[maxL] ? labels[maxR] : labels[maxL];
      const pickedScore = pR[maxR] >= pL[maxL] ? pR[maxR] : pL[maxL];

      console.log(`[${char} #${i}] R=${labels[maxR]} (${(pR[maxR]*100).toFixed(1)}%), L=${labels[maxL]} (${(pL[maxL]*100).toFixed(1)}%) => Picked: ${pickedLabel} (${(pickedScore*100).toFixed(1)}%) in ${pickedSlot}`);
    }
  }
}

testAll();
