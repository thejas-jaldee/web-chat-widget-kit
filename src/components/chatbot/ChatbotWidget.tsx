import React, { useState, useEffect } from 'react';
import { X, Send, ChevronRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

interface ChatbotWidgetProps {
  configId?: string;
  className?: string;
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ 
  configId = 'default',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [currentView, setCurrentView] = useState<'welcome' | 'conversation'>('welcome');
  const [loading, setLoading] = useState(true);

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

  const handleQuickAction = (action: QuickAction) => {
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
          className="h-14 w-14 rounded-full bg-chatbot-gradient hover:bg-chatbot-gradient-light shadow-chatbot transition-all duration-300 hover:scale-110 border-0"
          size="icon"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-chatbot-surface rounded-2xl shadow-chatbot border border-chatbot-border w-80 h-96 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-chatbot-gradient p-4 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
                  {config.avatar}
                </div>
                <div>
                  <h3 className="font-semibold">{config.greeting}</h3>
                  <p className="text-sm text-white/80">{config.subtitle}</p>
                </div>
              </div>
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

          {/* Content */}
          <div className="flex-1 flex flex-col">
            {currentView === 'welcome' ? (
              /* Welcome View */
              <div className="flex-1 p-4 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-chatbot-text-muted mb-4">
                    Today, 04:20
                  </p>
                </div>
                
                <div className="bg-chatbot-surface-secondary rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <div className="h-6 w-6 rounded-full bg-chatbot-gradient flex items-center justify-center text-xs text-white flex-shrink-0">
                      {config.avatar}
                    </div>
                    <div>
                      <p className="text-sm text-chatbot-text mb-3">
                        Hi There,<br />
                        How Can I help you today?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {config.quickActions.map((action) => (
                          <Button
                            key={action.id}
                            onClick={() => handleQuickAction(action)}
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 border-chatbot-border hover:bg-chatbot-primary hover:text-white transition-colors"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Conversation View */
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${
                      message.type === 'user'
                        ? 'bg-chatbot-gradient text-white rounded-lg rounded-br-sm'
                        : 'bg-chatbot-surface-secondary text-chatbot-text rounded-lg rounded-bl-sm'
                    } p-3`}>
                      <p className="text-sm">{message.content}</p>
                      {message.options && (
                        <div className="mt-3 space-y-2">
                          {message.options.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => handleOptionClick(option)}
                              className="w-full text-left p-2 text-sm border border-chatbot-border rounded hover:bg-chatbot-primary hover:text-white transition-colors flex items-center justify-between group"
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
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-chatbot-border">
              <div className="flex space-x-2">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Write a message"
                  className="flex-1 border-chatbot-border focus:ring-chatbot-primary"
                />
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  className="bg-chatbot-gradient hover:bg-chatbot-gradient-light"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {currentView === 'conversation' && (
                <button
                  onClick={resetChat}
                  className="w-full mt-2 text-xs text-chatbot-text-muted hover:text-chatbot-primary transition-colors"
                >
                  Start new conversation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};