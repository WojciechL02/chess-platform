export const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
export const WS_URL = API_URL.replace("http", "ws");
