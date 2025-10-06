// src/sdk.tsx
const g = globalThis as Record<string, unknown>;

if (!("global" in g)) {
  Reflect.set(g, "global", g); // some libs expect `global`
}

if (!("process" in g)) {
  Reflect.set(g, "process", { env: { NODE_ENV: "production" } });
}

import React from "react";
import { createRoot, Root } from "react-dom/client";
import {Livechat} from "./components/chatbot/Livechat";
import compiledCss from "./compiled.css?raw"; // will be generated before build
import { injectLeadFormSkin } from "./sdk/styles/injectFormSkin";
type RenderTarget = string | HTMLElement;
type LivechatProps = React.ComponentProps<typeof Livechat>;

type RenderOptions = {
  target: RenderTarget;   // CSS selector or HTMLElement
  props?: Partial<LivechatProps>;
};

type MountedInstance = {
  host: HTMLElement;
  shadow: ShadowRoot;
  mount: HTMLDivElement;
  root: Root;
};

declare global {
  interface Window {
    LeadSDK?: {
      render: (target: RenderTarget, props?: Partial<LivechatProps>) => MountedInstance;
      unmount: (target: RenderTarget) => void;
    };
  }
}

const __instances = new WeakMap<HTMLElement, MountedInstance>();

function resolveTarget(target: RenderTarget): HTMLElement {
  if (typeof target === "string") {
    const el = document.querySelector(target);
    if (!el) throw new Error(`LeadSDK: target not found: ${target}`);
    return el as HTMLElement;
  }
  return target;
}

function ensureShadow(host: HTMLElement): ShadowRoot {
  return host.shadowRoot ?? host.attachShadow({ mode: "open" });
}
(function exposeSDK() {
  // inject once on SDK load
  injectLeadFormSkin();
})();

function injectShadowStyles(shadow: ShadowRoot) {
  // Only inject once
  if (shadow.querySelector("style[data-leadsdk]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-leadsdk", "true");
  style.textContent = compiledCss;
  shadow.appendChild(style);
}

export function render(target: RenderTarget, props?: Partial<LivechatProps>): MountedInstance {
  const host = resolveTarget(target);
  const shadow = ensureShadow(host);
  injectShadowStyles(shadow);

  // Create/Reuse mount node
  let mount = shadow.querySelector<HTMLDivElement>("#leadsdk-root");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "leadsdk-root";
    shadow.appendChild(mount);
  }

  // If already mounted, unmount first
  if (__instances.has(host)) {
    unmount(host);
  }

  const root = createRoot(mount);
  root.render(<Livechat {...(props as LivechatProps)} />);

  const inst: MountedInstance = { host, shadow, mount, root };
  __instances.set(host, inst);
  return inst;
}

export function unmount(target: RenderTarget) {
  const host = resolveTarget(target);
  const inst = __instances.get(host);
  if (!inst) return;
  inst.root.unmount();
  __instances.delete(host);
}

window.LeadSDK = { render, unmount };
export default { render, unmount };
