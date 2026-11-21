
import axios from "axios";

const islApi = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

export default islApi;
