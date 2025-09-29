import {
  MinusIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  SendIcon,
  SmileIcon,
  X,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface QuickAction {
  id: string;
  label: string;
  type: 'link' | 'conversation';
  value: string;
}

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
  quickActions: QuickAction[];
  conversations: Record<string, Conversation>;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    position: 'bottom-right' | 'bottom-left';
  };
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  options?: ConversationOption[];
}

interface LivechatProps {
  configId?: string;
  className?: string;
}

export const Livechat: React.FC<LivechatProps> = ({ 
  configId = 'default',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [currentView, setCurrentView] = useState<'welcome' | 'conversation'>('welcome');
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const actionButtons = [
    { text: "Contact Us", className: "w-[120px]", id: "contact", type: "link" as const, value: "/contact" },
    { text: "Product Enquiry", className: "w-[161px]", id: "product", type: "conversation" as const, value: "product-enquiry" },
    { text: "Create Support Ticket", className: "w-[200px]", id: "support", type: "conversation" as const, value: "support-ticket" },
    { text: "Get Quote", className: "w-[119px]", id: "quote", type: "conversation" as const, value: "get-quote" },
    { text: "Feedback", className: "w-[107px]", id: "feedback", type: "conversation" as const, value: "feedback" },
  ];

  useEffect(() => {
    loadConfig();
  }, [configId]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/chatbot-configs.json');
      const configs = await response.json();
      const selectedConfig = configs[configId] || configs.default;
      setConfig(selectedConfig);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load chatbot config:', error);
      setLoading(false);
    }
  };

  const handleQuickAction = (action: typeof actionButtons[0]) => {
    if (action.type === 'link') {
      window.open(action.value, '_blank');
    } else if (action.type === 'conversation') {
      startConversation(action.value);
    }
  };

  const startConversation = (conversationId: string) => {
    if (!config) return;
    
    const conversation = config.conversations[conversationId];
    if (!conversation) return;

    const botMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: conversation.message,
      timestamp: new Date(),
      options: conversation.options
    };

    setMessages([botMessage]);
    setCurrentView('conversation');
  };

  const handleOptionClick = (option: ConversationOption) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user', 
      content: option.label,
      timestamp: new Date()
    };

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: option.response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: "Thank you for your message! A member of our team will get back to you soon.",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
    setUserInput('');
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentView('welcome');
    setUserInput('');
    setIsMinimized(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (loading || !config) {
    return null;
  }

  const positionClasses = config.theme.position === 'bottom-right' 
    ? 'bottom-4 right-4' 
    : 'bottom-4 left-4';

  return (
    <div className={`fixed ${positionClasses} z-50 ${className}`}>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)] hover:scale-110 shadow-lg transition-all duration-300 border-0 animate-bounce"
          size="icon"
        >
          <MessageCircle className="h-8 w-8 text-white" />
        </Button>
      )}

      {/* Chat Widget */}
      {isOpen && !isMinimized && (
        <div
          className="bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)] w-full min-w-[530px] h-[820px] relative overflow-hidden translate-y-[-1rem] animate-fade-in opacity-0"
          data-model-id="1:5"
        >
          {/* Background decorative elements */}
          <div className="absolute top-9 left-[407px] w-[41px] h-[41px] bg-[#6090ff] rounded-[20.65px] shadow-[0px_0px_2.89px_#a1a1a140] opacity-0 animate-fade-in [--animation-delay:400ms]" />
          <div className="absolute top-[37px] left-[461px] w-[41px] h-[41px] bg-[#6090ff] rounded-[20.3px] shadow-[0px_0px_2.84px_#a1a1a140] opacity-0 animate-fade-in [--animation-delay:600ms]" />

          {/* Top section with avatar and controls */}
          <div className="flex flex-col items-center pt-11 opacity-0 animate-fade-in [--animation-delay:200ms]">
            <div className="relative mb-6">
              <Avatar className="w-[94px] h-[94px]">
                <AvatarImage
                  src="https://c.animaapp.com/mg50asgc5NJpv5/img/ellipse-2.png"
                  alt="Chat bot avatar"
                />
                <AvatarFallback>🤖</AvatarFallback>
              </Avatar>

              {/* Control buttons */}
              <div className="absolute -top-2 -right-[200px] flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-[41px] h-[41px] bg-[#6090ff] rounded-full shadow-[0px_0px_2.89px_#a1a1a140] hover:bg-[#5080ef] transition-colors"
                >
                  <MoreHorizontalIcon className="w-4 h-4 text-white" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(true)}
                  className="w-[41px] h-[41px] bg-[#6090ff] rounded-full shadow-[0px_0px_2.84px_#a1a1a140] hover:bg-[#5080ef] transition-colors"
                >
                  <MinusIcon className="w-4 h-4 text-white" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="w-[41px] h-[41px] bg-[#6090ff] rounded-full shadow-[0px_0px_2.84px_#a1a1a140] hover:bg-[#5080ef] transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>

            {/* Greeting text */}
            <h1 className="h-[46px] font-semibold text-label-colordarkprimary text-[30.1px] text-center leading-[45.2px] [font-family:'Inter',Helvetica] tracking-[0] mb-4 opacity-0 animate-fade-in [--animation-delay:400ms]">
              {config.greeting}
            </h1>

            <p className="h-[34px] font-normal text-[#b7c3ff] text-xl text-center leading-[33.0px] [font-family:'Inter',Helvetica] tracking-[0] mb-8 opacity-0 animate-fade-in [--animation-delay:600ms]">
              {config.subtitle}
            </p>
          </div>

          {/* Chat container */}
          <Card className="absolute left-[calc(50.00%_-_261px)] top-[262px] w-[522px] h-[552px] bg-white rounded-[25px] border border-[#e2e2e2] shadow-lg opacity-0 animate-fade-up [--animation-delay:800ms]">
            <CardContent className="p-6 h-full flex flex-col">
              {currentView === 'welcome' ? (
                <>
                  {/* Timestamp */}
                  <div className="text-center mb-6">
                    <span className="font-normal text-[#667084] text-lg [font-family:'Inter',Helvetica] tracking-[0] leading-[30px]">
                      Today, 04:20
                    </span>
                  </div>

                  {/* Bot message */}
                  <div className="flex items-start gap-3 mb-6 opacity-0 animate-fade-in [--animation-delay:1000ms]">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarImage
                        src="https://c.animaapp.com/mg50asgc5NJpv5/img/ellipse-2-1.png"
                        alt="Bot avatar"
                      />
                      <AvatarFallback>🤖</AvatarFallback>
                    </Avatar>
                    <div className="bg-[#f2f2f2] rounded-[16px_16px_18.94px_2.1px] p-4 max-w-[241px]">
                      <p className="font-normal text-[#272727] text-base leading-[23px] [font-family:'Inter',Helvetica] tracking-[0]">
                        Hi There,
                        <br />
                        How Can I help you today?
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 mb-auto opacity-0 animate-fade-in [--animation-delay:1200ms]">
                    {actionButtons.map((button, index) => (
                      <Button
                        key={button.text}
                        onClick={() => handleQuickAction(button)}
                        variant="outline"
                        className={`${button.className} h-[42px] bg-white rounded-[24.1px] border-[0.96px] border-transparent bg-gradient-to-r from-[rgba(131,80,242,1)] via-[rgba(131,80,242,1)] to-[rgba(61,125,243,1)] bg-clip-border hover:shadow-md transition-all duration-200 hover:scale-105 opacity-0 animate-fade-in cursor-pointer`}
                        style={
                          {
                            "--animation-delay": `${1400 + index * 100}ms`,
                            background: "white",
                            backgroundImage:
                              "linear-gradient(white, white), linear-gradient(90deg, rgba(131,80,242,1) 20%, rgba(61,125,243,1) 80%)",
                            backgroundOrigin: "border-box",
                            backgroundClip: "padding-box, border-box",
                          } as React.CSSProperties
                        }
                      >
                        <span className="bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)] [-webkit-background-clip:text] bg-clip-text [-webkit-text-fill-color:transparent] font-medium text-[15.4px] leading-[22.2px] [font-family:'Inter',Helvetica] tracking-[0]">
                          {button.text}
                        </span>
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                /* Conversation View */
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${
                          message.type === 'user'
                            ? 'bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)] text-white rounded-[16px_16px_2px_16px]'
                            : 'bg-[#f2f2f2] text-[#272727] rounded-[16px_16px_18.94px_2.1px]'
                        } p-4`}>
                          <p className="text-sm leading-[23px] [font-family:'Inter',Helvetica]">{message.content}</p>
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
                    className="w-full mt-2 mb-4 text-xs text-[#667084] hover:text-[rgba(131,80,242,1)] transition-colors"
                  >
                    Start new conversation
                  </button>
                </div>
              )}

              {/* Message input area */}
              <div className="mt-auto pt-4 border-t border-[#e2e2e2] opacity-0 animate-fade-in [--animation-delay:1800ms]">
                <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
                  <Input
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Write a message"
                    className="flex-1 border-none bg-transparent font-medium text-ipftgreytext text-lg [font-family:'Inter',Helvetica] tracking-[0] focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-[26px] h-[26px] hover:bg-gray-100 transition-colors"
                    >
                      <SmileIcon className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-[26px] h-[26px] hover:bg-gray-100 transition-colors"
                    >
                      <PaperclipIcon className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      size="icon"
                      className="w-[51px] h-[51px] bg-gradient-to-r from-[rgba(131,80,242,1)] to-[rgba(61,125,243,1)] hover:opacity-90 transition-opacity rounded-full"
                    >
                      <SendIcon className="w-5 h-5 text-white" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <div className="bg-[linear-gradient(90deg,rgba(131,80,242,1)_20%,rgba(61,125,243,1)_80%)] rounded-t-2xl p-4 min-w-[300px] animate-fade-up">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src="https://c.animaapp.com/mg50asgc5NJpv5/img/ellipse-2.png" />
                <AvatarFallback>🤖</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{config.greeting}</h3>
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