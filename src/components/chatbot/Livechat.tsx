import {
  MinusIcon,
  MoreHorizontalIcon,
  PaperclipIcon,
  SendIcon,
  SmileIcon,
} from "lucide-react";
import React from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Livechat = (): JSX.Element => {
  const actionButtons = [
    { text: "Contact Us", className: "w-[120px]" },
    { text: "Product Enquiry", className: "w-[161px]" },
    { text: "Create Support Ticket", className: "w-[200px]" },
    { text: "Get Quote", className: "w-[119px]" },
    { text: "Feedback", className: "w-[107px]" },
  ];

  return (
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
              className="w-[41px] h-[41px] bg-[#6090ff] rounded-full shadow-[0px_0px_2.84px_#a1a1a140] hover:bg-[#5080ef] transition-colors"
            >
              <MinusIcon className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Greeting text */}
        <h1 className="h-[46px] font-semibold text-label-colordarkprimary text-[30.1px] text-center leading-[45.2px] [font-family:'Inter',Helvetica] tracking-[0] mb-4 opacity-0 animate-fade-in [--animation-delay:400ms]">
          Hey J!
        </h1>

        <p className="h-[34px] font-normal text-[#b7c3ff] text-xl text-center leading-[33.0px] [font-family:'Inter',Helvetica] tracking-[0] mb-8 opacity-0 animate-fade-in [--animation-delay:600ms]">
          You can ask anything About Jaldee!
        </p>
      </div>

      {/* Chat container */}
      <Card className="absolute left-[calc(50.00%_-_261px)] top-[262px] w-[522px] h-[552px] bg-white rounded-[25px] border border-[#e2e2e2] shadow-lg opacity-0 animate-fade-up [--animation-delay:800ms]">
        <CardContent className="p-6 h-full flex flex-col">
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
                variant="outline"
                className={`${button.className} h-[42px] bg-white rounded-[24.1px] border-[0.96px] border-transparent bg-gradient-to-r from-[rgba(131,80,242,1)] via-[rgba(131,80,242,1)] to-[rgba(61,125,243,1)] bg-clip-border hover:shadow-md transition-all duration-200 hover:scale-105 opacity-0 animate-fade-in`}
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

          {/* Message input area */}
          <div className="mt-auto pt-4 border-t border-[#e2e2e2] opacity-0 animate-fade-in [--animation-delay:1800ms]">
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
              <Input
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
  );
};