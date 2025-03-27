import { Buffer } from 'buffer';

// Ensure global is defined
declare global {
    interface Window {
        Buffer: typeof Buffer;
        global: any;
    }
}

// Define global if it doesn't exist
if (typeof window !== 'undefined') {
    window.global = window;
    window.Buffer = Buffer;
}

window.Buffer = Buffer;
