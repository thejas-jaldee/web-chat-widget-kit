// src/sdk/styles/injectFormSkin.ts
const STYLE_ID = "lead-form-skin";

const CSS = `
.lsdk-form.lsdk-form :where(input,select,textarea){
  width:100% !important;
  padding:12px !important;
  background:#f9f9f9 !important;
  border:1px solid #e5e5e5 !important;
  border-radius:4px !important;
  line-height:1.4 !important;
  color:#272727 !important;
  transition:border-color .25s ease,box-shadow .25s ease !important;
}
.lsdk-form.lsdk-form :where(input,select,textarea):focus{
  outline:none !important;
  border-color:rgba(131,80,242,1) !important;
  box-shadow:0 0 0 3px rgba(131,80,242,0.25) !important;
}
.lsdk-form h4{margin:0 0 8px;font-weight:600;color:rgba(131,80,242,1);font-size:14px}
.lsdk-input-group{margin-bottom:12px;position:relative}
.lsdk-input-group--icon input{padding-left:56px !important}
.lsdk-input-icon{position:absolute;top:0;left:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.lsdk-input-icon::after{content:"";position:absolute;top:8px;bottom:8px;right:-1px;width:1px;background:#e5e5e5;transition:background .25s ease}
.lsdk-input-group--icon input:focus + .lsdk-input-icon::after{background:rgba(131,80,242,1)}
.lsdk-radio{display:none}
.lsdk-segment{display:flex;border:1px solid #e5e5e5;border-radius:4px;overflow:hidden}
.lsdk-segment>label{flex:1;text-align:center;padding:12px;cursor:pointer;border-right:1px solid #e5e5e5;transition:background .25s ease,color .25s ease}
.lsdk-segment>label:last-child{border-right:0}
.lsdk-radio:checked + label{background:rgba(131,80,242,1);color:#fff;border-color:rgba(131,80,242,1)}
.lsdk-checkbox{display:none}
.lsdk-checkbox + label{position:relative;padding-left:26px;display:block;cursor:pointer;color:#667084}
.lsdk-checkbox + label::before{content:"";position:absolute;left:0;top:2px;width:18px;height:18px;border-radius:4px;background:#f9f9f9;border:1px solid #e5e5e5}
.lsdk-checkbox + label::after{content:"✔";position:absolute;left:3px;top:0;font-size:14px;color:#fff;opacity:0;transition:opacity .25s ease}
.lsdk-checkbox:checked + label::before{background:rgba(131,80,242,1);border-color:rgba(131,80,242,1)}
.lsdk-checkbox:checked + label::after{opacity:1}
.lsdk-scroll{overflow-y:auto;-webkit-overflow-scrolling:touch}
@media(max-width:540px){.lsdk-col-half,.lsdk-col-third{width:100%;padding-right:0}}
`;

function hasStyle(root: Document | ShadowRoot): boolean {
  return !!(root as ParentNode).querySelector?.(`#${STYLE_ID}`);
}

function attachStyleTo(root: Document | ShadowRoot): void {
  if (hasStyle(root)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;

  if (root instanceof Document) root.head.appendChild(style);
  else root.appendChild(style); // ShadowRoot
}

export function injectLeadFormSkin(): void {
  attachStyleTo(document);
}

export function injectLeadFormSkinIntoRoot(root: ShadowRoot): void {
  attachStyleTo(root);
}
