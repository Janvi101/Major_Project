const tf = require("@tensorflow/tfjs");
const fs = require("fs");
const path = require("path");

async function loadModel(modelPath) {
    // Read model.json
    const modelJSON = JSON.parse(
        fs.readFileSync(modelPath, "utf8")
    );

    // Folder containing model.json
    const modelDir = path.dirname(modelPath);

    // Get weight information
    const weightsManifest = modelJSON.weightsManifest;

    let weightSpecs = [];
    let weightDataParts = [];

    // Read every weight shard
    for (const group of weightsManifest) {
        weightSpecs = weightSpecs.concat(group.weights);

        for (const weightFile of group.paths) {
            const weightPath = path.join(modelDir, weightFile);

            console.log("Reading:", weightFile);

            const buffer = fs.readFileSync(weightPath);

            weightDataParts.push(
                new Uint8Array(
                    buffer.buffer,
                    buffer.byteOffset,
                    buffer.byteLength
                )
            );
        }
    }

    // Calculate total size of all weight files
    const totalLength = weightDataParts.reduce(
        (total, part) => total + part.byteLength,
        0
    );

    // Combine all weight files into one array
    const weightData = new Uint8Array(totalLength);

    let offset = 0;

    for (const part of weightDataParts) {
        weightData.set(part, offset);
        offset += part.byteLength;
    }

    // Load the Graph Model
    const model = await tf.loadGraphModel({
        load: async () => ({
            modelTopology: modelJSON.modelTopology,
            weightSpecs: weightSpecs,
            weightData: weightData.buffer
        })
    });

    return model;
}


async function testModel() {
    try {
        console.log("TensorFlow.js loaded successfully.");
        console.log("Loading ISL model...");

        // Location of your model.json
        const modelPath = path.resolve(
            __dirname,
            "../isl-model/tfjs_unrolled_graph/model.json"
        );

        console.log("Model path:");
        console.log(modelPath);

        // Load model
        const model = await loadModel(modelPath);

        console.log("\n================================");
        console.log("MODEL LOADED SUCCESSFULLY!");
        console.log("================================");

        console.log("Input shape:");
        console.log(model.inputs[0].shape);

        // Create dummy input
        // 1 sample × 30 frames × 126 values
        const input = tf.zeros([1, 30, 126]);

        console.log("\nDummy input created.");
        console.log("Input shape:", input.shape);

        console.log("\nRunning prediction...");

        // Run the model
        const prediction = model.predict(input);

        console.log("\nPrediction type:");
        console.log(typeof prediction);

        // If model has multiple outputs
        if (Array.isArray(prediction)) {

            console.log(
                "Number of outputs:",
                prediction.length
            );

            for (
                let index = 0;
                index < prediction.length;
                index++
            ) {
                const output = prediction[index];

                console.log(
                    `\nOutput ${index} shape:`,
                    output.shape
                );

                const values = await output.data();

                console.log(
                    `Output ${index} values:`
                );

                console.log(
                    Array.from(values)
                );
            }

        } else {

            // If model has one output
            console.log(
                "\nPrediction shape:",
                prediction.shape
            );

            const values = await prediction.data();

            console.log(
                "\nPrediction values:"
            );

            console.log(
                Array.from(values)
            );
        }

        // Free memory
        input.dispose();

        if (Array.isArray(prediction)) {
            prediction.forEach(output => {
                output.dispose();
            });
        } else {
            prediction.dispose();
        }

        console.log("\n================================");
        console.log("PREDICTION TEST COMPLETED!");
        console.log("================================");

    } catch (error) {

        console.log("\n================================");
        console.log("MODEL/PREDICTION TEST FAILED");
        console.log("================================");

        console.error(error);
    }
}


// Start the test
testModel();