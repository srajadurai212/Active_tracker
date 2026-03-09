import { jwtDecode } from "jwt-decode";
import axios from "./axios";

const isTokenValid = (authToken: string): boolean => {
  try {
    const decoded: { exp?: number } = jwtDecode(authToken);
    if (!decoded.exp) {
      console.error("Token does not contain an expiration time.");
      return false;
    }

    const currentTime = Date.now() / 1000; // Current time in seconds since epoch
    return decoded.exp > currentTime;
  } catch (err) {
    console.error("Failed to decode token:", err);
    return false;
  }
};

const setSession = (authToken?: string | null, rememberMe = false): void => {
  if (typeof authToken === "string" && authToken.trim() !== "") {
    if (rememberMe) {
      localStorage.setItem("authToken", authToken);
      sessionStorage.removeItem("authToken");
    } else {
      sessionStorage.setItem("authToken", authToken);
      localStorage.removeItem("authToken");
    }
    axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;
  } else {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    delete axios.defaults.headers.common.Authorization;
  }
};

const getStoredToken = (): string | null =>
  localStorage.getItem("authToken") ?? sessionStorage.getItem("authToken");

export { isTokenValid, setSession, getStoredToken };
