import React, { useState } from 'react';
import { ChatbotWidget } from './ChatbotWidget';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2, Palette, MessageSquare, Settings } from 'lucide-react';

const ChatbotDemo: React.FC = () => {
  const [selectedConfig, setSelectedConfig] = useState('default');

  const configs = [
    { id: 'default', name: 'Jaldee Assistant (Default)', description: 'Purple gradient theme with comprehensive support options' },
    { id: 'company-xyz', name: 'XYZ Company Sales Bot', description: 'Blue theme focused on sales and demos' }
  ];

  const embedCode = `<!-- Add this to any website -->
<script src="https://your-domain.com/chatbot.js"></script>
<script>
  ChatbotWidget.init({
    configId: '${selectedConfig}',
    position: 'bottom-right'
  });
</script>`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-chatbot-secondary/20 to-chatbot-primary/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-chatbot-text mb-4">
            Embeddable Chatbot Widget
          </h1>
          <p className="text-xl text-chatbot-text-muted max-w-2xl mx-auto">
            Powerful, customizable chatbot widget that can be embedded into any website with JSON-based configuration
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="border-chatbot-border">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-chatbot-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Conversational Flow</h3>
              <p className="text-sm text-chatbot-text-muted">Smart conversation paths with quick actions and categorized responses</p>
            </CardContent>
          </Card>

          <Card className="border-chatbot-border">
            <CardContent className="p-6 text-center">
              <Palette className="h-12 w-12 text-chatbot-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Custom Themes</h3>
              <p className="text-sm text-chatbot-text-muted">Beautiful gradient designs with customizable colors and positioning</p>
            </CardContent>
          </Card>

          <Card className="border-chatbot-border">
            <CardContent className="p-6 text-center">
              <Settings className="h-12 w-12 text-chatbot-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">JSON Configuration</h3>
              <p className="text-sm text-chatbot-text-muted">Easy setup with JSON files - no code changes needed</p>
            </CardContent>
          </Card>

          <Card className="border-chatbot-border">
            <CardContent className="p-6 text-center">
              <Code2 className="h-12 w-12 text-chatbot-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Easy Embed</h3>
              <p className="text-sm text-chatbot-text-muted">Simple script tag integration for any website or platform</p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Configuration Panel */}
          <Card className="border-chatbot-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-chatbot-primary" />
                <span>Demo Configuration</span>
              </CardTitle>
              <CardDescription>
                Select a chatbot configuration to see it in action
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-chatbot-text mb-2 block">
                  Chatbot Configuration
                </label>
                <Select value={selectedConfig} onValueChange={setSelectedConfig}>
                  <SelectTrigger className="border-chatbot-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {configs.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-chatbot-text-muted mt-1">
                  {configs.find(c => c.id === selectedConfig)?.description}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-chatbot-text mb-2 block">
                  Embed Code
                </label>
                <div className="bg-chatbot-surface-secondary p-4 rounded-lg border border-chatbot-border">
                  <pre className="text-xs text-chatbot-text-muted overflow-x-auto">
                    <code>{embedCode}</code>
                  </pre>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-chatbot-border"
                  onClick={() => navigator.clipboard.writeText(embedCode)}
                >
                  Copy Code
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="border-chatbot-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-chatbot-primary" />
                <span>Live Preview</span>
              </CardTitle>
              <CardDescription>
                Try the chatbot widget with the selected configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-8 min-h-[300px] relative border-2 border-dashed border-gray-200">
                <div className="text-center text-gray-500 mb-4">
                  <h3 className="font-medium">Sample Website</h3>
                  <p className="text-sm">The chatbot will appear in the bottom corner</p>
                </div>
                
                <div className="space-y-4 text-gray-400 text-sm">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-20 bg-gray-200 rounded w-full"></div>
                </div>

                {/* Chatbot Widget */}
                <ChatbotWidget configId={selectedConfig} className="!fixed !bottom-4 !right-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Instructions */}
        <Card className="border-chatbot-border">
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
            <CardDescription>
              Follow these steps to add the chatbot to your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="h-12 w-12 bg-chatbot-gradient rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold mb-2">Create Configuration</h3>
                <p className="text-sm text-chatbot-text-muted">
                  Define your chatbot's behavior, appearance, and conversation flows in a JSON file
                </p>
              </div>
              
              <div className="text-center">
                <div className="h-12 w-12 bg-chatbot-gradient rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold mb-2">Host Configuration</h3>
                <p className="text-sm text-chatbot-text-muted">
                  Upload your JSON configuration file to your server or CDN
                </p>
              </div>
              
              <div className="text-center">
                <div className="h-12 w-12 bg-chatbot-gradient rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold mb-2">Embed Widget</h3>
                <p className="text-sm text-chatbot-text-muted">
                  Add the embed script to your website with your configuration ID
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatbotDemo;