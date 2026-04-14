import { createFrontend, type VanillaTsWidgetFrontend } from "../AnQst/generated/frontend/VanillaTsWidget_VanillaTS/index";
import type { Magic } from "../../VanillaJsWidget/AnQst/generated/frontend/VanillaJsWidget_VanillaTS/index";

function renderMagic(
  tickElement: HTMLElement,
  valueElement: HTMLElement,
  stateElement: HTMLElement,
  magic: Magic | null
): void {
  if (magic === null) {
    tickElement.textContent = "-1";
    valueElement.textContent = "-1";
    stateElement.textContent = "Waiting for VanillaJsWidget...";
    return;
  }

  tickElement.textContent = String(magic.tick);
  valueElement.textContent = String(magic.value);
  stateElement.textContent = `Received tick ${magic.tick}.`;
}

async function main(window: Window, document: Document, _AnQstGenerated: typeof window.AnQstGenerated): Promise<void> {
  const frontend: VanillaTsWidgetFrontend = await createFrontend();
  const { MagicMirrorService } = frontend;

  const resetButton = document.getElementById("requestReset");
  const tickElement = document.getElementById("tickDisplay");
  const valueElement = document.getElementById("valueDisplay");
  const stateElement = document.getElementById("stateDisplay");

  if (!(resetButton instanceof HTMLButtonElement)) {
    throw new Error("Missing #requestReset button.");
  }
  if (!(tickElement instanceof HTMLElement) || !(valueElement instanceof HTMLElement) || !(stateElement instanceof HTMLElement)) {
    throw new Error("VanillaTsWidget markup is incomplete.");
  }

  renderMagic(tickElement, valueElement, stateElement, null);

  MagicMirrorService.onSlot.onMagic((magic: Magic) => {
    renderMagic(tickElement, valueElement, stateElement, magic);
  });

  resetButton.addEventListener("click", () => {
    stateElement.textContent = "Requesting reset...";
    MagicMirrorService.requestReset();
  });
}

void main(window, document, window.AnQstGenerated);
