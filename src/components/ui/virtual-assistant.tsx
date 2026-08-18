import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Loader2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { assistantApi } from '@/lib/api/assistant.api';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

/** Strip markdown and special symbols so TTS reads cleanly */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')       // headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1')     // italic
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*+]\s/gm, '')       // list bullets
    .replace(/^\d+\.\s/gm, '')       // numbered list
    .replace(/\n{2,}/g, '. ')        // double newlines → pause
    .replace(/\n/g, ' ')             // single newlines
    .replace(/•/g, '')               // bullet chars
    .trim();
}

export function VirtualAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Text-to-speech using Web Speech API in Spanish
  const speakText = useCallback((text: string) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const clean = stripMarkdown(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-ES';
    utterance.rate = 0.92;   // slightly slower for clarity
    utterance.pitch = 1.05;  // natural tone
    utterance.volume = 1.0;

    // Prefer a Spanish female voice if available
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice =
      voices.find((v) => v.lang === 'es-ES' && v.name.toLowerCase().includes('female')) ||
      voices.find((v) => v.lang === 'es-ES') ||
      voices.find((v) => v.lang.startsWith('es'));

    if (spanishVoice) utterance.voice = spanishVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [audioEnabled]);

  // Stop speaking immediately
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Toggle audio on/off
  const toggleAudio = useCallback(() => {
    if (audioEnabled) {
      stopSpeaking();
    }
    setAudioEnabled((prev) => !prev);
  }, [audioEnabled, stopSpeaking]);

  // Stop speaking when chat closes
  useEffect(() => {
    if (!isOpen) stopSpeaking();
  }, [isOpen, stopSpeaking]);

  // Initial greeting message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting =
        '¡Hola! 👋 Soy tu asistente virtual del Centro de Mando Ministerial. Estoy aquí para ayudarte a entender cómo usar este sistema y resolver cualquier duda que tengas.\n\nPuedes preguntarme sobre:\n\n• Cómo crear y gestionar documentos\n• Flujos de trabajo (Entrada/Salida)\n• Funciones de IA (OCR, Resumen, Decreto)\n• Expedientes y plazos\n• Protocolos de firma\n• Y cualquier otra función del sistema\n\n¿En qué puedo ayudarte hoy?';

      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Stop any current speech before sending
    stopSpeaking();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await assistantApi.chat({
        message: userMessage.content,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Speak the assistant response if audio is enabled
      speakText(data.response);
    } catch (error: any) {
      console.error('Assistant error:', error);

      let errorText = 'Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta de nuevo.';

      if (error.response?.status === 401) {
        errorText = 'Tu sesión ha expirado. Por favor, recarga la página e inicia sesión nuevamente.';
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      toast.error(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
            title="Asistente Virtual"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}

        {/* Chat Window */}
        {isOpen && (
          <Card className="w-[380px] h-[600px] shadow-2xl flex flex-col">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <CardTitle className="text-base">Asistente Virtual</CardTitle>
                {/* Speaking indicator */}
                {isSpeaking && (
                  <span className="text-xs bg-primary-foreground/20 rounded-full px-2 py-0.5 animate-pulse">
                    🔊 Hablando...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Audio toggle button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAudio}
                  className="h-8 w-8 p-0 text-primary-foreground hover:bg-primary-foreground/20"
                  title={audioEnabled ? 'Desactivar audio' : 'Activar audio (voz en español)'}
                >
                  {audioEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4 opacity-60" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {/* Messages Area */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString('es', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {/* Re-read button for assistant messages */}
                          {message.role === 'assistant' && audioEnabled && (
                            <button
                              onClick={() => speakText(message.content)}
                              className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                              title="Leer en voz alta"
                            >
                              🔊
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t">
                {/* Audio hint */}
                {!audioEnabled && (
                  <p className="text-xs text-muted-foreground mb-2 text-center">
                    Activa el audio 🔊 para escuchar respuestas en español
                  </p>
                )}
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu pregunta..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
