import {
  MinusIcon,
  PaperclipIcon,
  SendIcon,
  SmileIcon,
  X,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import type { DynamicFormSchema, SimpleField } from "@/components/dynamic-form/types";
import { getLeadSdkJson } from "@/components/dynamic-form/schemaClient";
import { adaptToDynamicFormSchema } from "@/components/dynamic-form/schemaAdapter";
import StaticLeadFields, {
  LeadInfo,
  LeadErrors,
} from "@/components/dynamic-form/StaticLeadFields";
import { submitLead, type LeadSubmitPayload } from "@/components/lead/LeadSubmit";
import { JALDEE_BASE_URL, JALDEE_AUTH_TOKEN } from "@/lib/env";
import { injectLeadFormSkin, injectLeadFormSkinIntoRoot } from "@/sdk/styles/injectFormSkin";

/** ---------- lightweight types for the S3 JSON ---------- */
type LeadSdkAction = {
  id: string;
  title: string;
  channel: {
    id: number;
    name: string;
    uid: string;            // chlead_...
    encodedUid: string;     // ch-...
    locationId: number;
  };
  product: string;
  template?: {
    uid: string;
    templateName: string;
    templateSchema?: unknown; // server may provide it; we still fetch via channel API on click per requirement
  };
};

type LeadSdkJson = {
  generatedAt: string;
  source: string;
  accountId: number;
  count: number;
  actions: LeadSdkAction[];
};
/** ------------------------------------------------------- */

interface ConversationOption {
  id: string;
  label: string;
  response: string;
}
interface Conversation {
  title: string;
  message: string;
  options: ConversationOption[];
}
interface ChatbotConfig {
  id: string;
  name: string;
  greeting: string;
  subtitle: string;
  avatar: string;
  quickActions: unknown[];
  conversations: Record<string, Conversation>;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    position: "bottom-right" | "bottom-left";
  };
}
interface Message {
  id: string;
  type: "bot" | "user";
  content: string;
  timestamp: Date;
  options?: ConversationOption[];
}
interface LivechatProps {
  configId?: string;
  className?: string;
}

type FlowMode = "idle" | "action-conversation" | "action-form";

/** lowercases string values safely */
function lower(v: unknown): string {
  return typeof v === "string" ? v.toLowerCase() : "";
}

/** Hide given section titles anywhere in the schema tree */
function stripTitles(s: DynamicFormSchema, hideSections: string[] = []): DynamicFormSchema {
  const lowered = new Set(hideSections.map((t) => t.toLowerCase()));
  const blankIfHidden = (title?: string) =>
    title && lowered.has(title.toLowerCase()) ? "" : (title ?? "");

  const mapField = (f: SimpleField): SimpleField => {
    if (f.type === "object") {
      return { ...f, title: blankIfHidden(f.title), fields: (f.fields ?? []).map(mapField) };
    }
    if (f.type === "array") {
      const mapped: SimpleField = { ...f, title: blankIfHidden(f.title) };
      const items = f.items as unknown;
      if (items && typeof items === "object" && "type" in (items as Record<string, unknown>)) {
        const itemField = items as SimpleField;
        mapped.items =
          itemField.type === "object"
            ? { ...itemField, fields: (itemField.fields ?? []).map(mapField) }
            : itemField;
      }
      if (f.fields && f.fields.length) mapped.fields = f.fields.map(mapField);
      return mapped;
    }
    return { ...f, title: blankIfHidden(f.title) };
  };

  return { ...s, title: "", fields: s.fields.map(mapField) };
}

/** Remove fields by case-insensitive title/name/key anywhere in the tree (no `any`) */
function removeFields(s: DynamicFormSchema, toRemove: string[] = []): DynamicFormSchema {
  if (!toRemove.length) return s;
  const targets = new Set(toRemove.map((t) => t.toLowerCase()));

  const hasKey = (obj: unknown, key: string): obj is Record<string, unknown> =>
    typeof obj === "object" && obj !== null && key in (obj as Record<string, unknown>);

  const shouldDrop = (f: SimpleField): boolean => {
    const title = lower((f as { title?: unknown }).title);
    const name = hasKey(f, "name") ? lower((f as Record<string, unknown>)["name"]) : "";
    const key = hasKey(f, "key") ? lower((f as Record<string, unknown>)["key"]) : "";
    return targets.has(title) || (name !== "" && targets.has(name)) || (key !== "" && targets.has(key));
  };

  const walk = (f: SimpleField): SimpleField | null => {
    if (shouldDrop(f)) return null;

    if (f.type === "object") {
      const children = (f.fields ?? []).map(walk).filter((x): x is SimpleField => x !== null);
      return { ...f, fields: children };
    }

    if (f.type === "array") {
      const mapped: SimpleField = { ...f };
      const items = f.items as unknown;

      if (items && typeof items === "object" && "type" in (items as Record<string, unknown>)) {
        const itemField = items as SimpleField;
        if (shouldDrop(itemField)) return null;

        if (itemField.type === "object") {
          const newItemFields = (itemField.fields ?? [])
            .map(walk)
            .filter((x): x is SimpleField => x !== null);
          mapped.items = { ...itemField, fields: newItemFields };
        } else {
          mapped.items = itemField;
        }
      } else if (items !== undefined) {
        (mapped as unknown as { items?: unknown }).items = items;
      }

      if (f.fields && f.fields.length) {
        mapped.fields = f.fields.map(walk).filter((x): x is SimpleField => x !== null);
      }
      return mapped;
    }

    return { ...f };
  };

  return {
    ...s,
    fields: s.fields.map(walk).filter((x): x is SimpleField => x !== null),
  };
}

/** Fetch template schema by channel encoded UID (GET) */
async function getTemplateByChannelEncUid(channelEncUid: string, signal?: AbortSignal) {
  const url = `${JALDEE_BASE_URL.replace(/\/$/, "")}/v1/rest/consumer/crm/lead/template/channel/${encodeURIComponent(
    channelEncUid
  )}`;
  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json",
      ...(JALDEE_AUTH_TOKEN ? { Authorization: `Bearer ${JALDEE_AUTH_TOKEN}` } : {}),
    },
    credentials: "include",
    mode: "cors",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Template fetch failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json(); // raw server schema
}

export const Livechat: React.FC<LivechatProps> = ({
  configId = "default",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [currentView, setCurrentView] = useState<"welcome" | "conversation" | "form">("welcome");
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // === new: retain the S3 JSON for the session ===
  const [sdkJson, setSdkJson] = useState<LeadSdkJson | null>(null);

  // dynamic form bits
  const [formSchema, setFormSchema] = useState<DynamicFormSchema | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // UI switches
  const [formTitle, setFormTitle] = useState<string>("");
  const [showDynamicForm, setShowDynamicForm] = useState<boolean>(false);

  // selected action meta (for submit)
  const [selectedChannelEncUid, setSelectedChannelEncUid] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  // form + skin injection
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    const node = formRef.current;
    if (!node) {
      injectLeadFormSkin();
      return;
    }
    const rootNode: Node = node.getRootNode();
    if (typeof ShadowRoot !== "undefined" && rootNode instanceof ShadowRoot) {
      injectLeadFormSkinIntoRoot(rootNode);
    } else {
      injectLeadFormSkin();
    }
  }, [isOpen, currentView]);

  const startTimeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [leadInfo, setLeadInfo] = useState<LeadInfo>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailId: "",
  });
  const [leadErrors, setLeadErrors] = useState<LeadErrors>({});
  const [dynamicValues, setDynamicValues] = useState<Record<string, unknown>>({});
  const [flowMode, setFlowMode] = useState<FlowMode>("idle");

  function validateLeadInfo(data: LeadInfo): boolean {
    const errs: LeadErrors = {};
    if (!data.firstName || data.firstName.trim().length < 3) {
      errs.firstName = "First name must be at least 3 characters.";
    } else if (data.firstName.length > 200) {
      errs.firstName = "First name cannot exceed 200 characters.";
    }
    if (data.lastName && data.lastName.length > 200) {
      errs.lastName = "Last name cannot exceed 200 characters.";
    }
    if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
      errs.phoneNumber = "Phone number is required.";
    }
    if (data.emailId) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailId);
      if (!emailOk) errs.emailId = "Please enter a valid email.";
      if (data.emailId.length > 200) errs.emailId = "Email cannot exceed 200 characters.";
    }
    setLeadErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ===== time ticker for "Today, HH:MM" =====
  useEffect(() => {
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    startTimeoutRef.current = window.setTimeout(() => {
      setCurrentTime(new Date());
      intervalRef.current = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    }, msToNextMinute);
    return () => {
      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // ===== Load static chatbot-configs.json =====
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch("/chatbot-configs.json");
        const configs = await response.json();
        const selectedConfig = configs[configId] || configs.default;
        if (isMounted) {
          setConfig(selectedConfig);
        }
      } catch (e) {
        console.error("Failed to load chatbot config:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [configId]);

  // ===== NEW: fetch lead-sdk.json exactly once on open and retain =====
  useEffect(() => {
    const abort = new AbortController();
    let isMounted = true;
    (async () => {
      try {
        // You can pass an accountId here if your schemaClient implementation expects it;
        // ours ignores the argument and uses its configured S3 path.
        const data = (await getLeadSdkJson(String(Date.now()), abort.signal)) as LeadSdkJson;
        if (isMounted) setSdkJson(data);
      } catch (e) {
        console.error("Failed to fetch lead-sdk.json:", e);
      }
    })();
    return () => {
      isMounted = false;
      abort.abort();
    };
  }, []); // only once per widget lifetime

  // ===== derive action buttons from retained JSON =====
  const jsonActions = useMemo(() => sdkJson?.actions ?? [], [sdkJson]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Auto-scroll when in conversation
  const msgWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (flowMode === "action-conversation") {
      msgWrapRef.current?.scrollTo({ top: msgWrapRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, flowMode]);

  const startConversation = (conversationId: string) => {
    if (!config) return;
    const conversation = config.conversations[conversationId];
    if (!conversation) return;
    const botMessage: Message = {
      id: Date.now().toString(),
      type: "bot",
      content: conversation.message,
      timestamp: new Date(),
      options: conversation.options,
    };
    setMessages([botMessage]);
    setCurrentView("conversation");
  };

  const handleOptionClick = (option: ConversationOption) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: option.label,
      timestamp: new Date(),
    };
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "bot",
      content: option.response,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage, botMessage]);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: userInput,
      timestamp: new Date(),
    };
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "bot",
      content:
        "Thank you for your message! A member of our team will get back to you soon.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage, botMessage]);
    setUserInput("");
    if (currentView !== "conversation") setCurrentView("conversation");
  };

  const handleJsonActionClick = (action: LeadSdkAction) => {
    // move into form mode + reset state
    setFlowMode("action-form");
    setCurrentView("form");
    setFormError(null);
    setDynamicValues({});
    setLeadErrors({});
    setLeadInfo({ firstName: "", lastName: "", phoneNumber: "", emailId: "" });

    // remember channel/location for submit
    setSelectedChannelEncUid(action.channel.encodedUid);
    setSelectedLocationId(action.channel.locationId);

    setFormTitle(action.title || "Form");
    setShowDynamicForm(true);
    setFormSchema(null);
    setFormLoading(true);

    const controller = new AbortController();
    (async () => {
      try {
        // Per requirement: always fetch by channel on click (even if JSON already has a schema)
        const raw = await getTemplateByChannelEncUid(action.channel.encodedUid, controller.signal);
        const schemaNode =
        typeof raw === "object" && raw !== null && "templateSchema" in raw
          ? (raw as { templateSchema: unknown }).templateSchema
          : raw;
        let schema = adaptToDynamicFormSchema(schemaNode);

        // Optional UX cleanup (safe no-ops if titles not present)
        schema = stripTitles(schema, ["Default Template", "Additional Info"]);
        // Example removal if needed: schema = removeFields(schema, ["City"]);

        setFormSchema(schema);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load form";
        setFormError(msg);
      } finally {
        setFormLoading(false);
      }
    })();
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentView("welcome");
    setUserInput("");
    setIsMinimized(false);
    setFormSchema(null);
    setFormError(null);
    setFormLoading(false);
    setFlowMode("idle");
    setDynamicValues({});
    setLeadInfo({ firstName: "", lastName: "", phoneNumber: "", emailId: "" });
    setLeadErrors({});
    setSelectedChannelEncUid("");
    setSelectedLocationId(null);
    setFormTitle("");
    setShowDynamicForm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendMessage();
  };

  if (loading || !config) return null;

  const dockMobile =
    config.theme.position === "bottom-right"
      ? "bottom-4 right-4"
      : "bottom-4 left-4";
  const dockDesktop =
    config.theme.position === "bottom-right"
      ? "sm:bottom-4 sm:right-4"
      : "sm:bottom-4 sm:left-4";

  const positionClasses =
    isOpen && !isMinimized
      ? `inset-0 sm:inset-auto ${dockDesktop}`
      : `${dockMobile} ${dockDesktop}`;

  const isCompact = currentView === "conversation" || currentView === "form";
  const headerPadTop = "pt-4 sm:pt-6";
  const headerClsBase =
    "transition-opacity duration-300 ease-out opacity-0 animate-fade-in [--animation-delay:200ms]";

  return (
    <div className={`fixed ${positionClasses} z-50 ${className}`}>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full hover:scale-110 shadow-lg transition-all duration-300 border-0 animate-bounce"
          size="icon"
        >
          <img src="/Ellipse 2.svg" alt="Chat bot avatar" className="h-16 w-16" />
        </Button>
      )}

      {isOpen && !isMinimized && (
        <div
          className="
            bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)]
            w-[100dvw] h-[calc(100dvh-2rem)]
            sm:w-[32vw] sm:min-w-[380px] sm:max-w-[520px]
            sm:h-[calc(100dvh-4rem)] sm:max-h-[calc(100dvh-4rem)]
            sm:rounded-[25px]
            relative overflow-hidden
            flex flex-col px-1 py-1 sm:px-1 sm:py-2 gap-1 sm:gap-2
            min-h-0
          "
        >
          {/* Header */}
          {!isCompact ? (
            <div className={`flex flex-col items-center pt-2 sm:pt-12 ${headerClsBase} px-2 sm:px-3`}>
              <div className="mb-2 flex items-center w-full max-w-full">
                <div className="mx-auto">
                  <Avatar className="w-[56px] h-[56px] sm:w-[72px] sm:h-[72px]">
                    <AvatarImage src="/Ellipse 2.svg" alt="Chat bot avatar" />
                    <AvatarFallback>🤖</AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute top-0 right-0 flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMinimized(true)}
                    className="w-9 h-9 sm:w-[41px] sm:h-[41px] bg-[#6090ff] rounded-full hover:bg-[#5080ef]"
                  >
                    <MinusIcon className="w-4 h-4 text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="w-9 h-9 sm:w-[41px] sm:h-[41px] bg-[#6090ff] rounded-full hover:bg-[#5080ef]"
                  >
                    <X className="w-4 h-4 text-white" />
                  </Button>
                </div>
              </div>
              <h1 className="font-semibold text-white text-[clamp(18px,2vw,24px)] text-center leading-tight mb-2">
                {config.greeting}
              </h1>
              <p className="font-normal text-[#b7c3ff] text-[clamp(13px,1.6vw,16px)] text-center leading-snug mb-3">
                {config.subtitle}
              </p>
            </div>
          ) : (
            <div className={`px-4 sm:px-6 ${headerPadTop} ${headerClsBase}`}>
              <div className="relative flex items-center gap-3 sm:gap-4">
                <Avatar className="w-12 h-12 sm:w-[56px] sm:h-[56px] shrink-0">
                  <AvatarImage src="/Ellipse 2.svg" alt="Chat bot avatar" />
                  <AvatarFallback>🤖</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-white font-semibold truncate text-[clamp(16px,1.6vw,22px)] leading-6 sm:leading-7">
                    {config.greeting}
                  </h2>
                  <p className="text-white/80 truncate text-[clamp(12px,1.3vw,14px)] leading-5">
                    {config.subtitle}
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMinimized(true)}
                    className="w-9 h-9 bg-[#6090ff] rounded-full hover:bg-[#5080ef]"
                  >
                    <MinusIcon className="w-4 h-4 text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="w-9 h-9 bg-[#6090ff] rounded-full hover:bg-[#5080ef]"
                  >
                    <X className="w-4 h-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Chat Card */}
          <Card className={`flex-1 min-h-0 w-full lsdk-scroll bg-white rounded-[18px] sm:rounded-[25px] border border-[#e2e2e2] shadow-lg overflow-hidden ${headerClsBase}`}>
            <CardContent className="p-3 sm:p-4 h-full flex flex-col min-h-0">
              {currentView === "welcome" ? (
                <>
                  <div className="text-center mb-4 sm:mb-6">
                    <span className="font-normal text-[#667084] text-[clamp(13px,1.4vw,18px)] leading-[30px]">
                      Today, {formatTime(currentTime)}
                    </span>
                  </div>

                  <div className="flex items-start gap-3 sm:gap-3 mb-4 sm:mb-6">
                    <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
                      <AvatarImage src="/Ellipse 2.svg" alt="Bot avatar" />
                      <AvatarFallback>🤖</AvatarFallback>
                    </Avatar>
                    <div className="bg-[#f2f2f2] rounded-[16px_16px_18.94px_2.1px] p-3 sm:p-4 max-w-[85%] sm:max-w-[22rem]">
                      <p className="text-[#272727] text-[clamp(13px,1.4vw,16px)] leading-[22px] sm:leading-[23px]">
                        Hi There,<br />How Can I help you today?
                      </p>
                    </div>
                  </div>

                  {/* dynamic buttons from JSON */}
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-3 mb-auto">
                    {jsonActions.map((a) => (
                      <Button
                        key={a.id}
                        onClick={() => handleJsonActionClick(a)}
                        variant="outline"
                        className="w-auto min-w-[9rem] sm:min-w-0 px-4 h-[42px] bg-white rounded-[24.1px] border-[0.96px] border-transparent hover:shadow-md transition-all duration-200 hover:scale-105"
                        style={{
                          background: "white",
                          backgroundImage:
                            "linear-gradient(white, white), linear-gradient(90deg, rgba(131,80,242,1) 20%, rgba(61,125,243,1) 80%)",
                          backgroundOrigin: "border-box",
                          backgroundClip: "padding-box, border-box",
                        } as React.CSSProperties}
                      >
                        <span className="bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] font-medium text-[clamp(13px,1.4vw,15.4px)] leading-[22px] whitespace-nowrap">
                          {a.title}
                        </span>
                      </Button>
                    ))}
                    {!jsonActions.length && (
                      <div className="text-sm text-[#667084]">No actions available.</div>
                    )}
                  </div>

                  {/* Sticky input only on welcome */}
                  <div className="sticky bottom-0 mt-6 border-t border-[#e2e2e2] bg-white">
                    <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg">
                      <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a message"
                        className="flex-1 border-none bg-transparent font-medium text-[clamp(14px,1.6vw,18px)] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9ca3af] text-[#272727]"
                      />
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <Button variant="ghost" size="icon" className="w-7 h-7 sm:w-[26px] sm:h-[26px] hover:bg-gray-100">
                          <SmileIcon className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 sm:w-[26px] sm:h-[26px] hover:bg-gray-100">
                          <PaperclipIcon className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          size="icon"
                          className="w-11 h-11 sm:w-[51px] sm:h-[51px] bg-gradient-to-r from-[rgba(131,80,242,1)] to-[rgba(61,125,243,1)] hover:opacity-90 transition-opacity rounded-full"
                        >
                          <SendIcon className="w-5 h-5 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : currentView === "conversation" ? (
                <div className="flex-1 min-h-0 flex flex-col h-full">
                  <div
                    ref={msgWrapRef}
                    className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 ${
                            message.type === "user"
                              ? "bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)] text-white rounded-[16px_16px_2px_16px]"
                              : "bg-[#f2f2f2] text-[#272727] rounded-[16px_16px_18.94px_2.1px]"
                          }`}
                        >
                          <p className="text-[clamp(13px,1.4vw,14px)] sm:text-sm leading-[21px] sm:leading-[23px]">
                            {message.content}
                          </p>
                          {message.options && (
                            <div className="mt-3 space-y-2">
                              {message.options.map((option) => (
                                <button
                                  key={option.id}
                                  onClick={() => handleOptionClick(option)}
                                  className="w-full text-left p-2 text-sm border border-[#e2e2e2] rounded hover:bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)] hover:text-white transition-colors flex items-center justify-between group"
                                >
                                  {option.label}
                                  <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={resetChat}
                    className="w-full mt-2 mb-2 sm:mb-4 text-xs text-[#667084] hover:text-[rgba(131,80,242,1)] transition-colors"
                  >
                    Start new conversation
                  </button>
                </div>
              ) : (
                // === SINGLE FORM VIEW ===
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#272727]">
                      {formTitle || "Form"}
                    </h3>
                    <button
                      onClick={() => { setCurrentView("welcome"); setFlowMode("idle"); }}
                      className="text-xs text-[#667084] hover:text-[rgba(131,80,242,1)] transition-colors"
                    >
                      ‹ Back
                    </button>
                  </div>

                  {/* Single scroll container for the WHOLE form */}
                  <form
                    ref={formRef}
                    className="lsdk-form lsdk-scroll flex-1 min-h-0 overflow-y-auto rounded-xl border border-[#e2e2e2] p-4 space-y-4"
                    style={{ WebkitOverflowScrolling: "touch" }}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!validateLeadInfo(leadInfo)) return;

                      const payload: LeadSubmitPayload = {
                        channelEncUid: selectedChannelEncUid, // from clicked action
                        crmLeadConsumer: {
                          firstName: leadInfo.firstName.trim(),
                          lastName: leadInfo.lastName?.trim() || undefined,
                          countryCode: "+91",
                          phone: (leadInfo.phoneNumber || "").trim(),
                          email: leadInfo.emailId?.trim() || undefined,
                        },
                        templateSchemaValue: showDynamicForm ? (dynamicValues ?? {}) : {},
                      };

                      // Optimistic UI
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          type: "user",
                          content: `Submitted ${formTitle || "request"}`,
                          timestamp: new Date(),
                        },
                      ]);
                      setCurrentView("conversation");
                      setFlowMode("action-conversation");

                      try {
                        const res = await submitLead(payload, {
                          baseUrl: JALDEE_BASE_URL,
                          location: selectedLocationId ?? "", // use the JSON's locationId
                          authToken: JALDEE_AUTH_TOKEN || undefined,
                          timeoutMs: 15000,
                          includeCredentials: true,
                        });

                        setMessages((prev) => [
                          ...prev,
                          {
                            id: (Date.now() + 1).toString(),
                            type: "bot",
                            content: "Thanks! Your request has been received. Our team will contact you shortly.",
                            timestamp: new Date(),
                          },
                      
                        ]);

                        // reset form values
                        setLeadInfo({ firstName: "", lastName: "", phoneNumber: "", emailId: "" });
                        setDynamicValues({});
                      } catch (err: unknown) {
                        const hasNameMessage = (e: unknown): e is { name?: string; message?: unknown } =>
                          typeof e === "object" && e !== null;

                        let msg = "Could not submit your request. Please try again.";
                        if (hasNameMessage(err) && (err as { name?: string }).name === "LeadSubmitError") {
                          const maybeMsg = (err as { message?: unknown }).message;
                          msg = typeof maybeMsg === "string" ? maybeMsg : "Lead submission failed";
                        }
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: (Date.now() + 3).toString(),
                            type: "bot",
                            content: `⚠️ ${msg}`,
                            timestamp: new Date(),
                          },
                        ]);
                      }
                    }}
                  >
                    {/* Static lead fields (always visible) */}
                    <StaticLeadFields
                      value={leadInfo}
                      onChange={setLeadInfo}
                      errors={leadErrors}
                    />

                    {/* Dynamic fields */}
                    {showDynamicForm && !formLoading && !formError && formSchema && (
                      <DynamicForm
                        schema={formSchema}
                        mode="embedded"
                        hideTitle
                        hideSectionTitles={["Default Template", "Additional Info"]}
                        onChange={(values) => setDynamicValues(values)}
                      />
                    )}

                    {showDynamicForm && formLoading && (
                      <div className="text-sm text-[#667084]">Loading form…</div>
                    )}

                    {showDynamicForm && formError && (
                      <div className="text-sm text-red-600">
                        {formError}{" "}
                        <button
                          className="underline ml-2"
                          onClick={(ev) => {
                            ev.preventDefault();
                            setCurrentView("welcome");
                            setFlowMode("idle");
                          }}
                        >
                          Back
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Single sticky submit bar */}
                  <div className="sticky bottom-0 mt-3">
                    <div className="rounded-xl border border-[#e2e2e2] bg-white p-3">
                      <Button
                        type="button"
                        className="w-full h-[44px] rounded-full bg-gradient-to-r from-[rgba(131,80,242,1)] to-[rgba(61,125,243,1)] hover:opacity-90"
                        onClick={() => formRef.current?.requestSubmit()}
                      >
                        <span className="text-white font-medium">Submit</span>
                      </Button>
                    </div>
                  </div>

                  <button
                    onClick={resetChat}
                    className="w-full mt-2 mb-2 sm:mb-4 text-xs text-[#667084] hover:text-[rgba(131,80,242,1)] transition-colors"
                  >
                    Start new conversation
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isOpen && isMinimized && (
        <div
          className="
            bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)]
            p-4 rounded-t-2xl min-w=[300px]
            max-[639px]:p-3
            max-[639px]:rounded-full
            max-[639px]:w-[92vw]
            max-[639px]:max-w-[380px]
            max-[639px]:min-w-0
          "
        >
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/Ellipse 2.svg" />
                <AvatarFallback>🤖</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{config?.greeting}</h3>
                <p className="text-[10px] text-white/80">Click to expand</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsMinimized(false)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type RefLike = {
  id?: unknown;
  leadId?: unknown;
  encUid?: unknown;
  reference?: unknown;
  ref?: unknown;
};
// helper to show a tiny reference from server response if possible
function summarizeRef(res: unknown): string {
  if (res && typeof res === "object") {
    const r = res as RefLike;
    const candidate = r.id ?? r.leadId ?? r.encUid ?? r.reference ?? r.ref;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return String(candidate);
    }
  }
  return "submitted";
}
