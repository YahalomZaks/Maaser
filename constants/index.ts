import { createElement, type ReactNode } from "react";
import { Fingerprint, KeyRound, Link2 } from "lucide-react";

// Code snippets for different authentication strategies
export const authCodeSnippets = {
	oauth: `// OAuth authentication with multiple providers
import { signIn } from "@/lib/auth-client";

export function OAuthButtons() {
  return (
    <div className="flex flex-col space-y-3">
      <button 
        onClick={() => signIn('google')} 
        className="flex items-center justify-center gap-2 p-2 rounded-md">
        <GoogleIcon /> Continue with Google
      </button>
      
      <button 
        onClick={() => signIn('github')} 
        className="flex items-center justify-center gap-2 p-2 rounded-md">
        <GithubIcon /> Continue with GitHub
      </button>
      
      <button 
        onClick={() => signIn('microsoft')} 
        className="flex items-center justify-center gap-2 p-2 rounded-md">
        <MicrosoftIcon /> Continue with Microsoft
      </button>
    </div>
  );
}`,
	emailPassword: `// Email & Password authentication
import { useState } from 'react';
import { signIn } from '@/lib/auth-client';

export function EmailPasswordForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const result = await signIn('credentials', { email, password });
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Authentication failed. Try again.');
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 rounded"
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 rounded"
        />
      </div>
      {error && <div className="text-destructive">{error}</div>}
      <button 
        type="submit" 
        className="w-full p-2 rounded">
        Sign In
      </button>
    </form>
  );
}`,
	magicLink: `// Magic Link authentication
import { useState } from 'react';
import { sendMagicLink } from '@/lib/auth-client';

export function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');
  
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await sendMagicLink(email);
      setIsSent(true);
    } catch (err) {
      setError('Failed to send login link. Please try again.');
    }
  }
  
  return (
    <div className="space-y-4">
      {!isSent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 rounded"
            />
          </div>
          {error && <div className="text-destructive">{error}</div>}
          <button 
            type="submit" 
            className="w-full p-2 rounded">
            Send Login Link
          </button>
        </form>
      ) : (
        <div className="text-center p-4 rounded">
          <h3 className="font-semibold">Login Link Sent!</h3>
          <p className="mt-2">
            Check your email for a login link. It will expire in 15 minutes.
          </p>
        </div>
      )}
    </div>
  );
}`,
};

const iconClassName = "h-6 w-6 text-primary";

type AuthTabId = keyof typeof authCodeSnippets;

export interface AuthTab {
  id: AuthTabId;
  title: string;
  description: string;
  icon: ReactNode;
}

export const authTabs: AuthTab[] = [
  {
    id: "oauth",
    title: "Social & OAuth",
    description:
      "Allow users to sign in with popular providers like Google, GitHub, or Microsoft in just a few clicks.",
    icon: createElement(Fingerprint, { className: iconClassName }),
  },
  {
    id: "emailPassword",
    title: "Email & Password",
    description:
      "Offer the classic email and password experience with validation, errors, and secure handling built-in.",
    icon: createElement(KeyRound, { className: iconClassName }),
  },
  {
    id: "magicLink",
    title: "Magic Link",
    description:
      "Provide a passwordless sign-in flow that sends a secure link for fast, frictionless access.",
    icon: createElement(Link2, { className: iconClassName }),
  },
];
