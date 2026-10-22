import { useCallback, useEffect, useRef, useState } from "react";

const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

export const canListen = !!SR;
export const canSpeak = !!synth;

const LANG = "en-IN"; // change to "hi-IN" for Hindi, or "en-US" for American English

export function useSpeech() {
  const [activeId, setActiveId] = useState(null); // which text is being read aloud
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const stop = useCallback(() => {
    synth?.cancel();
    setActiveId(null);
  }, []);

  const speak = useCallback((text, id = "default") => {
    if (!synth || !text) return;
    synth.cancel();
    // remove symbols that would be read out loud ("bullet", "asterisk")
    const clean = text.replace(/[•*#_`]/g, " ").replace(/\s+/g, " ").trim();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = LANG;
    u.onend = u.onerror = () => setActiveId((cur) => (cur === id ? null : cur));
    setActiveId(id);
    synth.speak(u);
  }, []);

  const listen = useCallback((onResult, onError) => {
    if (!SR) return;
    const rec = new SR();
    rec.lang = LANG;
    rec.interimResults = false;
    rec.onresult = (e) => onResult(e.results[0][0].transcript);
    rec.onerror = (e) => onError?.(e.error);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, []);

  const stopListening = useCallback(() => recRef.current?.stop(), []);

  // stop everything when the component unmounts
  useEffect(() => () => { synth?.cancel(); recRef.current?.abort(); }, []);

  return { activeId, listening, speak, stop, listen, stopListening };
}
