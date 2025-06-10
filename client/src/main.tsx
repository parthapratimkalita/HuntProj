import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Log the current auth token state for debugging
console.log("AUTH TOKEN IN LOCALSTORAGE:", localStorage.getItem('auth_token') ? "present" : "none");

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
