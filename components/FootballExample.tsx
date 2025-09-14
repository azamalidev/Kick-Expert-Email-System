'use client';

import Image from "next/image";
import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from "react";
import { FaArrowRight, FaSearch, FaPaperPlane } from "react-icons/fa";

type Message = {
  text: string;
  sender: "user" | "ai";
  level: "easy" | "medium" | "hard";
};

export default function FootballAssistant() {
  const [activeLevel, setActiveLevel] = useState<"easy" | "medium" | "hard">("medium");
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // AI model configurations
  const aiModels = {
    easy: {
      name: "",
      avatar: "⭐",
      systemPrompt: `You are a friendly football assistant for beginners. Respond in 1-2 short sentences with clear and accurate answers. 
Include both recent and historical information as needed. If the question is about an event like the 2022 FIFA World Cup, 
you know that Argentina won the tournament. Avoid saying anything hasn’t happened if it's already in the past. 
Focus on the main fact only and keep the language very simple.
`
    },
    medium: {
      name: "",
      avatar: "🔥",
      systemPrompt: `You are a helpful football analyst who provides accurate and up-to-date answers in 2–4 sentences. 
You include both recent events (like player transfers, match results, and tournaments) and relevant historical context. 
If asked about the 2022 World Cup, you confidently say Argentina won it. 
Do not respond as if you're in the past — always assume the present is 2023 or later. 
Keep your tone informative and accessible.`
    },
    hard: {
      name: "",
      avatar: "💎",
      systemPrompt: `You are a football expert with deep and current knowledge of the sport. 
You respond in 4–6 insightful sentences with expert-level detail, including stats, tactical insights, and historical relevance. 
You are aware that Argentina won the 2022 World Cup, and you incorporate such recent facts naturally. 
Avoid outdated statements like "this event has not happened yet" unless the event is truly in the future. 
Tailor your response as if you're speaking to an advanced football fan who values accuracy, depth, and nuance.
`
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    const urlQuestion = searchParams?.get('question');
    const storageQuestion = sessionStorage.getItem('presetQuestion');

    const presetQuestion = urlQuestion || storageQuestion;

    if (presetQuestion) {
      setSearchQuery(presetQuestion);
      sessionStorage.removeItem('presetQuestion');

      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }
  }, [searchParams]);

  const generateAIResponse = async (query: string, level: "easy" | "medium" | "hard") => {
    try {
      // Dynamic system prompt to handle historical questions
      const isHistorical = /\b(18|19|early 20|FIFA|FA Cup|history|origin|found|first|oldest)\b/i.test(query);

      const systemPrompt = isHistorical
        ? `You are a football historian AI. Provide accurate, detailed, and well-researched answers about football history. Include relevant dates, names, matches, tournaments, and events. Focus on clarity and factual accuracy, even for events from the 1800s and early 1900s.`
        : aiModels[level]?.systemPrompt || "You are a helpful AI assistant answering football-related questions.";

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: query
            }
          ],
          temperature: 0.7,
          max_tokens: level === "easy" ? 300 : level === "medium" ? 600 : 1000
        })
      });

      const data = await response.json();

      return data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      return "Sorry, I'm having trouble answering right now. Please try again later.";
    }
  };


  useEffect(() => {
    if (messages.length === 0 || messages.length === displayedMessages.length) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.sender === "user") {
      setDisplayedMessages(messages);
      return;
    }

    let currentText = "";
    let i = 0;
    const typingSpeed = 20;

    const typeWriter = () => {
      if (i < lastMessage.text.length) {
        currentText += lastMessage.text.charAt(i);
        setDisplayedMessages([...messages.slice(0, -1), {
          ...lastMessage,
          text: currentText
        }]);
        i++;
        setTimeout(typeWriter, typingSpeed);
      } else {
        setIsLoading(false);
      }
    };

    typeWriter();
  }, [messages]);

  const handleSearch = async () => {
    if (searchQuery.trim() === "" || isLoading) return;

    const userMessage: Message = {
      text: searchQuery,
      sender: "user",
      level: activeLevel
    };
    setMessages((prev) => [...prev, userMessage]);
    setSearchQuery("");
    setIsLoading(true);

    try {
      const aiResponseText = await generateAIResponse(searchQuery, activeLevel);

      const aiResponse: Message = {
        text: aiResponseText,
        sender: "ai",
        level: activeLevel
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error generating response:", error);
      const errorResponse: Message = {
        text: "Sorry, I couldn't process your request. Please try again.",
        sender: "ai",
        level: activeLevel
      };
      setMessages((prev) => [...prev, errorResponse]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [displayedMessages]);

  const currentModel = aiModels[activeLevel];

  return (
    <div id="football-example" className="flex flex-col items-center justify-center px-4 pt-20 pb-8 md:pt-28 min-h-screen">
      {/* Header section */}
      <div className="relative text-center mb-10 w-full max-w-4xl">
        <div className="flex items-center mb-4 justify-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={50}
            height={50}
            className="w-8 h-8 md:w-12 md:h-12"
          />
          <span className="ml-2 text-lime-400  font-bold text-xl md:text-2xl">
            Kick<span className="text-black ml-1">Expert</span>
          </span>
        </div>
        <h1 className="text-3xl sm:text-3xl md:text-5xl font-bold text-black mb-2">
          ASK ANYTHING ABOUT
        </h1>
        <h1 className="text-3xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-b from-green-800 to-lime-500 text-transparent bg-clip-text mb-4">
          FOOTBALL HISTORY
        </h1>

        <p className="text-black max-w-xl mx-auto text-sm sm:text-base font-medium">
          Get instant AI-powered answers about players, matches, goals and tournaments from international Football history
        </p>
      </div>

      {/* Knowledge level cards */}
      <div className="flex flex-col w-full gap-2">
        <p className="text-lime-700 max-w-xl mx-auto text-sm sm:text-base font-medium">
          Choose Your Knowledge Level
        </p>
        <div className="flex flex-row justify-center gap-4 mb-8 w-full max-w-4xl">
          {(["easy", "medium", "hard"] as const).map((level) => (
            <div
              key={level}
              className={`flex-1 rounded-xl p-2 md:p-4 text-center transition-all cursor-pointer
                bg-gradient-to-br from-white to-gray-50
                ${activeLevel === level
                  ? "border-2 border-lime-500 shadow-lg"
                  : "border-2 border-gray-300 hover:border-lime-300"}`}
              onClick={() => setActiveLevel(level)}
            >
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl mb-2">
                  {aiModels[level].avatar}
                </span>
                <h2 className="text-lg font-bold text-gray-800 capitalize">{level}</h2>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upper Search Input - Hidden when chat section appears */}
      {messages.length === 0 && (
        <div className="w-full max-w-2xl mb-4">
          <div className="flex items-center border-2 border-gray-500 rounded-xl px-4 py-3 shadow-sm bg-white">
            <FaSearch className="text-gray-700 mr-3" />
            <input
              type="text"
              placeholder={`Ask a ${activeLevel} level question`}
              className="flex-grow outline-none bg-transparent text-base text-gray-700 placeholder-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={handleSearch}
              className="text-white bg-lime-500 hover:bg-lime-600 p-2 rounded-full transition-colors"
              disabled={isLoading}
            >
              <FaArrowRight />
            </button>
          </div>
        </div>
      )}

      {/* Chat Section - Appears after first message */}
      {messages.length > 0 && (
        <div className="w-full max-w-3xl bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className="text-xl mr-2">{currentModel.avatar}</span>
              <h3 className="text-lg font-semibold text-gray-800">
                {currentModel.name}
              </h3>
            </div>
            <span className="px-3 py-1 bg-lime-100 text-lime-800 text-xs font-medium rounded-full">
              {activeLevel} level
            </span>
          </div>

          <div
            ref={chatContainerRef}
            className="flex flex-col space-y-4 h-64 sm:h-80 overflow-y-auto p-3 mb-4 scrollbar-hide"
          >
            {displayedMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${message.sender === "user"
                    ? "bg-lime-500 text-white text-left"
                    : "bg-gray-100 borde text-left text-gray-800"
                    }`}
                >
                  <div className="flex items-center mb-1">
                    <span className={`text-xs font-medium ${message.sender === "user" ? "text-lime-100" : "text-gray-500"}`}>
                      {message.sender === "user"
                        ? "You"
                        : `${aiModels[message.level].name} (${message.level})`}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.text}
                    {isLoading && index === displayedMessages.length - 1 && message.sender === "ai" && (
                      <span className="inline-block w-2 h-4 ml-1 bg-lime-500 animate-pulse"></span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && displayedMessages[displayedMessages.length - 1]?.sender === "user" && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 max-w-[85%]">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{currentModel.avatar}</span>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center border-2 border-gray-300 rounded-lg px-3 py-2 bg-white">
            <input
              type="text"
              placeholder={`Ask ${currentModel.name} a question...`}
              className="flex-grow px-2 py-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={handleSearch}
              className="text-lime-500 hover:text-lime-700 p-1.5 transition-colors"
              disabled={isLoading}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}

      {/* Info section */}
      <div className="max-w-2xl text-center">
        <p className="text-gray-700 text-lg mb-1">
          Selected level: <span className="font-medium text-lime-600 capitalize">{activeLevel}</span>
        </p>
        <p className="text-gray-600 text-sm">
          The assistant will tailor responses based on your selected knowledge level
        </p>
      </div>
    </div>
  );
}