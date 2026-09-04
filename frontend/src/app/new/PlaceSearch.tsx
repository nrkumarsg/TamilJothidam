'use client';

import { useEffect, useRef, useState } from 'react';
import { PlaceCandidate, resolveTimezone, searchPlaces } from '@/lib/api';
import { labels, WizardLanguage } from './labels';

export interface LocationState {
  placeName: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  utcOffsetMinutes: number | null;
  dstApplicable: boolean;
  manuallyCorrected: boolean;
}

export const emptyLocation: LocationState = {
  placeName: '',
  country: '',
  latitude: null,
  longitude: null,
  timezone: '',
  utcOffsetMinutes: null,
  dstApplicable: false,
  manuallyCorrected: false,
};

interface Props {
  language: WizardLanguage;
  localDateTime: string; // ISO local date-time, used to resolve historical UTC offset/DST
  value: LocationState;
  onChange: (next: LocationState) => void;
}

export function PlaceSearch({ language, localDateTime, value, onChange }: Props) {
  const t = labels[language];
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Selecting a candidate sets `query` to the full place name so the input
  // shows it — that would otherwise re-trigger this same search effect and
  // pop the dropdown back open. Skip exactly one search after a selection.
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setCandidates([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const results = await searchPlaces(query.trim());
        setCandidates(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function selectCandidate(candidate: PlaceCandidate) {
    setCandidates([]);
    skipNextSearchRef.current = true;
    setQuery(candidate.placeName);
    setResolving(true);
    setError(null);
    try {
      const tz = await resolveTimezone(candidate.latitude, candidate.longitude, localDateTime);
      onChange({
        placeName: candidate.placeName,
        country: candidate.country,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        timezone: tz.timezone,
        utcOffsetMinutes: tz.utcOffsetMinutes,
        dstApplicable: tz.dstApplicable,
        manuallyCorrected: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResolving(false);
    }
  }

  function updateManual(field: keyof LocationState, raw: string) {
    const next = { ...value, manuallyCorrected: true };
    if (field === 'latitude' || field === 'longitude' || field === 'utcOffsetMinutes') {
      (next as any)[field] = raw === '' ? null : Number(raw);
    } else if (field === 'dstApplicable') {
      (next as any)[field] = raw === 'true';
    } else {
      (next as any)[field] = raw;
    }
    onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label>
        {t.placeSearchLabel}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.placeSearchPlaceholder}
          style={inputStyle}
        />
      </label>

      {searching && <p style={hintStyle}>{t.searching}</p>}
      {error && <p style={{ ...hintStyle, color: '#c0392b' }}>{t.error}: {error}</p>}

      {candidates.length > 0 && (
        <ul style={listStyle}>
          {candidates.map((c, i) => (
            <li key={i}>
              <button type="button" onClick={() => selectCandidate(c)} style={candidateButtonStyle}>
                {c.placeName}
              </button>
            </li>
          ))}
        </ul>
      )}

      {resolving && <p style={hintStyle}>{t.resolvingTimezone}</p>}

      {value.placeName && (
        <div style={selectedBoxStyle}>
          <strong>{t.selectedPlace}:</strong> {value.placeName}

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={manualMode}
              onChange={(e) => setManualMode(e.target.checked)}
            />
            {t.manualCorrection}
          </label>

          <div style={gridStyle}>
            <label>
              {t.latitude}
              <input
                type="number"
                step="any"
                value={value.latitude ?? ''}
                disabled={!manualMode}
                onChange={(e) => updateManual('latitude', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label>
              {t.longitude}
              <input
                type="number"
                step="any"
                value={value.longitude ?? ''}
                disabled={!manualMode}
                onChange={(e) => updateManual('longitude', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label>
              {t.timezone}
              <input
                type="text"
                value={value.timezone}
                disabled={!manualMode}
                onChange={(e) => updateManual('timezone', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label>
              {t.utcOffset}
              <input
                type="number"
                value={value.utcOffsetMinutes ?? ''}
                disabled={!manualMode}
                onChange={(e) => updateManual('utcOffsetMinutes', e.target.value)}
                style={inputStyle}
              />
            </label>
            <label>
              {t.dst}
              <select
                value={String(value.dstApplicable)}
                disabled={!manualMode}
                onChange={(e) => updateManual('dstApplicable', e.target.value)}
                style={inputStyle}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  marginTop: '0.25rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '1rem',
};

const hintStyle: React.CSSProperties = { color: '#666', fontSize: '0.9rem', margin: 0 };

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  border: '1px solid #ddd',
  borderRadius: '4px',
  maxHeight: '200px',
  overflowY: 'auto',
};

const candidateButtonStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '0.5rem',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
};

const selectedBoxStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9rem',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.5rem',
};
