'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearSession, getStoredUser, StoredUser } from '@/lib/auth';

// Minimal dashboard shell (spec §39). Only "புதிய ஜாதகம் உருவாக்கு" is wired
// up (Phase 3); the rest need generated data (Phase 15+) before they have
// anything to show. Auth (Phase 17) gates entry to this page.
export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace('/login');
      return;
    }
    setUser(stored);
    setChecked(true);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  if (!checked) return null;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '2rem', margin: 0 }}>தமிழ் ஜாதகம்</h1>
      <p style={{ color: '#666', margin: 0 }}>Tamil Vedic Astrology / Jathakam AI Platform</p>
      {user && <p style={{ color: '#999', fontSize: '0.85rem', margin: 0 }}>{user.email}</p>}

      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginTop: '2rem',
          width: '100%',
          maxWidth: '280px',
        }}
      >
        <Link href="/new" style={primaryLinkStyle}>
          புதிய ஜாதகம் உருவாக்கு
        </Link>
        <span style={disabledLinkStyle}>எனது ஜாதகங்கள்</span>
        <span style={disabledLinkStyle}>அறிக்கைகள்</span>
        <span style={disabledLinkStyle}>அமைப்புகள்</span>
        {user?.role === 'ADMIN' && (
          <Link href="/admin" style={adminLinkStyle}>
            Admin Panel
          </Link>
        )}
        <button type="button" onClick={handleLogout} style={logoutButtonStyle}>
          வெளியேறு
        </button>
      </nav>

      <p style={{ color: '#999', fontSize: '0.85rem', marginTop: '1.5rem' }}>
        மற்ற பட்டன்கள் அடுத்த கட்டங்களில் செயல்படுத்தப்படும்.
      </p>
    </main>
  );
}

const primaryLinkStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  background: '#111',
  color: 'white',
  textDecoration: 'none',
  fontSize: '1rem',
};

const disabledLinkStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  background: '#f0f0f0',
  color: '#aaa',
  fontSize: '1rem',
};

const adminLinkStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  background: 'white',
  border: '1px solid #111',
  color: '#111',
  textDecoration: 'none',
  fontSize: '0.9rem',
};

const logoutButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '6px',
  background: 'white',
  border: '1px solid #ccc',
  color: '#555',
  fontSize: '0.9rem',
  cursor: 'pointer',
  marginTop: '0.75rem',
};
