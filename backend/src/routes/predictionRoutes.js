const express = require("express");

const {
  predictSign,
} = require("../controllers/predictionController");

const router = express.Router();

router.post("/", predictSign);

module.exports = router;