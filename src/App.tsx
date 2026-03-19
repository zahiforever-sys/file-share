import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Upload, 
  Download, 
  Share2, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  QrCode, 
  ArrowLeft,
  Smartphone,
  Wifi,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TransferData = {
  id: string;
  originalName: string;
  size: number;
  mimetype: string;
};

export default function App() {
  const [mode, setMode] = useState<'home' | 'send' | 'receive'>('home');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [receiveId, setReceiveId] = useState('');
  const [receivedFileInfo, setReceivedFileInfo] = useState<TransferData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (socket && transferData) {
      socket.emit('join-transfer', transferData.id);
      socket.on('download-started', () => {
        setStatus('Receiver started downloading!');
      });
    }
    return () => {
      socket?.off('download-started');
    };
  }, [socket, transferData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setTransferData(data);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleReceive = async () => {
    if (!receiveId) return;
    setDownloading(true);
    try {
      const response = await fetch(`/api/file/${receiveId.toUpperCase()}`);
      if (!response.ok) throw new Error('File not found');
      const data = await response.json();
      setReceivedFileInfo({ ...data, id: receiveId.toUpperCase() });
    } catch (error) {
      alert('Invalid code or file expired.');
    } finally {
      setDownloading(false);
    }
  };

  const downloadFile = () => {
    if (!receivedFileInfo) return;
    window.location.href = `/api/download/${receivedFileInfo.id}`;
    setDownloaded(true);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const shareUrl = transferData ? `${window.location.origin}/?code=${transferData.id}` : '';

  // Check for code in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setReceiveId(code);
      setMode('receive');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-emerald-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-md mx-auto px-6 pt-12 pb-24">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wifi className="text-black w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SwiftShare</h1>
          </div>
          {mode !== 'home' && (
            <button 
              onClick={() => {
                setMode('home');
                setTransferData(null);
                setReceivedFileInfo(null);
                setFile(null);
                setDownloaded(false);
              }}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          {mode === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-4xl font-bold leading-tight">
                  Share files <br />
                  <span className="text-emerald-500">instantly.</span>
                </h2>
                <p className="text-zinc-400 text-lg">
                  No cables, no cloud accounts. Just fast, direct sharing over your network.
                </p>
              </div>

              <div className="grid gap-4">
                <button
                  onClick={() => setMode('send')}
                  className="group relative overflow-hidden bg-white text-black p-6 rounded-3xl flex items-center justify-between transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-lg">Send Files</div>
                      <div className="text-black/60 text-sm">Upload and share a link</div>
                    </div>
                  </div>
                  <Share2 className="w-6 h-6 opacity-20 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => setMode('receive')}
                  className="group relative overflow-hidden bg-zinc-900 border border-white/10 p-6 rounded-3xl flex items-center justify-between transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                      <Download className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-lg">Receive Files</div>
                      <div className="text-zinc-500 text-sm">Enter code or scan QR</div>
                    </div>
                  </div>
                  <Smartphone className="w-6 h-6 opacity-20 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              <div className="pt-8 flex items-center justify-center gap-8 text-zinc-500 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Fast</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Free</span>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'send' && (
            <motion.div
              key="send"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {!transferData ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5",
                    uploading && "pointer-events-none opacity-50"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                  {uploading ? (
                    <>
                      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                      <p className="text-zinc-400">Uploading your file...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-emerald-500" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg">Tap to select a file</p>
                        <p className="text-zinc-500 text-sm">Up to 100MB supported</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{transferData.originalName}</div>
                      <div className="text-zinc-500 text-sm">{formatSize(transferData.size)}</div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl flex flex-col items-center gap-6">
                    <div className="bg-white p-2 rounded-xl">
                      <QRCodeSVG value={shareUrl} size={200} />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-black font-bold text-xl">Scan to receive</p>
                      <p className="text-black/60 text-sm">Or use code: <span className="font-mono font-bold text-emerald-600">{transferData.id}</span></p>
                    </div>
                  </div>

                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">{status}</span>
                    </motion.div>
                  )}

                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      alert('Link copied to clipboard!');
                    }}
                    className="w-full bg-zinc-900 border border-white/10 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    Copy Share Link
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {mode === 'receive' && (
            <motion.div
              key="receive"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {!receivedFileInfo ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-zinc-500 text-sm font-medium ml-1">Enter 6-digit code</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={receiveId}
                        onChange={(e) => setReceiveId(e.target.value.toUpperCase())}
                        placeholder="E.g. XJ92LK"
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl p-4 font-mono text-xl focus:outline-none focus:border-emerald-500 transition-colors"
                        maxLength={6}
                      />
                      <button 
                        onClick={handleReceive}
                        disabled={receiveId.length < 6 || downloading}
                        className="bg-emerald-500 text-black px-6 rounded-2xl font-bold disabled:opacity-50 disabled:grayscale transition-all"
                      >
                        {downloading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Find'}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#0A0A0A] px-2 text-zinc-600">Or scan QR code</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-zinc-500" />
                    </div>
                    <p className="text-zinc-500 text-sm">Use your phone's camera to scan the QR code on the sender's device.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">File Found!</h3>
                    <p className="text-zinc-500">Ready to download</p>
                  </div>

                  <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center">
                      <FileText className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-xl mb-1">{receivedFileInfo.originalName}</div>
                      <div className="text-zinc-500">{formatSize(receivedFileInfo.size)}</div>
                    </div>
                  </div>

                  {!downloaded ? (
                    <button 
                      onClick={downloadFile}
                      className="w-full bg-emerald-500 text-black p-6 rounded-3xl font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Download className="w-6 h-6" />
                      Download File
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl flex flex-col items-center gap-3 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        <div className="font-bold text-emerald-500 text-lg">Download Started</div>
                        <p className="text-emerald-500/60 text-sm">Check your device's downloads folder.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setMode('home');
                          setReceivedFileInfo(null);
                          setReceiveId('');
                          setDownloaded(false);
                        }}
                        className="w-full bg-zinc-900 border border-white/10 p-4 rounded-2xl font-bold text-zinc-400"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile-style Bottom Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-center">
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-6 pointer-events-auto shadow-2xl">
            <button 
              onClick={() => setMode('home')}
              className={cn("p-2 rounded-full transition-colors", mode === 'home' ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-500 hover:text-white")}
            >
              <Smartphone className="w-5 h-5" />
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button 
              onClick={() => setMode('send')}
              className={cn("p-2 rounded-full transition-colors", mode === 'send' ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-500 hover:text-white")}
            >
              <Upload className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setMode('receive')}
              className={cn("p-2 rounded-full transition-colors", mode === 'receive' ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-500 hover:text-white")}
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
