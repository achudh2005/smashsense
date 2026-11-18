export type VoiceCommandHandler = (command: 'START' | 'STOP' | 'UNDO' | 'REDO' | 'NEXT_GAME' | 'SCORE' | 'POINT_A' | 'POINT_B') => void;

export class SpeechService {
  private synthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  private recognitionSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  private recognition: any = null;
  private isListening = false;
  private commandHandler: VoiceCommandHandler | null = null;
  private voiceEnabled = true;

  constructor() {
    this.initRecognition();
  }

  public isVoiceSupported(): boolean {
    return this.synthesisSupported;
  }

  public isRecognitionSupported(): boolean {
    return this.recognitionSupported;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
  }

  public getVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  /**
   * Generates standard BWF score phrasing
   */
  public getScoreAnnouncement(
    scoreA: number,
    scoreB: number,
    serverTeam: 'A' | 'B',
    isDeuce: boolean = false,
    isGamePoint: boolean = false,
    isMatchPoint: boolean = false,
    winnerName?: string
  ): string {
    if (winnerName) {
      return `Game, ${winnerName}. ${Math.max(scoreA, scoreB)} to ${Math.min(scoreA, scoreB)}.`;
    }
    if (isMatchPoint) {
      return `Match point. ${scoreA}, ${scoreB}.`;
    }
    if (isGamePoint) {
      return `Game point. ${scoreA}, ${scoreB}.`;
    }
    if (isDeuce) {
      return `Deuce, 20 all.`;
    }
    if (scoreA === 0 && scoreB === 0) {
      return `Love all. Play.`;
    }
    if (scoreA === scoreB) {
      return `${scoreA} all.`;
    }
    if (serverTeam === 'A') {
      return `${scoreA}, ${scoreB}.`;
    }
    return `${scoreB}, ${scoreA}.`;
  }

  /**
   * Spoken score announcement in standard BWF phrasing
   */
  public announceScore(
    scoreA: number,
    scoreB: number,
    serverTeam: 'A' | 'B',
    isDeuce: boolean = false,
    isGamePoint: boolean = false,
    isMatchPoint: boolean = false,
    winnerName?: string
  ): string {
    const text = this.getScoreAnnouncement(
      scoreA,
      scoreB,
      serverTeam,
      isDeuce,
      isGamePoint,
      isMatchPoint,
      winnerName
    );
    this.speak(text);
    return text;
  }

  /**
   * Spoken IN / OUT call
   */
  public announceCall(call: 'IN' | 'OUT'): string {
    const text = call === 'OUT' ? 'OUT!' : 'IN!';
    this.speak(text);
    return text;
  }

  /**
   * General phrase announcement
   */
  public speak(phrase: string) {
    if (!this.voiceEnabled) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('SpeechSynthesis error:', e);
      }
    }
  }

  /**
   * Start hands-free speech recognition for commands
   */
  public startListening(handler: VoiceCommandHandler) {
    if (!this.recognitionSupported) return;
    this.commandHandler = handler;
    this.isListening = true;

    try {
      this.recognition?.start();
    } catch {
      // May already be active
    }
  }

  /**
   * Stop hands-free speech recognition
   */
  public stopListening() {
    this.isListening = false;
    this.commandHandler = null;
    try {
      this.recognition?.stop();
    } catch {
      void 0;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  private initRecognition() {
    if (!this.recognitionSupported) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (!lastResult || !lastResult[0]) return;

        const transcript = lastResult[0].transcript.toLowerCase().trim();
        this.processVoiceCommand(transcript);
      };

      this.recognition.onend = () => {
        // Automatically restart if still listening
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch {
            void 0;
          }
        }
      };

      this.recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('SpeechRecognition warning:', e.error);
        }
      };
    } catch (e) {
      console.warn('Could not initialize SpeechRecognition:', e);
    }
  }

  private processVoiceCommand(phrase: string) {
    if (!this.commandHandler) return;

    if (phrase.includes('start') || phrase.includes('play') || phrase.includes('resume')) {
      this.commandHandler('START');
      this.speak('Match active');
    } else if (phrase.includes('stop') || phrase.includes('pause') || phrase.includes('halt')) {
      this.commandHandler('STOP');
      this.speak('Match paused');
    } else if (phrase.includes('undo') || phrase.includes('cancel point')) {
      this.commandHandler('UNDO');
      this.speak('Score undone');
    } else if (phrase.includes('redo')) {
      this.commandHandler('REDO');
      this.speak('Score redone');
    } else if (phrase.includes('next game') || phrase.includes('new game')) {
      this.commandHandler('NEXT_GAME');
      this.speak('Next game starting');
    } else if (phrase.includes('score') || phrase.includes('what is the score')) {
      this.commandHandler('SCORE');
    } else if (phrase.includes('point a') || phrase.includes('point team a')) {
      this.commandHandler('POINT_A');
      this.speak('Point Team A');
    } else if (phrase.includes('point b') || phrase.includes('point team b')) {
      this.commandHandler('POINT_B');
      this.speak('Point Team B');
    }
  }
}

export const speechService = new SpeechService();
