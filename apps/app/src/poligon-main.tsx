// Poligon sahifasi kirish nuqtasi (poligon.html). Alohida sahifa — index.html (asosiy ilova, grid.ts)
// va studio.html TEGILMAYDI (54§1: yangi yadro yonda o'sadi, ekranlar bittalab qayta yo'naltiriladi).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PoligonApp } from "./poligon/ui/PoligonApp.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");
createRoot(root).render(<StrictMode><PoligonApp /></StrictMode>);
