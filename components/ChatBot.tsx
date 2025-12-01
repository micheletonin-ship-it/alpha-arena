

import React, { useState, useRef, useEffect } from 'react';
import { Theme, Stock, Holding, ChatMessage, User as UserType, AIResponse } from '../types';
import { MessageSquare, X, Send, Bot, User, Sparkles, Paperclip } from 'lucide-react'; // Added Paperclip icon
import { generateAIContent } from '../services/aiService';

interface ChatBotProps {
  theme: Theme;
  marketData: Stock[];
  holdings: Holding[];
  user: UserType;
  championshipId: string; // UPDATED: now mandatory string
}

export const ChatBot: React.FC<ChatBotProps> = ({ theme, marketData, holdings, user, championshipId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Ciao ${user.name.split(' ')[0]}! Sono AlphaBot, il tuo assistente di trading personale alimentato da ${user.active_ai_provider ? user.active_ai_provider.toUpperCase() : 'GEMINI'}. Come posso aiutarti?`,
      timestamp: new Date()
    }
  ]);

  // NEW: State for image upload
  const [selectedImage, setSelectedImage] = useState<{ file: File, preview: string, data: string, mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // NEW: Daily message limit (10 messages per day)
  const DAILY_MESSAGE_LIMIT = 10;
  const [dailyMessageCount, setDailyMessageCount] = useState(0);
  const [lastMessageDate, setLastMessageDate] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // NEW: Load and manage daily message count from localStorage
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `chatbot_daily_count_${user.id}`;
    const storageDateKey = `chatbot_last_date_${user.id}`;
    
    const savedCount = localStorage.getItem(storageKey);
    const savedDate = localStorage.getItem(storageDateKey);
    
    // Reset count if it's a new day
    if (savedDate !== today) {
      setDailyMessageCount(0);
      setLastMessageDate(today);
      localStorage.setItem(storageKey, '0');
      localStorage.setItem(storageDateKey, today);
    } else {
      setDailyMessageCount(parseInt(savedCount || '0', 10));
      setLastMessageDate(savedDate);
    }
  }, [user.id]);

  // Reset chat if user changes or championship changes
  useEffect(() => {
     setMessages([{
        id: 'welcome',
        role: 'model',
        text: `Ciao ${user.name.split(' ')[0]}! Sono AlphaBot, il tuo assistente di trading personale alimentato da ${user.active_ai_provider ? user.active_ai_provider.toUpperCase() : 'GEMINI'}. Come posso aiutarti?`,
        timestamp: new Date()
     }]);
     setSelectedImage(null); // Clear image on user change
  }, [user.id, user.active_ai_provider, championshipId]);

  // Utility function to convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data:image/jpeg;base64, prefix
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      try {
        const base64Data = await fileToBase64(file);
        setSelectedImage({ file, preview, data: base64Data, mimeType: file.type });
      } catch (error) {
        console.error("Errore nella conversione dell'immagine in Base64:", error);
        setSelectedImage(null);
      }
    }
    // Reset the input value to allow selecting the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.preview); // Clean up the object URL
      setSelectedImage(null);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return; // Don't send empty message or no image

    // NEW: Check daily message limit
    if (dailyMessageCount >= DAILY_MESSAGE_LIMIT) {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: `⚠️ Hai raggiunto il limite giornaliero di ${DAILY_MESSAGE_LIMIT} messaggi. Riprova domani!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
      image: selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    handleClearImage(); // Clear selected image after sending

    // NEW: Increment daily message count
    const newCount = dailyMessageCount + 1;
    setDailyMessageCount(newCount);
    localStorage.setItem(`chatbot_daily_count_${user.id}`, newCount.toString());

    try {
      // Filter holdings for the current championship context
      // holdings prop is already filtered by App.tsx, no need to filter again.
      // championshipId prop is now guaranteed to be a string.

      const systemContext = `
        Sei un assistente di trading AI avanzato chiamato "AlphaBot" incorporato nell'applicazione AlphaArena.
        
        CONTESTO UTENTE:
        - Nome: ${user.name}
        - Tipo di Account: ${user.accountType}
        - Contesto Campionato ID: ${championshipId}
        
        DATI DI MERCATO ATTUALI (Prezzi Live):
        ${JSON.stringify(marketData.map(s => ({ symbol: s.symbol, price: s.price, change: s.changePercent })))}
        
        PORTAFOGLIO UTENTE (nel contesto attuale):
        ${JSON.stringify(holdings)}
        
        ISTRUZIONI:
        1. Rispondi alle domande sulle performance del portafoglio dell'utente, sui prezzi specifici delle azioni e sui consigli finanziari generali.
        2. Sii conciso, professionale e utile. 
        3. Se ti viene chiesto di un'azione non presente nell'elenco, usa la tua conoscenza generale.
        4. NON usare la formattazione markdown per le tabelle, solo semplici liste di testo. Usa Markdown per grassetto/corsivo.
        5. Formatta la valuta in USD.
        6. Se ricevi un'immagine, analizzala attentamente in relazione al prompt testuale dell'utente e al contesto finanziario.
       `;

      let aiContents: string | any[] = [];
      
      // Always prepend system context as the first text part
      aiContents.push({ text: systemContext });

      // Add user's text input if present
      if (input.trim()) {
          aiContents.push({ text: `User Question: ${input}` });
      }
      
      // Add user's image if selected
      if (selectedImage) {
          aiContents.push({
              inlineData: {
                  mimeType: selectedImage.mimeType,
                  data: selectedImage.data,
              },
          });
      }

      // Call Unified AI Service
      // The generateAIContent function in aiService.ts now handles the final contents structure for Gemini
      const aiResponse: AIResponse = await generateAIContent(aiContents, { tools: [{googleSearch: {}}] });
      
      let finalResponseText = aiResponse.text;
      if (!aiResponse.text.trim()) {
          finalResponseText = `Mi dispiaccio, non sono riuscito a generare una risposta in questo momento. 
                                  Il mio cervello AI potrebbe essere sovraccarico o avere problemi di quota. 
                                  Controlla le impostazioni della chiave API per il provider ${user.active_ai_provider ? user.active_ai_provider.toUpperCase() : 'GEMINI'}.`;
      }

      const modelMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: finalResponseText,
          timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);

    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMsg = `Si è verificato un errore inaspettato con il servizio AI. 
                      Messaggio: ${error.message || 'Errore sconosciuto.'} 
                      Riprova più tardi o controlla le impostazioni.`;
      
      // More specific error handling based on messages from aiService.ts
      if (error.message?.includes('API Key not configured.')) {
          errorMsg = `Errore chiave API AI: La chiave API per ${user.active_ai_provider ? user.active_ai_provider.toUpperCase() : 'GEMINI'} non è configurata o non è valida. 
                      Configurala nelle Impostazioni per attivare l'AI.`;
      } else if (error.message?.includes('No Gemini API Key available.')) {
          errorMsg = `Errore chiave API AI: Nessuna chiave API Gemini disponibile. Configurala nelle Impostazioni.`;
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('Network error')) {
          errorMsg = "Errore di rete: Impossibile connettersi ai servizi AI. Controlla la tua connessione internet.";
      } else if (error.message?.includes('OpenAI Error:')) {
          errorMsg = `OpenAI API Error: ${error.message.replace('OpenAI Error: ', '')} 
                      Controlla la tua chiave API o lo stato del tuo account OpenAI.`;
      } else if (error.message?.includes('Anthropic Error:')) {
          errorMsg = `Anthropic API Error: ${error.message.replace('Anthropic Error: ', '')} 
                      Controlla la tua chiave API o lo stato del tuo account Anthropic.`;
      } else if (error.message?.includes('Gemini Error:')) {
        errorMsg = `Gemini API Error: ${error.message.replace('Gemini Error: ', '')} 
                    Controlla la tua chiave API o lo stato del tuo account Google AI.`;
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: errorMsg,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          isOpen 
            ? 'bg-red-500 rotate-90 text-white' 
            : theme === 'dark' ? 'bg-neonGreen text-black' : 'bg-black text-white'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 z-40 flex w-[90vw] max-w-[400px] flex-col overflow-hidden rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 ${
            theme === 'dark' 
            ? 'bg-[#1E1E1E] border-white/10' 
            : 'bg-white border-gray-200'
        }`} style={{ height: '500px', maxHeight: '70vh' }}>
          
          {/* Header */}
          <div className={`flex items-center justify-between border-b px-4 py-3 ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-neonGreen text-black' : 'bg-black text-white'}`}>
                    <Sparkles size={16} />
                </div>
                <div>
                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>AlphaBot</h3>
                    <div className="flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        </span>
                        <span className="text-[10px] text-gray-500">Online • {user.active_ai_provider ? user.active_ai_provider.toUpperCase() : 'GEMINI'}</span>
                    </div>
                </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-600">
            <div className="space-y-4">
               {messages.map((msg) => (
                 <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                             msg.role === 'user' 
                             ? 'bg-gray-200 text-gray-700' 
                             : (theme === 'dark' ? 'bg-white/10 text-neonGreen' : 'bg-black text-white')
                        }`}>
                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`rounded-2xl px-4 py-2 text-sm ${
                            msg.role === 'user'
                            ? (theme === 'dark' ? 'bg-neonGreen text-black' : 'bg-black text-white')
                            : (theme === 'dark' ? 'bg-white/5 text-gray-200' : 'bg-gray-100 text-gray-800')
                        }`}>
                            {msg.image && (
                                <img 
                                  src={msg.image.data.startsWith('data:') ? msg.image.data : `data:${msg.image.mimeType};base64,${msg.image.data}`}
                                  alt="User upload" 
                                  className="max-w-full h-auto rounded-lg mb-2"
                                  style={{ maxHeight: '150px' }}
                                />
                            )}
                            {msg.text}
                        </div>
                    </div>
                 </div>
               ))}
               {isTyping && (
                  <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl bg-gray-100 dark:bg-white/5 px-4 py-2">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></span>
                          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-75"></span>
                          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-150"></span>
                      </div>
                  </div>
               )}
               <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className={`border-t p-3 ${theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-white'}`}>
             {selectedImage && (
                <div className={`relative flex items-center mb-3 p-2 rounded-lg border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                    <img src={selectedImage.preview} alt="Anteprima immagine" className="h-10 w-10 object-cover rounded-md mr-2"/>
                    <span className="text-xs text-gray-500 flex-1 truncate">{selectedImage.file.name}</span>
                    <button onClick={handleClearImage} className={`ml-2 p-1 rounded-full ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                      <X size={14}/>
                    </button>
                </div>
             )}
             <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all focus-within:ring-1 ${
                theme === 'dark' 
                ? 'bg-white/5 border-white/10 focus-within:border-neonGreen/50 focus-within:ring-neonGreen/20' 
                : 'bg-gray-50 border-gray-200 focus-within:border-black focus-within:ring-black/10'
             }`}>
                <input 
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-lg p-2 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-200'}`}
                  title="Allega immagine"
                >
                  <Paperclip size={18} />
                </button>
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Chiedi del tuo portafoglio..."
                    className={`flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={(!input.trim() && !selectedImage) || isTyping}
                    className={`rounded-lg p-2 transition-colors ${
                        (!input.trim() && !selectedImage) 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : (theme === 'dark' ? 'text-neonGreen hover:bg-neonGreen/10' : 'text-black hover:bg-gray-200')
                    }`}
                >
                    <Send size={18} />
                </button>
             </div>
             <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-gray-500">L'AI può commettere errori. Controlla le informazioni importanti.</p>
                <p className={`text-[10px] font-medium ${
                  dailyMessageCount >= DAILY_MESSAGE_LIMIT 
                    ? 'text-red-500' 
                    : dailyMessageCount >= DAILY_MESSAGE_LIMIT * 0.8 
                      ? 'text-orange-500' 
                      : 'text-gray-500'
                }`}>
                  {DAILY_MESSAGE_LIMIT - dailyMessageCount}/{DAILY_MESSAGE_LIMIT} messaggi rimasti
                </p>
             </div>
          </div>

        </div>
      )}
    </>
  );
};
