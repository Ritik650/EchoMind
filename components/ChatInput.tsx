import React, { useState, useEffect, useRef } from 'react';
import { SendIcon, MicIcon, StopIcon } from './icons';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  // FIX: Use `any` type for SpeechRecognition object as it's not standard in all TS DOM libs.
  const recognitionRef = useRef<any | null>(null);

  const isSpeechRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  useEffect(() => {
    if (!isSpeechRecognitionSupported) return;

    // FIX: Cast window to `any` to access non-standard SpeechRecognition APIs.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInputText(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
  }, [isSpeechRecognitionSupported]);

  const handleMicClick = () => {
    if (isLoading) return;

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setInputText('');
      recognitionRef.current?.start();
    }
    setIsRecording(!isRecording);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
      }
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white/80 backdrop-blur-lg border-t border-gray-200">
      <div className="flex items-center space-x-3">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={isRecording ? "Listening..." : "Share what's on your mind..."}
          className="flex-1 p-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200 disabled:bg-gray-100"
          rows={1}
          disabled={isLoading}
        />
        {isSpeechRecognitionSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            className={`p-3 transition-colors duration-200 rounded-full ${isRecording ? 'text-white bg-red-500 animate-pulse' : 'text-gray-500 hover:text-blue-600'} disabled:text-gray-300`}
            disabled={isLoading}
            aria-label={isRecording ? "Stop recording" : "Record voice message"}
          >
            {isRecording ? <StopIcon /> : <MicIcon />}
          </button>
        )}
        <button
          type="submit"
          className="p-3 text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-300"
          disabled={isLoading || !inputText.trim()}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );
};

export default ChatInput;