// src/components/chatbot/Livechat.tsx
import {
  MinusIcon,
  PaperclipIcon,
  SendIcon,
  SmileIcon,
  X,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import type { DynamicFormSchema, SimpleField } from "@/components/dynamic-form/types";
import { getSchema } from "@/components/dynamic-form/schemaClient";
import { adaptToDynamicFormSchema } from "@/components/dynamic-form/schemaAdapter";
import StaticLeadFields, {
  LeadInfo,
  LeadErrors,
} from "@/components/dynamic-form/StaticLeadFields";

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

type ActionButton =
  | { text: string; className: string; id: string; type: "link"; value: string }
  | {
      text: string;
      className: string;
      id: string;
      type: "conversation";
      value: string;
    }
  | {
      text: string;
      className: string;
      id: string;
      type: "form";
      value: string;
    };

type FlowMode = "idle" | "action-conversation" | "action-form";

/** Typed helper to blank specific titles anywhere in the SimpleField tree */
function stripTitles(s: DynamicFormSchema, hideSections: string[] = []): DynamicFormSchema {
  const lowered = new Set(hideSections.map((t) => t.toLowerCase()));
  const blankIfHidden = (title?: string) =>
    title && lowered.has(title.toLowerCase()) ? "" : (title ?? "");

  const mapField = (f: SimpleField): SimpleField => {
    if (f.type === "object") {
      return {
        ...f,
        title: blankIfHidden(f.title),
        fields: (f.fields ?? []).map(mapField),
      };
    }
    if (f.type === "array") {
      const mapped: SimpleField = {
        ...f,
        title: blankIfHidden(f.title),
      };
      if (f.items && f.items.type === "object") {
        mapped.items = { ...f.items, fields: (f.items.fields ?? []).map(mapField) };
      } else if (f.items) {
        mapped.items = { ...f.items };
      }
      if (f.fields && f.fields.length) {
        mapped.fields = f.fields.map(mapField);
      }
      return mapped;
    }
    // primitive
    return { ...f, title: blankIfHidden(f.title) };
  };

  return {
    ...s,
    title: "", // hide top-level (e.g., "Default Template")
    fields: s.fields.map(mapField),
  };
}

export const Livechat: React.FC<LivechatProps> = ({
  configId = "default",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [currentView, setCurrentView] = useState<"welcome" | "conversation" | "form">("welcome");
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [formSchema, setFormSchema] = useState<DynamicFormSchema | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // dedicated form ref for submit
  const formRef = useRef<HTMLFormElement | null>(null);

  const startTimeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [leadInfo, setLeadInfo] = useState<LeadInfo>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailId: "",
  });
  const [leadErrors, setLeadErrors] = useState<LeadErrors>({});

  // collect dynamic form values while embedded (no any)
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
      if (data.emailId.length > 200)
        errs.emailId = "Email cannot exceed 200 characters.";
    }
    setLeadErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const actionButtons: ActionButton[] = [
    { text: "Contact Us", className: "w-[120px]", id: "contact", type: "form", value: "ch-43c0036-4t" },
    { text: "Product Enquiry", className: "w-[161px]", id: "product", type: "conversation", value: "product-enquiry" },
    { text: "Create Support Ticket", className: "w-[200px]", id: "support", type: "conversation", value: "support-ticket" },
    { text: "Get Quote", className: "w-[119px]", id: "quote", type: "conversation", value: "get-quote" },
    { text: "Feedback", className: "w-[107px]", id: "feedback", type: "conversation", value: "feedback" },
  ];

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch("/chatbot-configs.json");
        const configs = await response.json();
        const selectedConfig = configs[configId] || configs.default;
        if (isMounted) {
          setConfig(selectedConfig);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load chatbot config:", e);
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [configId]);

  // Auto-scroll when in conversation
  const msgWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (flowMode === "action-conversation") {
      msgWrapRef.current?.scrollTo({ top: msgWrapRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, flowMode]);

  const handleQuickAction = (action: ActionButton) => {
    switch (action.type) {
      case "form": {
        setFlowMode("action-form");
        setCurrentView("form");
        const controller = new AbortController();
        setFormLoading(true);
        setFormError(null);
        setFormSchema(null);
        setDynamicValues({});
        (async () => {
          try {
            const raw = await getSchema(action.value, controller.signal);
            const schemaNode = raw?.templateSchema ?? raw;
            let schema = adaptToDynamicFormSchema(schemaNode);

            // hide top title and the “Additional Info” section safely (no any)
            schema = stripTitles(schema, ["Additional Info"]);
            setFormSchema(schema);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to load form";
            setFormError(msg);
          } finally {
            setFormLoading(false);
          }
        })();
        return;
      }
      case "link":
        window.open(action.value, "_blank");
        return;
      case "conversation":
        setFlowMode("action-conversation");
        startConversation(action.value);
        return;
    }
  };

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
            w-[100dvw] h-[100dvh]
            sm:w-[32vw] sm:min-w-[380px] sm:max-w-[520px]
            sm:h-[200vh] sm:max-h-[calc(100dvh-2rem)]
            sm:rounded-[25px]
            relative overflow-hidden
            flex flex-col px-1 py-1 sm:px-1 sm:py-2 gap-1 sm:gap-2
            min-h-0
          "
        >
          {/* Header */}
          {!isCompact ? (
            <div className={`flex flex-col items-center pt-2 sm:pt-3 ${headerClsBase} px-2 sm:px-3`}>
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
          <Card className="flex-1 min-h-0 w-full bg-white rounded-[18px] sm:rounded-[25px] border border-[#e2e2e2] shadow-lg overflow-hidden">
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

                  <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-3 mb-auto">
                    {actionButtons.map((button) => (
                      <Button
                        key={button.id}
                        onClick={() => handleQuickAction(button)}
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
                          {button.text}
                        </span>
                      </Button>
                    ))}
                  </div>

                  {/* Sticky input only on welcome */}
                  <div className="sticky bottom-0 mt-6 border-t border-[#e2e2e2] bg-white">
                    <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg">
                      <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a message"
                        className="flex-1 border-none bg-transparent font-medium text-[clamp(14px,1.6vw,18px)] focus-visible:ring-0 focus-visible:ring-offset-0"
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
                // === SINGLE FORM VIEW (static + dynamic, one submit) ===
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#272727]">
                      Contact form
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
                    className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-[#e2e2e2] p-4 space-y-4"
                    style={{ WebkitOverflowScrolling: "touch" }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!validateLeadInfo(leadInfo)) return;

                      // Build payload (static + dynamic)
                      const payload: { lead: LeadInfo; fields: Record<string, unknown> } = {
                        lead: leadInfo,
                        fields: dynamicValues,
                      };

                      // Submit behavior – here just echo and switch to conversation
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          type: "bot",
                          content: "Thanks! We received your request.",
                          timestamp: new Date(),
                        },
                      ]);
                      setCurrentView("conversation");
                      setFlowMode("action-conversation");

                      // TODO: send `payload` to your API.
                      // await fetch('/api/submit', { method:'POST', body: JSON.stringify(payload) })
                    }}
                  >
                    {/* Static lead fields */}
                    <StaticLeadFields
                      value={leadInfo}
                      onChange={setLeadInfo}
                      errors={leadErrors}
                    />

                    {/* Dynamic fields rendered embedded (no inner form, no submit, no titles) */}
                    {!formLoading && !formError && formSchema && (
                      <DynamicForm
                        schema={formSchema}
                        mode="embedded"
                        hideTitle
                        hideSectionTitles={["Default Template", "Additional Info"]}
                        onChange={(values) => setDynamicValues(values)}
                      />
                    )}

                    {formLoading && (
                      <div className="text-sm text-[#667084]">Loading form…</div>
                    )}

                    {formError && (
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
                        Submit
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
                <p className="text-sm text-white/80">Click to expand</p>
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
