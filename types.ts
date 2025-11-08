export type Sender = 'user' | 'ai';

export enum Persona {
  PRAGMATIST = 'The Pragmatist',
  COMPASSIONATE_FRIEND = 'The Compassionate Friend',
  FUTURE_SELF = 'The Future Self',
  STOIC = 'The Stoic',
  OPTIMIST = 'The Optimist',
  CURIOUS_CHILD = 'The Curious Child',
  EMPATHETIC_LISTENER = 'The Empathetic Listener',
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  persona?: Persona;
  audioBuffer?: AudioBuffer;
  isLoading?: boolean;
}