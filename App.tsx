import React, { useState, useEffect, useRef } from 'react';
import { Message as MessageType, Persona } from './types';
import { INITIAL_MESSAGES } from './constants';
import { getAIResponseStream, getSpeech } from './services/geminiService';
import Message from './components/Message';
import ChatInput from './components/ChatInput';

const App: React.FC = () => {
  const [messages, setMessages] = useState<MessageType[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // FIX: Cast window to `any` to access non-standard `webkitAudioContext`.
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const playAudio = (audioBuffer: AudioBuffer) => {
    if (!audioContextRef.current) return;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start(0);
  };

  const handleSendMessage = async (text: string) => {
    const userMessage: MessageType = {
      id: Date.now().toString(),
      text,
      sender: 'user',
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    
    const aiMessageId = (Date.now() + 1).toString();
    const placeholderMessage: MessageType = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        isLoading: true,
    };
    setMessages(prev => [...prev, placeholderMessage]);

    try {
        const stream = await getAIResponseStream(newMessages, text);
        let responseText = '';
        let persona: Persona | undefined = undefined;
        let firstChunk = true;

        for await (const chunk of stream) {
            let chunkText = chunk.text;
            if (firstChunk) {
                const personaMatch = chunkText.match(/\[PERSONA: (.*?)\]\n?/);
                if (personaMatch && personaMatch[1]) {
                    const parsedPersona = personaMatch[1].trim() as Persona;
                    if (Object.values(Persona).includes(parsedPersona)) {
                        persona = parsedPersona;
                    }
                    chunkText = chunkText.replace(personaMatch[0], '');
                }
                firstChunk = false;
            }
            
            responseText += chunkText;
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                ? { ...msg, text: responseText, persona: persona ?? msg.persona } 
                : msg
            ));
        }
        
        setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, isLoading: false } : msg
        ));

        if (responseText && persona) {
            const audioBuffer = await getSpeech(responseText, persona);
            if (audioBuffer) {
                setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId ? { ...msg, audioBuffer: audioBuffer } : msg
                ));
                playAudio(audioBuffer);
            }
        }

    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: MessageType = {
        id: aiMessageId,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        isLoading: false,
      };
      setMessages(prev => prev.map(m => m.id === aiMessageId ? errorMessage : m));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 font-sans">
      <header className="text-center p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">EchoMind</h1>
        <p className="text-sm text-gray-500">Your AI-Powered Cognitive Co-Pilot</p>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg) => (
            <Message key={msg.id} message={msg} onPlayAudio={playAudio}/>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className="sticky bottom-0">
        <div className="max-w-2xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
};

export default App;