import React, { useState } from 'react';
import { Message as MessageType } from '../types';
import { SpeakerOnIcon, SpeakerOffIcon } from './icons';

interface MessageProps {
  message: MessageType;
  onPlayAudio: (audioBuffer: AudioBuffer) => void;
}

const PersonaBadge: React.FC<{ persona: string }> = ({ persona }) => (
  <div className="text-xs font-semibold text-gray-500 mb-1">{persona}</div>
);

const LoadingIndicator = () => (
    <div className="flex items-center space-x-2">
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></span>
        <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
    </div>
);

const AudioButton: React.FC<{ audioBuffer: AudioBuffer, onPlayAudio: (buffer: AudioBuffer) => void }> = ({ audioBuffer, onPlayAudio }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlay = () => {
        setIsPlaying(true);
        onPlayAudio(audioBuffer);
        // This is a simple approach. A more robust solution would use an AudioContext
        // manager to know when playback has actually finished.
        setTimeout(() => setIsPlaying(false), audioBuffer.duration * 1000);
    };

    return (
        <button
            onClick={handlePlay}
            className="text-gray-500 hover:text-blue-600 transition-colors duration-200 mt-2"
            aria-label="Play audio"
        >
            {isPlaying ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
        </button>
    );
};

const Message: React.FC<MessageProps> = ({ message, onPlayAudio }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div
        className={`w-full max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-sm transition-all duration-300 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-white text-gray-800 rounded-bl-none'
        }`}
      >
        {!isUser && message.persona && <PersonaBadge persona={message.persona} />}
        {message.isLoading ? <LoadingIndicator /> : <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>}
        {!isUser && message.audioBuffer && !message.isLoading && (
            <AudioButton audioBuffer={message.audioBuffer} onPlayAudio={onPlayAudio} />
        )}
      </div>
    </div>
  );
};

export default Message;